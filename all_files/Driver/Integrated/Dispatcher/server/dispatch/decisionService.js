import {
  buildDispatchCandidates,
  buildDeterministicDispatchDecision,
  buildDispatchDecisionFromRanking,
} from '../../src/lib/dispatchEngine.js'
import { fetchRouteWeather } from '../../src/lib/weather.js'
import { requestOllamaDispatchDecision } from './ollamaClient.js'

function withMetadata(decision, extraMetadata = {}) {
  return {
    ...decision,
    metadata: {
      ...(decision.metadata || {}),
      ...extraMetadata,
    },
  }
}

export async function decideDispatch(
  {
    activeLoad,
    drivers,
    simulationTimestamp,
    weatherSnapshot = null,
    useLiveWeather = true,
  },
  dependencies = {},
) {
  const {
    fetchWeather = fetchRouteWeather,
    requestLlmDecision = requestOllamaDispatchDecision,
  } = dependencies

  if (!activeLoad || !Array.isArray(drivers) || !drivers.length || !simulationTimestamp) {
    return {
      error: 'A live load, driver snapshot, and simulation timestamp are required for dispatch decisions.',
      options: [],
      weatherSummary: null,
      updatedAt: new Date().toISOString(),
      recommendedDriverId: null,
      rankedDriverIds: [],
      provider: 'heuristic',
      model: 'deterministic',
      fallbackUsed: true,
      latencyMs: 0,
      metadata: {
        provider: 'heuristic',
        model: 'deterministic',
        fallbackUsed: true,
        fallbackReason: 'Missing decision payload',
      },
    }
  }

  let weatherSummary = weatherSnapshot

  if (useLiveWeather && !weatherSummary) {
    weatherSummary = await fetchWeather(activeLoad.origin, activeLoad.destination)
  }

  const candidateSnapshot = buildDispatchCandidates(drivers, activeLoad, {
    currentTime: simulationTimestamp,
    liveWeatherRisk: weatherSummary?.risk ?? null,
  })

  if (candidateSnapshot.error) {
    return {
      ...candidateSnapshot,
      weatherSummary,
      updatedAt: new Date().toISOString(),
      recommendedDriverId: null,
      rankedDriverIds: [],
      provider: 'heuristic',
      model: 'deterministic',
      fallbackUsed: true,
      latencyMs: 0,
    }
  }

  const deterministicDecision = withMetadata(
    buildDeterministicDispatchDecision(drivers, activeLoad, {
      currentTime: simulationTimestamp,
      liveWeatherRisk: weatherSummary?.risk ?? null,
    }),
    {
      provider: 'heuristic',
      model: 'deterministic',
      fallbackUsed: false,
      llmEnabled: false,
    },
  )

  const llmResult = await requestLlmDecision({
    load: activeLoad,
    candidates: candidateSnapshot.candidates,
    weatherSummary,
    simulationTimestamp,
    deterministicDecision,
  })

  const updatedAt = new Date().toISOString()
  const llmMetadata = {
    provider: llmResult.provider,
    model: llmResult.model,
    latencyMs: llmResult.latencyMs,
  }

  if (llmResult.disabled) {
    const deterministic = withMetadata(deterministicDecision, {
      provider: 'heuristic',
      model: 'deterministic',
      fallbackUsed: false,
      llmEnabled: false,
    })

    return {
      ...deterministic,
      weatherSummary,
      updatedAt,
      recommendedDriverId: deterministic.recommended?.id || null,
      rankedDriverIds: deterministic.rankedDriverIds || deterministic.options.map((candidate) => candidate.id),
      provider: deterministic.metadata.provider,
      model: deterministic.metadata.model,
      fallbackUsed: deterministic.metadata.fallbackUsed,
      latencyMs: deterministic.metadata.latencyMs ?? 0,
    }
  }

  if (!llmResult.ok) {
    const fallback = withMetadata(deterministicDecision, {
      ...llmMetadata,
      provider: 'heuristic',
      model: 'deterministic',
      fallbackUsed: true,
      llmEnabled: true,
      fallbackReason: llmResult.error,
    })

    return {
      ...fallback,
      weatherSummary,
      updatedAt,
      recommendedDriverId: fallback.recommended?.id || null,
      rankedDriverIds: fallback.rankedDriverIds || fallback.options.map((candidate) => candidate.id),
      provider: fallback.metadata.provider,
      model: fallback.metadata.model,
      fallbackUsed: fallback.metadata.fallbackUsed,
      latencyMs: fallback.metadata.latencyMs ?? 0,
    }
  }

  const llmDecision = withMetadata(
    buildDispatchDecisionFromRanking(candidateSnapshot.candidates, activeLoad, {
      rankedDriverIds: llmResult.data.rankedDriverIds,
      summary: llmResult.data.summary,
      whyNotNearest: llmResult.data.whyNotNearest,
      driverRationales: llmResult.data.driverRationales,
      confidence: llmResult.data.confidence,
    }),
    {
      ...llmMetadata,
      provider: 'ollama',
      fallbackUsed: false,
      llmEnabled: true,
    },
  )

  return {
    ...llmDecision,
    weatherSummary,
    updatedAt,
    recommendedDriverId: llmDecision.recommended?.id || null,
    rankedDriverIds: llmDecision.rankedDriverIds || llmDecision.options.map((candidate) => candidate.id),
    provider: llmDecision.metadata.provider,
    model: llmDecision.metadata.model,
    fallbackUsed: llmDecision.metadata.fallbackUsed,
    latencyMs: llmDecision.metadata.latencyMs ?? 0,
  }
}

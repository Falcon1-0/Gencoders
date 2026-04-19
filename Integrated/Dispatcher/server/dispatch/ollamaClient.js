import { apiConfig } from '../config.js'

function buildPrompt({ load, candidates, weatherSummary, simulationTimestamp, deterministicDecision }) {
  const candidateTable = candidates.map((candidate) => ({
    id: candidate.id,
    status: candidate.status,
    currentCity: candidate.currentCity,
    emptyMiles: candidate.emptyMiles,
    projectedCpm: candidate.projectedCpm,
    marginUsd: candidate.marginUsd,
    pickupBufferHours: candidate.pickupBufferHours,
    deliveryBufferHours: candidate.deliveryBufferHours,
    pickupFeasible: candidate.pickupFeasible,
    onTimeConfidence: candidate.onTimeConfidence,
    fitScore: candidate.score,
  }))

  return [
    {
      role: 'system',
      content: [
        'You are a freight dispatch decision engine.',
        'Rank every driver for the active load and choose the single best driver.',
        'Use only the provided data. Do not invent facts.',
        'Prefer service feasibility, on-time confidence, corridor fit, margin protection, and avoiding unnecessary resets.',
        'The closest truck is often the wrong truck; explain that clearly when relevant.',
        'Return only JSON with keys recommendedDriverId, rankedDriverIds, confidence, summary, whyNotNearest.',
        'recommendedDriverId must be one of the candidate ids.',
        'rankedDriverIds must contain every candidate id exactly once.',
        'Keep summary and whyNotNearest to one sentence each.',
        'Do not include markdown fences or extra text.',
      ].join(' '),
    },
    {
      role: 'user',
      content: JSON.stringify({
        simulationTimestamp,
        load,
        weatherSummary: weatherSummary || {
          risk: deterministicDecision.weatherRisk,
          riskLabel: deterministicDecision.weatherLabel,
          reason: 'Using built-in corridor weather risk.',
        },
        deterministicBaseline: {
          recommendedDriverId: deterministicDecision.recommended?.id,
          rankedDriverIds: deterministicDecision.rankedDriverIds,
        },
        candidates: candidateTable,
      }),
    },
  ]
}

function parseJsonContent(content) {
  const trimmed = String(content || '').trim()
  if (!trimmed) {
    throw new Error('Ollama returned an empty response')
  }

  try {
    return JSON.parse(trimmed)
  } catch (error) {
    const firstBrace = trimmed.indexOf('{')
    const lastBrace = trimmed.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1))
    }
    throw error
  }
}

function normalizeResponseShape(parsed, candidates) {
  const candidateIds = new Set(candidates.map((candidate) => candidate.id))
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Ollama returned a non-object response')
  }

  if (!Array.isArray(parsed.rankedDriverIds) || parsed.rankedDriverIds.length === 0) {
    throw new Error('Ollama did not return a full ranking')
  }

  const rankedDriverIds = []
  const seenIds = new Set()
  parsed.rankedDriverIds.forEach((id) => {
    if (!candidateIds.has(id)) {
      return
    }
    if (seenIds.has(id)) return
    seenIds.add(id)
    rankedDriverIds.push(id)
  })

  if (!rankedDriverIds.length) {
    throw new Error('Ollama ranking did not include any known drivers')
  }

  candidates.forEach((candidate) => {
    if (!seenIds.has(candidate.id)) {
      rankedDriverIds.push(candidate.id)
    }
  })

  const recommendedDriverId = candidateIds.has(parsed.recommendedDriverId)
    ? parsed.recommendedDriverId
    : rankedDriverIds[0]

  const driverRationales = {}
  if (Array.isArray(parsed.driverExplanations)) {
    parsed.driverExplanations.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return
      if (!candidateIds.has(entry.driverId)) return
      if (typeof entry.rationale !== 'string' || !entry.rationale.trim()) return
      driverRationales[entry.driverId] = entry.rationale.trim()
    })
  }

  return {
    recommendedDriverId,
    rankedDriverIds,
    confidence: Math.max(1, Math.min(99, Number(parsed.confidence || 0) || 72)),
    summary: String(parsed.summary || '').trim(),
    whyNotNearest: String(parsed.whyNotNearest || '').trim(),
    driverRationales,
  }
}

function describeOllamaError(error, operation = 'request') {
  if (error?.name === 'AbortError') {
    return `Ollama ${operation} timed out after ${apiConfig.ollamaTimeoutMs} ms at ${apiConfig.ollamaBaseUrl}.`
  }

  const causeCode = error?.cause?.code
  const causeMessage = error?.cause?.message || ''
  const rawMessage = error?.message || ''
  const combined = `${rawMessage} ${causeMessage}`.trim()

  if (causeCode === 'ECONNREFUSED' || /ECONNREFUSED/i.test(combined) || rawMessage === 'fetch failed') {
    return `Ollama is not reachable at ${apiConfig.ollamaBaseUrl}. Start Ollama with \`ollama serve\` and pull the configured model with \`ollama pull ${apiConfig.ollamaModel}\`.`
  }

  if (causeCode === 'ENOTFOUND' || /ENOTFOUND/i.test(combined)) {
    return `The configured Ollama host could not be found: ${apiConfig.ollamaBaseUrl}. Check OLLAMA_BASE_URL.`
  }

  return combined || `Ollama ${operation} failed at ${apiConfig.ollamaBaseUrl}.`
}

export async function checkOllamaHealth(fetchImpl = fetch) {
  if (!apiConfig.ollamaEnabled) {
    return {
      enabled: false,
      reachable: false,
      baseUrl: apiConfig.ollamaBaseUrl,
      model: apiConfig.ollamaModel,
      message: 'Ollama integration is disabled. Set OLLAMA_ENABLED=true to enable local LLM dispatching.',
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.min(apiConfig.ollamaTimeoutMs, 2500))

  try {
    const response = await fetchImpl(`${apiConfig.ollamaBaseUrl}/api/tags`, {
      signal: controller.signal,
    })
    if (!response.ok) {
      return { reachable: false, message: `Ollama responded with ${response.status}` }
    }

    const payload = await response.json()
    return {
      reachable: true,
      baseUrl: apiConfig.ollamaBaseUrl,
      model: apiConfig.ollamaModel,
      models: Array.isArray(payload.models) ? payload.models.map((model) => model.name) : [],
    }
  } catch (error) {
    return {
      reachable: false,
      baseUrl: apiConfig.ollamaBaseUrl,
      model: apiConfig.ollamaModel,
      message: describeOllamaError(error, 'health check'),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function requestOllamaDispatchDecision(
  { load, candidates, weatherSummary, simulationTimestamp, deterministicDecision },
  fetchImpl = fetch,
) {
  if (!apiConfig.ollamaEnabled) {
    return {
      ok: false,
      disabled: true,
      provider: 'ollama',
      model: apiConfig.ollamaModel,
      latencyMs: 0,
      error: 'Ollama integration is disabled.',
    }
  }

  const health = await checkOllamaHealth(fetchImpl)
  if (!health.reachable) {
    return {
      ok: false,
      provider: 'ollama',
      model: apiConfig.ollamaModel,
      latencyMs: 0,
      error: health.message,
    }
  }

  if (!health.models.includes(apiConfig.ollamaModel)) {
    return {
      ok: false,
      provider: 'ollama',
      model: apiConfig.ollamaModel,
      latencyMs: 0,
      error: `Configured Ollama model ${apiConfig.ollamaModel} is not available yet at ${apiConfig.ollamaBaseUrl}. Finish \`ollama pull ${apiConfig.ollamaModel}\` before enabling local LLM dispatching.`,
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), apiConfig.ollamaTimeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetchImpl(`${apiConfig.ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: apiConfig.ollamaModel,
        stream: false,
        think: false,
        format: 'json',
        options: {
          temperature: 0,
          num_predict: 160,
        },
        messages: buildPrompt({
          load,
          candidates,
          weatherSummary,
          simulationTimestamp,
          deterministicDecision,
        }),
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama request failed with ${response.status}`)
    }

    const payload = await response.json()
    const content = payload.message?.content || payload.response || '{}'
    const parsed = parseJsonContent(content)

    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      model: apiConfig.ollamaModel,
      provider: 'ollama',
      data: normalizeResponseShape(parsed, candidates),
    }
  } catch (error) {
    return {
      ok: false,
      provider: 'ollama',
      model: apiConfig.ollamaModel,
      latencyMs: Date.now() - startedAt,
      error: describeOllamaError(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

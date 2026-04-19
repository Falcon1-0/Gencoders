import { describe, expect, it, vi } from 'vitest'
import { defaultLoad, drivers } from '../src/data/mockData.js'
import { decideDispatch } from '../server/dispatch/decisionService.js'

describe('decideDispatch', () => {
  it('falls back to the deterministic engine when the llm fails', async () => {
    const decision = await decideDispatch(
      {
        activeLoad: defaultLoad,
        drivers,
        simulationTimestamp: '2026-04-19T08:00:00.000Z',
        useLiveWeather: false,
      },
      {
        requestLlmDecision: vi.fn().mockResolvedValue({
          ok: false,
          provider: 'ollama',
          model: 'qwen3:8b',
          latencyMs: 43,
          error: 'Ollama unavailable',
        }),
      },
    )

    expect(decision.fallbackUsed).toBe(true)
    expect(decision.provider).toBe('heuristic')
    expect(decision.recommendedDriverId).toBeTruthy()
    expect(decision.metadata.fallbackReason).toContain('Ollama unavailable')
  })

  it('uses an ollama ranking when the llm returns valid structured output', async () => {
    const decision = await decideDispatch(
      {
        activeLoad: defaultLoad,
        drivers,
        simulationTimestamp: '2026-04-19T08:00:00.000Z',
        useLiveWeather: false,
      },
      {
        requestLlmDecision: vi.fn().mockResolvedValue({
          ok: true,
          provider: 'ollama',
          model: 'qwen3:8b',
          latencyMs: 52,
          data: {
            recommendedDriverId: 'DRV-206',
            rankedDriverIds: ['DRV-206', 'DRV-201', 'DRV-204'],
            confidence: 81,
            summary: 'Assign B. Lee for the best mix of corridor fit and timing.',
            whyNotNearest: 'The nearest truck has weaker service economics.',
            driverRationales: {
              'DRV-206': 'Strong lane fit and enough HOS buffer.',
              'DRV-201': 'Reliable but slightly more repositioning.',
            },
          },
        }),
      },
    )

    expect(decision.fallbackUsed).toBe(false)
    expect(decision.provider).toBe('ollama')
    expect(decision.recommendedDriverId).toBe('DRV-206')
    expect(decision.options[0].llmReason).toContain('Strong lane fit')
  })

  it('returns a clean fallback payload when the request body is incomplete', async () => {
    const decision = await decideDispatch({})

    expect(decision.fallbackUsed).toBe(true)
    expect(decision.rankedDriverIds).toHaveLength(0)
    expect(decision.error).toContain('required')
  })
})

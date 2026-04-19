import { describe, expect, it } from 'vitest'
import { defaultLoad, drivers } from '../src/data/mockData.js'
import { buildDispatchCandidates, buildDeterministicDispatchDecision } from '../src/lib/dispatchEngine.js'

describe('dispatchEngine', () => {
  it('builds scored candidates for a snapshot in time', () => {
    const snapshot = buildDispatchCandidates(drivers, defaultLoad, {
      currentTime: '2026-04-19T08:00:00.000Z',
    })

    expect(snapshot.error).toBeUndefined()
    expect(snapshot.candidates).toHaveLength(drivers.length)
    expect(snapshot.candidates[0]).toHaveProperty('emptyMiles')
    expect(snapshot.candidates[0]).toHaveProperty('pickupFeasible')
    expect(snapshot.weatherLabel).toBeDefined()
  })

  it('produces a deterministic fallback recommendation', () => {
    const decision = buildDeterministicDispatchDecision(drivers, defaultLoad, {
      currentTime: '2026-04-19T08:00:00.000Z',
    })

    expect(decision.recommended).toBeDefined()
    expect(decision.options[0].id).toBe(decision.recommended.id)
    expect(decision.rankedDriverIds).toHaveLength(drivers.length)
    expect(decision.metadata.provider).toBe('heuristic')
  })
})

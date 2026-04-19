import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../server/createApp.js'

function createMockLiveBoard() {
  return {
    getSnapshot() {
      return {
        snapshotVersion: 7,
        clock: '2026-04-19T08:00:00.000Z',
        activeLoad: { id: 'LD-7' },
        queuedLoads: [],
        drivers: [],
        activity: [],
      }
    },
    subscribe() {
      return () => {}
    },
  }
}

describe('api', () => {
  it('serves board state and a health summary', async () => {
    const app = createApp({
      liveBoard: createMockLiveBoard(),
      services: {
        checkOllamaHealth: vi.fn().mockResolvedValue({
          reachable: false,
          message: 'offline',
        }),
      },
    })

    const [stateResponse, healthResponse] = await Promise.all([
      request(app).get('/api/live-board/state'),
      request(app).get('/api/health'),
    ])

    expect(stateResponse.status).toBe(200)
    expect(stateResponse.body.snapshotVersion).toBe(7)
    expect(healthResponse.status).toBe(200)
    expect(healthResponse.body.ollama.reachable).toBe(false)
  })

  it('passes dispatch requests to the decision service', async () => {
    const app = createApp({
      liveBoard: createMockLiveBoard(),
      services: {
        decideDispatch: vi.fn().mockResolvedValue({
          recommendedDriverId: 'DRV-206',
          rankedDriverIds: ['DRV-206'],
          provider: 'ollama',
          model: 'qwen3:8b',
          fallbackUsed: false,
        }),
      },
    })

    const response = await request(app)
      .post('/api/dispatch/decision')
      .send({ activeLoad: { id: 'LD-7' }, drivers: [{ id: 'DRV-206' }] })

    expect(response.status).toBe(200)
    expect(response.body.recommendedDriverId).toBe('DRV-206')
    expect(response.body.provider).toBe('ollama')
  })
})

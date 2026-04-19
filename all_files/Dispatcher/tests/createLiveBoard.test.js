import { describe, expect, it } from 'vitest'
import { createLiveBoard } from '../server/liveBoard/createLiveBoard.js'

describe('createLiveBoard', () => {
  it('advances the board clock and keeps an activity feed', () => {
    const board = createLiveBoard({
      tickMs: 60000,
      tickMinutes: 18,
    })

    const initial = board.getSnapshot()
    board.advanceTick()
    board.advanceTick()
    const updated = board.getSnapshot()

    expect(updated.snapshotVersion).toBeGreaterThan(initial.snapshotVersion)
    expect(new Date(updated.clock).getTime()).toBeGreaterThan(new Date(initial.clock).getTime())
    expect(updated.activity.length).toBeGreaterThan(1)
  })

  it('rotates the active load after enough ticks', () => {
    const board = createLiveBoard({
      tickMs: 60000,
      tickMinutes: 18,
    })

    const initialLoadId = board.getSnapshot().activeLoad.id
    board.advanceTick()
    board.advanceTick()
    board.advanceTick()
    board.advanceTick()
    board.advanceTick()

    expect(board.getSnapshot().activeLoad.id).not.toBe(initialLoadId)
  })
})

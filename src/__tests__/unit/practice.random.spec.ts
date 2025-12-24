import { describe, expect, test } from 'vitest'
import { createEmptyState, ensurePracticeOrder } from '../../storage/localState'

describe('fixed_random picks ten', () => {
  test('order length is 10', () => {
    const s = createEmptyState()
    s.lists = [{ id: 'L', name: 'x', createdAt: Date.now() }]
    s.itemsByListId['L'] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      term: `t${i}`,
      createdAt: Date.now(),
    }))
    ensurePracticeOrder(s, 'L', { mode: 'fixed_random', reshuffle: true })
    expect(s.practiceByListId['L'].order.length).toBe(10)
  })
})

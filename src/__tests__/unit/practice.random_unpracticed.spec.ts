import { describe, expect, test } from 'vitest'
import { createEmptyState, ensurePracticeOrder } from '../../storage/localState'

describe('fixed_random_unpracticed picks ten excluding practiced', () => {
  test('excludes practiced items from selection', () => {
    const s = createEmptyState()
    const listId = 'L'
    s.lists = [{ id: listId, name: 'x', createdAt: Date.now() }]
    s.itemsByListId[listId] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      term: `t${i}`,
      createdAt: Date.now(),
    }))
    s.practiceHistory = [
      {
        id: 'run1',
        startedAt: Date.now(),
        total: 5,
        correctByAttempt: { 1: 0, 2: 0, 3: 0 },
        finalWrongCount: 0,
        records: [{ itemId: '0', term: 't0', attemptCount: 1, isCorrect: true }],
        listId,
        listName: 'x',
        mode: 'fixed_sequence',
      },
    ]
    ensurePracticeOrder(s, listId, { mode: 'fixed_random_unpracticed', reshuffle: true })
    const order = s.practiceByListId[listId].order
    expect(order.length).toBe(10)
    expect(order.includes('0')).toBe(false)
  })
})

import { describe, expect, test } from 'vitest'
import { createEmptyState, ensurePracticeOrder } from '../../storage/localState'

describe('fixed_random_unpracticed excludes items present in corrects/mistakes/current run', () => {
  test('excludes items in corrects', () => {
    const s = createEmptyState()
    const listId = 'L'
    s.lists = [{ id: listId, name: 'x', createdAt: Date.now() }]
    s.itemsByListId[listId] = [
      { id: 'A', term: 'a', createdAt: Date.now() },
      { id: 'B', term: 'b', createdAt: Date.now() },
      { id: 'C', term: 'c', createdAt: Date.now() },
    ]
    s.corrects = [
      { id: 'c1', listId, itemId: 'A', term: 'a', sentence: 's', stage: 1, correctCount: 1, lastCorrectAt: Date.now() },
    ]
    ensurePracticeOrder(s, listId, { mode: 'fixed_random_unpracticed', reshuffle: true })
    const order = s.practiceByListId[listId].order
    expect(order.includes('A')).toBe(false)
  })

  test('excludes items in mistakes', () => {
    const s = createEmptyState()
    const listId = 'L'
    s.lists = [{ id: listId, name: 'x', createdAt: Date.now() }]
    s.itemsByListId[listId] = [
      { id: 'A', term: 'a', createdAt: Date.now() },
      { id: 'B', term: 'b', createdAt: Date.now() },
      { id: 'C', term: 'c', createdAt: Date.now() },
    ]
    s.mistakes = [{ id: 'm1', listId, itemId: 'B', term: 'b', sentence: 's', wrongCount: 1, lastWrongAt: Date.now() }]
    ensurePracticeOrder(s, listId, { mode: 'fixed_random_unpracticed', reshuffle: true })
    const order = s.practiceByListId[listId].order
    expect(order.includes('B')).toBe(false)
  })

  test('excludes items present in current run records', () => {
    const s = createEmptyState()
    const listId = 'L'
    s.lists = [{ id: listId, name: 'x', createdAt: Date.now() }]
    s.itemsByListId[listId] = [
      { id: 'A', term: 'a', createdAt: Date.now() },
      { id: 'B', term: 'b', createdAt: Date.now() },
      { id: 'C', term: 'c', createdAt: Date.now() },
    ]
    s.practiceByListId[listId] = {
      order: ['A', 'B', 'C'],
      cursor: 1,
      updatedAt: Date.now(),
      mode: 'fixed_sequence',
      run: {
        id: 'r1',
        startedAt: Date.now(),
        total: 3,
        correctByAttempt: { 1: 0, 2: 0, 3: 0 },
        finalWrongCount: 0,
        records: [{ itemId: 'A', term: 'a', attemptCount: 1, isCorrect: true }],
      },
    }
    ensurePracticeOrder(s, listId, { mode: 'fixed_random_unpracticed', reshuffle: true })
    const order = s.practiceByListId[listId].order
    expect(order.includes('A')).toBe(false)
  })
})

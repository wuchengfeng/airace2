import { describe, expect, test } from 'vitest'
import { createEmptyState, ensurePracticeOrder } from '../../storage/localState'

describe('practice ensure order', () => {
  test('reshuffle: true resets progress', () => {
    let s = createEmptyState()
    const listId = 'L1'
    s.itemsByListId[listId] = [
      { id: '1', term: 'a', createdAt: 0 },
      { id: '2', term: 'b', createdAt: 0 }
    ]
    s.practiceByListId[listId] = {
      order: ['1', '2'],
      cursor: 1,
      updatedAt: Date.now(),
      mode: 'fixed_sequence',
      run: { id: 'old', startedAt: 0, total: 2, correctByAttempt: {1:0,2:0,3:0}, finalWrongCount: 0, records: [] }
    }

    ensurePracticeOrder(s, listId, { reshuffle: true, mode: 'fixed_sequence' })
    
    const p = s.practiceByListId[listId]
    expect(p.cursor).toBe(0)
    expect(p.run?.id).not.toBe('old')
    expect(p.run?.total).toBe(2)
  })

  test('fixed_sequence updates order when items change', () => {
    let s = createEmptyState()
    const listId = 'L1'
    // Old state: items 1, 2
    s.itemsByListId[listId] = [
      { id: '1', term: 'a', createdAt: 0 },
      { id: '2', term: 'b', createdAt: 0 },
      { id: '3', term: 'c', createdAt: 0 } // New item 3 added
    ]
    s.practiceByListId[listId] = {
      order: ['1', '2'],
      cursor: 1, // was at '2'
      updatedAt: Date.now(),
      mode: 'fixed_sequence',
      run: { id: 'r1', startedAt: 0, total: 2, correctByAttempt: {1:0,2:0,3:0}, finalWrongCount: 0, records: [] }
    }

    ensurePracticeOrder(s, listId, { mode: 'fixed_sequence' })
    
    const p = s.practiceByListId[listId]
    expect(p.order).toEqual(['1', '2', '3']) // Should include 3
    expect(p.cursor).toBe(1) // Should still point to '2' (index 1)
  })
})

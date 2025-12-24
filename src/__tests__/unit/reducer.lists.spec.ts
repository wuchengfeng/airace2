import { describe, expect, test } from 'vitest'
import { reducer } from '../../app/storeContext'
import { createEmptyState } from '../../storage/localState'

describe('reducer: lists management', () => {
  test('lists/create adds a new list', () => {
    let s = createEmptyState()
    s = reducer(s, {
      type: 'lists/create',
      payload: { name: 'My List', id: 'L1' }
    })
    expect(s.lists).toHaveLength(1)
    expect(s.lists[0]).toMatchObject({ id: 'L1', name: 'My List' })
    expect(s.itemsByListId['L1']).toEqual([])
  })

  test('lists/delete removes list and associated data', () => {
    let s = createEmptyState()
    const listId = 'L1'
    
    // Setup state with data linked to L1
    s.lists = [{ id: listId, name: 'L1', createdAt: Date.now() }]
    s.itemsByListId[listId] = [{ id: 'i1', term: 't1', createdAt: Date.now() }]
    s.practiceByListId[listId] = { order: ['i1'], cursor: 0, updatedAt: Date.now(), mode: 'fixed_sequence' }
    s.mistakes = [{ id: 'm1', listId: listId, itemId: 'i1', term: 't1', sentence: 's1', wrongCount: 1, lastWrongAt: Date.now() }]
    s.practiceHistory = [{ id: 'run1', listId: listId, mode: 'fixed_sequence', startedAt: Date.now(), total: 1, correctByAttempt: {1:0,2:0,3:0}, finalWrongCount: 0 }]

    s = reducer(s, {
      type: 'lists/delete',
      payload: { listId }
    })

    expect(s.lists).toHaveLength(0)
    expect(s.itemsByListId[listId]).toBeUndefined()
    expect(s.practiceByListId[listId]).toBeUndefined()
    expect(s.mistakes).toHaveLength(0)
    expect(s.practiceHistory).toHaveLength(0)
  })
})

import { describe, expect, test } from 'vitest'
import { reducer } from '../../app/storeContext'
import { createEmptyState } from '../../storage/localState'

describe('practice next archives once', () => {
  test('archives to history after finishing', () => {
    let s = createEmptyState()
    s.lists = [{ id: 'L', name: 'x', createdAt: Date.now() }]
    s.itemsByListId['L'] = [
      { id: '1', term: 'a', createdAt: Date.now() },
      { id: '2', term: 'b', createdAt: Date.now() },
      { id: '3', term: 'c', createdAt: Date.now() },
    ]
    s = reducer(s, { type: 'practice/ensure', payload: { listId: 'L' } })
    s = reducer(s, { type: 'practice/next', payload: { listId: 'L' } })
    s = reducer(s, { type: 'practice/next', payload: { listId: 'L' } })
    s = reducer(s, { type: 'practice/next', payload: { listId: 'L' } })
    expect((s.practiceHistory ?? []).length).toBe(1)
  })
})

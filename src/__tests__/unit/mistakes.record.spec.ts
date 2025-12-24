import { describe, expect, test } from 'vitest'
import { createEmptyState, recordMistake } from '../../storage/localState'

describe('mistakes record', () => {
  test('accumulates wrongCount', () => {
    const s = createEmptyState()
    const e = { id: 'm1', listId: 'L', itemId: 'I', term: 't', sentence: 'S' }
    recordMistake(s, e)
    recordMistake(s, e)
    const found = s.mistakes.find((m) => m.itemId === 'I')
    expect(found?.wrongCount).toBe(2)
  })
})

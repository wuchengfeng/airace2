import { describe, expect, test } from 'vitest'
import { reducer } from '../../app/storeContext'
import { createEmptyState } from '../../storage/localState'

describe('reducer: practice/finalWrong', () => {
  test('increments finalWrongCount and adds failed record', () => {
    let s = createEmptyState()
    const listId = 'L1'
    s.practiceByListId[listId] = {
      order: ['item1'],
      cursor: 0,
      updatedAt: Date.now(),
      mode: 'fixed_sequence',
      run: {
        id: 'run1',
        startedAt: Date.now(),
        total: 1,
        correctByAttempt: { 1: 0, 2: 0, 3: 0 },
        finalWrongCount: 0,
        records: []
      }
    }

    s = reducer(s, {
      type: 'practice/finalWrong',
      payload: {
        listId,
        record: { itemId: 'item1', term: 'term1' }
      }
    })

    const run = s.practiceByListId[listId].run!
    expect(run.finalWrongCount).toBe(1)
    expect(run.records![0]).toMatchObject({
      itemId: 'item1',
      attemptCount: 4,
      isCorrect: false
    })
  })
})

import { describe, expect, test } from 'vitest'
import { reducer } from '../../app/storeContext'
import { createEmptyState } from '../../storage/localState'

describe('reducer: practice/correct', () => {
  test('increments correctByAttempt[1] and adds record for 1st attempt', () => {
    let s = createEmptyState()
    const listId = 'L1'
    // Setup initial practice state
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
      type: 'practice/correct',
      payload: {
        listId,
        attemptNo: 1,
        record: { itemId: 'item1', term: 'term1' }
      }
    })

    const run = s.practiceByListId[listId].run!
    expect(run.correctByAttempt[1]).toBe(1)
    expect(run.correctByAttempt[2]).toBe(0)
    expect(run.correctByAttempt[3]).toBe(0)
    expect(run.records?.length).toBe(1)
    expect(run.records![0]).toMatchObject({
      itemId: 'item1',
      attemptCount: 1,
      isCorrect: true
    })
  })

  test('increments correctByAttempt[2] for 2nd attempt', () => {
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
      type: 'practice/correct',
      payload: {
        listId,
        attemptNo: 2,
        record: { itemId: 'item1', term: 'term1' }
      }
    })

    const run = s.practiceByListId[listId].run!
    expect(run.correctByAttempt[1]).toBe(0)
    expect(run.correctByAttempt[2]).toBe(1)
    expect(run.correctByAttempt[3]).toBe(0)
    expect(run.records![0].attemptCount).toBe(2)
  })

  test('increments correctByAttempt[3] for 3rd attempt', () => {
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
      type: 'practice/correct',
      payload: {
        listId,
        attemptNo: 3,
        record: { itemId: 'item1', term: 'term1' }
      }
    })

    const run = s.practiceByListId[listId].run!
    expect(run.correctByAttempt[1]).toBe(0)
    expect(run.correctByAttempt[2]).toBe(0)
    expect(run.correctByAttempt[3]).toBe(1)
    expect(run.records![0].attemptCount).toBe(3)
  })
})

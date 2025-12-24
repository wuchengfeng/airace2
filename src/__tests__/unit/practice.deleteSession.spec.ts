import { describe, expect, test } from 'vitest'
import { createEmptyState, deletePracticeSession } from '../../storage/localState'

describe('practice delete session', () => {
  test('removes progress entry', () => {
    const s = createEmptyState()
    s.practiceByListId['L'] = { order: ['a'], cursor: 0, updatedAt: Date.now(), mode: 'fixed_sequence' }
    const next = deletePracticeSession(s, 'L')
    expect(next.practiceByListId['L']).toBeUndefined()
  })
})

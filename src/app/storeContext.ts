import { createContext } from 'react'
import type {
  AppStateV1,
  CorrectEntry,
  ListItem,
  ListItemMaterial,
  MistakeEntry,
  PracticeHistoryEntry,
  PracticeMode,
  PracticeRun,
  PracticeProgress,
  PromptTemplate,
  WordList,
} from '../domain/models'
import {
  deleteItem,
  deleteList,
  ensurePracticeOrder,
  mergeWordTablesFromTeable,
  moveNext,
  recordCorrect,
  recordMistake,
  upsertItem,
  bulkUpsertItems,
  upsertList,
  deleteHistoryRun,
  deletePracticeSession,
} from '../storage/localState'
import type { TeableWordTableRecord } from '../storage/localState'

export type Action =
  | { type: 'state/replace'; payload: { state: AppStateV1 } }
  | { type: 'lists/sync'; payload: { remote: TeableWordTableRecord[] } }
  | { type: 'lists/create'; payload: { name: string; id?: string; createdAt?: number } }
  | { type: 'lists/rename'; payload: { listId: string; name: string } }
  | { type: 'lists/delete'; payload: { listId: string } }
  | { type: 'items/replace'; payload: { listId: string; items: ListItem[] } }
  | { type: 'items/upsert'; payload: { listId: string; item: ListItem } }
  | { type: 'items/bulkUpsert'; payload: { listId: string; items: ListItem[] } }
  | { type: 'items/delete'; payload: { listId: string; itemId: string } }
  | { type: 'practice/ensure'; payload: { listId: string; reshuffle?: boolean; mode?: PracticeMode } }
  | { type: 'practice/next'; payload: { listId: string } }
  | { type: 'practice/deleteSession'; payload: { listId: string } }
  | {
      type: 'practice/correct'
      payload: {
        listId: string
        attemptNo: 1 | 2 | 3
        record: { itemId: string; term: string; userMeaningZh?: string; snapshot?: ListItemMaterial }
      }
    }
  | {
      type: 'practice/finalWrong'
      payload: {
        listId: string
        record: { itemId: string; term: string; userMeaningZh?: string; snapshot?: ListItemMaterial }
      }
    }
  | { type: 'settings/mode'; payload: { mode: PracticeMode } }
  | { type: 'settings/selectedList'; payload: { selectedListId?: string } }
  | { type: 'items/material'; payload: { listId: string; itemId: string; material: ListItemMaterial } }
  | { type: 'mistakes/record'; payload: { entry: Omit<MistakeEntry, 'wrongCount' | 'lastWrongAt'> } }
  | { type: 'mistakes/clear' }
  | { type: 'corrects/record'; payload: { entry: Omit<CorrectEntry, 'correctCount' | 'lastCorrectAt'> } }
  | { type: 'corrects/clear' }
  | { type: 'history/delete'; payload: { runId: string } }
  | { type: 'prompts/set'; payload: { key: string; template: PromptTemplate } }

function createRun(total: number): PracticeRun {
  return {
    id: crypto.randomUUID(),
    startedAt: Date.now(),
    total,
    correctByAttempt: { 1: 0, 2: 0, 3: 0 },
    finalWrongCount: 0,
    records: [],
  }
}

function ensureRun(progress: PracticeProgress) {
  if (!progress.run) progress.run = createRun(progress.order.length)
  progress.run.total = progress.order.length
  return progress.run
}

function archiveRun(next: AppStateV1, listId: string, run: PracticeRun, mode: PracticeMode) {
  const history = next.practiceHistory ?? []
  if (history.some((h) => h.id === run.id)) return
  const listName = next.lists.find((l) => l.id === listId)?.name
  const entry: PracticeHistoryEntry = { ...run, listId, listName, mode }
  next.practiceHistory = [entry, ...history]
}

export function reducer(state: AppStateV1, action: Action): AppStateV1 {
  if (action.type === 'state/replace') return action.payload.state

  const next: AppStateV1 = structuredClone(state)

  switch (action.type) {
    case 'lists/sync': {
      return mergeWordTablesFromTeable(state, action.payload.remote)
    }
    case 'lists/create': {
      const list: WordList = {
        id: action.payload.id ?? crypto.randomUUID(),
        name: action.payload.name,
        createdAt: action.payload.createdAt ?? Date.now(),
      }
      upsertList(next, list)
      next.itemsByListId[list.id] = next.itemsByListId[list.id] ?? []
      return next
    }
    case 'lists/rename': {
      const list = next.lists.find((l) => l.id === action.payload.listId)
      if (!list) return state
      list.name = action.payload.name
      upsertList(next, list)
      return next
    }
    case 'lists/delete': {
      deleteList(next, action.payload.listId)
      return next
    }
    case 'items/upsert': {
      const { listId, item } = action.payload
      const list = next.lists.find((l) => l.id === listId)
      if (list) {
        upsertItem(next, listId, item)
      }
      return next
    }
    case 'items/bulkUpsert': {
      const { listId, items } = action.payload
      const list = next.lists.find((l) => l.id === listId)
      if (list) {
        bulkUpsertItems(next, listId, items)
      }
      return next
    }
    case 'items/replace': {
      const prev = next.itemsByListId[action.payload.listId] ?? []
      const materialById = new Map(prev.map((it) => [it.id, it.material] as const))
      next.itemsByListId[action.payload.listId] = action.payload.items.map((it) => ({
        ...it,
        material: it.material ?? materialById.get(it.id),
      }))
      return next
    }
    case 'items/delete': {
      deleteItem(next, action.payload.listId, action.payload.itemId)
      return next
    }
    case 'practice/ensure': {
      ensurePracticeOrder(next, action.payload.listId, { reshuffle: action.payload.reshuffle, mode: action.payload.mode })
      if (!next.settings) next.settings = { mode: 'fixed_sequence' }
      return next
    }
    case 'practice/next': {
      const progress = next.practiceByListId[action.payload.listId]
      const cursorBefore = progress?.cursor ?? 0
      const lengthBefore = progress?.order.length ?? 0

      moveNext(next, action.payload.listId)

      const after = next.practiceByListId[action.payload.listId]
      const run = after?.run
      const mode = after?.mode ?? next.settings?.mode ?? 'fixed_sequence'
      
      const isJustFinished =
        run && after && cursorBefore < lengthBefore && after.cursor >= after.order.length

      if (isJustFinished) {
        if (!run.endedAt) run.endedAt = Date.now()
        console.log('[Practice] Archiving run:', run.id)
        archiveRun(next, action.payload.listId, run, mode)
      }
      return next
    }
    case 'practice/deleteSession': {
      return deletePracticeSession(state, action.payload.listId)
    }
    case 'practice/correct': {
      const progress = next.practiceByListId[action.payload.listId]
      if (!progress) return state
      const run = ensureRun(progress)
      run.correctByAttempt[action.payload.attemptNo] += 1
      run.records = run.records ?? []
      run.records.push({
        itemId: action.payload.record.itemId,
        term: action.payload.record.term,
        attemptCount: action.payload.attemptNo,
        isCorrect: true,
        userMeaningZh: action.payload.record.userMeaningZh,
        snapshot: action.payload.record.snapshot,
      })
      progress.updatedAt = Date.now()
      return next
    }
    case 'practice/finalWrong': {
      const progress = next.practiceByListId[action.payload.listId]
      if (!progress) return state
      const run = ensureRun(progress)
      run.finalWrongCount += 1
      run.records = run.records ?? []
      run.records.push({
        itemId: action.payload.record.itemId,
        term: action.payload.record.term,
        attemptCount: 4,
        isCorrect: false,
        userMeaningZh: action.payload.record.userMeaningZh,
        snapshot: action.payload.record.snapshot,
      })
      progress.updatedAt = Date.now()
      return next
    }
    case 'settings/mode': {
      next.settings = { ...(next.settings ?? { mode: 'fixed_sequence' }), mode: action.payload.mode }
      return next
    }
    case 'settings/selectedList': {
      next.settings = { ...(next.settings ?? { mode: 'fixed_sequence' }), selectedListId: action.payload.selectedListId }
      return next
    }
    case 'items/material': {
      const arr = next.itemsByListId[action.payload.listId] ?? []
      const item = arr.find((i) => i.id === action.payload.itemId)
      if (!item) return state
      item.material = action.payload.material
      return next
    }
    case 'mistakes/record': {
      recordMistake(next, action.payload.entry)
      return next
    }
    case 'mistakes/clear': {
      next.mistakes = []
      return next
    }
    case 'corrects/record': {
      recordCorrect(next, action.payload.entry)
      return next
    }
    case 'corrects/clear': {
      next.corrects = []
      return next
    }
    case 'history/delete': {
      return deleteHistoryRun(state, action.payload.runId)
    }
    case 'prompts/set': {
      next.aiPrompts = next.aiPrompts ?? {}
      next.aiPrompts[action.payload.key] = action.payload.template
      return next
    }
    default:
      return state
  }
}

export type Store = {
  state: AppStateV1
  dispatch: (action: Action) => void
}

export const StoreContext = createContext<Store | null>(null)

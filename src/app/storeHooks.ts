import { useCallback, useContext, useMemo } from 'react'
import type { CorrectEntry, ListItem, ListItemMaterial, MistakeEntry, PracticeMode, PromptTemplate } from '../domain/models'
import {
  createTeableWord,
  createTeableWords,
  createTeableWordTable,
  deleteTeableWordTables,
  deleteTeableWords,
  fetchTeableWords,
  getTeableEnv,
  renameTeableWordTable,
  updateTeableWord,
} from '../storage/localState'
import { StoreContext } from './storeContext'

export function useAppState() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('AppStoreProvider missing')
  return store.state
}

export function useAppActions() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('AppStoreProvider missing')
  const dispatch = store.dispatch

  const createList = useCallback(
    (name: string) => {
      const env = getTeableEnv()
      if (!env || !env.wordTableTableId) {
        dispatch({ type: 'lists/create', payload: { name } })
        return
      }

      void createTeableWordTable(env, name)
        .then((rec) => {
          const ts = rec.createdTime ? Date.parse(rec.createdTime) : NaN
          dispatch({
            type: 'lists/create',
            payload: { id: rec.id, name, createdAt: Number.isFinite(ts) ? ts : Date.now() },
          })
        })
        .catch((e) => {
          console.error(e)
          const msg = e instanceof Error ? e.message : String(e)
          window.alert(`创建失败：${msg}`)
        })
    },
    [dispatch],
  )
  const renameList = useCallback(
    (listId: string, name: string) => {
      const env = getTeableEnv()
      if (!env || !env.wordTableTableId || !listId.startsWith('rec')) {
        dispatch({ type: 'lists/rename', payload: { listId, name } })
        return
      }

      void renameTeableWordTable(env, listId, name)
        .then(() => {
          dispatch({ type: 'lists/rename', payload: { listId, name } })
        })
        .catch((e) => {
          console.error(e)
          const msg = e instanceof Error ? e.message : String(e)
          window.alert(`重命名失败：${msg}`)
        })
    },
    [dispatch],
  )
  const deleteList = useCallback(
    (listId: string) => {
      const env = getTeableEnv()
      if (!env || !env.wordTableTableId || !listId.startsWith('rec')) {
        dispatch({ type: 'lists/delete', payload: { listId } })
        return
      }

      void (async () => {
        const items = await fetchTeableWords(env, listId)
        if (items.length > 0) await deleteTeableWords(env, items.map((it) => it.id))
        await deleteTeableWordTables(env, [listId])
        dispatch({ type: 'lists/delete', payload: { listId } })
      })().catch((e) => {
        console.error(e)
        const msg = e instanceof Error ? e.message : String(e)
        window.alert(`删除失败：${msg}`)
      })
    },
    [dispatch],
  )
  const upsertItem = useCallback(
    (listId: string, item: ListItem) => {
      const env = getTeableEnv()

      if (env && env.wordListsTableId && listId.startsWith('rec')) {
        if (item.id.startsWith('rec')) {
          void updateTeableWord(env, item.id, item.term)
            .then(() => {
              dispatch({ type: 'items/upsert', payload: { listId, item } })
              dispatch({ type: 'practice/ensure', payload: { listId, reshuffle: true } })
            })
            .catch((e) => {
              console.error(e)
              const msg = e instanceof Error ? e.message : String(e)
              window.alert(`保存失败：${msg}`)
            })
          return
        }

        void createTeableWord(env, listId, item.term)
          .then((rec) => {
            const ts = rec.createdTime ? Date.parse(rec.createdTime) : NaN
            dispatch({
              type: 'items/upsert',
              payload: {
                listId,
                item: { ...item, id: rec.id, createdAt: Number.isFinite(ts) ? ts : item.createdAt },
              },
            })
            dispatch({ type: 'practice/ensure', payload: { listId, reshuffle: true } })
          })
          .catch((e) => {
            console.error(e)
            const msg = e instanceof Error ? e.message : String(e)
            window.alert(`添加失败：${msg}`)
          })
        return
      }

      dispatch({ type: 'items/upsert', payload: { listId, item } })
      dispatch({ type: 'practice/ensure', payload: { listId, reshuffle: true } })
    },
    [dispatch],
  )

  const bulkCreateItems = useCallback(
    async (listId: string, terms: string[], onProgress?: (count: number, total: number) => void) => {
      const env = getTeableEnv()
      const isTeable = env && env.wordListsTableId && listId.startsWith('rec')

      if (!isTeable) {
        const items = terms.map((t) => ({ id: crypto.randomUUID(), term: t, createdAt: Date.now() }))
        dispatch({ type: 'items/bulkUpsert', payload: { listId, items } })
        dispatch({ type: 'practice/ensure', payload: { listId, reshuffle: true } })
        onProgress?.(terms.length, terms.length)
        return
      }

      // Teable logic: Batch + Serial + Throttle
      const BATCH_SIZE = 50
      let processed = 0

      for (let i = 0; i < terms.length; i += BATCH_SIZE) {
        const batchTerms = terms.slice(i, i + BATCH_SIZE)
        try {
          const created = await createTeableWords(env!, listId, batchTerms)
          const items = created.map((c) => ({
            id: c.id,
            term: c.term,
            createdAt: c.createdTime ?? Date.now(),
          }))
          dispatch({ type: 'items/bulkUpsert', payload: { listId, items } })
          processed += batchTerms.length
          onProgress?.(processed, terms.length)

          // Throttle: wait 500ms between batches
          if (i + BATCH_SIZE < terms.length) {
            await new Promise((r) => setTimeout(r, 500))
          }
        } catch (e) {
          console.error('Batch import failed', e)
          throw e // Let caller handle error (e.g. stop process)
        }
      }
      dispatch({ type: 'practice/ensure', payload: { listId, reshuffle: true } })
    },
    [dispatch],
  )

  const deleteItem = useCallback(
    (listId: string, itemId: string) => {
      const env = getTeableEnv()
      if (env && env.wordListsTableId && listId.startsWith('rec') && itemId.startsWith('rec')) {
        void deleteTeableWords(env, [itemId])
          .then(() => {
            dispatch({ type: 'items/delete', payload: { listId, itemId } })
            dispatch({ type: 'practice/ensure', payload: { listId, reshuffle: true } })
          })
          .catch((e) => {
            console.error(e)
            const msg = e instanceof Error ? e.message : String(e)
            window.alert(`删除失败：${msg}`)
          })
        return
      }
      dispatch({ type: 'items/delete', payload: { listId, itemId } })
      dispatch({ type: 'practice/ensure', payload: { listId, reshuffle: true } })
    },
    [dispatch],
  )
  const syncItemsFromTeable = useCallback(
    (listId: string) => {
      const env = getTeableEnv()
      if (!env || !env.wordListsTableId || !listId.startsWith('rec')) return
      void fetchTeableWords(env, listId)
        .then((items) => {
          dispatch({ type: 'items/replace', payload: { listId, items } })
        })
        .catch((e) => {
          console.error(e)
        })
    },
    [dispatch],
  )
  const ensurePractice = useCallback(
    (listId: string, reshuffle?: boolean, mode?: PracticeMode) =>
      dispatch({ type: 'practice/ensure', payload: { listId, reshuffle, mode } }),
    [dispatch],
  )
  const nextPractice = useCallback((listId: string) => dispatch({ type: 'practice/next', payload: { listId } }), [dispatch])
  const markPracticeCorrect = useCallback(
    (
      listId: string,
      attemptNo: 1 | 2 | 3,
      record: { itemId: string; term: string; userMeaningZh?: string; snapshot?: ListItemMaterial },
    ) => dispatch({ type: 'practice/correct', payload: { listId, attemptNo, record } }),
    [dispatch],
  )
  const markPracticeFinalWrong = useCallback(
    (
      listId: string,
      record: { itemId: string; term: string; userMeaningZh?: string; snapshot?: ListItemMaterial },
    ) => dispatch({ type: 'practice/finalWrong', payload: { listId, record } }),
    [dispatch],
  )
  const setItemMaterial = useCallback(
    (listId: string, itemId: string, material: ListItemMaterial) =>
      dispatch({ type: 'items/material', payload: { listId, itemId, material } }),
    [dispatch],
  )
  const recordMistake = useCallback(
    (entry: Omit<MistakeEntry, 'wrongCount' | 'lastWrongAt'>) => {
      dispatch({ type: 'mistakes/record', payload: { entry } })
    },
    [dispatch],
  )

  const clearMistakes = useCallback(() => {
    dispatch({ type: 'mistakes/clear' })
  }, [dispatch])

  const recordCorrect = useCallback(
    (entry: Omit<CorrectEntry, 'correctCount' | 'lastCorrectAt'>) => {
      dispatch({ type: 'corrects/record', payload: { entry } })
    },
    [dispatch],
  )

  const clearCorrects = useCallback(() => {
    dispatch({ type: 'corrects/clear' })
  }, [dispatch])

  const setUserMode = useCallback((mode: PracticeMode) => dispatch({ type: 'settings/mode', payload: { mode } }), [dispatch])
  const setSelectedListId = useCallback(
    (selectedListId?: string) => dispatch({ type: 'settings/selectedList', payload: { selectedListId } }),
    [dispatch],
  )
  const setPromptTemplate = useCallback(
    (key: string, template: PromptTemplate) => dispatch({ type: 'prompts/set', payload: { key, template } }),
    [dispatch],
  )

  const deleteHistoryRun = useCallback(
    (runId: string) => {
      dispatch({ type: 'history/delete', payload: { runId } })
    },
    [dispatch],
  )

  const deletePracticeSession = useCallback(
    (listId: string) => {
      dispatch({ type: 'practice/deleteSession', payload: { listId } })
    },
    [dispatch],
  )

  const startCorrectsReview = useCallback(
    (entries: CorrectEntry[]) => {
      const listId = 'review-corrects'
      const items: ListItem[] = entries.map((e) => ({
        id: e.itemId,
        term: e.term,
        createdAt: e.lastCorrectAt,
        material: e.snapshot?.material,
      }))

      // 1. Create temporary list if not exists (handled by reducer if we dispatch list creation, 
      // but 'lists/create' uses random UUID. We need manual insertion or just let 'items/replace' handle it?)
      // Actually 'items/replace' doesn't create list metadata.
      // We should dispatch 'lists/create' with specific ID if possible, but the action doesn't support forcing ID in payload (it does: id?: string).
      
      // Check if list exists in state
      // (Can't access state directly here easily without adding it to dependency, which is fine)
      
      dispatch({ 
        type: 'lists/create', 
        payload: { id: listId, name: '对猜本复习', createdAt: Date.now() } 
      })

      // 2. Populate items
      dispatch({ type: 'items/replace', payload: { listId, items } })

      // 3. Start practice (shuffle 10)
      dispatch({ type: 'practice/ensure', payload: { listId, reshuffle: true, mode: 'fixed_random' } })
    },
    [dispatch],
  )

  const startMistakesReview = useCallback(
    (entries: MistakeEntry[]) => {
      const listId = 'review-mistakes'
      const items: ListItem[] = entries.map((e) => ({
        id: e.itemId,
        term: e.term,
        createdAt: e.lastWrongAt,
        material: e.snapshot?.material,
      }))

      dispatch({
        type: 'lists/create',
        payload: { id: listId, name: '错题本复习', createdAt: Date.now() },
      })

      dispatch({ type: 'items/replace', payload: { listId, items } })

      dispatch({ type: 'practice/ensure', payload: { listId, reshuffle: true, mode: 'fixed_random' } })
    },
    [dispatch],
  )

  return useMemo(
    () => ({
      createList,
      renameList,
      deleteList,
      syncItemsFromTeable,
      upsertItem,
      bulkCreateItems,
      deleteItem,
      ensurePractice,
      nextPractice,
      markPracticeCorrect,
      markPracticeFinalWrong,
      setItemMaterial,
      recordMistake,
      clearMistakes,
      recordCorrect,
      clearCorrects,
      deleteHistoryRun,
      deletePracticeSession,
      startCorrectsReview,
      startMistakesReview,
      setUserMode,
      setSelectedListId,
      setPromptTemplate,
    }),
    [
      bulkCreateItems,
      clearMistakes,
      clearCorrects,
      createList,
      deleteItem,
      deleteList,
      ensurePractice,
      markPracticeCorrect,
      markPracticeFinalWrong,
      nextPractice,
      recordMistake,
      recordCorrect,
      renameList,
      setItemMaterial,
      setPromptTemplate,
      setSelectedListId,
      setUserMode,
      syncItemsFromTeable,
      upsertItem,
      startCorrectsReview,
      startMistakesReview,
    ],
  )
}

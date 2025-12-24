import { useEffect, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import { reducer, StoreContext } from './storeContext'
import { fetchTeableWordTables, getTeableEnv, loadState, saveState } from '../storage/localState'

export function AppStoreProvider(props: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    const env = getTeableEnv()
    if (!env || !env.wordTableTableId) return
    let cancelled = false

    fetchTeableWordTables(env)
      .then((remote) => {
        if (cancelled) return
        dispatch({ type: 'lists/sync', payload: { remote } })
      })
      .catch((e) => {
        console.error(e)
      })

    return () => {
      cancelled = true
    }
  }, [dispatch])

  const store = useMemo(() => ({ state, dispatch }), [state])
  return <StoreContext.Provider value={store}>{props.children}</StoreContext.Provider>
}

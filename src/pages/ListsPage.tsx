import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAppActions, useAppState } from '../app/storeHooks'
import { fetchTeableWordTables, getTeableEnv } from '../storage/localState'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { TextField } from '../ui/TextField'

export function ListsPage() {
  const state = useAppState()
  const actions = useAppActions()
  const [name, setName] = useState('')
  const teableEnv = useMemo(() => getTeableEnv(), [])
  const [teableStatus, setTeableStatus] = useState<
    | { kind: 'unconfigured' }
    | { kind: 'loading' }
    | { kind: 'ok'; count: number }
    | { kind: 'error'; message: string }
  >(() => {
    if (!teableEnv || !teableEnv.wordTableTableId) return { kind: 'unconfigured' }
    return { kind: 'loading' }
  })

  useEffect(() => {
    if (!teableEnv || !teableEnv.wordTableTableId) return

    let cancelled = false
    fetchTeableWordTables(teableEnv)
      .then((records) => {
        if (cancelled) return
        setTeableStatus({ kind: 'ok', count: records.length })
      })
      .catch((e) => {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : '请求失败'
        setTeableStatus({ kind: 'error', message: msg })
      })

    return () => {
      cancelled = true
    }
  }, [teableEnv])

  const itemsCountByListId = useMemo(() => {
    const out: Record<string, number> = {}
    for (const list of state.lists) out[list.id] = (state.itemsByListId[list.id] ?? []).length
    return out
  }, [state.itemsByListId, state.lists])

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">词表</h1>
          <div className="mt-1 text-sm text-white/60">管理目标词 / 词组</div>
        </div>
      </div>

      {teableStatus.kind === 'unconfigured' ? (
        <Card className="p-5">
          <div className="text-sm font-semibold text-white">Teable 未配置</div>
          <div className="mt-1 text-sm text-white/60">当前词表来自本地缓存（localStorage）</div>
        </Card>
      ) : teableStatus.kind === 'loading' ? (
        <Card className="p-5">
          <div className="text-sm font-semibold text-white">Teable 连接中…</div>
          <div className="mt-1 text-sm text-white/60">正在读取 WordTable</div>
        </Card>
      ) : teableStatus.kind === 'ok' ? (
        <Card className="p-5">
          <div className="text-sm font-semibold text-white">Teable 已连接</div>
          <div className="mt-1 text-sm text-white/60">WordTable 读取成功：{teableStatus.count} 条记录</div>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="text-sm font-semibold text-white">Teable 连接失败</div>
          <div className="mt-1 text-sm text-white/60">{teableStatus.message}</div>
        </Card>
      )}

      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <TextField
            label="新建词表"
            placeholder="例如：日常口语 / 经济学 / 小说摘录"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            onClick={() => {
              const n = name.trim()
              if (!n) return
              actions.createList(n)
              setName('')
            }}
            className="w-full sm:w-auto"
          >
            创建
          </Button>
        </div>
      </Card>

      <div className="grid gap-3">
        {state.lists.map((list) => (
          <Card key={list.id} className="flex items-center justify-between gap-3 p-5">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{list.name}</div>
              <div className="mt-1 text-xs text-white/55">{itemsCountByListId[list.id] ?? 0} 个条目</div>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/app/practice/${list.id}`}>
                <Button size="sm">练习</Button>
              </Link>
              <Link to={`/admin/lists/${list.id}`}>
                <Button size="sm" variant="secondary">
                  编辑
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const ok = window.confirm('删除这个词表？（包含条目与练习进度）')
                  if (!ok) return
                  actions.deleteList(list.id)
                }}
              >
                删除
              </Button>
            </div>
          </Card>
        ))}
        {state.lists.length === 0 ? (
          <Card className="p-5">
            <div className="text-sm font-semibold text-white">先创建一个词表开始</div>
            <div className="mt-1 text-sm text-white/60">添加目标词/词组后，就可以开始练习。</div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

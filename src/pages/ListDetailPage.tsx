import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppActions, useAppState } from '../app/storeHooks'
import type { ListItem } from '../domain/models'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { TextArea, TextField } from '../ui/TextField'
import { cn } from '../ui/cn'
import { fetchTeableWords, fetchTeableWordsSample, getTeableEnv } from '../storage/localState'

export function ListDetailPage() {
  const { listId } = useParams()
  const state = useAppState()
  const actions = useAppActions()
  const nav = useNavigate()

  const list = state.lists.find((l) => l.id === listId)
  const items = (listId ? state.itemsByListId[listId] : []) ?? []

  const [rename, setRename] = useState(list?.name ?? '')
  const [term, setTerm] = useState('')
  const [bulkText, setBulkText] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTerm, setEditTerm] = useState('')

  const teableEnv = useMemo(() => getTeableEnv(), [])
  const [teableStatus, setTeableStatus] = useState<
    | { kind: 'unconfigured' }
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'ok'; count: number }
    | { kind: 'error'; message: string }
  >(() => {
    if (!teableEnv || !teableEnv.wordListsTableId) return { kind: 'unconfigured' }
    if (listId && listId.startsWith('rec')) return { kind: 'loading' }
    return { kind: 'idle' }
  })
  const [showDebug, setShowDebug] = useState(false)
  const [debugSample, setDebugSample] = useState<unknown[] | null>(null)
  const [importing, setImporting] = useState<{ processed: number; total: number } | null>(null)

  const canSubmit = useMemo(() => term.trim().length > 0, [term])
  const bulkTerms = useMemo(() => {
    return bulkText
      .split(/\r?\n/g)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
  }, [bulkText])

  useEffect(() => {
    if (!listId) return
    actions.syncItemsFromTeable(listId)
  }, [actions, listId])

  useEffect(() => {
    if (!listId) return
    if (!teableEnv || !teableEnv.wordListsTableId || !listId.startsWith('rec')) return
    let cancelled = false
    fetchTeableWords(teableEnv, listId)
      .then((remoteItems) => {
        if (cancelled) return
        setTeableStatus({ kind: 'ok', count: remoteItems.length })
      })
      .catch((e) => {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : '请求失败'
        setTeableStatus({ kind: 'error', message: msg })
      })
    return () => {
      cancelled = true
    }
  }, [listId, teableEnv])

  if (!listId || !list) {
    return (
      <Card className="p-5">
        <div className="text-sm font-semibold text-white">词表不存在</div>
        <div className="mt-2">
          <Link to="/admin/lists">
            <Button variant="secondary">返回词表</Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-white">{list.name}</h1>
          <div className="mt-1 text-sm text-white/60">{items.length} 个条目</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/app/practice/${listId}`}>
            <Button size="sm">去练习</Button>
          </Link>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (!listId) return
              actions.syncItemsFromTeable(listId)
            }}
          >
            刷新
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowDebug((v) => !v)
              if (!showDebug && teableEnv && teableEnv.wordListsTableId) {
                void fetchTeableWordsSample(teableEnv)
                  .then((s) => setDebugSample(s))
                  .catch((e) => {
                    const msg = e instanceof Error ? e.message : String(e)
                    setDebugSample([{ error: msg }])
                  })
              }
            }}
          >
            {showDebug ? '隐藏数据' : '原始数据'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              const ok = window.confirm('删除这个词表？（包含条目与练习进度）')
              if (!ok) return
              actions.deleteList(listId)
              nav('/admin/lists')
            }}
          >
            删除
          </Button>
        </div>
      </div>

      {teableStatus.kind === 'unconfigured' ? (
        <Card className="p-5">
          <div className="text-sm font-semibold text-white">Teable 未配置</div>
          <div className="mt-1 text-sm text-white/60">当前条目来自本地缓存（localStorage）</div>
        </Card>
      ) : teableStatus.kind === 'loading' ? (
        <Card className="p-5">
          <div className="text-sm font-semibold text-white">正在从 Teable 读取条目…</div>
          <div className="mt-1 text-sm text-white/60">WordLists 表数据拉取中</div>
        </Card>
      ) : teableStatus.kind === 'ok' ? (
        <Card className="p-5">
          <div className="text-sm font-semibold text-white">Teable 读取成功</div>
          <div className="mt-1 text-sm text-white/60">远端该词表下共 {teableStatus.count} 条记录</div>
        </Card>
      ) : teableStatus.kind === 'error' ? (
        <Card className="p-5">
          <div className="text-sm font-semibold text白">Teable 读取失败</div>
          <div className="mt-1 text-sm text-white/60">{teableStatus.message}</div>
        </Card>
      ) : null}
      {showDebug ? (
        <Card className="p-5">
          <div className="text-sm font-semibold text-white">原始数据样本</div>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-white/70">
            {JSON.stringify(debugSample ?? { note: '点击“显示原始数据”以加载样本' }, null, 2)}
          </pre>
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <TextField label="重命名" value={rename} onChange={(e) => setRename(e.target.value)} />
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => {
              const n = rename.trim()
              if (!n) return
              actions.renameList(listId, n)
            }}
          >
            保存
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="grid gap-3">
          <TextField
            label="目标词 / 词组（原文）"
            placeholder="例如：make up / take it for granted"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => {
                if (!canSubmit) return
                const item: ListItem = {
                  id: crypto.randomUUID(),
                  term: term.trim(),
                  createdAt: Date.now(),
                }
                actions.upsertItem(listId, item)
                setTerm('')
              }}
            >
              添加条目
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="grid gap-3">
          <TextArea
            label="批量粘贴（换行=不同的单词/词组）"
            placeholder={'例如：\nmake up\ntake it for granted\n...'}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-white/55">将添加 {bulkTerms.length} 个条目（会跳过空行与已有重复）</div>
            <Button
              variant="secondary"
              onClick={() => {
                if (bulkTerms.length === 0) return
                if (importing) return

                const existing = new Set(items.map((it) => it.term))
                const toAdd: string[] = []
                for (const t of bulkTerms) {
                  if (existing.has(t)) continue
                  existing.add(t)
                  toAdd.push(t)
                }

                if (toAdd.length === 0) {
                  window.alert('没有需要添加的新词')
                  setBulkText('')
                  return
                }

                setImporting({ processed: 0, total: toAdd.length })
                actions
                  .bulkCreateItems(listId, toAdd, (processed, total) => {
                    setImporting({ processed, total })
                  })
                  .then(() => {
                    setBulkText('')
                    setImporting(null)
                    window.alert(`成功添加 ${toAdd.length} 个条目`)
                  })
                  .catch((e) => {
                    const msg = e instanceof Error ? e.message : String(e)
                    window.alert(`批量添加中断：${msg}`)
                    setImporting(null)
                  })
              }}
              disabled={bulkTerms.length === 0 || importing !== null}
            >
              {importing ? `添加中 ${importing.processed}/${importing.total}...` : '一键添加'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-3">
        {items.map((it) => {
          const isEditing = editingId === it.id
          return (
            <Card key={it.id} className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{it.term}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (isEditing) {
                        setEditingId(null)
                        return
                      }
                      setEditingId(it.id)
                      setEditTerm(it.term)
                    }}
                  >
                    {isEditing ? '收起' : '编辑'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const ok = window.confirm('删除这个条目？')
                      if (!ok) return
                      actions.deleteItem(listId, it.id)
                    }}
                  >
                    删除
                  </Button>
                </div>
              </div>

              {isEditing ? (
                <div className={cn('grid gap-3 rounded-xl border border-white/10 bg-white/5 p-3 ring-1 ring-white/10')}>
                  <TextField value={editTerm} onChange={(e) => setEditTerm(e.target.value)} />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingId(null)
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const t = editTerm.trim()
                        if (!t) return
                        actions.upsertItem(listId, { ...it, term: t })
                        setEditingId(null)
                      }}
                    >
                      保存
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          )
        })}
        {items.length === 0 ? (
          <Card className="p-5">
            <div className="text-sm font-semibold text-white">还没有条目</div>
            <div className="mt-1 text-sm text-white/60">先添加一个目标词/词组。</div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

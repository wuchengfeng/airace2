import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAppActions, useAppState } from '../app/storeHooks'
import { HighlightText } from '../lib/highlight'
import { formatTime } from '../lib/time'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { cn } from '../ui/cn'

export function CorrectsPage() {
  const state = useAppState()
  const actions = useAppActions()
  const nav = useNavigate()
  const [stageFilter, setStageFilter] = useState<number | 'all'>('all')

  const listNameById = useMemo(() => {
    const out: Record<string, string> = {}
    for (const l of state.lists) out[l.id] = l.name
    return out
  }, [state.lists])

  const filteredCorrects = useMemo(() => {
    if (!state.corrects) return []
    if (stageFilter === 'all') return state.corrects
    return state.corrects.filter((c) => c.stage === stageFilter)
  }, [state.corrects, stageFilter])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">对猜本</h1>
          <div className="mt-1 text-sm text-white/60">记录猜对的词/词组及阶段</div>
        </div>
        <div className="flex items-center gap-2">
           <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (filteredCorrects.length === 0) return
              actions.startCorrectsReview(filteredCorrects)
              nav('/app/practice/review-corrects')
            }}
            disabled={filteredCorrects.length === 0}
          >
            随机练10个
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const ok = window.confirm('清空全部记录？')
              if (!ok) return
              actions.clearCorrects()
            }}
            disabled={!state.corrects || state.corrects.length === 0}
          >
            清空
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setStageFilter('all')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            stageFilter === 'all'
              ? 'bg-white text-black'
              : 'bg-white/10 text-white hover:bg-white/20'
          )}
        >
          全部
        </button>
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s as number)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              stageFilter === s
                ? 'bg-white text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            )}
          >
            阶段 {s}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filteredCorrects.map((c) => {
          const listName = listNameById[c.listId] ?? '（已删除的词表）'
          return (
            <Card key={c.id} className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="truncate text-sm font-semibold text-white">{c.term}</div>
                    <div className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-300 ring-1 ring-green-500/20">
                      阶段 {c.stage}
                    </div>
                    <div className="text-xs text-white/50">{formatTime(c.lastCorrectAt)}</div>
                  </div>
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-relaxed text-white/80 ring-1 ring-white/10">
                    <HighlightText text={c.sentence} query={c.term} />
                  </div>
                  <div className="mt-3 text-xs text-white/55">
                    来自词表：
                    {listNameById[c.listId] ? (
                      <Link className="ml-1 text-white underline decoration-white/30 underline-offset-4" to={`/admin/lists/${c.listId}`}>
                        {listName}
                      </Link>
                    ) : (
                      <span className="ml-1">{listName}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
        {filteredCorrects.length === 0 ? (
          <Card className="space-y-2 p-5">
            <div className="text-sm font-semibold text-white">暂无记录</div>
            <div className="text-sm text-white/60">在练习里猜对后，会自动记录到这里。</div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

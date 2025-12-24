import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAppActions, useAppState } from '../app/storeHooks'
import { HighlightText } from '../lib/highlight'
import { formatTime } from '../lib/time'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { cn } from '../ui/cn'

export function MistakesPage() {
  const state = useAppState()
  const actions = useAppActions()
  const nav = useNavigate()
  const [wrongCountFilter, setWrongCountFilter] = useState<number | 'all'>('all')

  const listNameById = useMemo(() => {
    const out: Record<string, string> = {}
    for (const l of state.lists) out[l.id] = l.name
    return out
  }, [state.lists])

  const filteredMistakes = useMemo(() => {
    if (!state.mistakes) return []
    if (wrongCountFilter === 'all') return state.mistakes
    return state.mistakes.filter((m) => m.wrongCount >= wrongCountFilter)
  }, [state.mistakes, wrongCountFilter])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">错题本</h1>
          <div className="mt-1 text-sm text-white/60">记录最终仍猜错的词/词组</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (filteredMistakes.length === 0) return
              actions.startMistakesReview(filteredMistakes)
              nav('/app/practice/review-mistakes')
            }}
            disabled={filteredMistakes.length === 0}
          >
            随机练10个
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const ok = window.confirm('清空全部错题？')
              if (!ok) return
              actions.clearMistakes()
            }}
            disabled={state.mistakes.length === 0}
          >
            清空
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setWrongCountFilter('all')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            wrongCountFilter === 'all' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20',
          )}
        >
          全部
        </button>
        <button
          onClick={() => setWrongCountFilter(2)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            wrongCountFilter === 2 ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20',
          )}
        >
          错 2+ 次
        </button>
        <button
          onClick={() => setWrongCountFilter(3)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            wrongCountFilter === 3 ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20',
          )}
        >
          错 3+ 次
        </button>
      </div>

      <div className="grid gap-3">
        {filteredMistakes.map((m) => {
          const finalReveal = m.snapshot?.material?.finalReveal
          const listName = listNameById[m.listId] ?? '（已删除的词表）'
          return (
            <Card key={m.id} className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="truncate text-sm font-semibold text-white">{m.term}</div>
                    <div className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70 ring-1 ring-white/10">
                      错 {m.wrongCount} 次
                    </div>
                    <div className="text-xs text-white/50">{formatTime(m.lastWrongAt)}</div>
                  </div>
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-relaxed text-white/80 ring-1 ring-white/10">
                    <HighlightText text={m.sentence} query={m.term} />
                  </div>
                  <div className="mt-3 text-xs text-white/55">
                    来自词表：
                    {listNameById[m.listId] ? (
                      <Link className="ml-1 text-white underline decoration-white/30 underline-offset-4" to={`/admin/lists/${m.listId}`}>
                        {listName}
                      </Link>
                    ) : (
                      <span className="ml-1">{listName}</span>
                    )}
                  </div>
                </div>
              </div>

              {finalReveal ? (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-white">最终解释</div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                    <HighlightText text={finalReveal.articleZh} query={finalReveal.termMeaningZh} />
                  </div>
                  <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-3 text-sm text-amber-200 ring-1 ring-amber-300/20">
                    {finalReveal.termMeaningZh}
                  </div>
                </div>
              ) : null}
            </Card>
          )
        })}
        {state.mistakes.length === 0 ? (
          <Card className="space-y-2 p-5">
            <div className="text-sm font-semibold text-white">暂无错题</div>
            <div className="text-sm text-white/60">在练习里连续三次猜错后，会自动记录到这里。</div>
            <div>
              <Link to="/app">
                <Button variant="secondary">去练习</Button>
              </Link>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

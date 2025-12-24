import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useAppActions, useAppState } from '../app/storeHooks'
import { formatTime } from '../lib/time'
import type { PracticeMode } from '../domain/models'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

const modeLabel: Record<PracticeMode, string> = {
  fixed_sequence: '固定词表序列模式',
  ai_infinite: 'AI 无限词模式',
  fixed_random: '固定词表随机模式',
}

function formatDurationMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const restS = s % 60
  if (m <= 0) return `${restS}s`
  return `${m}m ${restS}s`
}

export function HistoryPage() {
  const state = useAppState()
  const actions = useAppActions()

  const history = useMemo(() => (state.practiceHistory ?? []).filter((h) => typeof h.endedAt === 'number'), [state.practiceHistory])

  const activeSessions = useMemo(() => {
    const out = []
    for (const [listId, progress] of Object.entries(state.practiceByListId)) {
      if (progress.mode !== 'fixed_sequence') continue
      if (progress.cursor <= 0) continue
      if (progress.cursor >= progress.order.length) continue // Completed

      const list = state.lists.find((l) => l.id === listId)
      const listName = list?.name ?? '（已删除的词表）'
      out.push({ listId, listName, progress })
    }
    // Sort by most recently updated
    return out.sort((a, b) => b.progress.updatedAt - a.progress.updatedAt)
  }, [state.practiceByListId, state.lists])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">练习历史</h1>
          <div className="mt-1 text-sm text-white/60">查看每一轮练习的统计与详情</div>
        </div>
      </div>

      <div className="grid gap-3">
        {activeSessions.map(({ listId, listName, progress }) => {
          const total = progress.order.length
          const current = progress.cursor + 1
          
          return (
            <Card key={`active-${listId}`} className="flex flex-wrap items-start justify-between gap-3 border-amber-500/30 bg-amber-500/5 p-5 ring-1 ring-amber-500/30">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-semibold text-white">{listName}</div>
                  <div className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-200 ring-1 ring-amber-500/20">
                    进行中
                  </div>
                </div>
                <div className="mt-1 text-xs text-white/55">固定词表序列模式</div>
                <div className="mt-2 text-xs text-white/45">
                  上次练习：{formatTime(progress.updatedAt)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-xl bg-white/10 px-3 py-2 text-center ring-1 ring-white/10">
                  <div className="text-xs font-semibold tracking-wide text-white/60">进度</div>
                  <div className="mt-1 text-lg font-semibold tracking-tight text-white">
                    {current}<span className="text-sm text-white/50">/{total}</span>
                  </div>
                </div>
                <Link to={`/app/practice/${listId}`}>
                  <Button size="sm" variant="primary">
                    继续
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => {
                    if (confirm('确定要删除这个练习进度吗？（不会删除词表本身）')) {
                      actions.deletePracticeSession(listId)
                    }
                  }}
                >
                  删除
                </Button>
              </div>
            </Card>
          )
        })}

        {history.map((h) => {
          const correctTotal = h.correctByAttempt[1] + h.correctByAttempt[2] + h.correctByAttempt[3]
          const acc = h.total > 0 ? Math.round((correctTotal / h.total) * 100) : 0
          const duration =
            typeof h.endedAt === 'number' && typeof h.startedAt === 'number' ? formatDurationMs(h.endedAt - h.startedAt) : undefined
          return (
            <Card key={h.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{h.listName ?? '（已删除的词表）'}</div>
                <div className="mt-1 text-xs text-white/55">{modeLabel[h.mode] ?? h.mode}</div>
                <div className="mt-2 text-xs text-white/45">
                  {formatTime(h.startedAt)}
                  {h.endedAt ? ` · ${formatTime(h.endedAt)}` : null}
                  {duration ? ` · ${duration}` : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-xl bg-white/10 px-3 py-2 text-center ring-1 ring-white/10">
                  <div className="text-xs font-semibold tracking-wide text-white/60">正确率</div>
                  <div className="mt-1 text-lg font-semibold tracking-tight text-white">{acc}%</div>
                </div>
                <Link to={`/app/history/${h.id}`}>
                  <Button size="sm" variant="secondary">
                    详情
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => {
                    if (confirm('确定要删除这条练习记录吗？')) {
                      actions.deleteHistoryRun(h.id)
                    }
                  }}
                >
                  删除
                </Button>
              </div>
            </Card>
          )
        })}

        {history.length === 0 ? (
          <Card className="space-y-2 p-5">
            <div className="text-sm font-semibold text-white">还没有历史记录</div>
            <div className="text-sm text-white/60">完成一轮练习后，会自动出现在这里。</div>
            <div>
              <Link to="/app">
                <Button variant="secondary">去开始</Button>
              </Link>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}


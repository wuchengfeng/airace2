import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppActions, useAppState } from '../app/storeHooks'
import type { PracticeMode } from '../domain/models'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { cn } from '../ui/cn'

const modeLabel: Record<PracticeMode, string> = {
  fixed_sequence: '固定词表序列模式',
  ai_infinite: 'AI 无限词模式（暂不开放）',
  fixed_random: '固定词表随机模式',
}

export function ModePage() {
  const state = useAppState()
  const actions = useAppActions()
  const nav = useNavigate()

  const settings = state.settings ?? { mode: 'fixed_sequence' as const }
  const selectedMode = settings.mode
  const selectedListId = settings.selectedListId
  const selectedAiProvider = settings.aiProvider ?? 'tal'

  const itemsCountByListId = useMemo(() => {
    const out: Record<string, number> = {}
    for (const list of state.lists) out[list.id] = (state.itemsByListId[list.id] ?? []).length
    return out
  }, [state.itemsByListId, state.lists])

  function pickMode(mode: PracticeMode) {
    if (mode === 'ai_infinite') return
    actions.setUserMode(mode)
  }

  function start() {
    if (!selectedListId) return
    actions.ensurePractice(selectedListId, true, selectedMode)
    nav(`/app/practice/${selectedListId}`)
  }

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-white/0 to-white/5" />
        <div className="relative space-y-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-white/60">用户端</div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">选择模式</h1>
            <div className="mt-2 text-sm text-white/60">选择适合你的练习模式。</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {(['fixed_sequence', 'ai_infinite', 'fixed_random'] as PracticeMode[]).map((m) => {
              const enabled = m !== 'ai_infinite'
              const active = selectedMode === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickMode(m)}
                  className={cn(
                    'text-left',
                    'rounded-2xl border bg-white/5 p-4 ring-1 transition-all',
                    active ? 'border-white/20 ring-white/20' : 'border-white/10 ring-white/10',
                    enabled ? 'hover:bg-white/10' : 'opacity-60 cursor-not-allowed',
                  )}
                  disabled={!enabled}
                >
                  <div className="text-xs font-semibold tracking-wide text-white/60">模式</div>
                  <div className="mt-2 text-sm font-semibold text-white">{modeLabel[m]}</div>
                  {m === 'fixed_sequence' ? (
                    <div className="mt-2 text-xs text-white/55">按词表当前顺序，从第 1 条练到最后 1 条</div>
                  ) : m === 'fixed_random' ? (
                    <div className="mt-2 text-xs text-white/55">每次随机抽取 10 个词进行练习</div>
                  ) : (
                    <div className="mt-2 text-xs text-white/45">暂不开放</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">选择词表</div>
            <div className="mt-1 text-sm text-white/60">用于当前模式练习</div>
          </div>
          <Link to="/admin/lists">
            <Button size="sm" variant="secondary">
              去后台管理词表
            </Button>
          </Link>
        </div>

        {state.lists.length === 0 ? (
          <Card className="p-5">
            <div className="text-sm font-semibold text-white">还没有词表</div>
            <div className="mt-1 text-sm text-white/60">先去后台创建词表并添加条目，再回来练习。</div>
            <div className="mt-3">
              <Link to="/admin/lists">
                <Button variant="secondary">去创建</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3">
            {state.lists.map((list) => {
              const active = selectedListId === list.id
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => actions.setSelectedListId(list.id)}
                  className={cn(
                    'flex items-center justify-between gap-3 text-left',
                    'rounded-2xl border bg-white/5 p-5 ring-1 transition-all',
                    active ? 'border-white/20 ring-white/20' : 'border-white/10 ring-white/10 hover:bg-white/10',
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{list.name}</div>
                    <div className="mt-1 text-xs text-white/55">{itemsCountByListId[list.id] ?? 0} 个条目</div>
                  </div>
                  <div className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1', active ? 'bg-white text-slate-900 ring-white/20' : 'bg-white/10 text-white/70 ring-white/10')}>
                    {active ? '已选择' : '选择'}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">选择模型</div>
            <div className="mt-1 text-sm text-white/60">切换不同的大模型调用方式</div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['tal', 'volces'] as const).map((p) => {
            const active = selectedAiProvider === p
            return (
              <button
                key={p}
                type="button"
                onClick={() => actions.setAiProvider(p)}
                className={cn(
                  'text-left',
                  'rounded-2xl border bg-white/5 p-4 ring-1 transition-all',
                  active ? 'border-white/20 ring-white/20' : 'border-white/10 ring-white/10 hover:bg-white/10',
                )}
              >
                <div className="text-xs font-semibold tracking-wide text-white/60">模型</div>
                <div className="mt-2 text-sm font-semibold text-white">{p === 'tal' ? 'Tal AI（内网）' : 'Volces Ark（公网）'}</div>
              </button>
            )
          })}
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">开始练习</div>
          <div className="mt-1 text-sm text-white/60">
            {selectedMode === 'fixed_random'
              ? '将随机抽取 10 个词进行练习。'
              : '将从第 1 题开始，直到最后 1 题结束。'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={start} disabled={!selectedListId}>
            开始
          </Button>
          <Link to="/app/mistakes">
            <Button variant="secondary">错猜本</Button>
          </Link>
          <Link to="/app/history">
            <Button variant="secondary">历史记录</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useAppActions, useAppState } from '../app/storeHooks'
import { formatTime } from '../lib/time'
import type { PracticeHistoryEntry, PracticeMode } from '../domain/models'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

const modeLabel: Record<PracticeMode, string> = {
  fixed_sequence: '固定词表序列模式',
  ai_infinite: 'AI 无限词模式',
  fixed_random: '固定词表随机模式',
  fixed_random_unpracticed: '随机未练过（10）',
}

function formatDurationMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const restS = s % 60
  if (m <= 0) return `${restS}s`
  return `${m}m ${restS}s`
}

export function HistoryDetailPage() {
  const { runId } = useParams()
  const state = useAppState()
  const actions = useAppActions()
  const nav = useNavigate()

  const entry = useMemo(() => {
    const arr = state.practiceHistory ?? []
    return arr.find((h) => h.id === runId) as PracticeHistoryEntry | undefined
  }, [runId, state.practiceHistory])

  if (!entry) {
    return (
      <Card className="space-y-3 p-5">
        <div className="text-sm font-semibold text-white">记录不存在</div>
        <div className="text-sm text-white/60">可能已被清理，或该轮练习尚未完成。</div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/history">
            <Button variant="secondary">返回历史</Button>
          </Link>
          <Link to="/app">
            <Button>去练习</Button>
          </Link>
        </div>
      </Card>
    )
  }

  const correct1 = entry.correctByAttempt[1]
  const correct2 = entry.correctByAttempt[2]
  const correct3 = entry.correctByAttempt[3]
  const correctTotal = correct1 + correct2 + correct3
  const finalWrong = entry.finalWrongCount
  const acc = entry.total > 0 ? Math.round((correctTotal / entry.total) * 100) : 0
  const rate1 = entry.total > 0 ? Math.round((correct1 / entry.total) * 100) : 0
  const rate2 = entry.total > 0 ? Math.round((correct2 / entry.total) * 100) : 0
  const rate3 = entry.total > 0 ? Math.round((correct3 / entry.total) * 100) : 0
  const duration =
    typeof entry.endedAt === 'number' && typeof entry.startedAt === 'number'
      ? formatDurationMs(entry.endedAt - entry.startedAt)
      : undefined

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-white/0 to-white/5" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wide text-white/60">历史详情</div>
            <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-white">{entry.listName ?? '（已删除的词表）'}</h1>
            <div className="mt-2 text-sm text-white/60">{modeLabel[entry.mode] ?? entry.mode}</div>
            <div className="mt-1 text-xs text-white/45">
              开始：{formatTime(entry.startedAt)}
              {entry.endedAt ? ` · 结束：${formatTime(entry.endedAt)}` : null}
              {duration ? ` · 用时：${duration}` : null}
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-center ring-1 ring-white/10">
            <div className="text-xs font-semibold tracking-wide text-white/60">正确率</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight text-white">{acc}%</div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <div className="rounded px-2 py-1 text-[11px] text-white/80 ring-1 ring-white/15">一猜 {rate1}%</div>
              <div className="rounded px-2 py-1 text-[11px] text-white/80 ring-1 ring-white/15">二猜 {rate2}%</div>
              <div className="rounded px-2 py-1 text-[11px] text-white/80 ring-1 ring-white/15">三猜 {rate3}%</div>
              <div className="rounded px-2 py-1 text-[11px] text-white/80 ring-1 ring-white/15">猜对 {acc}%</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <div className="text-xs font-semibold tracking-wide text-white/60">本轮题数</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-white">{entry.total}</div>
          <div className="mt-2 text-sm text-white/60">其中正确 {correctTotal} · 进入错题 {finalWrong}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-semibold tracking-wide text-white/60">正确分布</div>
          <div className="mt-3 grid gap-2">
            <div className="flex items-center justify-between text-sm text-white/75">
              <span>阶段 1 直接猜对</span>
              <span className="font-semibold text-white">{correct1}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/75">
              <span>阶段 2 结合上下文猜对</span>
              <span className="font-semibold text-white">{correct2}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/75">
              <span>阶段 3 结合短文解释猜对</span>
              <span className="font-semibold text-white">{correct3}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-white/75">
              <span>阶段 4 仍猜错（入错题本）</span>
              <span className="font-semibold text-white">{finalWrong}</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/5 p-2 text-center text-xs text-white/70 ring-1 ring-white/10">
              一猜正确率 <span className="ml-1 font-semibold text-white">{rate1}%</span>
            </div>
            <div className="rounded-xl bg-white/5 p-2 text-center text-xs text-white/70 ring-1 ring-white/10">
              二猜正确率 <span className="ml-1 font-semibold text-white">{rate2}%</span>
            </div>
            <div className="rounded-xl bg-white/5 p-2 text-center text-xs text-white/70 ring-1 ring-white/10">
              三猜正确率 <span className="ml-1 font-semibold text-white">{rate3}%</span>
            </div>
            <div className="rounded-xl bg-white/5 p-2 text-center text-xs text-white/70 ring-1 ring-white/10">
              猜对正确率 <span className="ml-1 font-semibold text-white">{acc}%</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">继续练？</div>
          <div className="mt-1 text-sm text-white/60">回到模式页，或直接对该词表再来一轮。</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/history">
            <Button variant="secondary">返回历史</Button>
          </Link>
          {entry.listId ? (
            <Button
              onClick={() => {
                actions.setSelectedListId(entry.listId)
                actions.setUserMode('fixed_sequence')
                actions.ensurePractice(entry.listId, true, 'fixed_sequence')
                nav(`/app/practice/${entry.listId}`)
              }}
            >
              再来一轮
            </Button>
          ) : null}
          {entry.listId ? (
            <Link to={`/admin/lists/${entry.listId}`}>
              <Button variant="secondary">查看词表</Button>
            </Link>
          ) : null}
        </div>
      </Card>

      {entry.records && entry.records.length > 0 ? (
        <Card className="overflow-hidden p-5">
          <div className="mb-4 text-sm font-semibold text-white">作答详情</div>
          <div className="divide-y divide-white/10">
            {entry.records.map((rec, i) => (
              <div key={i} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-white">{rec.term}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          rec.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {rec.isCorrect ? '正确' : '失败'}
                      </span>
                      {rec.attemptCount && (
                        <span className="text-xs text-white/40">
                          {rec.isCorrect ? `第 ${rec.attemptCount} 次猜对` : '4 次尝试均失败'}
                        </span>
                      )}
                    </div>
                    {rec.userMeaningZh ? (
                      <div className="mt-1 text-sm text-white/60">
                        你的回答：<span className="text-white/80">{rec.userMeaningZh}</span>
                      </div>
                    ) : null}
                    {rec.snapshot?.sentence ? (
                      <div className="mt-2 rounded bg-white/5 p-2 text-sm text-white/70">
                        <div className="mb-1 text-xs text-white/40">例句：</div>
                        {rec.snapshot.sentence}
                      </div>
                    ) : null}
                    {rec.snapshot?.context?.contextZh ? (
                      <div className="mt-2 rounded bg-white/5 p-2 text-sm text-white/70">
                        <div className="mb-1 text-xs text-white/40">上下文说明：</div>
                        <div className="line-clamp-2">{rec.snapshot.context.contextZh}</div>
                      </div>
                    ) : null}
                    {rec.snapshot?.article?.articleZh ? (
                      <div className="mt-2 rounded bg-white/5 p-2 text-sm text-white/70">
                        <div className="mb-1 text-xs text-white/40">短文（部分）：</div>
                        <div className="line-clamp-2">{rec.snapshot.article.articleZh}</div>
                      </div>
                    ) : null}
                    {Array.isArray(rec.attempts) && rec.attempts.length > 0 ? (
                      <div className="mt-3 rounded bg-white/5 p-2 text-sm text-white/80 ring-1 ring-white/10">
                        <div className="mb-2 text-xs font-semibold text-white/60">猜测记录</div>
                        <div className="space-y-1">
                          {rec.attempts.map((a, j) => (
                            <div key={j} className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70 ring-1 ring-white/10">
                                    阶段 {a.attemptNo}
                                  </span>
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${a.judge?.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {a.judge?.isCorrect ? '正确' : '未通过'}
                                  </span>
                                  {typeof a.judge?.score === 'number' ? (
                                    <span className="text-[10px] text-white/50">分数 {a.judge.score}</span>
                                  ) : null}
                                </div>
                                <div className="mt-1 text-xs text-white/70">{a.userMeaningZh}</div>
                                {a.judge?.reason ? (
                                  <div className="mt-1 text-[11px] text-white/50">评判：{a.judge.reason}</div>
                                ) : null}
                                {a.judge?.correctMeaningZh ? (
                                  <div className="mt-1 text-[11px] text-white/50">参考：{a.judge.correctMeaningZh}</div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}

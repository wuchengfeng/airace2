import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppActions, useAppState } from '../app/storeHooks'
import { formatTime } from '../lib/time'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function PracticeResultPage() {
  const { listId } = useParams()
  const state = useAppState()
  const actions = useAppActions()
  const nav = useNavigate()

  const list = state.lists.find((l) => l.id === listId)
  const progress = listId ? state.practiceByListId[listId] : undefined
  const run = progress?.run

  if (!listId || !list) {
    return (
      <Card className="space-y-3 p-5">
        <div className="text-sm font-semibold text-white">词表不存在</div>
        <div className="mt-2">
          <Link to="/admin/lists">
            <Button variant="secondary">返回词表</Button>
          </Link>
        </div>
      </Card>
    )
  }

  if (!run) {
    return (
      <Card className="space-y-3 p-5">
        <div className="text-sm font-semibold text-white">还没有结果</div>
        <div className="text-sm text-white/60">开始一轮练习后，这里会显示本轮总结。</div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/app/practice/${listId}`}>
            <Button>去练习</Button>
          </Link>
          <Link to={`/admin/lists/${listId}`}>
            <Button variant="secondary">编辑词表</Button>
          </Link>
        </div>
      </Card>
    )
  }

  const total = run.total
  const correct1 = run.correctByAttempt[1]
  const correct2 = run.correctByAttempt[2]
  const correct3 = run.correctByAttempt[3]
  const correctTotal = correct1 + correct2 + correct3
  const finalWrong = run.finalWrongCount
  const accuracy = total > 0 ? Math.round((correctTotal / total) * 100) : 0

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-white/0 to-white/5" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wide text-white/60">练习结果</div>
            <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-white">本轮完成</h1>
            <div className="mt-2 text-sm text-white/60">{list.name}</div>
            <div className="mt-1 text-xs text-white/45">
              开始：{formatTime(run.startedAt)}
              {run.endedAt ? ` · 结束：${formatTime(run.endedAt)}` : null}
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-center ring-1 ring-white/10">
            <div className="text-xs font-semibold tracking-wide text-white/60">正确率</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight text-white">{accuracy}%</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <div className="text-xs font-semibold tracking-wide text-white/60">本轮题数</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-white">{total}</div>
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
        </Card>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">继续？</div>
          <div className="mt-1 text-sm text-white/60">回到列表继续练习，或查看错题本。</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              actions.ensurePractice(listId, true)
              nav(`/app/practice/${listId}`)
            }}
          >
            再来一轮
          </Button>
          <Link to="/app">
            <Button variant="secondary">返回首页</Button>
          </Link>
        </div>
      </Card>

      {run.records && run.records.length > 0 ? (
        <Card className="overflow-hidden p-5">
          <div className="mb-4 text-sm font-semibold text-white">作答详情</div>
          <div className="divide-y divide-white/10">
            {run.records.map((rec, i) => (
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
                    {rec.snapshot?.article?.articleZh ? (
                      <div className="mt-2 rounded bg-white/5 p-2 text-sm text-white/70">
                        <div className="mb-1 text-xs text-white/40">短文（部分）：</div>
                        <div className="line-clamp-2">{rec.snapshot.article.articleZh}</div>
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

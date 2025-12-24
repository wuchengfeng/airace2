import { Link } from 'react-router-dom'
import { useAppState } from '../app/storeHooks'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function HomePage() {
  const state = useAppState()
  const listCount = state.lists.length
  const mistakeCount = state.mistakes.length
  const primaryList = state.lists[0]

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-white/0 to-white/5" />
        <div className="relative">
          <div className="text-xs font-semibold tracking-wide text-white/60">全新方式：背单词 / 词组</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">纯应试方式高效学习「AI猜词法」</h1>
          <div className="mt-2 max-w-prose text-sm leading-relaxed text-white/70">
          先用一句话猜词义，错了就补上下文，再错给短文，还错，那就说明真猜不出来，那就进入错题本。
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/admin/lists">
              <Button variant="secondary">去创建/管理词表</Button>
            </Link>
            {primaryList ? (
              <Link to={`/app/practice/${primaryList.id}`}>
                <Button>开始猜词</Button>
              </Link>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <div className="text-xs font-semibold tracking-wide text-white/60">词表</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-white">{listCount}</div>
          <div className="mt-3">
            <Link to="/admin/lists">
              <Button variant="secondary" className="w-full">
                管理词表
              </Button>
            </Link>
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold tracking-wide text-white/60">错题本</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-white">{mistakeCount}</div>
          <div className="mt-3">
            <Link to="/app/mistakes">
              <Button variant="secondary" className="w-full">
                查看错题
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {primaryList ? (
        <Card className="flex items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">继续练习</div>
            <div className="mt-1 truncate text-sm text-white/65">{primaryList.name}</div>
          </div>
          <Link to={`/app/practice/${primaryList.id}`}>
            <Button>开始</Button>
          </Link>
        </Card>
      ) : (
        <Card className="flex items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">还没有词表</div>
            <div className="mt-1 text-sm text-white/65">先创建一个词表，并添加句子与目标词/词组</div>
          </div>
          <Link to="/admin/lists">
            <Button>去创建</Button>
          </Link>
        </Card>
      )}
    </div>
  )
}

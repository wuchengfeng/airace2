import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function NotFoundPage() {
  return (
    <Card className="space-y-3 p-5">
      <div className="text-sm font-semibold text-white">页面不存在</div>
      <div className="text-sm text-white/60">返回首页继续。</div>
      <div>
        <Link to="/">
          <Button variant="secondary">回到首页</Button>
        </Link>
      </div>
    </Card>
  )
}

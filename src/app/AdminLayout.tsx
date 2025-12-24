import { Link } from 'react-router-dom'
import { BaseLayout } from './BaseLayout'
import { Button } from '../ui/Button'

export function AdminLayout() {
  return (
    <BaseLayout
      homeTo="/admin/lists"
      title="Ai Hackathon Admin"
      nav={[
        { to: '/admin/lists', label: '词表管理' },
        { to: '/admin/prompts', label: '提示词' },
      ]}
      right={
        <Link to="/app">
          <Button size="sm" variant="secondary">
            用户端
          </Button>
        </Link>
      }
    />
  )
}

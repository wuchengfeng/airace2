import { Link } from 'react-router-dom'
import { BaseLayout } from './BaseLayout'
import { Button } from '../ui/Button'

export function UserLayout() {
  return (
    <BaseLayout
      homeTo="/app"
      title="猜记单词-Ai Hackathon"
      nav={[
        { to: '/app', label: '模式' },
        { to: '/app/mistakes', label: '错猜本' },
        { to: '/app/corrects', label: '对猜本' },
        { to: '/app/history', label: '历史' },
      ]}
      right={
        <Link to="/admin/lists">
          <Button size="sm" variant="secondary">
            后台
          </Button>
        </Link>
      }
    />
  )
}


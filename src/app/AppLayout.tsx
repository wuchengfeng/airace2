import { Link, NavLink, Outlet } from 'react-router-dom'
import { cn } from '../ui/cn'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-xl px-3 py-2 text-sm font-medium transition-all',
    isActive
      ? 'bg-white text-slate-900 shadow-soft'
      : 'text-white/70 hover:bg-white/10 hover:text-white ring-1 ring-transparent hover:ring-white/10',
  )

export function AppLayout() {
  return (
    <div className="min-h-full">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-[420px] w-[420px] rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-[-25%] left-[-10%] h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-900 shadow-soft">
              A
            </span>
            <span className="text-base font-semibold tracking-tight text-white">Airace</span>
          </Link>
          <nav className="flex items-center gap-2">
            <NavLink to="/lists" className={linkClass}>
              词表
            </NavLink>
            <NavLink to="/mistakes" className={linkClass}>
              错题本
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

export function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
  },
) {
  const { className, variant = 'primary', size = 'md', ...rest } = props

  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-[1px]'
  const sizes = size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-sm'
  const variants =
    variant === 'primary'
      ? 'bg-white text-slate-900 hover:bg-white/90 shadow-soft'
      : variant === 'secondary'
        ? 'bg-white/10 text-white hover:bg-white/15 ring-1 ring-white/15'
        : variant === 'danger'
          ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-soft'
          : 'bg-transparent text-white/80 hover:bg-white/10'

  return <button className={cn(base, sizes, variants, className)} {...rest} />
}

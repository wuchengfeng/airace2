import type { HTMLAttributes } from 'react'
import { cn } from './cn'

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 p-4 shadow-soft backdrop-blur',
        'ring-1 ring-white/10',
        className,
      )}
      {...rest}
    />
  )
}

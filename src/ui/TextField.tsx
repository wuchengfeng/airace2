import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from './cn'

export function TextField(
  props: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string },
) {
  const { className, label, hint, error, ...rest } = props
  return (
    <label className={cn('block', className)}>
      {label ? <div className="mb-1 text-sm font-medium text-white/85">{label}</div> : null}
      <input
        className={cn(
          'h-11 w-full rounded-xl border bg-white/5 px-3 text-sm text-white outline-none transition-all placeholder:text-white/35',
          'ring-1 ring-white/10 focus:ring-2 focus:ring-sky-400/40',
          error ? 'border-rose-400/50 focus:border-rose-400' : 'border-white/10 focus:border-white/20',
        )}
        {...rest}
      />
      {error ? (
        <div className="mt-1 text-xs font-medium text-rose-300">{error}</div>
      ) : hint ? (
        <div className="mt-1 text-xs text-white/50">{hint}</div>
      ) : null}
    </label>
  )
}

export function TextArea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; error?: string },
) {
  const { className, label, hint, error, ...rest } = props
  return (
    <label className={cn('block', className)}>
      {label ? <div className="mb-1 text-sm font-medium text-white/85">{label}</div> : null}
      <textarea
        className={cn(
          'min-h-24 w-full resize-y rounded-xl border bg-white/5 px-3 py-2 text-sm text-white outline-none transition-all placeholder:text-white/35',
          'ring-1 ring-white/10 focus:ring-2 focus:ring-sky-400/40',
          error ? 'border-rose-400/50 focus:border-rose-400' : 'border-white/10 focus:border-white/20',
        )}
        {...rest}
      />
      {error ? (
        <div className="mt-1 text-xs font-medium text-rose-300">{error}</div>
      ) : hint ? (
        <div className="mt-1 text-xs text-white/50">{hint}</div>
      ) : null}
    </label>
  )
}

import { cn } from '../ui/cn'

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function HighlightText(props: { text: string; query: string; className?: string }) {
  const { text, query, className } = props
  const q = query.trim()
  if (!q) return <span className={className}>{text}</span>

  const re = new RegExp(`(${escapeRegExp(q)})`, 'gi')
  const parts = text.split(re)

  if (parts.length === 1) return <span className={className}>{text}</span>

  return (
    <span className={cn('leading-relaxed', className)}>
      {parts.map((part, idx) => {
        if (part.toLowerCase() === q.toLowerCase()) {
          return (
            <span
              key={idx}
              className="rounded-md bg-amber-400/20 px-1 font-semibold text-amber-200 ring-1 ring-amber-300/20"
            >
              {part}
            </span>
          )
        }
        return <span key={idx}>{part}</span>
      })}
    </span>
  )
}

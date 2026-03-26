interface WarmthBadgeProps {
  readonly value: number
}

export function WarmthBadge({ value }: WarmthBadgeProps) {
  let tone = 'bg-slate-50 text-slate-600 border-slate-200'
  if (value > 0.2) {
    tone = 'bg-amber-50 text-amber-700 border-amber-200'
  } else if (value < -0.2) {
    tone = 'bg-sky-50 text-sky-700 border-sky-200'
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${tone}`}>
      Warm · {Math.round(value * 100)}%
    </span>
  )
}

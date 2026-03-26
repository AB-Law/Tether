import type { EntryType } from '../types'

const iconByType: Record<EntryType, string> = {
  idea: '💡',
  observation: '👁️',
  quote: '❝',
  place: '📍',
  want: '❤️',
  task: '✅',
  random_thought: '🧠',
}

interface EntryTypeIconProps {
  readonly entryType: EntryType
  readonly className?: string
}

export function EntryTypeIcon(props: Readonly<EntryTypeIconProps>) {
  const { entryType, className = '' } = props
  return (
    <span aria-hidden="true" className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm ${className}`}>
      {iconByType[entryType]}
    </span>
  )
}

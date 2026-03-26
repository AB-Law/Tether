import { Link } from 'react-router-dom'

import type { Person } from '../types'
import { WarmthBadge } from './WarmthBadge'

interface PersonCardProps {
  readonly person: Person
}

export function PersonCard({ person }: PersonCardProps) {
  return (
    <Link className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow" to={`/people/${person.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-semibold text-slate-700">
            {person.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{person.name}</h3>
            <p className="mt-0.5 text-xs text-slate-500">Known connection</p>
          </div>
        </div>
        <WarmthBadge value={person.warmth_score} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{person.relationship_type.replace('_', ' ')}</p>
        <p className="text-xs text-slate-500">Next: {person.next_nudge_at ? new Date(person.next_nudge_at).toLocaleDateString() : 'Not scheduled'}</p>
      </div>
      <p className="mt-2 text-xs text-slate-500">Last talked: {person.last_talked_at ? new Date(person.last_talked_at).toLocaleDateString() : 'Never'}</p>
    </Link>
  )
}

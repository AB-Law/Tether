import { Link } from 'react-router-dom'

import { useDriftingAway } from '../hooks/usePeople'

export function DriftingAwayView() {
  const { data, isLoading } = useDriftingAway()

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading drifting-away list...</p>
  }

  if (!data?.length) {
    return <p className="text-sm text-slate-500">Nobody is drifting away right now.</p>
  }

  return (
    <div className="space-y-3">
      {data.map((person) => (
        <div key={person.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{person.name}</p>
              <p className="text-sm text-slate-600">Last talked: {person.last_talked_at ?? 'Never'}</p>
            </div>
            <Link className="text-sm font-medium text-blue-700 hover:underline" to={`/people/${person.id}`}>
              Open
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'

import { DriftingAwayView } from '../components/DriftingAwayView'
import { PersonCard } from '../components/PersonCard'
import { usePeopleList } from '../hooks/usePeople'

export function PeopleListPage() {
  const [search, setSearch] = useState('')
  const [relationshipType, setRelationshipType] = useState('')
  const [showDrifting, setShowDrifting] = useState(false)
  const showList = !showDrifting
  const { data, isLoading } = usePeopleList({
    search: search || undefined,
    relationship_type: relationshipType || undefined,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Your People</h2>
          <p className="mt-1 text-sm text-slate-500">Track warmth, nudges, and recent interactions.</p>
        </div>
        <Link className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700" to="/people/new">
          New person
        </Link>
      </div>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1.5fr_1fr_auto]">
        <input
          className="min-w-0 rounded-lg border border-slate-300 px-3 py-2"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name..."
          value={search}
        />
        <select
          className="rounded-lg border border-slate-300 px-3 py-2"
          onChange={(event) => setRelationshipType(event.target.value)}
          value={relationshipType}
        >
          <option value="">All</option>
          <option value="close_friend">Close friend</option>
          <option value="friend">Friend</option>
          <option value="acquaintance">Acquaintance</option>
          <option value="new_person">New person</option>
          <option value="complicated">Complicated</option>
          <option value="faded">Faded</option>
        </select>
        <button className="rounded-lg border border-slate-300 px-3 py-2 md:min-w-40" onClick={() => setShowDrifting((v) => !v)} type="button">
          {showDrifting ? 'Show list' : 'Show drifting away'}
        </button>
      </div>
      {showDrifting ? <DriftingAwayView /> : null}
      {showList && isLoading ? <p className="text-sm text-slate-500">Loading...</p> : null}
      {showList ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.data.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

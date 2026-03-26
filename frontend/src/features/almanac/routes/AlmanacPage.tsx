import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useQuickCaptureStore } from '../../../app/store/quickCapture'
import { EntryTypeIcon } from '../components/EntryTypeIcon'
import { TaskList } from '../components/TaskList'
import { useAlmanacList, useCompleteEntry } from '../hooks/useAlmanac'
import type { EntryType } from '../types'

const tabs: Array<{ id: 'all' | EntryType; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'idea', label: 'Idea' },
  { id: 'observation', label: 'Observation' },
  { id: 'quote', label: 'Quote' },
  { id: 'place', label: 'Place' },
  { id: 'want', label: 'Want' },
  { id: 'task', label: 'Task' },
  { id: 'random_thought', label: 'Random Thought' },
]

export function AlmanacPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'all' | EntryType>(
    (searchParams.get('entry_type') as 'all' | EntryType) || 'all',
  )
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [tag, setTag] = useState(searchParams.get('tag') || '')
  const { open } = useQuickCaptureStore()
  const { mutate: completeTask } = useCompleteEntry()
  const listQuery = useAlmanacList({
    entry_type: activeTab === 'all' ? undefined : activeTab,
    search: search || undefined,
    tag: tag || undefined,
  })
  const filteredEntries = listQuery.data?.data ?? []
  const setFilterParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    const hasValue = Boolean(value?.length)
    if (hasValue) next.set(key, value ?? '')
    else next.delete(key)
    setSearchParams(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Almanac</h2>
          <p className="mt-1 text-sm text-slate-500">Collect ideas, observations, wants, and tasks in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => navigate('/almanac/new')}
            type="button"
          >
            New entry
          </button>
          <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={open} type="button">
            Quick capture
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        {tabs.map((tab) => (
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
              setFilterParam('entry_type', tab.id === 'all' ? null : tab.id)
            }}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1.5fr_1fr]">
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          onChange={(event) => {
            setSearch(event.target.value)
            setFilterParam('search', event.target.value || null)
          }}
          placeholder="Search title, body, tags..."
          value={search}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          onChange={(event) => {
            setTag(event.target.value)
            setFilterParam('tag', event.target.value || null)
          }}
          placeholder="Filter by tag..."
          value={tag}
        />
      </div>

      {activeTab === 'task' ? (
        <TaskList entries={filteredEntries} onComplete={completeTask} />
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <Link className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md" key={entry.id} to={`/almanac/${entry.id}`}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <EntryTypeIcon entryType={entry.entry_type} />
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{entry.entry_type.replace('_', ' ')}</p>
                    <h3 className="text-lg font-semibold text-slate-900">{entry.title}</h3>
                  </div>
                </div>
                {entry.entry_type === 'task' && entry.due_date ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">Due {entry.due_date}</span>
                ) : null}
              </div>
              <p className="line-clamp-2 text-sm text-slate-600">{entry.body ?? ''}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {entry.tags.map((entryTag) => (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600" key={entryTag.id}>
                    #{entryTag.name}
                  </span>
                ))}
              </div>
            </Link>
          ))}
          {listQuery.isLoading ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Loading entries...</p> : null}
          {filteredEntries.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No entries match this filter.</p> : null}
        </div>
      )}
    </div>
  )
}

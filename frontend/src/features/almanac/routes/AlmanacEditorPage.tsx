import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useCreateEntry } from '../hooks/useAlmanac'
import type { EntryType } from '../types'

const entryTypeOptions: Array<{ value: EntryType; label: string }> = [
  { value: 'idea', label: 'Idea' },
  { value: 'observation', label: 'Observation' },
  { value: 'quote', label: 'Quote' },
  { value: 'place', label: 'Place' },
  { value: 'want', label: 'Want' },
  { value: 'task', label: 'Task' },
  { value: 'random_thought', label: 'Random Thought' },
]

export function AlmanacEditorPage() {
  const navigate = useNavigate()
  const { mutateAsync: createEntry, isPending } = useCreateEntry()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    title: '',
    body: '',
    entry_type: 'random_thought' as EntryType,
    tags: '',
    due_date: '',
    reminder_at: '',
  })

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <Link className="text-sm font-medium text-blue-600" to="/almanac">
          ← Back to Almanac
        </Link>
      </div>

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            New entry
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Create Almanac Entry</h2>
          <p className="mt-1 text-sm text-slate-500">Add a full entry with tags and optional task fields.</p>
        </header>

        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!draft.title.trim()) return
            setErrorMessage(null)
            void createEntry({
              title: draft.title.trim(),
              body: draft.body.trim() || undefined,
              entry_type: draft.entry_type,
              tag_names: draft.tags
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
              due_date: draft.entry_type === 'task' && draft.due_date ? draft.due_date : undefined,
              reminder_at:
                draft.entry_type === 'task' && draft.reminder_at
                  ? new Date(draft.reminder_at).toISOString()
                  : undefined,
            }).catch(() => {
              setErrorMessage('Could not create entry. Please try again.')
            })
          }}
        >
          <label className="block space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              required
              value={draft.title}
            />
          </label>

          <label className="block space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Body</span>
            <textarea
              className="min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2"
              onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
              value={draft.body}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Type</span>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, entry_type: event.target.value as EntryType }))
              }
              value={draft.entry_type}
            >
              {entryTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Tags (comma separated)</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))}
              value={draft.tags}
            />
          </label>

          {draft.entry_type === 'task' ? (
            <>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Due Date</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  onChange={(event) => setDraft((prev) => ({ ...prev, due_date: event.target.value }))}
                  type="date"
                  value={draft.due_date}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Reminder</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, reminder_at: event.target.value }))
                  }
                  type="datetime-local"
                  value={draft.reminder_at}
                />
              </label>
            </>
          ) : null}

          {errorMessage ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 md:col-span-2">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 md:col-span-2">
            <button
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              onClick={() => navigate('/almanac')}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              disabled={isPending}
              type="submit"
            >
              {isPending ? 'Creating...' : 'Create Entry'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

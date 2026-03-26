import { Link, useParams } from 'react-router-dom'

import { AiReflectionPanel } from '../components/AiReflectionPanel'
import { useDeleteEntry, useJournalEntry } from '../hooks/useJournal'

export function JournalEntryPage() {
  const { entryId = '' } = useParams()
  const { data, isLoading } = useJournalEntry(entryId)
  const deleteMutation = useDeleteEntry()

  if (isLoading) return <p className="text-sm text-slate-500">Loading entry...</p>
  if (!data) return <p className="text-sm text-slate-500">Entry not found.</p>

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">{data.entry_date}</p>
            <h2 className="text-4xl font-extrabold leading-none tracking-tight text-slate-900">Journal Entry</h2>
            <p className="text-sm text-slate-500">A closer look at this day and the people tied to it.</p>
          </div>
          <div className="flex gap-2">
            <Link className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50" to={`/journal/${entryId}/edit`}>
              Edit
            </Link>
            <button className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100" onClick={() => deleteMutation.mutate(entryId)} type="button">
              Delete
            </button>
          </div>
        </div>
        <article className="whitespace-pre-wrap text-[15px] leading-8 text-slate-700">{data.body}</article>
        <div className="space-y-3 border-t border-slate-100 pt-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Tags</p>
          {data.tags.map((tag) => (
            <span
              className="mr-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
              key={tag.id}
            >
              #{tag.name}
            </span>
          ))}
          {data.tags.length === 0 ? <p className="text-sm text-slate-500">No tags</p> : null}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Linked People</p>
          {data.people.map((person) => (
            <Link className="mr-2 inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700" key={person.id} to={`/people/${person.id}`}>
              @{person.name}
            </Link>
          ))}
          {data.people.length === 0 ? <p className="text-sm text-slate-500">No linked people</p> : null}
        </div>
      </section>
      <AiReflectionPanel entryId={entryId} latestReflection={data.latest_ai_reflection} />
    </div>
  )
}

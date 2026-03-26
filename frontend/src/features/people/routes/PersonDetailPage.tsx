import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { MomentForm } from '../../moments/components/MomentForm'
import { useCreateMoment, useMoments } from '../../moments/hooks/useMoments'
import { useDeletePerson, usePerson, usePersonTimeline } from '../hooks/usePeople'

const sentimentTone: Record<string, string> = {
  warm: 'bg-emerald-50 text-emerald-700',
  neutral: 'bg-slate-100 text-slate-600',
  hurtful: 'bg-rose-50 text-rose-700',
  complicated: 'bg-amber-50 text-amber-700',
}

const formatDate = (value: string | null) => {
  if (!value) return 'Never'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function PersonDetailPage() {
  const { personId = '' } = useParams()
  const { data, isLoading } = usePerson(personId)
  const { data: timeline } = usePersonTimeline(personId)
  const { data: moments } = useMoments(personId)
  const createMoment = useCreateMoment(personId)
  const deletePerson = useDeletePerson()
  const [showComposer, setShowComposer] = useState(false)

  const recentMoments = useMemo(() => (moments ?? []).slice(0, 3), [moments])

  if (isLoading) return <p className="text-sm text-slate-500">Loading person...</p>
  if (!data) return <p className="text-sm text-slate-500">Person not found.</p>

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-lg font-semibold text-slate-700">
              {data.name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-900">{data.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">{data.relationship_type.replace('_', ' ')}</span>
                <span className="text-amber-700">Warm - {Math.round(data.warmth_score * 100)}%</span>
                <span className="text-slate-500">Known connection</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" to={`/people/${personId}/edit`}>
              Edit
            </Link>
            <button
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              onClick={() => deletePerson.mutate(personId)}
              type="button"
            >
              Archive
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <article className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Last talked</p>
            <p className="mt-1 text-lg font-medium text-slate-900">{formatDate(data.last_talked_at)}</p>
          </article>
          <article className="rounded-xl bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Next nudge</p>
            <p className="mt-1 text-lg font-medium text-slate-900">{formatDate(data.next_nudge_at)}</p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Recent Moments</h3>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700" onClick={() => setShowComposer((v) => !v)} type="button">
              {showComposer ? 'Hide' : 'Add New'}
            </button>
          </div>
          {showComposer ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <MomentForm onSubmit={(payload) => createMoment.mutateAsync(payload).then(() => setShowComposer(false))} />
            </div>
          ) : null}
          {recentMoments.length === 0 ? (
            <article className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">No moments yet. Add your first interaction.</article>
          ) : null}
          {recentMoments.map((moment) => (
            <article className="rounded-xl border border-slate-200 bg-white p-4" key={moment.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{formatDate(moment.occurred_on)}</p>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${sentimentTone[moment.sentiment] ?? sentimentTone.neutral}`}>
                  {moment.sentiment}
                </span>
              </div>
              <p className="mt-3 text-base text-slate-800">{moment.what_happened}</p>
              <div className="mt-3 flex gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{moment.moment_type.replace('_', ' ')}</span>
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Common Contexts</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">Architecture</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">Hiking</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">Coffee</span>
            </div>
          </section>
          <section className="rounded-xl bg-blue-600 p-4 text-white shadow-sm">
            <h4 className="text-sm font-semibold uppercase tracking-wide">Connection Tip</h4>
            <p className="mt-2 text-sm text-blue-100">Mention a recent shared topic and ask a thoughtful follow-up question.</p>
            <button className="mt-3 w-full rounded-lg bg-white/20 px-3 py-2 text-sm font-medium text-white" type="button">
              Set Nudge
            </button>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Meetup Location</h4>
            <p className="mt-1 text-xs text-slate-500">{data.location ?? 'Usually meet in San Francisco'}</p>
            <div className="mt-3 h-24 rounded-lg bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200" />
          </section>
        </aside>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white px-6 py-6">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Journal Timeline</h3>
        {!timeline || timeline.length === 0 ? (
          <p className="text-sm text-slate-500">No journal entries mention this person yet.</p>
        ) : (
          timeline.map((entry) => (
            <article className="rounded-lg border border-slate-200 p-3" key={entry.id}>
              <p className="text-xs uppercase tracking-wide text-slate-500">{entry.entry_date}</p>
              <p className="mt-1 text-sm text-slate-700">{entry.body.slice(0, 200)}</p>
            </article>
          ))
        )}
      </section>
    </div>
  )
}

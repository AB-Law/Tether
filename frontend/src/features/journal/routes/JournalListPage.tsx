import { Link } from 'react-router-dom'
import { DailyPromptBanner } from '../components/DailyPromptBanner'
import { WeeklyDigestCard } from '../components/WeeklyDigestCard'
import { useJournalList, useLatestDigest } from '../hooks/useJournal'

export function JournalListPage() {
  const { data, isLoading } = useJournalList({})
  const { data: digestData, isLoading: isDigestLoading } = useLatestDigest()
  const streakBars = [
    { id: 'bar-1', filled: true },
    { id: 'bar-2', filled: true },
    { id: 'bar-3', filled: true },
    { id: 'bar-4', filled: false },
    { id: 'bar-5', filled: false },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <span className="sr-only">Journal</span>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Monday, October 23</p>
        <h2 className="text-4xl font-extrabold leading-none tracking-tight text-slate-900">Your Journal</h2>
        <p className="text-xl font-medium text-slate-500">Good morning, Alex. Reflecting on your week so far.</p>
      </header>
      <WeeklyDigestCard
        digestText={digestData?.text}
        generatedAt={digestData?.created_at ? new Date(digestData.created_at).toLocaleDateString() : undefined}
        isEmpty={!isDigestLoading && !digestData}
        isLoading={isDigestLoading}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[2.2fr_1fr]">
        <DailyPromptBanner />
        <div className="rounded-xl bg-blue-600 p-5 text-white shadow-md shadow-blue-600/30">
          <p className="text-sm font-medium tracking-tight text-blue-100">Weekly Streak</p>
          <p className="mt-2 text-5xl font-extrabold leading-none tracking-tight">12</p>
          <p className="mt-1 text-lg text-blue-100">Days</p>
          <div className="mt-6 flex items-center gap-2">
            {streakBars.map((bar) => (
              <span
                className={bar.filled ? 'h-1 w-8 rounded-full bg-white' : 'h-1 w-8 rounded-full bg-blue-400'}
                key={bar.id}
              />
            ))}
          </div>
          <p className="mt-5 max-w-[18ch] text-sm leading-5 text-blue-100">You're in the top 5% of consistent reflectors this month!</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <span className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600">Last 30 Days</span>
        <span className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600">Mood</span>
        <span className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600">All Tags</span>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200 p-1">
          <button
            aria-label="List view"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600"
            type="button"
          >
            ≣
          </button>
          <button aria-label="Grid view" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400" type="button">
            ⊞
          </button>
        </div>
      </div>
      {isLoading ? <p className="text-sm text-slate-500">Loading entries...</p> : null}
      <div className="space-y-4">
        {data?.data.map((entry) => (
          <Link
            className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            key={entry.id}
            to={`/journal/${entry.id}`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{entry.entry_date}</p>
                <p className="mt-1 text-base font-bold text-slate-900">Journal Note</p>
              </div>
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Mood: {entry.mood ?? '-'}
              </span>
            </div>
            <p className="line-clamp-2 text-sm leading-6 text-slate-600">{entry.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                  key={tag.id}
                >
                  #{tag.name}
                </span>
              ))}
              {(entry.people ?? []).map((person) => (
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-700" key={person.id}>
                  @{person.name}
                </span>
              ))}
            </div>
          </Link>
        ))}
        {!data?.data.length && !isLoading ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No entries yet.</p>
        ) : null}
      </div>
      <div className="flex justify-center">
        <button className="text-sm font-semibold text-blue-600" type="button">
          Load older entries
        </button>
      </div>
      <Link
        aria-label="New Entry"
        className="fixed bottom-8 right-8 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-2xl leading-none text-white shadow-lg shadow-blue-500/40 transition hover:bg-blue-700"
        to="/journal/new"
      >
        +
      </Link>
    </div>
  )
}

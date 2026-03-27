import { Link } from 'react-router-dom'

interface NudgeCardProps {
  readonly personId: string
  readonly personName: string
  readonly scheduledLabel: string
  readonly nudgeText?: string
  readonly lastTalkedLabel?: string
  readonly acknowledged?: boolean
  readonly onSnooze?: () => void
  readonly onDone?: () => void
}

export function NudgeCard({
  personId,
  personName,
  scheduledLabel,
  nudgeText,
  lastTalkedLabel,
  acknowledged = false,
  onSnooze,
  onDone,
}: NudgeCardProps) {
  const resolvedText = nudgeText?.trim() || `Time to reach out to ${personName}.`

  return (
    <article
      className={`rounded-xl border bg-white p-5 shadow-sm transition ${
        acknowledged ? 'border-emerald-100 bg-emerald-50/40' : 'border-slate-200 hover:shadow-md'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{scheduledLabel}</p>
          <Link className="mt-1 inline-flex text-lg font-bold text-slate-900 hover:text-blue-700" to={`/people/${personId}`}>
            {personName}
          </Link>
        </div>
        {acknowledged ? (
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Done
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{resolvedText}</p>
      {lastTalkedLabel ? <p className="mt-2 text-xs font-medium text-slate-500">{lastTalkedLabel}</p> : null}
      <div className="mt-4 flex items-center gap-2">
        <button
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={onSnooze}
          type="button"
        >
          Snooze
        </button>
        <button
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700"
          onClick={onDone}
          type="button"
        >
          Done
        </button>
      </div>
    </article>
  )
}

import { useMemo, useState } from 'react'

interface WeeklyDigestCardProps {
  readonly isLoading?: boolean
  readonly generatedAt?: string
  readonly digestText?: string
  readonly isEmpty?: boolean
}

const FALLBACK_DIGEST_TEXT =
  "This week, you spent a lot of time reflecting on consistency and connection. A recurring theme in your journal is balancing ambition with rest, especially around your workdays. You also mentioned two meaningful check-ins with people who matter to you, and those moments seemed to improve your overall mood trend toward the end of the week.\n\nOne gentle pattern to notice: when you took even a short pause in the evening, your entries became clearer and less self-critical. That might be a useful anchor for next week. What would it look like to protect that small pause more intentionally? And which relationship would you like to invest in first?"

export function WeeklyDigestCard({
  isLoading = false,
  generatedAt = 'Oct 23, 2024',
  digestText = FALLBACK_DIGEST_TEXT,
  isEmpty = false,
}: WeeklyDigestCardProps) {
  const [expanded, setExpanded] = useState(false)
  const paragraphs = useMemo(
    () =>
      digestText
        .split('\n\n')
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    [digestText],
  )
  const visibleParagraphs = expanded ? paragraphs : paragraphs.slice(0, 1)
  const canExpand = paragraphs.length > 1

  if (isLoading) {
    return (
      <section className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-6 py-5 shadow-sm">
        <p className="text-sm text-slate-500">Loading weekly digest...</p>
      </section>
    )
  }
  if (isEmpty) {
    return (
      <section className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-6 py-5 shadow-sm">
        <p className="text-sm text-slate-600">Your first weekly digest will appear after the end of the week.</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-6 py-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
            Your Weekly Digest
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-blue-500">Generated {generatedAt}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {visibleParagraphs.map((paragraph) => (
          <p className="text-sm leading-6 text-slate-700" key={paragraph}>
            {paragraph}
          </p>
        ))}
      </div>
      {canExpand ? (
        <button
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          <span>{expanded ? 'Show less' : 'Read full digest'}</span>
          <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </button>
      ) : null}
    </section>
  )
}

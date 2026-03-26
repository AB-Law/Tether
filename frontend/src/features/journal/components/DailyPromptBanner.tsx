import { useDailyPrompt } from '../hooks/useJournal'
import { useState } from 'react'

const storageKeyForToday = () => `journal-prompt-dismissed-${new Date().toISOString().slice(0, 10)}`

export function DailyPromptBanner() {
  const { data, isLoading } = useDailyPrompt()
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(storageKeyForToday()) === '1')
  if (dismissed) return null
  if (isLoading || !data) return null

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
            <span aria-hidden="true" className="inline-flex h-3.5 w-3.5 items-center justify-center text-[10px]">
              🏆
            </span>
            <span>Daily Prompt</span>
          </p>
          <p className="text-[29px] font-extrabold leading-tight tracking-tight text-slate-900">{data.prompt}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Taking a moment to celebrate the small things helps build a positive narrative of your day-to-day life.
          </p>
        </div>
        <button
          className="mt-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700"
          onClick={() => {
            sessionStorage.setItem(storageKeyForToday(), '1')
            setDismissed(true)
          }}
          type="button"
        >
          Write Entry
        </button>
      </div>
    </section>
  )
}

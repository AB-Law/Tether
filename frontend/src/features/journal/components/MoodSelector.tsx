interface MoodSelectorProps {
  value: number | null
  onChange: (value: number | null) => void
}

const labels = ['Very low', 'Low', 'Neutral', 'Good', 'Great']

export function MoodSelector({ value, onChange }: Readonly<MoodSelectorProps>) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          className={
            value === score
              ? 'rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30'
              : 'rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-white'
          }
          key={score}
          onClick={() => onChange(value === score ? null : score)}
          type="button"
        >
          {score} - {labels[score - 1]}
        </button>
      ))}
    </div>
  )
}

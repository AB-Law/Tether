import { useMemo, useState } from 'react'

interface TagInputProps {
  value: string[]
  options: string[]
  onChange: (next: string[]) => void
}

export function TagInput({ value, options, onChange }: Readonly<TagInputProps>) {
  const [draft, setDraft] = useState('')
  const suggestions = useMemo(() => {
    const token = draft.trim().toLowerCase()
    if (!token) return []
    return options.filter((option) => option.toLowerCase().includes(token)).slice(0, 8)
  }, [draft, options])

  const commit = (raw: string) => {
    const next = raw.trim()
    if (!next) return
    if (value.some((item) => item.toLowerCase() === next.toLowerCase())) return
    onChange([...value, next])
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2.5">
        {value.map((tag) => (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600" key={tag}>
            {tag}
            <button
              aria-label={`Remove ${tag}`}
              className="rounded px-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              onClick={() => onChange(value.filter((item) => item !== tag))}
              type="button"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault()
            commit(draft)
            setDraft('')
          }
        }}
        placeholder="Add tags..."
        value={draft}
      />
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2.5">
          {suggestions.map((item) => (
            <button
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
              key={item}
              onClick={() => {
                commit(item)
                setDraft('')
              }}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

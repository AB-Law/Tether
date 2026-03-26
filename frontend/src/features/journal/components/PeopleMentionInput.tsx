import { useMemo, useState } from 'react'
import type { Person } from '../../people/types'

interface MentionToken {
  start: number
  end: number
  query: string
}

const mentionRegex = /@([\p{L}\p{N} .'\-_]*)$/u

const getActiveMention = (text: string, caret: number): MentionToken | null => {
  const left = text.slice(0, caret)
  const match = mentionRegex.exec(left)
  if (match?.index == null) return null
  const query = match[1] ?? ''
  return { start: match.index, end: caret, query }
}

interface PeopleMentionInputProps {
  value: string
  onChange: (value: string) => void
  peopleOptions: Person[]
  selectedPeople: Person[]
  onSelectedPeopleChange: (people: Person[]) => void
}

export function PeopleMentionInput({
  value,
  onChange,
  peopleOptions,
  selectedPeople,
  onSelectedPeopleChange,
}: Readonly<PeopleMentionInputProps>) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [caret, setCaret] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')

  const mention = useMemo(() => getActiveMention(value, caret), [value, caret])
  const suggestions = useMemo(() => {
    if (!mention) return []
    const token = mention.query.trim().toLowerCase()
    const source = peopleOptions.filter((person) => !person.archived_at)
    if (!token) return source.slice(0, 10)
    return source
      .filter((person) => person.name.toLowerCase().includes(token))
      .sort((a, b) => {
        const aPrefix = a.name.toLowerCase().startsWith(token)
        const bPrefix = b.name.toLowerCase().startsWith(token)
        if (aPrefix !== bPrefix) return aPrefix ? -1 : 1
        if (a.name !== b.name) return a.name.localeCompare(b.name)
        return a.id.localeCompare(b.id)
      })
      .slice(0, 10)
  }, [mention, peopleOptions])

  const commitSuggestion = (person: Person) => {
    if (!mention) return
    const nextText = `${value.slice(0, mention.start)}@${person.name}${value.slice(mention.end)}`
    onChange(nextText)
    if (!selectedPeople.some((item) => item.id === person.id)) {
      onSelectedPeopleChange([...selectedPeople, person])
    }
    setStatusMessage('')
  }

  return (
    <div className="space-y-3">
      <textarea
        className="min-h-56 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-7 text-slate-700"
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => setCaret((event.target as HTMLTextAreaElement).selectionStart)}
        onKeyDown={(event) => {
          if (!mention) return
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveIndex((prev) => (prev + 1) % Math.max(1, suggestions.length))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex((prev) => (prev - 1 + Math.max(1, suggestions.length)) % Math.max(1, suggestions.length))
          } else if (event.key === 'Enter' || event.key === 'Tab') {
            if (suggestions[activeIndex]) {
              event.preventDefault()
              commitSuggestion(suggestions[activeIndex])
            }
          } else if (event.key === 'Escape') {
            setStatusMessage('')
          }
        }}
        onSelect={(event) => setCaret((event.target as HTMLTextAreaElement).selectionStart)}
        placeholder="Write your journal entry. Type @ to mention people."
        value={value}
      />
      {mention ? (
        <div aria-label="Mention suggestions" className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          {suggestions.length === 0 ? (
            <p className="text-xs text-slate-500">No people found</p>
          ) : (
            suggestions.map((person, index) => (
              <button
                className={
                  index === activeIndex
                    ? 'flex w-full items-center justify-between rounded-lg bg-blue-50 px-2 py-1.5 text-left text-xs font-medium text-blue-700'
                    : 'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50'
                }
                key={person.id}
                onClick={() => commitSuggestion(person)}
                type="button"
              >
                <span>{person.name}</span>
                <span className="text-[10px] text-slate-500">
                  {person.relationship_type}
                  {person.location ? ` · ${person.location}` : ''}
                </span>
              </button>
            ))
          )}
          {statusMessage ? <p className="mt-1 text-xs text-rose-600">{statusMessage}</p> : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2.5">
        {selectedPeople.map((person) => (
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700" key={person.id}>
            @{person.name}
            <button
              aria-label={`Remove ${person.name}`}
              className="rounded px-1 hover:bg-blue-100"
              onClick={() => onSelectedPeopleChange(selectedPeople.filter((item) => item.id !== person.id))}
              type="button"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

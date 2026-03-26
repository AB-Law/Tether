import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { usePeopleList } from '../../people/hooks/usePeople'
import { TagInput } from '../../shared/components/TagInput'
import { AiReflectionPanel } from '../components/AiReflectionPanel'
import { DailyPromptBanner } from '../components/DailyPromptBanner'
import { MoodSelector } from '../components/MoodSelector'
import { PeopleMentionInput } from '../components/PeopleMentionInput'
import { useCreateEntry, useJournalEntry, useTags, useUpdateEntry } from '../hooks/useJournal'

export function JournalEditorPage() {
  const { entryId } = useParams()
  const isEdit = Boolean(entryId)
  const navigate = useNavigate()
  const entryQuery = useJournalEntry(entryId ?? '')
  const createMutation = useCreateEntry()
  const updateMutation = useUpdateEntry()
  const tagsQuery = useTags()
  const peopleQuery = usePeopleList({})

  const entry = entryQuery.data
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [body, setBody] = useState('')
  const [mood, setMood] = useState<number | null>(null)
  const [tagNames, setTagNames] = useState<string[]>([])
  const [selectedPeople, setSelectedPeople] = useState<Array<{ id: string; name: string; relationship_type: string; location: string | null }>>([])

  const peopleOptions = peopleQuery.data?.data ?? []
  const tagOptions = useMemo(() => tagsQuery.data?.map((tag) => tag.name) ?? [], [tagsQuery.data])

  if (isEdit && entryQuery.isLoading) return <p className="text-sm text-slate-500">Loading entry...</p>

  const hydratedBody = body || entry?.body || ''
  const hydratedDate = entryDate || entry?.entry_date || new Date().toISOString().slice(0, 10)
  const hydratedMood = mood ?? entry?.mood ?? null
  const hydratedTags = tagNames.length > 0 ? tagNames : (entry?.tags.map((tag) => tag.name) ?? [])
  const hydratedPeople = selectedPeople.length > 0 ? selectedPeople : (entry?.people as typeof selectedPeople | undefined) ?? []

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 lg:p-8">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">{hydratedDate}</p>
          <h2 className="text-4xl font-extrabold leading-none tracking-tight text-slate-900">{isEdit ? 'Edit Entry' : 'New Entry'}</h2>
          <p className="text-base text-slate-500">{isEdit ? 'Refine this reflection before saving.' : 'Capture what mattered today with clarity.'}</p>
        </div>
        {isEdit ? null : <DailyPromptBanner />}
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault()
            const payload = {
              entry_date: hydratedDate,
              body: hydratedBody,
              mood: hydratedMood,
              tag_names: hydratedTags,
              person_ids: hydratedPeople.map((person) => person.id),
            }
            if (isEdit && entryId) {
              updateMutation.mutate({ id: entryId, payload }, { onSuccess: () => navigate(`/journal/${entryId}`) })
              return
            }
            createMutation.mutate(payload)
          }}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Date</span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
                onChange={(event) => setEntryDate(event.target.value)}
                type="date"
                value={hydratedDate}
              />
            </label>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Mood</p>
              <MoodSelector onChange={setMood} value={hydratedMood} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Entry details</p>
            <PeopleMentionInput
              onChange={setBody}
              onSelectedPeopleChange={setSelectedPeople}
              peopleOptions={peopleOptions}
              selectedPeople={hydratedPeople}
              value={hydratedBody}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Tags</p>
            <TagInput onChange={setTagNames} options={tagOptions} value={hydratedTags} />
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50" onClick={() => navigate('/journal')} type="button">
              Cancel
            </button>
            <button className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700" type="submit">
              {isEdit ? 'Save Changes' : 'Create Entry'}
            </button>
          </div>
        </form>
      </section>
      {isEdit && entryId ? (
        <AiReflectionPanel entryId={entryId} latestReflection={entry?.latest_ai_reflection ?? null} />
      ) : (
        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">AI Reflection</h3>
          <p className="text-sm text-slate-500">Save this entry to unlock reflection and streaming insights.</p>
          <button className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500" disabled type="button">
            Reflect
          </button>
          <button className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500" disabled type="button">
            Stream Reflect
          </button>
        </aside>
      )}
    </div>
  )
}

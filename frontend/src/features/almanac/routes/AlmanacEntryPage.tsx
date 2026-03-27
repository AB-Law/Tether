import { type Dispatch, type SetStateAction, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { EntryTypeIcon } from '../components/EntryTypeIcon'
import { useAlmanacEntry, useDeleteEntry, useUpdateEntry } from '../hooks/useAlmanac'
import type { EntryType } from '../types'

type AlmanacEntryDraft = {
  title: string
  body: string
  entry_type: EntryType
  tags: string
  due_date: string
  reminder_at: string
  is_completed: boolean
}

type AlmanacEntryRecord = {
  id: string
  title: string
  body: string | null
  entry_type: EntryType
  tags: Array<{ id: string; name: string }>
  due_date: string | null
  reminder_at: string | null
  is_completed: boolean | null
  created_at: string
  source: string
}

const emptyDraft: AlmanacEntryDraft = {
  title: '',
  body: '',
  entry_type: 'random_thought',
  tags: '',
  due_date: '',
  reminder_at: '',
  is_completed: false,
}

function toDraft(entry: AlmanacEntryRecord): AlmanacEntryDraft {
  return {
    title: entry.title,
    body: entry.body ?? '',
    entry_type: entry.entry_type,
    tags: entry.tags.map((tag) => tag.name).join(', '),
    due_date: entry.due_date ?? '',
    reminder_at: entry.reminder_at ? entry.reminder_at.slice(0, 16) : '',
    is_completed: Boolean(entry.is_completed),
  }
}

function buildTagList(tags: string): string[] {
  return tags
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildPayload(entryId: string, draft: AlmanacEntryDraft) {
  const isTask = draft.entry_type === 'task'
  return {
    id: entryId,
    payload: {
      title: draft.title,
      body: draft.body,
      entry_type: draft.entry_type,
      tag_names: buildTagList(draft.tags),
      due_date: isTask ? draft.due_date || null : null,
      reminder_at: isTask && draft.reminder_at ? new Date(draft.reminder_at).toISOString() : null,
      is_completed: isTask ? draft.is_completed : undefined,
    },
  }
}

async function handleSaveChanges(
  entryId: string,
  draft: AlmanacEntryDraft,
  updateEntry: (payload: ReturnType<typeof buildPayload>) => Promise<unknown>,
  setErrorMessage: (message: string | null) => void,
  setIsSaving: (value: boolean) => void,
  setIsEditMode: (value: boolean) => void,
): Promise<void> {
  setErrorMessage(null)
  setIsSaving(true)
  try {
    await updateEntry(buildPayload(entryId, draft))
    setIsEditMode(false)
  } catch {
    setErrorMessage('Could not save changes. Please try again.')
  } finally {
    setIsSaving(false)
  }
}

async function handleDeleteEntry(
  entryId: string,
  deleteEntry: (id: string) => Promise<unknown>,
  navigate: (path: string) => void,
  setShowDeleteConfirm: (value: boolean) => void,
  setErrorMessage: (message: string | null) => void,
  setIsDeleting: (value: boolean) => void,
): Promise<void> {
  setShowDeleteConfirm(false)
  setErrorMessage(null)
  setIsDeleting(true)
  try {
    await deleteEntry(entryId)
    navigate('/almanac')
  } catch {
    setErrorMessage('Could not delete this entry. Please try again.')
  } finally {
    setIsDeleting(false)
  }
}

type AlmanacEntryModeContentProps = Readonly<{
  draft: AlmanacEntryDraft
  entry: AlmanacEntryRecord
  isEditMode: boolean
  setDraft: Dispatch<SetStateAction<AlmanacEntryDraft>>
  onCancel: () => void
  onSave: () => void
  isSaving: boolean
}>

function AlmanacEntryModeContent(props: AlmanacEntryModeContentProps) {
  const { draft, entry, isEditMode, setDraft, onCancel, onSave, isSaving } = props
  
  const isTaskDraft = draft.entry_type === 'task'

  if (!isEditMode) {
    return (
      <>
        <article className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{entry.body ?? ''}</article>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Tags</p>
          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag) => (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600" key={tag.id}>
                #{tag.name}
              </span>
            ))}
          </div>
        </div>
        {entry.entry_type === 'task' ? (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
            <p className="text-sm text-slate-700">
              <span className="block text-xs uppercase tracking-wide text-slate-500">Due Date</span>
              {entry.due_date ?? '-'}
            </p>
            <p className="text-sm text-slate-700">
              <span className="block text-xs uppercase tracking-wide text-slate-500">Reminder</span>
              {entry.reminder_at ?? '-'}
            </p>
            <p className="text-sm text-slate-700">
              <span className="block text-xs uppercase tracking-wide text-slate-500">Completed</span>
              {entry.is_completed ? 'Yes' : 'No'}
            </p>
          </div>
        ) : null}
      </>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block space-y-1 md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Title</span>
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
          value={draft.title}
        />
      </label>
      <label className="block space-y-1 md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Body</span>
        <textarea
          className="min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2"
          onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
          value={draft.body}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Type</span>
        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          onChange={(event) => setDraft((prev) => ({ ...prev, entry_type: event.target.value as EntryType }))}
          value={draft.entry_type}
        >
          <option value="idea">Idea</option>
          <option value="observation">Observation</option>
          <option value="quote">Quote</option>
          <option value="place">Place</option>
          <option value="want">Want</option>
          <option value="task">Task</option>
          <option value="random_thought">Random Thought</option>
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">Tags (comma separated)</span>
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))}
          value={draft.tags}
        />
      </label>
      {isTaskDraft ? (
        <>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Due Date</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              onChange={(event) => setDraft((prev) => ({ ...prev, due_date: event.target.value }))}
              type="date"
              value={draft.due_date}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Reminder</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              onChange={(event) => setDraft((prev) => ({ ...prev, reminder_at: event.target.value }))}
              type="datetime-local"
              value={draft.reminder_at}
            />
          </label>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 md:col-span-2">
            <input
              id="entry-completed"
              checked={draft.is_completed}
              onChange={(event) => setDraft((prev) => ({ ...prev, is_completed: event.target.checked }))}
              type="checkbox"
            />
            <label htmlFor="entry-completed">Mark completed</label>
          </div>
        </>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700" onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          disabled={isSaving}
          onClick={onSave}
          type="button"
        >
          {isSaving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

type AlmanacEntryErrorMessageProps = Readonly<{
  message: string | null
}>

function AlmanacEntryErrorMessage(props: AlmanacEntryErrorMessageProps) {
  const { message } = props
  if (!message) {
    return null
  }

  return (
    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p>
  )
}

type AlmanacEntryDeleteDialogProps = Readonly<{
  isVisible: boolean
  onCancel: () => void
  isDeleting: boolean
  onDelete: () => void
}>

function AlmanacEntryDeleteDialog(props: AlmanacEntryDeleteDialogProps) {
  const { isVisible, onCancel, isDeleting, onDelete } = props
  if (!isVisible) {
    return null
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <p>Delete this entry?</p>
      <div className="mt-3 flex gap-2">
        <button className="rounded-lg border border-rose-200 px-3 py-1.5" onClick={onCancel} type="button">
          Cancel
        </button>
        <button
          className="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white"
          disabled={isDeleting}
          onClick={onDelete}
          type="button"
        >
          {isDeleting ? 'Deleting...' : 'Confirm delete'}
        </button>
      </div>
    </div>
  )
}

export function AlmanacEntryPage() {
  const { entryId = '' } = useParams()
  const navigate = useNavigate()
  const entryQuery = useAlmanacEntry(entryId)
  const entry = entryQuery.data
  const { mutateAsync: updateEntry } = useUpdateEntry()
  const { mutateAsync: deleteEntry } = useDeleteEntry()
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [draft, setDraft] = useState<AlmanacEntryDraft>(emptyDraft)

  if (entryQuery.isLoading) return <p className="text-sm text-slate-500">Loading entry...</p>
  if (!entry) return <p className="text-sm text-slate-500">Almanac entry not found.</p>

  const toggleEditMode = () => {
    setIsEditMode((value) => {
      const nextValue = !value
      if (nextValue) {
        setDraft(toDraft(entry))
      }
      return nextValue
    })
  }

  const handleSave = () => {
    void handleSaveChanges(entry.id, draft, updateEntry, setErrorMessage, setIsSaving, setIsEditMode)
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
  }

  const handleDelete = () => {
    void handleDeleteEntry(entry.id, deleteEntry, navigate, setShowDeleteConfirm, setErrorMessage, setIsDeleting)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <Link className="text-sm font-medium text-blue-600" to="/almanac">
          ← Back to Almanac
        </Link>
        <button
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
          onClick={toggleEditMode}
          type="button"
        >
          {isEditMode ? 'Exit edit mode' : 'Edit mode'}
        </button>
      </div>

      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <EntryTypeIcon entryType={entry.entry_type} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{entry.entry_type.replace('_', ' ')}</p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">{isEditMode ? draft.title : entry.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Created {entry.created_at} · Source: {entry.source}
              </p>
            </div>
          </div>
          <button className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100" onClick={() => setShowDeleteConfirm(true)} type="button">
            Delete
          </button>
        </header>

        <AlmanacEntryModeContent
          draft={draft}
          entry={entry}
          isEditMode={isEditMode}
          setDraft={setDraft}
          isSaving={isSaving}
          onCancel={handleCancelEdit}
          onSave={handleSave}
        />
        <AlmanacEntryErrorMessage message={errorMessage} />
      </section>

      <AlmanacEntryDeleteDialog
        isVisible={showDeleteConfirm}
        isDeleting={isDeleting}
        onCancel={() => {
          setShowDeleteConfirm(false)
        }}
        onDelete={handleDelete}
      />
    </div>
  )
}

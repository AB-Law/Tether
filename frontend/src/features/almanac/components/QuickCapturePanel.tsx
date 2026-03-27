import { useState } from 'react'

import { useQuickCaptureStore } from '../../../app/store/quickCapture'
import { useCapture } from '../hooks/useAlmanac'
import type { EntryType } from '../types'

const typeOptions: Array<{ value: EntryType; label: string }> = [
  { value: 'random_thought', label: 'Random Thought' },
  { value: 'idea', label: 'Idea' },
  { value: 'observation', label: 'Observation' },
  { value: 'quote', label: 'Quote' },
  { value: 'place', label: 'Place' },
  { value: 'want', label: 'Want' },
  { value: 'task', label: 'Task' },
]

export function QuickCapturePanel() {
  const { isOpen, close } = useQuickCaptureStore()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [entryType, setEntryType] = useState<EntryType>('random_thought')
  const [showToast, setShowToast] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const captureMutation = useCapture()

  return (
    <>
      {isOpen ? (
        <>
          <button
            aria-label="Close capture panel overlay"
            className="fixed inset-0 z-40 bg-slate-900/30"
            onClick={close}
            type="button"
          />
          <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-md border-l border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Quick Capture</h3>
                <p className="text-sm text-slate-500">Capture from anywhere. Shortcut: Meta/Ctrl + K</p>
              </div>
              <button
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-600"
                onClick={close}
                type="button"
              >
                Close
              </button>
            </div>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (!title.trim()) return
                setErrorMessage(null)
                void captureMutation
                  .mutateAsync({
                    title: title.trim(),
                    body: body.trim() || undefined,
                    entry_type: entryType,
                  })
                  .then(() => {
                    setTitle('')
                    setBody('')
                    setEntryType('random_thought')
                    setShowToast(true)
                    close()
                    setTimeout(() => setShowToast(false), 1600)
                  })
                  .catch(() => {
                    setErrorMessage('Capture failed. Please try again.')
                  })
              }}
            >
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Title</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What's on your mind?"
                  required
                  value={title}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Body (optional)</span>
                <textarea
                  className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2"
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Add details..."
                  value={body}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Entry Type</span>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  onChange={(event) => setEntryType(event.target.value as EntryType)}
                  value={entryType}
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-start justify-end gap-2 pt-2">
                <button
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                  onClick={close}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  disabled={captureMutation.isPending}
                  type="submit"
                >
                  Capture
                </button>
              </div>
              {errorMessage ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {errorMessage}
                </p>
              ) : null}
            </form>
          </aside>
        </>
      ) : null}
      {showToast ? (
        <div className="fixed bottom-6 right-6 z-[60] rounded-lg bg-slate-900 px-3 py-2 text-sm text-white shadow-lg">
          Captured successfully
        </div>
      ) : null}
    </>
  )
}

import { useMemo, useState } from 'react'

import type { AlmanacEntry } from '../types'

interface TaskListProps {
  readonly entries: AlmanacEntry[]
  readonly onComplete: (entryId: string, isCompleted: boolean) => Promise<void>
}

function isOverdue(dueDate?: string | null) {
  if (!dueDate) return false
  const todayDate = new Date()
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(todayDate.getDate()).padStart(2, '0')}`
  return dueDate < today
}

export function TaskList({ entries, onComplete }: Readonly<TaskListProps>) {
  const [optimisticCompleted, setOptimisticCompleted] = useState<Record<string, boolean>>({})
  const completedIds = useMemo(() => {
    const next = new Set(entries.filter((entry) => entry.is_completed).map((entry) => entry.id))
    for (const [entryId, isCompleted] of Object.entries(optimisticCompleted)) {
      if (isCompleted) {
        next.add(entryId)
      } else {
        next.delete(entryId)
      }
    }
    return next
  }, [entries, optimisticCompleted])

  const tasks = useMemo(() => entries.filter((entry) => entry.entry_type === 'task'), [entries])

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const completed = completedIds.has(task.id)
        const overdue = !completed && isOverdue(task.due_date)
        const articleClass = overdue
          ? 'rounded-xl border bg-amber-50/40 border-amber-300 p-4'
          : 'rounded-xl border border-slate-200 bg-white p-4'
        const titleClass = completed
          ? 'font-semibold text-slate-400 line-through'
          : 'font-semibold text-slate-900'
        const badgeClass = overdue
          ? 'rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800'
          : 'rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600'
        return (
          <article className={articleClass} key={task.id}>
            <div className="flex items-start justify-between gap-3">
              <label className="flex min-w-0 items-start gap-3">
                <span className="sr-only">Mark {task.title} completed</span>
                <input
                  aria-label={`Mark ${task.title} completed`}
                  checked={completed}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                  onChange={() => {
                    const nextCompleted = !completed
                    setOptimisticCompleted((prev) => ({
                      ...prev,
                      [task.id]: nextCompleted,
                    }))
                    const request = onComplete(task.id, nextCompleted)
                    void request
                      .then(() => {
                        setOptimisticCompleted((prev) => {
                          const current = prev[task.id]
                          if (current !== nextCompleted) {
                            return prev
                          }
                          const next = { ...prev }
                          delete next[task.id]
                          return next
                        })
                      })
                      .catch(() => {
                        setOptimisticCompleted((prev) => {
                          const next = { ...prev }
                          delete next[task.id]
                          return next
                        })
                      })
                  }}
                  type="checkbox"
                />
                <span>
                  <p className={titleClass}>{task.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{task.body ?? ''}</p>
                </span>
              </label>
              <span className={badgeClass}>
                {task.due_date ? `Due ${task.due_date}` : 'No due date'}
              </span>
            </div>
          </article>
        )
      })}
      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          No tasks yet.
        </p>
      ) : null}
    </div>
  )
}

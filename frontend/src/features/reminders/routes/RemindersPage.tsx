import { useMemo, useState } from 'react'

import { NudgeCard } from '../components/NudgeCard'
import type { ReminderStatus } from '../types'
import { useRemindersList, useSnoozeReminder, useUpdateReminder } from '../hooks/useReminders'

const STATUS_FILTERS: Array<{ id: 'all' | ReminderStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'sent', label: 'Sent' },
  { id: 'snoozed', label: 'Snoozed' },
]

export function RemindersPage() {
  const [activeStatus, setActiveStatus] = useState<'all' | ReminderStatus>('all')
  const { data, isLoading } = useRemindersList(activeStatus === 'all' ? undefined : activeStatus)
  const snoozeMutation = useSnoozeReminder()
  const updateMutation = useUpdateReminder()

  const filteredReminders = useMemo(
    () =>
      (data ?? []).map((item) => {
        const payload = item.payload ?? {}
        const personNameValue = payload['person_name']
        const nudgeTextValue = payload['nudge_text']
        const personName = typeof personNameValue === 'string' ? personNameValue : 'Connection'
        return {
          id: item.id,
          type: item.reminder_type === 'nudge' ? 'nudge' : 'general',
          status: item.status,
          title:
            item.reminder_type === 'nudge'
              ? `Reach out to ${personName}`
              : `Reminder for ${item.entity_type}`,
          personId: item.entity_id,
          personName,
          lastTalkedLabel: undefined,
          nudgeText: typeof nudgeTextValue === 'string' ? nudgeTextValue : undefined,
          scheduledLabel: new Date(item.scheduled_for).toLocaleString(),
          acknowledged: item.status === 'sent',
        }
      }),
    [data],
  )
  const remindersContent = (() => {
    if (isLoading) {
      return <p className="text-sm text-slate-500">Loading reminders...</p>
    }
    if (!filteredReminders.length) {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-base font-semibold text-slate-700">No reminders in this state</p>
          <p className="mt-1 text-sm text-slate-500">Try another filter to preview the remaining UI states.</p>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        {filteredReminders.map((reminder) =>
          reminder.type === 'nudge' && reminder.personName ? (
            <NudgeCard
              acknowledged={reminder.acknowledged}
              key={reminder.id}
              lastTalkedLabel={reminder.lastTalkedLabel}
              nudgeText={reminder.nudgeText}
              personId={reminder.personId ?? reminder.id}
              personName={reminder.personName}
              scheduledLabel={reminder.scheduledLabel}
              onDone={() => updateMutation.mutate({ id: reminder.id, status: 'sent' })}
              onSnooze={() =>
                snoozeMutation.mutate({
                  id: reminder.id,
                  until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                })
              }
            />
          ) : (
            <article className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm" key={reminder.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{reminder.title}</p>
                  <p className="text-xs text-slate-500">{reminder.scheduledLabel}</p>
                </div>
                <button className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600" type="button">
                  Done
                </button>
              </div>
            </article>
          ),
        )}
      </div>
    )
  })()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Phase 4 Preview</p>
        <h2 className="text-4xl font-extrabold leading-none tracking-tight text-slate-900">Reminders</h2>
        <p className="text-base text-slate-500">UI-only prototype with nudge cards and reminder status filters.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        {STATUS_FILTERS.map((filter) => (
          <button
            className={
              activeStatus === filter.id
                ? 'rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white'
                : 'rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }
            key={filter.id}
            onClick={() => setActiveStatus(filter.id)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>

      {remindersContent}

      <footer className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
        <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500" type="button">
          Previous
        </button>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Page 1 of 3</p>
        <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700" type="button">
          Next
        </button>
      </footer>
    </div>
  )
}

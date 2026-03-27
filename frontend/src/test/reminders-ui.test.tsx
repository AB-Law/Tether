import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NudgeCard } from '../features/reminders/components/NudgeCard'
import { RemindersPage } from '../features/reminders/routes/RemindersPage'
import type { ReminderApiItem } from '../features/reminders/types'

const remindersMocks = vi.hoisted(() => ({
  useRemindersList: vi.fn(),
  useSnoozeReminder: vi.fn(),
  useUpdateReminder: vi.fn(),
}))

vi.mock('../features/reminders/hooks/useReminders', () => ({
  useRemindersList: remindersMocks.useRemindersList,
  useSnoozeReminder: remindersMocks.useSnoozeReminder,
  useUpdateReminder: remindersMocks.useUpdateReminder,
}))

describe('reminders UI', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders mixed reminder states and filters list', async () => {
    const snoozeMutate = vi.fn()
    const updateMutate = vi.fn()
    remindersMocks.useRemindersList.mockReturnValue({
      data: [
        {
          id: 'r-1',
          entity_type: 'person',
          entity_id: 'person-sarah',
          reminder_type: 'nudge',
          status: 'pending',
          channel: 'in_app',
          scheduled_for: new Date().toISOString(),
          payload: { person_name: 'Sarah Chen', nudge_text: "What's on your mind about Sarah?" },
        },
      ],
      isLoading: false,
    })
    remindersMocks.useSnoozeReminder.mockReturnValue({ mutate: snoozeMutate })
    remindersMocks.useUpdateReminder.mockReturnValue({ mutate: updateMutate })

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <RemindersPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Reminders')).toBeInTheDocument()
    expect(screen.getByText('Sarah Chen')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Snooze' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(snoozeMutate).toHaveBeenCalled()
    expect(updateMutate).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Snoozed' }))
    await user.click(screen.getByRole('button', { name: 'Pending' }))
  })

  it('renders nudge card fallback and acknowledged state', () => {
    render(
      <MemoryRouter>
        <NudgeCard acknowledged personId="p1" personName="Alex" scheduledLabel="Tomorrow" />
      </MemoryRouter>,
    )

    expect(screen.getByText('Time to reach out to Alex.')).toBeInTheDocument()
    expect(screen.getAllByText('Done').length).toBeGreaterThan(0)
  })

  it('renders nudge card with provided text', () => {
    render(
      <MemoryRouter>
        <NudgeCard
          personId="p2"
          personName="Taylor"
          scheduledLabel="Tomorrow"
          nudgeText="Custom nudge text."
          lastTalkedLabel="Last talked yesterday"
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Custom nudge text.')).toBeInTheDocument()
    expect(screen.getByText('Last talked yesterday')).toBeInTheDocument()
  })

  it('renders empty state when no reminders exist', () => {
    remindersMocks.useRemindersList.mockReturnValue({ data: [], isLoading: false })
    remindersMocks.useSnoozeReminder.mockReturnValue({ mutate: vi.fn() })
    remindersMocks.useUpdateReminder.mockReturnValue({ mutate: vi.fn() })
    render(
      <MemoryRouter>
        <RemindersPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('No reminders in this state')).toBeInTheDocument()
  })

  it('renders loading and generic reminder row', () => {
    remindersMocks.useRemindersList.mockReturnValue({
      data: [
        {
          id: 'r-2',
          entity_type: 'task',
          entity_id: 'task-1',
          reminder_type: 'general',
          status: 'pending',
          channel: 'in_app',
          scheduled_for: new Date().toISOString(),
          payload: null,
        },
      ],
      isLoading: true,
    })
    remindersMocks.useSnoozeReminder.mockReturnValue({ mutate: vi.fn() })
    remindersMocks.useUpdateReminder.mockReturnValue({ mutate: vi.fn() })
    const { rerender } = render(
      <MemoryRouter>
        <RemindersPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading reminders...')).toBeInTheDocument()
    remindersMocks.useRemindersList.mockReturnValue({
      data: [
        {
          id: 'r-2',
          entity_type: 'task',
          entity_id: 'task-1',
          reminder_type: 'general',
          status: 'pending',
          channel: 'in_app',
          scheduled_for: new Date().toISOString(),
          payload: null,
        },
      ],
      isLoading: false,
    })
    rerender(
      <MemoryRouter>
        <RemindersPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Reminder for task')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('handles undefined data and missing person id fallback', async () => {
    remindersMocks.useRemindersList.mockReturnValue({
      data: undefined,
      isLoading: false,
    })
    remindersMocks.useSnoozeReminder.mockReturnValue({ mutate: vi.fn() })
    remindersMocks.useUpdateReminder.mockReturnValue({ mutate: vi.fn() })
    const user = userEvent.setup()
    const { rerender } = render(
      <MemoryRouter>
        <RemindersPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('No reminders in this state')).toBeInTheDocument()

    remindersMocks.useRemindersList.mockReturnValue({
      data: [
        {
          id: 'r-x',
          entity_type: 'person',
          entity_id: undefined,
          reminder_type: 'nudge',
          status: 'pending',
          channel: 'in_app',
          scheduled_for: new Date().toISOString(),
          payload: { person_name: 'Fallback Person', nudge_text: 'Ping?' },
        } as unknown as ReminderApiItem,
      ],
      isLoading: false,
    })
    rerender(
      <MemoryRouter>
        <RemindersPage />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Snooze' }))
  })
})

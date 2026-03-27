import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { RoutePlaceholder } from '../components/layout/route-placeholder'
import { getDigest } from '../features/journal/api/get-digest'
import { WeeklyDigestCard } from '../features/journal/components/WeeklyDigestCard'
import { mockReminders } from '../features/reminders/data/mock-reminders'
import { listReminders } from '../features/reminders/api/list-reminders'
import { snoozeReminder } from '../features/reminders/api/snooze-reminder'
import { updateReminder } from '../features/reminders/api/update-reminder'
import { useRemindersList, useSnoozeReminder, useUpdateReminder } from '../features/reminders/hooks/useReminders'
import { useLatestDigest } from '../features/journal/hooks/useJournal'

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}))

vi.mock('../lib/api-client', () => ({
  apiClient: {
    get: apiMocks.apiGet,
    post: apiMocks.apiPost,
    patch: apiMocks.apiPatch,
  },
}))

function HookProbe() {
  const list = useRemindersList()
  const snooze = useSnoozeReminder()
  const update = useUpdateReminder()
  return (
    <div>
      <span>{list.isSuccess ? 'list-ok' : 'list-wait'}</span>
      <button onClick={() => snooze.mutate({ id: 'r1', until: new Date().toISOString() })} type="button">
        snooze
      </button>
      <button onClick={() => update.mutate({ id: 'r1', status: 'sent' })} type="button">
        update
      </button>
    </div>
  )
}

function JournalHookProbe() {
  const latestDigest = useLatestDigest()
  return <span>{latestDigest.isSuccess ? 'digest-ok' : 'digest-wait'}</span>
}

describe('phase4 reminders and digest utilities', () => {
  it('covers route placeholder and mock data module', () => {
    render(<RoutePlaceholder label="Journal" />)
    expect(screen.getByText('Journal placeholder')).toBeInTheDocument()
    expect(mockReminders.length).toBeGreaterThan(0)
  })

  it('covers digest and reminder api clients', async () => {
    apiMocks.apiGet.mockResolvedValueOnce({ data: { data: { run_id: 'd1', created_at: '2026-01-01', text: 'digest' } } })
    apiMocks.apiGet.mockResolvedValueOnce({ data: [{ id: 'r1' }] })
    apiMocks.apiGet.mockResolvedValueOnce({ data: [{ id: 'r2' }] })
    apiMocks.apiPost.mockResolvedValueOnce({ data: { id: 'r1', status: 'snoozed' } })
    apiMocks.apiPatch.mockResolvedValueOnce({ data: { id: 'r1', status: 'sent' } })

    const digest = await getDigest()
    const reminders = await listReminders()
    await listReminders('pending')
    const snoozed = await snoozeReminder('r1', '2026-01-01T00:00:00Z')
    const updated = await updateReminder('r1', { status: 'sent' })

    expect(digest?.run_id).toBe('d1')
    expect(reminders[0].id).toBe('r1')
    expect(snoozed.id).toBe('r1')
    expect(updated.status).toBe('sent')
  })

  it('returns null digest on api error', async () => {
    apiMocks.apiGet.mockRejectedValueOnce(new Error('no digest'))
    const digest = await getDigest()
    expect(digest).toBeNull()
  })

  it('covers reminders hooks with query client', async () => {
    apiMocks.apiGet.mockResolvedValue({ data: [] })
    apiMocks.apiPost.mockResolvedValue({ data: { id: 'r1', status: 'snoozed' } })
    apiMocks.apiPatch.mockResolvedValue({ data: { id: 'r1', status: 'sent' } })

    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <HookProbe />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByText('list-ok')).toBeInTheDocument())
    screen.getByRole('button', { name: 'snooze' }).click()
    screen.getByRole('button', { name: 'update' }).click()
  })

  it('covers latest digest hook and single paragraph digest card branch', async () => {
    apiMocks.apiGet.mockResolvedValue({ data: { data: { run_id: 'd1', created_at: '2026-01-01', text: 'digest' } } })
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <JournalHookProbe />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByText('digest-ok')).toBeInTheDocument())

    render(<WeeklyDigestCard digestText="Single paragraph only." />)
    expect(screen.queryByRole('button', { name: /Read full digest/i })).not.toBeInTheDocument()
  })
})


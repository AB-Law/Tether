import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const useAlmanacEntry = vi.fn()
const useUpdateEntry = vi.fn()
const useDeleteEntry = vi.fn()

vi.mock('../features/almanac/hooks/useAlmanac', () => ({
  useAlmanacEntry,
  useUpdateEntry,
  useDeleteEntry,
}))

const ideaEntry = {
  id: 'a1',
  user_id: 'u1',
  entry_type: 'idea',
  title: 'Morning note',
  body: 'Write a reflection',
  due_date: null,
  reminder_at: null,
  is_completed: false,
  completed_at: null,
  source: 'manual',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  tags: [{ id: 't1', name: 'habit' }],
}

const taskEntry = {
  id: 'a2',
  user_id: 'u1',
  entry_type: 'task',
  title: 'Book dinner',
  body: 'Reserve a reservation',
  due_date: '2026-03-11',
  reminder_at: '2026-03-10T18:00:00+02:00',
  is_completed: false,
  completed_at: null,
  source: 'manual',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  tags: [{ id: 't2', name: 'life' }],
}

afterEach(() => {
  cleanup()
  useAlmanacEntry.mockReset()
  useUpdateEntry.mockReset()
  useDeleteEntry.mockReset()
})

beforeEach(() => {
  useAlmanacEntry.mockReset()
  useUpdateEntry.mockReset()
  useDeleteEntry.mockReset()
  useUpdateEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })
  useDeleteEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })
})

describe('almanac entry page coverage', () => {
  it('shows loading and error states', async () => {
    const { AlmanacEntryPage } = await import('../features/almanac/routes/AlmanacEntryPage')
    useAlmanacEntry.mockReturnValue({ isLoading: true, isError: false, data: null })
    const refetch = vi.fn()
    useAlmanacEntry.mockReturnValue({ isLoading: true, isError: false, data: null })
    const loadingRender = render(
      <MemoryRouter initialEntries={['/almanac/a1']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading entry...')).toBeInTheDocument()
    loadingRender.unmount()

    useAlmanacEntry.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error('bad'),
      data: null,
      refetch,
    })
    render(
      <MemoryRouter initialEntries={['/almanac/a1']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Failed to load this almanac entry: bad')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('shows generic error message for non-Error failures', async () => {
    const { AlmanacEntryPage } = await import('../features/almanac/routes/AlmanacEntryPage')
    const refetch = vi.fn()
    useAlmanacEntry.mockReturnValue({
      isLoading: false,
      isError: true,
      error: { message: 'server down' },
      data: null,
      refetch,
    })

    render(
      <MemoryRouter initialEntries={['/almanac/a1']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Failed to load this almanac entry: Please retry.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('renders dash for missing task reminder values', async () => {
    const { AlmanacEntryPage } = await import('../features/almanac/routes/AlmanacEntryPage')
    const taskWithMissingReminder = {
      ...taskEntry,
      id: 'a4',
      title: 'Task missing reminder',
      due_date: null,
      reminder_at: null,
      is_completed: false,
      body: 'Plan groceries',
    }
    useAlmanacEntry.mockReturnValue({
      isLoading: false,
      isError: false,
      data: taskWithMissingReminder,
    })

    render(
      <MemoryRouter initialEntries={['/almanac/a4']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const reminderLabel = screen.getByText('Reminder')
    expect(reminderLabel.closest('p')?.textContent).toContain('-')
  })

  it('shows not found state when entry is missing', async () => {
    const { AlmanacEntryPage } = await import('../features/almanac/routes/AlmanacEntryPage')
    useAlmanacEntry.mockReturnValue({ isLoading: false, isError: false, data: null })
    useUpdateEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })
    useDeleteEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })
    render(
      <MemoryRouter initialEntries={['/almanac/a1']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Almanac entry not found.')).toBeInTheDocument()
  })

  it('edits and saves non-task entries', async () => {
    const { AlmanacEntryPage } = await import('../features/almanac/routes/AlmanacEntryPage')
    const updateEntry = vi.fn(async () => undefined)
    useAlmanacEntry.mockReturnValue({
      isLoading: false,
      isError: false,
      data: ideaEntry,
    })
    useUpdateEntry.mockReturnValue({ mutateAsync: updateEntry })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/a1']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Edit mode' }))
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Morning note updated')
    await user.clear(screen.getByLabelText('Tags (comma separated)'))
    await user.type(screen.getByLabelText('Tags (comma separated)'), 'focus,')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => {
      expect(updateEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'a1',
          payload: expect.objectContaining({
            title: 'Morning note updated',
            tag_names: ['focus'],
          }),
        }),
      )
    })
  })

  it('handles task payloads with reminder offset in task edit mode', async () => {
    const { AlmanacEntryPage } = await import('../features/almanac/routes/AlmanacEntryPage')
    const updateEntry = vi.fn(async () => undefined)
    useAlmanacEntry.mockReturnValue({
      isLoading: false,
      isError: false,
      data: taskEntry,
    })
    useUpdateEntry.mockReturnValue({ mutateAsync: updateEntry })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/a2']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Edit mode' }))
    await user.clear(screen.getByLabelText('Body'))
    await user.type(screen.getByLabelText('Body'), 'Reserve by phone')
    expect(screen.getByLabelText('Due Date')).toHaveValue('2026-03-11')
    expect(screen.getByLabelText('Reminder')).toHaveValue('2026-03-10T18:00')
    await user.clear(screen.getByLabelText('Due Date'))
    await user.type(screen.getByLabelText('Due Date'), '2026-03-12')
    await user.clear(screen.getByLabelText('Reminder'))
    await user.type(screen.getByLabelText('Reminder'), '2026-03-11T08:30')
    await user.click(screen.getByLabelText('Mark completed'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(updateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'a2',
        payload: expect.objectContaining({
          body: 'Reserve by phone',
          due_date: '2026-03-12',
          reminder_at: '2026-03-11T08:30+02:00',
          is_completed: true,
        }),
      }),
    )
  })

  it('handles delete flow and navigates back', async () => {
    const { AlmanacEntryPage } = await import('../features/almanac/routes/AlmanacEntryPage')
    const deleteEntry = vi.fn(async () => undefined)
    useAlmanacEntry.mockReturnValue({
      isLoading: false,
      isError: false,
      data: ideaEntry,
    })
    useDeleteEntry.mockReturnValue({ mutateAsync: deleteEntry })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/a1']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
          <Route path="/almanac" element={<div>Almanac list</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => {
      expect(deleteEntry).toHaveBeenCalledWith('a1')
      expect(screen.getByText('Almanac list')).toBeInTheDocument()
    })
  })

  it('handles completed task placeholders and draft conversion for timezone-neutral reminders', async () => {
    const { AlmanacEntryPage } = await import('../features/almanac/routes/AlmanacEntryPage')
    const updateEntry = vi.fn(async () => undefined)
    useAlmanacEntry.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        ...taskEntry,
        id: 'a3',
        title: 'Timezone neutral task',
        body: null,
        due_date: null,
        reminder_at: '2026-03-10T18:00:00',
        is_completed: true,
      },
    })
    useUpdateEntry.mockReturnValue({ mutateAsync: updateEntry })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/a3']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getAllByText('-', { selector: 'p' }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Yes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit mode' }))
    expect(screen.getByLabelText('Reminder')).toHaveValue('2026-03-10T18:00')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(updateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'a3',
        payload: expect.objectContaining({
          reminder_at: '2026-03-10T18:00Z',
          is_completed: true,
        }),
      }),
    )
  })

  it('supports exit edit mode via button toggling', async () => {
    const { AlmanacEntryPage } = await import('../features/almanac/routes/AlmanacEntryPage')
    const updateEntry = vi.fn(async () => undefined)
    useAlmanacEntry.mockReturnValue({
      isLoading: false,
      isError: false,
      data: ideaEntry,
    })
    useUpdateEntry.mockReturnValue({ mutateAsync: updateEntry })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/a1']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Edit mode' }))
    await user.click(screen.getByRole('button', { name: 'Exit edit mode' }))
    expect(screen.getByRole('button', { name: 'Edit mode' })).toBeInTheDocument()
  })

  it('shows deleting state while delete is in progress', async () => {
    const { AlmanacEntryDeleteDialog } = await import('../features/almanac/routes/AlmanacEntryPage')
    const onCancel = vi.fn()
    const onDelete = vi.fn(() => new Promise(() => {}))

    render(<AlmanacEntryDeleteDialog isVisible onCancel={onCancel} isDeleting onDelete={onDelete} />)

    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeInTheDocument()
  })

  it('can cancel edit mode without saving changes', async () => {
    const { AlmanacEntryPage } = await import('../features/almanac/routes/AlmanacEntryPage')
    const updateEntry = vi.fn(async () => undefined)
    useAlmanacEntry.mockReturnValue({
      isLoading: false,
      isError: false,
      data: ideaEntry,
    })
    useUpdateEntry.mockReturnValue({ mutateAsync: updateEntry })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/a1']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Edit mode' }))
    await user.clear(screen.getByLabelText('Body'))
    await user.type(screen.getByLabelText('Body'), 'Drafting...')
    await user.selectOptions(screen.getByRole('combobox'), 'random_thought')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(updateEntry).not.toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Edit mode' })).toBeInTheDocument()
  })

  it('displays an error when save fails', async () => {
    const { AlmanacEntryPage } = await import('../features/almanac/routes/AlmanacEntryPage')
    const updateEntry = vi.fn(async () => {
      throw new Error('nope')
    })
    useAlmanacEntry.mockReturnValue({
      isLoading: false,
      isError: false,
      data: ideaEntry,
    })
    useUpdateEntry.mockReturnValue({ mutateAsync: updateEntry })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/a1']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Edit mode' }))
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Morning note fail')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Could not save changes. Please try again.')).toBeInTheDocument()
  })

  it('displays an error when delete fails', async () => {
    const { AlmanacEntryPage } = await import('../features/almanac/routes/AlmanacEntryPage')
    const deleteEntry = vi.fn(async () => {
      throw new Error('nope')
    })
    useAlmanacEntry.mockReturnValue({
      isLoading: false,
      isError: false,
      data: ideaEntry,
    })
    useDeleteEntry.mockReturnValue({ mutateAsync: deleteEntry })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/a1']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByText('Could not delete this entry. Please try again.')).toBeInTheDocument()
  })

  it('allows dismissing delete confirmation', async () => {
    const { AlmanacEntryPage } = await import('../features/almanac/routes/AlmanacEntryPage')
    useAlmanacEntry.mockReturnValue({
      isLoading: false,
      isError: false,
      data: ideaEntry,
    })
    useDeleteEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/a1']}>
        <Routes>
          <Route path="/almanac/:entryId" element={<AlmanacEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Delete this entry?')).not.toBeInTheDocument()
  })
})

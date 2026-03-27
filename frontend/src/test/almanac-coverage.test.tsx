import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AlmanacEntry } from '../features/almanac/types'
import { almanacMockEntries } from '../features/almanac/data/mockEntries'
import { useQuickCaptureStore } from '../app/store/quickCapture'

const useAlmanacList = vi.fn()
const useCompleteEntry = vi.fn()
const useUpdateEntry = vi.fn()
const useCapture = vi.fn()
const useCreateEntry = vi.fn()

vi.mock('../features/almanac/hooks/useAlmanac', () => ({
  useAlmanacList,
  useCompleteEntry,
  useUpdateEntry,
  useCapture,
  useCreateEntry,
}))

const makeMeta = (data: AlmanacEntry[]) => ({
  data,
  meta: {
    page: 1,
    page_size: 20,
    total: data.length,
  },
})

const dueTask: AlmanacEntry = {
  id: 'a1',
  user_id: 'u1',
  entry_type: 'task',
  title: 'Book dinner',
  body: 'Reserve table',
  due_date: '2026-03-28',
  reminder_at: null,
  is_completed: false,
  completed_at: null,
  source: 'manual',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  tags: [{ id: 't1', name: 'life' }],
}

const overdueTask: AlmanacEntry = {
  ...dueTask,
  id: 'a0',
  title: 'Submit taxes',
  body: 'Fill tax form',
  due_date: '2000-01-01',
}

const noDueNoBodyTask: AlmanacEntry = {
  ...dueTask,
  id: 'a3',
  title: 'Unscheduled task',
  body: null,
  due_date: null,
}

const makeListQueryResult = (data: AlmanacEntry[]) => ({
  data: makeMeta(data),
})

const ideaEntry: AlmanacEntry = {
  id: 'a2',
  user_id: 'u1',
  entry_type: 'idea',
  title: 'Plan walk',
  body: 'Take a walk with a neighbor',
  due_date: null,
  reminder_at: null,
  is_completed: false,
  completed_at: null,
  source: 'manual',
  created_at: '2026-03-02T00:00:00Z',
  updated_at: '2026-03-02T00:00:00Z',
  tags: [{ id: 't2', name: 'habit' }],
}

const ideaEntryWithNoBody: AlmanacEntry = {
  ...ideaEntry,
  id: 'a3',
  title: 'Idea with no body',
  body: null,
}

function LocationEcho() {
  const location = useLocation()
  return <div data-testid="search">{location.search}</div>
}

afterEach(() => {
  cleanup()
  useQuickCaptureStore.setState({ isOpen: false })
  vi.clearAllMocks()
})

beforeEach(() => {
  vi.clearAllMocks()
  useQuickCaptureStore.setState({ isOpen: false })
  useCapture.mockReturnValue({ mutateAsync: vi.fn(async () => undefined), isPending: false })
})

describe('almanac coverage-critical files', () => {
  it('loads mock almanac entries fixture data', () => {
    expect(almanacMockEntries.length).toBeGreaterThan(0)
    expect(almanacMockEntries.at(0)?.tags.length).toBeGreaterThan(0)
  })

  it('covers quick capture store state transitions', () => {
    expect(useQuickCaptureStore.getState().isOpen).toBe(false)
    useQuickCaptureStore.getState().open()
    expect(useQuickCaptureStore.getState().isOpen).toBe(true)
    useQuickCaptureStore.getState().toggle()
    expect(useQuickCaptureStore.getState().isOpen).toBe(false)
    useQuickCaptureStore.getState().close()
    expect(useQuickCaptureStore.getState().isOpen).toBe(false)
  })

  it('app shell shortcut ignores editable fields and toggles capture elsewhere', async () => {
    const { AppShell } = await import('../pages/app-shell')
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<AppShell />} />
        </Routes>
      </MemoryRouter>,
    )

    const searchField = screen.getByPlaceholderText('Search entries, people, or tags...')
    await user.click(searchField)
    fireEvent.keyDown(searchField, { key: 'k', metaKey: true })
    expect(useQuickCaptureStore.getState().isOpen).toBe(false)

    fireEvent.keyDown(document.body, { key: 'k', metaKey: true, bubbles: true })
    expect(useQuickCaptureStore.getState().isOpen).toBe(true)

    fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true, bubbles: true })
    expect(useQuickCaptureStore.getState().isOpen).toBe(false)

    fireEvent.keyDown(document.body, { key: 'a', metaKey: true, bubbles: true })
    expect(useQuickCaptureStore.getState().isOpen).toBe(false)
  })

  it('app shell uses active element fallback for shortcut target', async () => {
    const { AppShell } = await import('../pages/app-shell')
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'k',
      metaKey: true,
    })
    Object.defineProperty(event, 'target', {
      configurable: true,
      value: null,
    })

    render(
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<AppShell />} />
        </Routes>
      </MemoryRouter>,
    )

    globalThis.dispatchEvent(event)
    expect(useQuickCaptureStore.getState().isOpen).toBe(true)
  })

  it('task list marks complete and rolls back on error', async () => {
    const { TaskList } = await import('../features/almanac/components/TaskList')
    const user = userEvent.setup()
    const pendingTaskCompletion = new Promise<void>(() => {})
    const completeTask = vi.fn(() => pendingTaskCompletion)
    const failTask = vi.fn(async () => Promise.reject(new Error('nope')))
    const completedTask = { ...dueTask, is_completed: true }

    const { rerender } = render(<TaskList entries={[dueTask]} onComplete={completeTask} />)
    const completeBox = screen.getByRole('checkbox', { name: /Mark Book dinner completed/i })
    await user.click(completeBox)
    expect(completeTask).toHaveBeenCalledWith('a1', true)
    expect(completeBox).toBeChecked()

    rerender(<TaskList entries={[completedTask]} onComplete={failTask} />)
    const failedBox = screen.getByRole('checkbox', { name: /Mark Book dinner completed/i })
    await user.click(failedBox)
    expect(failTask).toHaveBeenCalledWith('a1', false)
    await waitFor(() => expect(failedBox).toBeChecked())

    rerender(<TaskList entries={[]} onComplete={completeTask} />)
    expect(screen.getByText('No tasks yet.')).toBeInTheDocument()
  })

  it('task list handles overdue and missing field branches', async () => {
    const { TaskList } = await import('../features/almanac/components/TaskList')
    const user = userEvent.setup()
    const completeTask = vi.fn(async () => undefined)

    render(<TaskList entries={[noDueNoBodyTask, overdueTask, dueTask]} onComplete={completeTask} />)
    const overdueTaskArticle = screen.getByText('Submit taxes').closest('article')
    const noDueTaskArticle = screen.getByText('Unscheduled task').closest('article')
    expect(overdueTaskArticle).toHaveClass('rounded-xl border bg-amber-50/40 border-amber-300 p-4')
    expect(noDueTaskArticle).toHaveClass('rounded-xl border border-slate-200 bg-white p-4')
    expect(screen.getAllByText('No due date')).toHaveLength(1)
    const noDueBodyParagraph = noDueTaskArticle?.querySelector('span p:last-child')
    expect(noDueBodyParagraph?.textContent).toBe('')

    await user.click(screen.getByRole('checkbox', { name: /Mark Submit taxes completed/i }))
    await user.click(screen.getByRole('checkbox', { name: /Mark Unscheduled task completed/i }))
    await user.click(screen.getByRole('checkbox', { name: /Mark Book dinner completed/i }))
    expect(completeTask).toHaveBeenCalledTimes(3)
    expect(screen.getByText('No due date')).toBeInTheDocument()
  })

  it('task list handles rapid toggles without stale rollback side effects', async () => {
    const { TaskList } = await import('../features/almanac/components/TaskList')
    const user = userEvent.setup()
    let resolveFirst: () => void
    let resolveSecond: () => void
    const firstRequest = new Promise<void>((resolve) => {
      resolveFirst = resolve
    })
    const secondRequest = new Promise<void>((resolve) => {
      resolveSecond = resolve
    })
    const completeTask = vi
      .fn()
      .mockReturnValueOnce(firstRequest)
      .mockReturnValueOnce(secondRequest)

    render(<TaskList entries={[dueTask]} onComplete={completeTask} />)
    const checkbox = screen.getByRole('checkbox', { name: /Mark Book dinner completed/i })

    await user.click(checkbox)
    await user.click(checkbox)
    expect(completeTask).toHaveBeenCalledTimes(2)

    resolveFirst!()
    await waitFor(() => expect(checkbox).not.toBeChecked())

    resolveSecond!()
    await waitFor(() => expect(checkbox).not.toBeChecked())
  })

  it('quick capture panel handles success', async () => {
    const { QuickCapturePanel } = await import('../features/almanac/components/QuickCapturePanel')
    const captureSuccess = vi.fn(async () => undefined)
    const user = userEvent.setup()
    useCapture.mockReturnValue({ mutateAsync: captureSuccess, isPending: false })

    useQuickCaptureStore.getState().open()
    render(<QuickCapturePanel />)
    await user.type(screen.getByPlaceholderText("What's on your mind?"), 'Daily note')
    await user.type(screen.getByPlaceholderText('Add details...'), 'A reminder')
    await user.selectOptions(screen.getByRole('combobox'), 'task')
    await user.click(screen.getByRole('button', { name: 'Capture' }))
    expect(captureSuccess).toHaveBeenCalledWith({
      title: 'Daily note',
      body: 'A reminder',
      entry_type: 'task',
    })
    expect(useQuickCaptureStore.getState().isOpen).toBe(false)
    expect(screen.getByText('Captured successfully')).toBeInTheDocument()
  })

  it('quick capture panel surfaces errors', async () => {
    const { QuickCapturePanel } = await import('../features/almanac/components/QuickCapturePanel')
    const user = userEvent.setup()
    const captureFailure = vi.fn(async () => Promise.reject(new Error('x')))
    useCapture.mockReturnValue({ mutateAsync: captureFailure, isPending: false })

    useQuickCaptureStore.getState().open()
    render(<QuickCapturePanel />)
    await user.type(screen.getByPlaceholderText("What's on your mind?"), 'Failed note')
    await user.click(screen.getByRole('button', { name: 'Capture' }))
    expect(await screen.findByText('Capture failed. Please try again.')).toBeInTheDocument()
    expect(useQuickCaptureStore.getState().isOpen).toBe(true)
  })

  it('quick capture panel does not submit when title is empty', async () => {
    const { QuickCapturePanel } = await import('../features/almanac/components/QuickCapturePanel')
    const user = userEvent.setup()
    const capture = vi.fn(async () => undefined)
    useCapture.mockReturnValue({ mutateAsync: capture, isPending: false })

    useQuickCaptureStore.getState().open()
    render(<QuickCapturePanel />)
    await user.type(screen.getByPlaceholderText("What's on your mind?"), '   ')
    await user.click(screen.getByRole('button', { name: 'Capture' }))

    expect(capture).not.toHaveBeenCalled()
    expect(useQuickCaptureStore.getState().isOpen).toBe(true)
  })

  it('quick capture clears success toast after auto-dismiss delay', async () => {
    const { QuickCapturePanel } = await import('../features/almanac/components/QuickCapturePanel')
    const user = userEvent.setup()
    const captureSuccess = vi.fn(async () => undefined)
    useCapture.mockReturnValue({ mutateAsync: captureSuccess, isPending: false })

    useQuickCaptureStore.getState().open()
    render(<QuickCapturePanel />)
    const titleField = screen.getByPlaceholderText("What's on your mind?")
    const captureButton = screen.getByRole('button', { name: 'Capture' })
    await user.type(titleField, 'Daily note')
    await user.click(captureButton)

    await waitFor(() =>
      expect(captureSuccess).toHaveBeenCalledWith({
        title: 'Daily note',
        body: undefined,
        entry_type: 'random_thought',
      }),
    )

    expect(screen.getByText('Captured successfully')).toBeInTheDocument()
    await waitFor(
      () => {
        expect(screen.queryByText('Captured successfully')).not.toBeInTheDocument()
      },
      { timeout: 2000 },
    )
  })

  it('almanac page applies filters, tabs, and empty/loading branches', async () => {
    const { AlmanacPage } = await import('../features/almanac/routes/AlmanacPage')
    const user = userEvent.setup()
    useAlmanacList.mockImplementation((filters) => {
      if (filters.search === 'loading' && filters.entry_type === 'task') {
        return { isLoading: true, data: null }
      }
      if (filters.entry_type === 'task') {
        return { isLoading: false, ...makeListQueryResult([dueTask]) }
      }
      if (filters.search === 'none') {
        return { isLoading: false, ...makeListQueryResult([]) }
      }
      return { isLoading: false, ...makeListQueryResult([ideaEntry]) }
    })

    const completeTask = vi.fn(async () => undefined)
    useCompleteEntry.mockReturnValue({ mutateAsync: completeTask })
    useUpdateEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })
    const AlmanacWithLocation = () => (
      <>
        <LocationEcho />
        <AlmanacPage />
      </>
    )

    render(
      <MemoryRouter initialEntries={['/almanac?entry_type=task']}>
        <Routes>
          <Route path="/almanac" element={<AlmanacWithLocation />} />
          <Route path="/almanac/new" element={<div>new editor</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('checkbox', { name: /Mark Book dinner completed/ })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Mark Book dinner completed/ }))
    expect(completeTask).toHaveBeenCalledWith('a1')

    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByRole('link', { name: /Plan walk/i })).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText('Search title, body, tags...')
    await user.clear(searchInput)
    await user.type(searchInput, 'none')
    expect(screen.getByTestId('search').textContent).toContain('search=none')
    expect(screen.getByText('No entries match this filter.')).toBeInTheDocument()

    const tagInput = screen.getByPlaceholderText('Filter by tag...')
    await user.clear(tagInput)
    await user.type(tagInput, 'habit')
    expect(screen.getByTestId('search').textContent).toContain('tag=habit')
    await user.clear(tagInput)

    await user.clear(searchInput)
    expect(screen.getByText('Plan walk')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New entry' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'New entry' }))
    expect(screen.getByText('new editor')).toBeInTheDocument()
  })

  it('almanac page handles fallback list data, nullish body, and tab filter values', async () => {
    const { AlmanacPage } = await import('../features/almanac/routes/AlmanacPage')
    const user = userEvent.setup()

    useAlmanacList.mockImplementation((filters) => {
      if (filters.entry_type === 'idea') return { isLoading: false, ...makeListQueryResult([ideaEntryWithNoBody]) }
      return { isLoading: false, data: undefined as unknown as { data: AlmanacEntry[]; meta: { page: number; page_size: number; total: number } } }
    })

    useCompleteEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })
    useUpdateEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })

    const AlmanacWithLocation = () => (
      <>
        <LocationEcho />
        <AlmanacPage />
      </>
    )

    render(
      <MemoryRouter initialEntries={['/almanac?search=active&tag=work']}>
        <Routes>
          <Route path="/almanac" element={<AlmanacWithLocation />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('No entries match this filter.')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Search title, body, tags...'), { target: { value: '' } })
    fireEvent.change(screen.getByPlaceholderText('Filter by tag...'), { target: { value: '' } })

    await user.click(screen.getByRole('button', { name: 'Idea' }))
    expect(screen.getByText('Idea with no body')).toBeInTheDocument()

    const ideaBodyElement = screen
      .getByRole('link', { name: /Idea with no body/ })
      .querySelector('p.line-clamp-2')
    expect(ideaBodyElement).toBeTruthy()
    expect(ideaBodyElement?.textContent).toBe('')

    await user.clear(screen.getByPlaceholderText('Search title, body, tags...'))
    await user.type(screen.getByPlaceholderText('Search title, body, tags...'), 'active')
    expect(screen.getByTestId('search').textContent).toContain('search=active')
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('No entries match this filter.')).toBeInTheDocument()
  })

  it('removes search and tag params when filters are cleared', async () => {
    const { AlmanacPage } = await import('../features/almanac/routes/AlmanacPage')
    const user = userEvent.setup()
    useAlmanacList.mockReturnValue({
      isLoading: false,
      ...makeListQueryResult([ideaEntry]),
    })
    useCompleteEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })
    useUpdateEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })

    const AlmanacWithLocation = () => (
      <>
        <LocationEcho />
        <AlmanacPage />
      </>
    )

    render(
      <MemoryRouter initialEntries={['/almanac?entry_type=task&search=active&tag=habit']}>
        <Routes>
          <Route path="/almanac" element={<AlmanacWithLocation />} />
        </Routes>
      </MemoryRouter>,
    )

    const searchInput = screen.getByPlaceholderText('Search title, body, tags...')
    const tagInput = screen.getByPlaceholderText('Filter by tag...')
    await user.clear(searchInput)
    await user.clear(tagInput)
    expect(screen.getByTestId('search').textContent).not.toContain('search=')
    expect(screen.getByTestId('search').textContent).not.toContain('tag=')
  })

  it('almanac page supports uncompleting a completed task', async () => {
    const { AlmanacPage } = await import('../features/almanac/routes/AlmanacPage')
    const user = userEvent.setup()
    const completedDueTask = { ...dueTask, is_completed: true }
    const uncompleteTask = vi.fn(async () => undefined)
    useAlmanacList.mockReturnValue({
      isLoading: false,
      ...makeListQueryResult([completedDueTask]),
    })
    useCompleteEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })
    useUpdateEntry.mockReturnValue({ mutateAsync: uncompleteTask })

    render(
      <MemoryRouter initialEntries={['/almanac?entry_type=task']}>
        <Routes>
          <Route path="/almanac" element={<AlmanacPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('checkbox', { name: /Mark Book dinner completed/ }))
    expect(uncompleteTask).toHaveBeenCalledWith({
      id: 'a1',
      payload: { is_completed: false, completed_at: null },
    })
  })

  it('almanac page validates invalid query values', async () => {
    const { AlmanacPage } = await import('../features/almanac/routes/AlmanacPage')
    useAlmanacList.mockImplementation((filters) => {
      if (filters.entry_type === 'task') return { isLoading: false, ...makeListQueryResult([dueTask]) }
      return { isLoading: false, ...makeListQueryResult([ideaEntry]) }
    })
    useCompleteEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })
    useUpdateEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })

    render(
      <MemoryRouter initialEntries={['/almanac?entry_type=invalid']}>
        <Routes>
          <Route path="/almanac" element={<AlmanacPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getAllByText('All').length).toBeGreaterThan(0)
    expect(screen.getByText('Plan walk')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Mark Book dinner completed/ })).not.toBeInTheDocument()
  })

  it('almanac page displays loading state before entries resolve', async () => {
    const { AlmanacPage } = await import('../features/almanac/routes/AlmanacPage')
    useAlmanacList.mockReturnValue({
      isLoading: true,
      ...makeListQueryResult([]),
    })
    useCompleteEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })
    useUpdateEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })

    render(
      <MemoryRouter initialEntries={['/almanac?entry_type=all&search=loading']}>
        <Routes>
          <Route path="/almanac" element={<AlmanacPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Loading entries...')).toBeInTheDocument()
  })

  it('renders non-due task rows without due badges on all-tab view', async () => {
    const { AlmanacPage } = await import('../features/almanac/routes/AlmanacPage')
    const taskWithoutDue = {
      ...dueTask,
      id: 'a4',
      title: 'No due task',
      due_date: null,
    }
    useAlmanacList.mockReturnValue({
      isLoading: false,
      ...makeListQueryResult([ideaEntry, taskWithoutDue, dueTask]),
    })
    useCompleteEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })
    useUpdateEntry.mockReturnValue({ mutateAsync: vi.fn(async () => undefined) })

    render(
      <MemoryRouter initialEntries={['/almanac?entry_type=all']}>
        <Routes>
          <Route path="/almanac" element={<AlmanacPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Plan walk')).toBeInTheDocument()
    expect(screen.getByText('No due task')).toBeInTheDocument()
    expect(screen.getByText(/Due 2026-03-28/)).toBeInTheDocument()
    const noDueTaskRow = screen.getByText('No due task').closest('div')
    expect(noDueTaskRow?.textContent).not.toMatch(/Due /)
  })

  it('almanac editor can cancel and create task fields', async () => {
    const { AlmanacEditorPage } = await import('../features/almanac/routes/AlmanacEditorPage')
    const createEntry = vi.fn(async () => ({ id: 'created' }))
    useCreateEntry.mockReturnValue({ mutateAsync: createEntry })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/new']}>
        <Routes>
          <Route path="/almanac/new" element={<AlmanacEditorPage />} />
          <Route path="/almanac" element={<div>Almanac list</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Task from editor')
    await user.selectOptions(screen.getByRole('combobox'), 'task')
    await user.type(screen.getByLabelText('Due Date'), '2026-03-11')
    await user.type(screen.getByLabelText('Reminder'), '2026-03-11T08:30')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Almanac list')).toBeInTheDocument()
  })

  it('almanac editor blocks create when title is blank', async () => {
    const { AlmanacEditorPage } = await import('../features/almanac/routes/AlmanacEditorPage')
    const createEntry = vi.fn(async () => ({ id: 'created' }))
    useCreateEntry.mockReturnValue({ mutateAsync: createEntry })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/new']}>
        <Routes>
          <Route path="/almanac/new" element={<AlmanacEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const titleField = screen.getByRole('textbox', { name: 'Title' })
    await user.type(titleField, '   ')
    await user.click(screen.getByRole('button', { name: 'Create Entry' }))
    expect(createEntry).not.toHaveBeenCalled()
  })

  it('almanac editor sends create payload and clears errors', async () => {
    const { AlmanacEditorPage } = await import('../features/almanac/routes/AlmanacEditorPage')
    const createEntry = vi.fn(async () => ({ id: 'created' }))
    useCreateEntry.mockReturnValue({ mutateAsync: createEntry })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/new']}>
        <Routes>
          <Route path="/almanac/new" element={<AlmanacEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const textboxes = screen.getAllByRole('textbox')
    await user.type(textboxes[0], 'Note')
    await user.type(textboxes[1], 'Body')
    await user.type(textboxes[2], 'focus,weekly')
    await user.selectOptions(screen.getByRole('combobox'), 'random_thought')
    await user.click(screen.getByRole('button', { name: 'Create Entry' }))

    expect(createEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Note',
        body: 'Body',
        entry_type: 'random_thought',
        tag_names: ['focus', 'weekly'],
      }),
    )
  })

  it('almanac editor submits task payload with date fields', async () => {
    const { AlmanacEditorPage } = await import('../features/almanac/routes/AlmanacEditorPage')
    const createEntry = vi.fn(async () => ({ id: 'created' }))
    useCreateEntry.mockReturnValue({ mutateAsync: createEntry })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/new']}>
        <Routes>
          <Route path="/almanac/new" element={<AlmanacEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const titleField = screen.getByRole('textbox', { name: 'Title' })
    const bodyField = screen.getByRole('textbox', { name: 'Body' })
    await user.type(titleField, 'Task from editor')
    await user.type(bodyField, 'Task body')
    await user.selectOptions(screen.getByRole('combobox'), 'task')
    await user.type(screen.getByLabelText('Due Date'), '2026-03-11')
    await user.type(screen.getByLabelText('Reminder'), '2026-03-11T08:30')
    await user.type(screen.getByLabelText('Tags (comma separated)'), 'life,work')
    await user.click(screen.getByRole('button', { name: 'Create Entry' }))

    expect(createEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Task from editor',
        body: 'Task body',
        entry_type: 'task',
        tag_names: ['life', 'work'],
        due_date: '2026-03-11',
      }),
    )
    const calledArgs = createEntry.mock.calls[0]?.[0]
    expect(calledArgs.reminder_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('almanac editor indicates submitting state while save is pending', async () => {
    const { AlmanacEditorPage } = await import('../features/almanac/routes/AlmanacEditorPage')
    useCreateEntry.mockReturnValue({ mutateAsync: vi.fn(async () => ({ id: 'created' })), isPending: true })

    render(
      <MemoryRouter initialEntries={['/almanac/new']}>
        <Routes>
          <Route path="/almanac/new" element={<AlmanacEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
  })

  it('almanac editor reports submission failures', async () => {
    const { AlmanacEditorPage } = await import('../features/almanac/routes/AlmanacEditorPage')
    const createFailed = vi.fn(async () => {
      throw new Error('failed')
    })
    useCreateEntry.mockReturnValue({ mutateAsync: createFailed })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/almanac/new']}>
        <Routes>
          <Route path="/almanac/new" element={<AlmanacEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const textboxes = screen.getAllByRole('textbox')
    await user.type(textboxes[0], 'Bad')
    await user.click(screen.getByRole('button', { name: 'Create Entry' }))
    expect(await screen.findByText('Could not create entry. Please try again.')).toBeInTheDocument()
  })
})

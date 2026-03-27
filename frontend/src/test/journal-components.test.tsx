import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const useJournalList = vi.fn()
const useDailyPrompt = vi.fn()
const useTags = vi.fn()
const useJournalEntry = vi.fn()
const useCreateEntry = vi.fn()
const useUpdateEntry = vi.fn()
const useDeleteEntry = vi.fn()
const useReflect = vi.fn()
const useStreamReflect = vi.fn()
const useGetAiRuns = vi.fn()
const useLatestDigest = vi.fn()
const usePeopleList = vi.fn()

vi.mock('../features/journal/hooks/useJournal', () => ({
  useJournalList,
  useDailyPrompt,
  useTags,
  useJournalEntry,
  useCreateEntry,
  useUpdateEntry,
  useDeleteEntry,
  useReflect,
  useStreamReflect,
  useGetAiRuns,
  useLatestDigest,
}))

vi.mock('../features/people/hooks/usePeople', () => ({
  usePeopleList,
}))

describe('journal components and routes', () => {
  afterEach(() => {
    cleanup()
    sessionStorage.clear()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    useDailyPrompt.mockReturnValue({ data: { prompt: 'Prompt', source: 'static' }, isLoading: false })
    useTags.mockReturnValue({ data: [{ id: 't1', name: 'work' }] })
    usePeopleList.mockReturnValue({ data: { data: [{ id: 'p1', name: 'Sam', relationship_type: 'friend', location: null, archived_at: null }] } })
    useJournalEntry.mockReturnValue({ data: null, isLoading: false })
    useCreateEntry.mockReturnValue({ mutate: vi.fn() })
    useUpdateEntry.mockReturnValue({ mutate: vi.fn() })
    useDeleteEntry.mockReturnValue({ mutate: vi.fn() })
    useReflect.mockReturnValue({ mutate: vi.fn(), isPending: false })
    useStreamReflect.mockReturnValue({ isStreaming: false, streamedText: '', start: vi.fn() })
    useGetAiRuns.mockReturnValue({ data: [] })
    useLatestDigest.mockReturnValue({ data: null, isLoading: false })
  })

  it('renders journal list page', async () => {
    const { JournalListPage } = await import('../features/journal/routes/JournalListPage')
    useJournalList.mockReturnValue({
      isLoading: false,
      data: {
        data: [
          { id: 'j1', entry_date: '2026-01-01', mood: 3, body: 'Entry body', tags: [{ id: 't1', name: 'work' }], people: [{ id: 'p1', name: 'Sam' }] },
        ],
      },
    })
    render(
      <MemoryRouter>
        <JournalListPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Journal')).toBeInTheDocument()
    expect(screen.getByText('Entry body')).toBeInTheDocument()
  })

  it('renders journal list loading and empty states', async () => {
    const { JournalListPage } = await import('../features/journal/routes/JournalListPage')
    useJournalList.mockReturnValueOnce({ isLoading: true, data: null })
    const { rerender } = render(
      <MemoryRouter>
        <JournalListPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading entries...')).toBeInTheDocument()

    useJournalList.mockReturnValueOnce({ isLoading: false, data: { data: [] } })
    rerender(
      <MemoryRouter>
        <JournalListPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('No entries yet.')).toBeInTheDocument()
  })

  it('renders editor mention flow and submit', async () => {
    const { JournalEditorPage } = await import('../features/journal/routes/JournalEditorPage')
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/journal/new']}>
        <Routes>
          <Route path="/journal/new" element={<JournalEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await user.type(screen.getByPlaceholderText('Write your journal entry. Type @ to mention people.'), 'Hello @Sa')
    expect(screen.getByLabelText('Mention suggestions')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Samfriend' }))
    await user.type(screen.getByPlaceholderText('Add tags...'), 'work{enter}')
    await user.click(screen.getByRole('button', { name: 'Create Entry' }))
  })

  it('renders entry page with reflection panel', async () => {
    const { JournalEntryPage } = await import('../features/journal/routes/JournalEntryPage')
    useJournalEntry.mockReturnValue({
      isLoading: false,
      data: {
        id: 'j1',
        entry_date: '2026-01-01',
        body: 'Body',
        mood: 3,
        tags: [],
        people: [{ id: 'p1', name: 'Sam' }],
        latest_ai_reflection: null,
      },
    })
    render(
      <MemoryRouter initialEntries={['/journal/j1']}>
        <Routes>
          <Route path="/journal/:entryId" element={<JournalEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Journal Entry')).toBeInTheDocument()
    expect(screen.getByText('No reflection yet.')).toBeInTheDocument()
  })

  it('ai reflection panel supports history and actions', async () => {
    const { AiReflectionPanel } = await import('../features/journal/components/AiReflectionPanel')
    const mutate = vi.fn()
    const start = vi.fn()
    const user = userEvent.setup()
    useReflect.mockReturnValueOnce({ mutate, isPending: false })
    useStreamReflect.mockReturnValueOnce({ isStreaming: true, streamedText: '', start })
    useGetAiRuns.mockReturnValueOnce({ data: [{ id: 'r1', status: 'completed', response_text: null }] })
    render(<AiReflectionPanel entryId="j1" latestReflection={null} />)

    expect(screen.getAllByText('Streaming...').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Reflect' }))
    expect(mutate).toHaveBeenCalled()
    expect(start).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'History' }))
    expect(screen.getByRole('button', { name: 'Hide History' })).toBeInTheDocument()
  })

  it('editor page edit mode submits update payload', async () => {
    const { JournalEditorPage } = await import('../features/journal/routes/JournalEditorPage')
    const updateMutate = vi.fn()
    const user = userEvent.setup()
    useJournalEntry.mockReturnValueOnce({
      isLoading: false,
      data: {
        id: 'j1',
        entry_date: '2026-01-01',
        body: 'Existing body',
        mood: 2,
        tags: [],
        people: [],
        latest_ai_reflection: null,
      },
    })
    useUpdateEntry.mockReturnValueOnce({ mutate: updateMutate })

    render(
      <MemoryRouter initialEntries={['/journal/j1/edit']}>
        <Routes>
          <Route path="/journal/:entryId/edit" element={<JournalEditorPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(updateMutate).toHaveBeenCalled()
  })

  it('renders entry page loading and not found', async () => {
    const { JournalEntryPage } = await import('../features/journal/routes/JournalEntryPage')
    useJournalEntry.mockReturnValueOnce({ isLoading: true, data: null })
    const { rerender } = render(
      <MemoryRouter initialEntries={['/journal/j1']}>
        <Routes>
          <Route path="/journal/:entryId" element={<JournalEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading entry...')).toBeInTheDocument()

    useJournalEntry.mockReturnValueOnce({ isLoading: false, data: null })
    rerender(
      <MemoryRouter initialEntries={['/journal/j1']}>
        <Routes>
          <Route path="/journal/:entryId" element={<JournalEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Entry not found.')).toBeInTheDocument()
  })

  it('daily prompt banner dismisses for session', async () => {
    const { DailyPromptBanner } = await import('../features/journal/components/DailyPromptBanner')
    const user = userEvent.setup()
    render(<DailyPromptBanner />)
    const writeButton = screen.getAllByRole('button', { name: 'Write Entry' }).at(-1)
    if (!writeButton) throw new Error('Write Entry button not found')
    await user.click(writeButton)
    expect(screen.queryAllByText('Prompt').length).toBe(0)
  })

  it('daily prompt banner shows personalised label for ai source', async () => {
    const { DailyPromptBanner } = await import('../features/journal/components/DailyPromptBanner')
    useDailyPrompt.mockReturnValueOnce({
      data: { prompt: 'What felt unexpectedly meaningful today?', source: 'ai' },
      isLoading: false,
    })
    render(<DailyPromptBanner />)
    expect(screen.getByText('Personalised for you')).toBeInTheDocument()
  })

  it('weekly digest card expands and collapses', async () => {
    const { WeeklyDigestCard } = await import('../features/journal/components/WeeklyDigestCard')
    const user = userEvent.setup()
    render(
      <WeeklyDigestCard
        digestText={
          'You maintained steady momentum this week and showed up for yourself.\n\nYou also reached out to two people who seem to ground you.'
        }
      />,
    )

    expect(screen.queryByText('You also reached out to two people who seem to ground you.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Read full digest/i }))
    expect(screen.getByText('You also reached out to two people who seem to ground you.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Show less/i }))
    expect(screen.queryByText('You also reached out to two people who seem to ground you.')).not.toBeInTheDocument()
  })

  it('weekly digest card renders loading and empty states', async () => {
    const { WeeklyDigestCard } = await import('../features/journal/components/WeeklyDigestCard')
    const { rerender } = render(<WeeklyDigestCard isLoading />)
    expect(screen.getByText('Loading weekly digest...')).toBeInTheDocument()
    rerender(<WeeklyDigestCard isEmpty />)
    expect(screen.getByText('Your first weekly digest will appear after the end of the week.')).toBeInTheDocument()
  })

  it('tag input supports suggestion click and removal', async () => {
    const { TagInput } = await import('../features/shared/components/TagInput')
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagInput onChange={onChange} options={['work', 'wellness']} value={['work']} />)
    const removeButton = screen.getAllByRole('button', { name: 'Remove work' }).at(-1)
    if (!removeButton) throw new Error('Remove work button not found')
    await user.click(removeButton)
    expect(onChange).toHaveBeenCalledWith([])

    const tagInput = screen.getAllByPlaceholderText('Add tags...').at(-1)
    if (!tagInput) throw new Error('Tag input not found')
    await user.type(tagInput, 'wel')
    const wellnessButton = screen.getAllByRole('button', { name: 'wellness' }).at(-1)
    if (!wellnessButton) throw new Error('Wellness suggestion not found')
    await user.click(wellnessButton)
    expect(onChange).toHaveBeenCalledWith(['work', 'wellness'])
  })

  it('people mention input handles keyboard and remove', async () => {
    const { PeopleMentionInput } = await import('../features/journal/components/PeopleMentionInput')
    const onChange = vi.fn()
    const onSelectedPeopleChange = vi.fn()
    const user = userEvent.setup()
    render(
      <PeopleMentionInput
        onChange={onChange}
        onSelectedPeopleChange={onSelectedPeopleChange}
        peopleOptions={[{ id: 'p1', name: 'Sam', relationship_type: 'friend', location: 'NYC', archived_at: null }]}
        selectedPeople={[{ id: 'p1', name: 'Sam', relationship_type: 'friend', location: 'NYC' }]}
        value={'Hello @Sa'}
      />,
    )
    const input = screen.getAllByPlaceholderText('Write your journal entry. Type @ to mention people.').at(-1)
    if (!input) throw new Error('Mention input not found')
    await user.click(input)
    await user.keyboard('{ArrowDown}{ArrowUp}{Tab}{Escape}')
    expect(onChange).toHaveBeenCalled()
    const removeButton = screen.getAllByRole('button', { name: 'Remove Sam' }).at(-1)
    if (!removeButton) throw new Error('Remove Sam button not found')
    await user.click(removeButton)
    expect(onSelectedPeopleChange).toHaveBeenCalledWith([])
  })

  it('renders standalone shared components', async () => {
    const { MoodSelector } = await import('../features/journal/components/MoodSelector')
    const { DailyPromptBanner } = await import('../features/journal/components/DailyPromptBanner')
    const { TagInput } = await import('../features/shared/components/TagInput')
    const onChange = vi.fn()
    render(<MoodSelector onChange={onChange} value={null} />)
    await userEvent.click(screen.getAllByRole('button', { name: /1 - Very low/ })[0])
    render(<MoodSelector onChange={onChange} value={1} />)
    await userEvent.click(screen.getAllByRole('button', { name: /1 - Very low/ })[1])
    render(<DailyPromptBanner />)
    expect(screen.getAllByText('Prompt').length).toBeGreaterThan(0)
    render(<TagInput onChange={onChange} options={['work']} value={[]} />)
    await userEvent.type(screen.getAllByPlaceholderText('Add tags...')[0], 'work{enter}')
  })
})

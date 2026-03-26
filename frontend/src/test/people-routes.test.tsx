import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const usePeopleList = vi.fn()
const usePerson = vi.fn()
const useCreatePerson = vi.fn()
const useUpdatePerson = vi.fn()
const useDeletePerson = vi.fn()
const useDriftingAway = vi.fn(() => ({ isLoading: false, data: [] }))
const useMoments = vi.fn()
const useCreateMoment = vi.fn()

vi.mock('../features/people/hooks/usePeople', () => ({
  usePeopleList,
  usePerson,
  useCreatePerson,
  useUpdatePerson,
  useDeletePerson,
  useDriftingAway,
}))

vi.mock('../features/moments/hooks/useMoments', () => ({
  useMoments,
  useCreateMoment,
}))

describe('people routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('people list page renders list and drifting toggle', async () => {
    const { PeopleListPage } = await import('../features/people/routes/PeopleListPage')
    usePeopleList.mockReturnValue({
      isLoading: false,
      data: {
        data: [
          {
            id: 'p1',
            name: 'Ada',
            relationship_type: 'friend',
            birthday: null,
            location: null,
            notes: null,
            contact_cadence_days: null,
            warmth_score: 0.2,
            last_talked_at: null,
            next_nudge_at: null,
            archived_at: null,
          },
        ],
      },
    })

    render(
      <MemoryRouter>
        <PeopleListPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Your People')).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText('Search by name...'), 'Ada')
    await userEvent.selectOptions(screen.getByDisplayValue('All'), 'friend')
    await userEvent.click(screen.getByRole('button', { name: 'Show drifting away' }))
    expect(screen.getByRole('button', { name: 'Show list' })).toBeInTheDocument()

    usePeopleList.mockReturnValueOnce({ isLoading: true, data: { data: [] } })
    render(
      <MemoryRouter>
        <PeopleListPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('person detail handles loading, missing, and full view', async () => {
    const { PersonDetailPage } = await import('../features/people/routes/PersonDetailPage')
    const mutate = vi.fn()
    const mutateAsync = vi.fn(async () => undefined)
    useDeletePerson.mockReturnValue({ mutate })
    useCreateMoment.mockReturnValue({ mutateAsync })

    usePerson.mockReturnValueOnce({ isLoading: true, data: null })
    useMoments.mockReturnValue({ data: [] })
    const { rerender } = render(
      <MemoryRouter initialEntries={['/people/p1']}>
        <Routes>
          <Route path="/people/:personId" element={<PersonDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading person...')).toBeInTheDocument()

    usePerson.mockReturnValueOnce({ isLoading: false, data: null })
    rerender(
      <MemoryRouter initialEntries={['/people/p1']}>
        <Routes>
          <Route path="/people/:personId" element={<PersonDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Person not found.')).toBeInTheDocument()

    usePerson.mockReturnValue({
      isLoading: false,
      data: {
        id: 'p1',
        name: 'Ada Lovelace',
        relationship_type: 'close_friend',
        birthday: null,
        location: 'London',
        notes: null,
        contact_cadence_days: null,
        warmth_score: 0.5,
        last_talked_at: '2026-01-01',
        next_nudge_at: '2026-01-02',
        archived_at: null,
      },
    })
    useMoments.mockReturnValue({
      data: [{ id: 'm1', title: 'x', moment_type: 'conversation', sentiment: 'warm', occurred_on: '2026-01-01', what_happened: 'Talked', notes: null }],
    })
    rerender(
      <MemoryRouter initialEntries={['/people/p1']}>
        <Routes>
          <Route path="/people/:personId" element={<PersonDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    expect(mutate).toHaveBeenCalledWith('p1')
    await userEvent.click(screen.getByRole('button', { name: 'Add New' }))
    expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument()
    await userEvent.type(screen.getByPlaceholderText('Title'), 'Follow up')
    await userEvent.type(screen.getByPlaceholderText('What happened?'), 'Great')
    await userEvent.click(screen.getByRole('button', { name: 'Save moment' }))
    expect(mutateAsync).toHaveBeenCalled()

    usePerson.mockReturnValue({
      isLoading: false,
      data: {
        id: 'p2',
        name: 'Grace Hopper',
        relationship_type: 'friend',
        birthday: null,
        location: null,
        notes: null,
        contact_cadence_days: null,
        warmth_score: 0.1,
        last_talked_at: 'not-a-date',
        next_nudge_at: null,
        archived_at: null,
      },
    })
    useMoments.mockReturnValue({ data: [] })
    rerender(
      <MemoryRouter initialEntries={['/people/p2']}>
        <Routes>
          <Route path="/people/:personId" element={<PersonDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('No moments yet. Add your first interaction.')).toBeInTheDocument()
    expect(screen.getByText('Usually meet in San Francisco')).toBeInTheDocument()
    expect(screen.getByText('not-a-date')).toBeInTheDocument()

    usePerson.mockReturnValue({
      isLoading: false,
      data: {
        id: 'p3',
        name: 'Unknown Sentiment',
        relationship_type: 'friend',
        birthday: null,
        location: null,
        notes: null,
        contact_cadence_days: null,
        warmth_score: 0,
        last_talked_at: null,
        next_nudge_at: null,
        archived_at: null,
      },
    })
    useMoments.mockReturnValue({
      data: [{ id: 'm2', title: 'x', moment_type: 'conversation', sentiment: 'mystery', occurred_on: '2026-01-01', what_happened: 'Hmm', notes: null }],
    })
    rerender(
      <MemoryRouter initialEntries={['/people/p3']}>
        <Routes>
          <Route path="/people/:personId" element={<PersonDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('mystery')).toBeInTheDocument()

    useMoments.mockReturnValue({ data: undefined })
    rerender(
      <MemoryRouter initialEntries={['/people/p3']}>
        <Routes>
          <Route path="/people/:personId" element={<PersonDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('No moments yet. Add your first interaction.')).toBeInTheDocument()
  })

  it('person form supports create and edit flows', async () => {
    const { PersonFormPage } = await import('../features/people/routes/PersonFormPage')
    const createMutateAsync = vi.fn(async () => ({ id: 'new-id' }))
    const updateMutateAsync = vi.fn(async () => ({ id: 'edit-id' }))
    useCreatePerson.mockReturnValue({ mutateAsync: createMutateAsync })
    useUpdatePerson.mockReturnValue({ mutateAsync: updateMutateAsync })
    usePerson.mockReturnValue({ data: null, isLoading: false })

    render(
      <MemoryRouter initialEntries={['/people/new']}>
        <Routes>
          <Route path="/people/new" element={<PersonFormPage />} />
          <Route path="/people/:personId" element={<div>Detail Page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText('Name'), 'Alice')
    await userEvent.type(screen.getByLabelText('Contact cadence (days)'), '10')
    await userEvent.type(screen.getByLabelText('Notes'), 'Hi')
    await userEvent.selectOptions(screen.getByLabelText('Relationship type'), 'close_friend')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(createMutateAsync).toHaveBeenCalled()
    expect(await screen.findByText('Detail Page')).toBeInTheDocument()

    render(
      <MemoryRouter initialEntries={['/people/edit-id/edit']}>
        <Routes>
          <Route path="/people/:personId/edit" element={<PersonFormPage />} />
          <Route path="/people/:personId" element={<div>Detail Page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText('Name'), 'Bob')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(updateMutateAsync).toHaveBeenCalled()

    render(
      <MemoryRouter initialEntries={['/people/new']}>
        <Routes>
          <Route path="/people/new" element={<PersonFormPage />} />
          <Route path="/people" element={<div>People List</div>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useCurrentUser = vi.fn()
const useLogin = vi.fn()
const useDriftingAway = vi.fn()
const useMoments = vi.fn()
const useCreateMoment = vi.fn()
const tokenSet = vi.fn()

vi.mock('../features/auth/hooks/useCurrentUser', () => ({ useCurrentUser }))
vi.mock('../features/auth/hooks/useLogin', () => ({ useLogin }))
vi.mock('../features/people/hooks/usePeople', () => ({ useDriftingAway }))
vi.mock('../features/moments/hooks/useMoments', () => ({ useMoments, useCreateMoment }))
vi.mock('../lib/api-client', () => ({ tokenStore: { set: tokenSet } }))

describe('components and pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders warmth badge tones', async () => {
    const { WarmthBadge } = await import('../features/people/components/WarmthBadge')
    const { rerender } = render(<WarmthBadge value={0.5} />)
    expect(screen.getByText('Warm · 50%')).toBeInTheDocument()
    rerender(<WarmthBadge value={-0.3} />)
    expect(screen.getByText('Warm · -30%')).toBeInTheDocument()
    rerender(<WarmthBadge value={0} />)
    expect(screen.getByText('Warm · 0%')).toBeInTheDocument()
  })

  it('renders person card values and link', async () => {
    const { PersonCard } = await import('../features/people/components/PersonCard')
    render(
      <MemoryRouter>
        <PersonCard
          person={{
            id: 'p1',
            name: 'Ada Lovelace',
            relationship_type: 'close_friend',
            birthday: null,
            location: null,
            notes: null,
            contact_cadence_days: null,
            warmth_score: 0.42,
            last_talked_at: '2026-01-01',
            next_nudge_at: '2026-01-02',
            archived_at: null,
          }}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Known connection')).toBeInTheDocument()
    expect(screen.getByText('close friend')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/people/p1')
    expect(screen.getByText(/Next:/)).toBeInTheDocument()
    expect(screen.getByText(/Last talked:/)).toBeInTheDocument()
  })

  it('renders drifting away variants', async () => {
    const { DriftingAwayView } = await import('../features/people/components/DriftingAwayView')
    useDriftingAway.mockReturnValue({ isLoading: true, data: undefined })
    const { rerender } = render(
      <MemoryRouter>
        <DriftingAwayView />
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading drifting-away list...')).toBeInTheDocument()

    useDriftingAway.mockReturnValue({ isLoading: false, data: [] })
    rerender(
      <MemoryRouter>
        <DriftingAwayView />
      </MemoryRouter>,
    )
    expect(screen.getByText('Nobody is drifting away right now.')).toBeInTheDocument()

    useDriftingAway.mockReturnValue({ isLoading: false, data: [{ id: 'p1', name: 'Ada', last_talked_at: null }] })
    rerender(
      <MemoryRouter>
        <DriftingAwayView />
      </MemoryRouter>,
    )
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/people/p1')
  })

  it('submits and resets moment form', async () => {
    const { MomentForm } = await import('../features/moments/components/MomentForm')
    const onSubmit = vi.fn(async () => undefined)
    const user = userEvent.setup()

    render(<MomentForm onSubmit={onSubmit} />)
    await user.type(screen.getByPlaceholderText('Title'), 'Call')
    await user.type(screen.getByPlaceholderText('What happened?'), 'Great chat')
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'conflict')
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'warm')
    await user.type(screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/), '{selectall}2026-01-01')
    await user.click(screen.getByRole('button', { name: 'Save moment' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Call',
        what_happened: 'Great chat',
      }),
    )
    expect(screen.getByPlaceholderText('Title')).toHaveValue('')
    expect(screen.getByPlaceholderText('What happened?')).toHaveValue('')
  })

  it('renders moment timeline and forwards create callback', async () => {
    const { MomentTimeline } = await import('../features/moments/components/MomentTimeline')
    const mutateAsync = vi.fn(async () => ({}))
    const user = userEvent.setup()
    useCreateMoment.mockReturnValue({ mutateAsync })
    useMoments.mockReturnValue({
      isLoading: false,
      data: [{ id: 'm1', title: 'Lunch', sentiment: 'warm', occurred_on: '2026-01-01', what_happened: 'Talked', moment_type: 'conversation' }],
    })

    render(<MomentTimeline personId="p1" />)
    expect(screen.getByText('Lunch')).toBeInTheDocument()
    await user.type(screen.getAllByPlaceholderText('Title').at(-1)!, 'Quick note')
    await user.click(screen.getAllByRole('button', { name: 'Save moment' }).at(-1)!)
    expect(mutateAsync).toHaveBeenCalled()

    useMoments.mockReturnValueOnce({ isLoading: true, data: [] })
    render(<MomentTimeline personId="p2" />)
    expect(screen.getByText('Loading moments...')).toBeInTheDocument()
  })

  it('auth guard handles loading, unauthenticated, and children', async () => {
    const { AuthGuard } = await import('../features/auth/components/AuthGuard')
    useCurrentUser.mockReturnValue({ isLoading: true, data: null })
    const { rerender } = render(
      <MemoryRouter>
        <AuthGuard>
          <div>Inner</div>
        </AuthGuard>
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    useCurrentUser.mockReturnValue({ isLoading: false, data: null })
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <AuthGuard>
                <div>Inner</div>
              </AuthGuard>
            }
          />
          <Route path="/login" element={<div>Login target</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Login target')).toBeInTheDocument()

    useCurrentUser.mockReturnValue({ isLoading: false, data: { id: 'u1' } })
    rerender(
      <MemoryRouter>
        <AuthGuard>
          <div>Inner</div>
        </AuthGuard>
      </MemoryRouter>,
    )
    expect(screen.getByText('Inner')).toBeInTheDocument()
  })

  it('login page submits credentials and shows error/pending states', async () => {
    const mutateAsync = vi.fn(async () => undefined)
    const user = userEvent.setup()
    const { LoginPage } = await import('../features/auth/routes/LoginPage')

    useLogin.mockReturnValue({ mutateAsync, isError: false, isPending: false })
    const { rerender } = render(<LoginPage />)
    await user.type(screen.getByPlaceholderText('alex@example.com'), 'a@b.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(mutateAsync).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' })

    useLogin.mockReturnValue({ mutateAsync, isError: true, isPending: true })
    rerender(<LoginPage />)
    expect(screen.getByText('Unable to sign in. Check your credentials and try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Signing In...' })).toBeDisabled()
  })

  it('shell, not found, and placeholder render expected elements', async () => {
    const { AppShell } = await import('../pages/app-shell')
    const { NotFoundPage } = await import('../pages/not-found')
    const { RoutePlaceholder } = await import('../components/layout/route-placeholder')
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })

    render(
      <MemoryRouter initialEntries={['/people']}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route path="people" element={<div>Child</div>} />
            <Route index element={<div>Child</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Tether')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(tokenSet).toHaveBeenCalledWith(null)
    expect(assign).toHaveBeenCalledWith('/login')

    render(
      <MemoryRouter>
        <NotFoundPage />
        <RoutePlaceholder label="Journal" />
      </MemoryRouter>,
    )
    expect(screen.getByText('Page not found')).toBeInTheDocument()
    expect(screen.getByText('Journal placeholder')).toBeInTheDocument()
  })
})

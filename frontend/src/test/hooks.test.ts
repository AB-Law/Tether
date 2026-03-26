import { beforeEach, describe, expect, it, vi } from 'vitest'

const useQuery = vi.fn()
const useMutation = vi.fn()
const invalidateQueries = vi.fn()
const useQueryClient = vi.fn(() => ({ invalidateQueries }))
const navigate = vi.fn()
const streamReflectMock = vi.fn(() => () => undefined)

vi.mock('@tanstack/react-query', () => ({
  useQuery,
  useMutation,
  useQueryClient,
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}))

vi.mock('../features/auth/api/login', () => ({ login: vi.fn(async (payload) => ({ access_token: payload.email })) }))
vi.mock('../features/auth/api/me', () => ({ getCurrentUser: vi.fn(async () => ({ id: 'u1' })) }))
vi.mock('../features/people/api/list-people', () => ({ listPeople: vi.fn(async () => ({ data: [] })) }))
vi.mock('../features/people/api/get-person', () => ({ getPerson: vi.fn(async () => ({ id: 'p1' })) }))
vi.mock('../features/people/api/create-person', () => ({ createPerson: vi.fn(async () => ({ id: 'p1' })) }))
vi.mock('../features/people/api/update-person', () => ({ updatePerson: vi.fn(async () => ({ id: 'p1' })) }))
vi.mock('../features/people/api/delete-person', () => ({ deletePerson: vi.fn(async () => undefined) }))
vi.mock('../features/people/api/get-drifting-away', () => ({ getDriftingAway: vi.fn(async () => []) }))
vi.mock('../features/people/api/get-timeline', () => ({ getTimeline: vi.fn(async () => []) }))
vi.mock('../features/moments/api/list-moments', () => ({ listMoments: vi.fn(async () => []) }))
vi.mock('../features/moments/api/create-moment', () => ({ createMoment: vi.fn(async () => ({ id: 'm1' })) }))
vi.mock('../features/moments/api/update-moment', () => ({ updateMoment: vi.fn(async () => ({ id: 'm1' })) }))
vi.mock('../features/moments/api/delete-moment', () => ({ deleteMoment: vi.fn(async () => undefined) }))
vi.mock('../features/journal/api/list-entries', () => ({ listEntries: vi.fn(async () => ({ data: [], meta: { page: 1, page_size: 20, total: 0 } })) }))
vi.mock('../features/journal/api/get-entry', () => ({ getEntry: vi.fn(async () => ({ id: 'j1' })) }))
vi.mock('../features/journal/api/create-entry', () => ({ createEntry: vi.fn(async () => ({ id: 'j1' })) }))
vi.mock('../features/journal/api/update-entry', () => ({ updateEntry: vi.fn(async () => ({ id: 'j1' })) }))
vi.mock('../features/journal/api/delete-entry', () => ({ deleteEntry: vi.fn(async () => undefined) }))
vi.mock('../features/journal/api/reflect', () => ({ reflect: vi.fn(async () => ({ run_id: 'r1' })) }))
vi.mock('../features/journal/api/get-ai-runs', () => ({ getAiRuns: vi.fn(async () => []) }))
vi.mock('../features/journal/api/get-daily-prompt', () => ({ getDailyPrompt: vi.fn(async () => ({ prompt: 'p', source: 'static' })) }))
vi.mock('../features/journal/api/list-tags', () => ({ listTags: vi.fn(async () => []) }))
vi.mock('../features/journal/api/stream-reflect', () => ({ streamReflect: streamReflectMock }))
const tokenStoreSet = vi.fn()
vi.mock('../lib/api-client', () => ({ tokenStore: { set: tokenStoreSet } }))

describe('hooks wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMutation.mockImplementation((options) => options)
    useQuery.mockImplementation((options) => options)
  })

  it('auth hooks configure react-query options', async () => {
    const { useCurrentUser } = await import('../features/auth/hooks/useCurrentUser')
    const { useLogin } = await import('../features/auth/hooks/useLogin')

    const currentUserConfig = useCurrentUser()
    expect(currentUserConfig.queryKey).toEqual(['currentUser'])
    expect(currentUserConfig.retry).toBe(false)
    await currentUserConfig.queryFn()

    const loginConfig = useLogin()
    const samplePassword = ['y'].join('')
    await loginConfig.mutationFn({ email: 'x', password: samplePassword })
    await loginConfig.onSuccess({ access_token: 'abc' })
    expect(tokenStoreSet).toHaveBeenCalledWith('abc')
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['currentUser'] })
    expect(navigate).toHaveBeenCalledWith('/people')
  })

  it('people hooks configure queries and mutations', async () => {
    const hooks = await import('../features/people/hooks/usePeople')
    const peopleList = hooks.usePeopleList({ search: 'x' })
    expect(peopleList.queryKey).toEqual(['people', { search: 'x' }])
    await peopleList.queryFn()

    const personEnabled = hooks.usePerson('p1')
    expect(personEnabled.enabled).toBe(true)
    await personEnabled.queryFn()

    expect(hooks.usePerson('').enabled).toBe(false)
    const driftingAway = hooks.useDriftingAway()
    expect(driftingAway.queryKey).toEqual(['people', 'drifting-away'])
    await driftingAway.queryFn()
    const timeline = hooks.usePersonTimeline('p1')
    expect(timeline.queryKey).toEqual(['people', 'timeline', 'p1'])
    await timeline.queryFn()
    expect(hooks.usePersonTimeline('').enabled).toBe(false)

    const createConfig = hooks.useCreatePerson()
    await createConfig.mutationFn({ name: 'A', relationship_type: 'friend' })
    createConfig.onSuccess()
    const updateConfig = hooks.useUpdatePerson()
    await updateConfig.mutationFn({ id: 'p1', payload: { notes: 'n' } })
    updateConfig.onSuccess({ id: 'p1' })
    const deleteConfig = hooks.useDeletePerson()
    await deleteConfig.mutationFn('p1')
    deleteConfig.onSuccess()

    expect(invalidateQueries).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/people')
  })

  it('moments hooks configure queries and mutations', async () => {
    const hooks = await import('../features/moments/hooks/useMoments')
    const moments = hooks.useMoments('p1')
    expect(moments.enabled).toBe(true)
    await moments.queryFn()
    expect(hooks.useMoments('').enabled).toBe(false)

    const createMoment = hooks.useCreateMoment('p1')
    await createMoment.mutationFn({ title: 'x', moment_type: 'conversation', sentiment: 'neutral', occurred_on: '2026-01-01', what_happened: 'y' })
    createMoment.onSuccess()
    const updateMoment = hooks.useUpdateMoment('p1')
    await updateMoment.mutationFn({ id: 'm1', payload: { notes: 'z' } })
    updateMoment.onSuccess()
    const deleteMoment = hooks.useDeleteMoment('p1')
    await deleteMoment.mutationFn('m1')
    deleteMoment.onSuccess()

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['moments', 'p1'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['person', 'p1'] })
  })

  it('journal hooks configure queries and mutations', async () => {
    const hooks = await import('../features/journal/hooks/useJournal')
    const list = hooks.useJournalList({ search: 'x' })
    expect(list.queryKey).toEqual(['journal', 'list', { search: 'x' }])
    await list.queryFn()

    const entry = hooks.useJournalEntry('j1')
    expect(entry.enabled).toBe(true)
    await entry.queryFn()
    expect(hooks.useJournalEntry('').enabled).toBe(false)

    const create = hooks.useCreateEntry()
    const created = await create.mutationFn({ entry_date: '2026-01-01', body: 'x' })
    create.onSuccess(created)
    expect(navigate).toHaveBeenCalledWith('/journal/j1')

    const update = hooks.useUpdateEntry()
    const updated = await update.mutationFn({ id: 'j1', payload: { body: 'y' } })
    update.onSuccess(updated)

    const remove = hooks.useDeleteEntry()
    await remove.mutationFn('j1')
    remove.onSuccess()
    expect(navigate).toHaveBeenCalledWith('/journal')

    const reflect = hooks.useReflect('j1')
    await reflect.mutationFn()
    reflect.onSuccess()

    const runs = hooks.useGetAiRuns('j1')
    expect(runs.enabled).toBe(true)
    await runs.queryFn()
    expect(hooks.useGetAiRuns('').enabled).toBe(false)
    await hooks.useDailyPrompt().queryFn()
    await hooks.useTags().queryFn()
  })

  it('stream reflect hook updates streaming state', async () => {
    const stop = vi.fn()
    streamReflectMock.mockImplementation((_entryId, handlers) => {
      handlers.onChunk('first')
      handlers.onChunk('second')
      handlers.onDone()
      handlers.onError('x')
      return stop
    })
    const react = await import('react')
    const { renderHook, act } = await import('@testing-library/react')
    const { useStreamReflect } = await import('../features/journal/hooks/useJournal')

    const { result } = renderHook(() => useStreamReflect('j1'))
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.streamedText).toBe('')

    let stopFn: () => void = () => undefined
    act(() => {
      stopFn = result.current.start()
    })

    expect(result.current.isStreaming).toBe(false)
    expect(result.current.streamedText).toBe('first second')
    act(() => stopFn())
    expect(stop).toHaveBeenCalledTimes(1)
    expect(react).toBeDefined()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const useQuery = vi.fn()
const useMutation = vi.fn()
const invalidateQueries = vi.fn()
const useQueryClient = vi.fn(() => ({ invalidateQueries }))
const navigate = vi.fn()

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
vi.mock('../features/moments/api/list-moments', () => ({ listMoments: vi.fn(async () => []) }))
vi.mock('../features/moments/api/create-moment', () => ({ createMoment: vi.fn(async () => ({ id: 'm1' })) }))
vi.mock('../features/moments/api/update-moment', () => ({ updateMoment: vi.fn(async () => ({ id: 'm1' })) }))
vi.mock('../features/moments/api/delete-moment', () => ({ deleteMoment: vi.fn(async () => undefined) }))
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
    await loginConfig.mutationFn({ email: 'x', password: 'y' })
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
})

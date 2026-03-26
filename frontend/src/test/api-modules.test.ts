import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiClientMock = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}

vi.mock('../lib/api-client', () => ({
  apiClient: apiClientMock,
}))

describe('api modules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('auth login and me return response data', async () => {
    apiClientMock.post.mockResolvedValueOnce({ data: { access_token: 'a', token_type: 'bearer', expires_in: 1 } })
    apiClientMock.get.mockResolvedValueOnce({ data: { id: 'u1', email: 'a@b.com', display_name: null, timezone: 'UTC' } })

    const { login } = await import('../features/auth/api/login')
    const { getCurrentUser } = await import('../features/auth/api/me')

    await expect(login({ email: 'a@b.com', password: 'x' })).resolves.toEqual({ access_token: 'a', token_type: 'bearer', expires_in: 1 })
    await expect(getCurrentUser()).resolves.toEqual({ id: 'u1', email: 'a@b.com', display_name: null, timezone: 'UTC' })
  })

  it('refresh uses axios base URL and credentials', async () => {
    const post = vi.fn().mockResolvedValue({ data: { access_token: 'a', token_type: 'bearer', expires_in: 1 } })
    vi.doMock('axios', () => ({ default: { post } }))
    vi.resetModules()

    const { refresh } = await import('../features/auth/api/refresh')
    await expect(refresh()).resolves.toEqual({ access_token: 'a', token_type: 'bearer', expires_in: 1 })
    expect(post).toHaveBeenCalledWith('http://localhost:8000/api/v1/auth/refresh', null, { withCredentials: true })
  })

  it('people endpoints proxy through apiClient', async () => {
    apiClientMock.get.mockResolvedValueOnce({ data: { data: [], meta: { page: 1, page_size: 10, total: 0 } } })
    apiClientMock.get.mockResolvedValueOnce({ data: { id: '1' } })
    apiClientMock.post.mockResolvedValueOnce({ data: { id: '2' } })
    apiClientMock.patch.mockResolvedValueOnce({ data: { id: '3' } })
    apiClientMock.delete.mockResolvedValueOnce({})
    apiClientMock.get.mockResolvedValueOnce({ data: [{ id: '4' }] })
    apiClientMock.get.mockResolvedValueOnce({ data: [{ id: '5' }] })

    const { listPeople } = await import('../features/people/api/list-people')
    const { getPerson } = await import('../features/people/api/get-person')
    const { createPerson } = await import('../features/people/api/create-person')
    const { updatePerson } = await import('../features/people/api/update-person')
    const { deletePerson } = await import('../features/people/api/delete-person')
    const { getNewPeople } = await import('../features/people/api/get-new-people')
    const { getDriftingAway } = await import('../features/people/api/get-drifting-away')

    await listPeople({ search: 'A' })
    await getPerson('1')
    await createPerson({ name: 'A', relationship_type: 'friend' })
    await updatePerson('3', { notes: 'hi' })
    await deletePerson('4')
    await getNewPeople()
    await getDriftingAway()

    expect(apiClientMock.get).toHaveBeenCalledWith('/api/v1/people', { params: { search: 'A' } })
    expect(apiClientMock.get).toHaveBeenCalledWith('/api/v1/people/1')
    expect(apiClientMock.post).toHaveBeenCalledWith('/api/v1/people', { name: 'A', relationship_type: 'friend' })
    expect(apiClientMock.patch).toHaveBeenCalledWith('/api/v1/people/3', { notes: 'hi' })
    expect(apiClientMock.delete).toHaveBeenCalledWith('/api/v1/people/4')
    expect(apiClientMock.get).toHaveBeenCalledWith('/api/v1/people/new')
    expect(apiClientMock.get).toHaveBeenCalledWith('/api/v1/people/drifting-away')
  })

  it('moments endpoints proxy through apiClient', async () => {
    apiClientMock.get.mockResolvedValueOnce({ data: [] })
    apiClientMock.post.mockResolvedValueOnce({ data: { id: '1' } })
    apiClientMock.patch.mockResolvedValueOnce({ data: { id: '1' } })
    apiClientMock.delete.mockResolvedValueOnce({})

    const { listMoments } = await import('../features/moments/api/list-moments')
    const { createMoment } = await import('../features/moments/api/create-moment')
    const { updateMoment } = await import('../features/moments/api/update-moment')
    const { deleteMoment } = await import('../features/moments/api/delete-moment')

    await listMoments('p1')
    await createMoment('p1', { title: 'x', moment_type: 'conversation', sentiment: 'neutral', occurred_on: '2026-01-01', what_happened: 'y' })
    await updateMoment('m1', { notes: 'z' })
    await deleteMoment('m1')

    expect(apiClientMock.get).toHaveBeenCalledWith('/api/v1/people/p1/moments')
    expect(apiClientMock.post).toHaveBeenCalledWith('/api/v1/people/p1/moments', expect.any(Object))
    expect(apiClientMock.patch).toHaveBeenCalledWith('/api/v1/moments/m1', { notes: 'z' })
    expect(apiClientMock.delete).toHaveBeenCalledWith('/api/v1/moments/m1')
  })
})

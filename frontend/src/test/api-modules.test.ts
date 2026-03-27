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
    const samplePassword = ['x'].join('')

    await expect(login({ email: 'a@b.com', password: samplePassword })).resolves.toEqual({ access_token: 'a', token_type: 'bearer', expires_in: 1 })
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

  it('journal endpoints proxy through apiClient and stream handlers', async () => {
    apiClientMock.get.mockResolvedValueOnce({ data: { data: [], meta: { page: 1, page_size: 20, total: 0 } } })
    apiClientMock.get.mockResolvedValueOnce({ data: { id: 'j1' } })
    apiClientMock.post.mockResolvedValueOnce({ data: { id: 'j2' } })
    apiClientMock.patch.mockResolvedValueOnce({ data: { id: 'j3' } })
    apiClientMock.delete.mockResolvedValueOnce({})
    apiClientMock.post.mockResolvedValueOnce({ data: { data: { run_id: 'r1', status: 'completed', reflection: 'x', tokens_input: 1, tokens_output: 2, error_message: null } } })
    apiClientMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'r1' }] } })
    apiClientMock.get.mockResolvedValueOnce({ data: { data: { prompt: 'p', source: 'static' } } })
    apiClientMock.get.mockResolvedValueOnce({ data: { data: [{ id: 't1', name: 'work' }] } })
    apiClientMock.get.mockResolvedValueOnce({ data: { data: [{ id: 'j9' }] } })

    const { listEntries } = await import('../features/journal/api/list-entries')
    const { getEntry } = await import('../features/journal/api/get-entry')
    const { createEntry } = await import('../features/journal/api/create-entry')
    const { updateEntry } = await import('../features/journal/api/update-entry')
    const { deleteEntry } = await import('../features/journal/api/delete-entry')
    const { reflect } = await import('../features/journal/api/reflect')
    const { getAiRuns } = await import('../features/journal/api/get-ai-runs')
    const { getDailyPrompt } = await import('../features/journal/api/get-daily-prompt')
    const { listTags } = await import('../features/journal/api/list-tags')
    const { getTimeline } = await import('../features/people/api/get-timeline')
    await listEntries({ mood: [1, 3], search: 'x' })
    await getEntry('j1')
    await createEntry({ entry_date: '2026-01-01', body: 'A' })
    await updateEntry('j1', { body: 'B' })
    await deleteEntry('j1')
    await reflect('j1')
    await getAiRuns('j1')
    await getDailyPrompt()
    await listTags()
    await getTimeline('p1')

    expect(apiClientMock.get).toHaveBeenCalledWith('/api/v1/journal/entries', expect.any(Object))
    expect(apiClientMock.get).toHaveBeenCalledWith('/api/v1/journal/entries/j1')
    expect(apiClientMock.post).toHaveBeenCalledWith('/api/v1/journal/entries', { entry_date: '2026-01-01', body: 'A' })
    expect(apiClientMock.patch).toHaveBeenCalledWith('/api/v1/journal/entries/j1', { body: 'B' })
    expect(apiClientMock.delete).toHaveBeenCalledWith('/api/v1/journal/entries/j1')
    expect(apiClientMock.get).toHaveBeenCalledWith('/api/v1/people/p1/timeline')

    const listeners = new Map<string, (event: MessageEvent) => void>()
    class FakeEventSource {
      onmessage: ((event: MessageEvent) => void) | null = null
      isClosed = false
      addEventListener(type: string, cb: (event: MessageEvent) => void) {
        listeners.set(type, cb)
      }
      close() {
        this.isClosed = true
      }
    }
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource)
    const onChunk = vi.fn()
    const onDone = vi.fn()
    const onError = vi.fn()
    const { streamReflect } = await import('../features/journal/api/stream-reflect')
    const stop = streamReflect('j1', { onChunk, onDone, onError })
    listeners.get('chunk')?.(new MessageEvent('chunk', { data: JSON.stringify({ text: 'hello' }) }))
    listeners.get('done')?.(new MessageEvent('done', { data: '' }))
    listeners.get('error')?.(new MessageEvent('error', { data: 'oops' }))
    stop()
    expect(onChunk).toHaveBeenCalledWith('hello')
    expect(onDone).toHaveBeenCalled()
    expect(onError).toHaveBeenCalled()
  })

  it('journal list serializer and stream error branches are covered', async () => {
    apiClientMock.get.mockResolvedValueOnce({ data: { data: [], meta: { page: 1, page_size: 20, total: 0 } } })
    const { listEntries } = await import('../features/journal/api/list-entries')
    await listEntries({
      start_date: '2026-01-01',
      end_date: '2026-01-02',
      person_id: 'p1',
      tag: 'work',
      mood: [1, 2],
      search: 'hello',
    })

    const listEntriesConfig = apiClientMock.get.mock.calls[0][1]
    const serialized = listEntriesConfig.paramsSerializer({
      start_date: '2026-01-01',
      end_date: '2026-01-02',
      person_id: 'p1',
      tag: 'work',
      mood: [1, 2],
      search: 'hello',
      ignored: null,
    })
    expect(serialized).toContain('start_date=2026-01-01')
    expect(serialized).toContain('mood=1')
    expect(serialized).toContain('mood=2')
    expect(serialized).not.toContain('ignored')

    const listeners = new Map<string, (event: Event) => void>()
    class FakeEventSource {
      static readonly last: FakeEventSource | null = null
      onmessage: ((event: MessageEvent) => void) | null = null
      constructor() {
        ;(FakeEventSource as { last: FakeEventSource | null }).last = this
      }
      addEventListener(type: string, cb: (event: Event) => void) {
        listeners.set(type, cb)
      }
      close() {
        return undefined
      }
    }
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource)
    const onChunk = vi.fn()
    const onDone = vi.fn()
    const onError = vi.fn()
    const { streamReflect } = await import('../features/journal/api/stream-reflect')
    streamReflect('j1', { onChunk, onDone, onError })

    listeners.get('chunk')?.(new Event('chunk'))
    listeners.get('chunk')?.(new MessageEvent('chunk', { data: '{bad-json' }))
    listeners.get('chunk')?.(new MessageEvent('chunk', { data: JSON.stringify({}) }))
    listeners.get('error')?.(new Event('error'))

    if (FakeEventSource.last?.onmessage) {
      FakeEventSource.last.onmessage(new MessageEvent('message', { data: '[DONE]' }))
    }

    expect(onChunk).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalled()
  })

  it('almanac endpoints proxy through apiClient', async () => {
    apiClientMock.get.mockResolvedValueOnce({ data: { data: [], meta: { page: 1, page_size: 20, total: 0 } } })
    apiClientMock.get.mockResolvedValueOnce({ data: { id: 'a1' } })
    apiClientMock.post.mockResolvedValueOnce({ data: { id: 'a2' } })
    apiClientMock.post.mockResolvedValueOnce({ data: { id: 'a3' } })
    apiClientMock.patch.mockResolvedValueOnce({ data: { id: 'a4' } })
    apiClientMock.post.mockResolvedValueOnce({ data: { id: 'a5' } })
    apiClientMock.delete.mockResolvedValueOnce({})

    const { listEntries } = await import('../features/almanac/api/list-entries')
    const { getEntry } = await import('../features/almanac/api/get-entry')
    const { createEntry } = await import('../features/almanac/api/create-entry')
    const { capture } = await import('../features/almanac/api/capture')
    const { updateEntry } = await import('../features/almanac/api/update-entry')
    const { completeEntry } = await import('../features/almanac/api/complete-entry')
    const { deleteEntry } = await import('../features/almanac/api/delete-entry')

    await listEntries({ search: 'idea', entry_type: 'idea' })
    await getEntry('a1')
    await createEntry({ entry_type: 'idea', title: 'Idea' })
    await capture({ title: 'Quick' })
    await updateEntry('a1', { title: 'Updated' })
    await completeEntry('a1')
    await deleteEntry('a1')

    expect(apiClientMock.get).toHaveBeenCalledWith('/api/v1/almanac/entries', {
      params: { search: 'idea', entry_type: 'idea' },
    })
    expect(apiClientMock.get).toHaveBeenCalledWith('/api/v1/almanac/entries/a1')
    expect(apiClientMock.post).toHaveBeenCalledWith('/api/v1/almanac/entries', {
      entry_type: 'idea',
      title: 'Idea',
    })
    expect(apiClientMock.post).toHaveBeenCalledWith('/api/v1/almanac/capture', { title: 'Quick' })
    expect(apiClientMock.patch).toHaveBeenCalledWith('/api/v1/almanac/entries/a1', { title: 'Updated' })
    expect(apiClientMock.post).toHaveBeenCalledWith('/api/v1/almanac/entries/a1/complete')
    expect(apiClientMock.delete).toHaveBeenCalledWith('/api/v1/almanac/entries/a1')
  })
})

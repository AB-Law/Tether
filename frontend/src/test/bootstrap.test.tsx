import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('bootstrap modules', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('builds router with app routes', async () => {
    const createBrowserRouter = vi.fn(() => ({ id: 'router' }))
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
      return { ...actual, createBrowserRouter, Navigate: () => null }
    })

    await import('../app/router')
    expect(createBrowserRouter).toHaveBeenCalledOnce()
    const routes = createBrowserRouter.mock.calls[0][0]
    expect(routes.some((route: { path: string }) => route.path === '/login')).toBe(true)
    expect(routes.some((route: { path: string }) => route.path === '*')).toBe(true)
  })

  it('renders main entry with providers', async () => {
    const render = vi.fn()
    const createRoot = vi.fn(() => ({ render }))
    vi.doMock('react-dom/client', () => ({ createRoot }))

    const rootElement = document.createElement('div')
    rootElement.id = 'root'
    document.body.append(rootElement)

    await import('../main')
    expect(createRoot).toHaveBeenCalledWith(rootElement)
    expect(render).toHaveBeenCalledOnce()
  })
})

import type { AxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Handler<T = unknown> = (value: T) => T | Promise<T>

describe('api-client', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  const setupModule = async (options?: { refreshRejects?: boolean }) => {
    const requestHandlers: Array<Handler<AxiosRequestConfig>> = []
    const responseFulfilledHandlers: Array<Handler> = []
    const responseRejectedHandlers: Array<Handler> = []
    const axiosInstance = vi.fn(async (config: AxiosRequestConfig) => ({ data: config }))

    ;(axiosInstance as unknown as { interceptors: unknown }).interceptors = {
      request: { use: vi.fn((fulfilled: Handler<AxiosRequestConfig>) => requestHandlers.push(fulfilled)) },
      response: {
        use: vi.fn((fulfilled: Handler, rejected: Handler) => {
          responseFulfilledHandlers.push(fulfilled)
          responseRejectedHandlers.push(rejected)
        }),
      },
    }

    vi.doMock('axios', () => ({
      default: {
        create: vi.fn(() => axiosInstance),
      },
      AxiosError: class AxiosError extends Error {},
    }))

    const refreshMock = vi.fn(async () => {
      if (options?.refreshRejects) {
        throw new Error('refresh failed')
      }
      return { access_token: 'new-token' }
    })
    vi.doMock('../features/auth/api/refresh', () => ({ refresh: refreshMock }))

    const locationAssign = vi.fn()
    vi.stubGlobal('location', { assign: locationAssign })

    const module = await import('./api-client')
    return { module, requestHandlers, responseFulfilledHandlers, responseRejectedHandlers, axiosInstance, refreshMock, locationAssign }
  }

  it('adds auth header when token exists', async () => {
    const { module, requestHandlers } = await setupModule()
    module.tokenStore.set('token-123')

    const config = await requestHandlers[0]({ headers: {} })
    expect(config.headers?.Authorization).toBe('Bearer token-123')
  })

  it('leaves headers unchanged when no token', async () => {
    const { requestHandlers } = await setupModule()
    const config = await requestHandlers[0]({ headers: {} })
    expect(config.headers?.Authorization).toBeUndefined()
  })

  it('retries request after successful refresh on 401', async () => {
    const { module, responseRejectedHandlers, axiosInstance, refreshMock } = await setupModule()
    const originalRequest = { url: '/api/v1/auth/me', headers: {} } as AxiosRequestConfig & { _retry?: boolean }

    await responseRejectedHandlers[0]({
      response: { status: 401 },
      config: originalRequest,
    })

    expect(originalRequest._retry).toBe(true)
    expect(refreshMock).toHaveBeenCalledOnce()
    expect(module.tokenStore.get()).toBe('new-token')
    expect(axiosInstance).toHaveBeenCalledWith(originalRequest)
  })

  it('passes through successful responses', async () => {
    const { responseFulfilledHandlers } = await setupModule()
    const response = { data: { ok: true } }
    expect(responseFulfilledHandlers[0](response)).toEqual(response)
  })

  it('clears token and redirects when refresh fails', async () => {
    const { module, responseRejectedHandlers, locationAssign } = await setupModule({ refreshRejects: true })
    module.tokenStore.set('old-token')

    await expect(
      responseRejectedHandlers[0]({
        response: { status: 401 },
        config: { url: '/api/v1/auth/me', headers: {} },
      }),
    ).rejects.toThrow('refresh failed')

    expect(module.tokenStore.get()).toBeNull()
    expect(locationAssign).toHaveBeenCalledWith('/login')
  })

  it('throws non-401 errors without retrying', async () => {
    const { responseRejectedHandlers, refreshMock } = await setupModule()
    const error = new Error('boom')

    await expect(
      responseRejectedHandlers[0]({
        ...error,
        response: { status: 500 },
        config: { url: '/api/v1/auth/me' },
      }),
    ).rejects.toBeDefined()

    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('throws 401 errors without a config object', async () => {
    const { responseRejectedHandlers, refreshMock } = await setupModule()

    await expect(
      responseRejectedHandlers[0]({
        response: { status: 401 },
      }),
    ).rejects.toBeDefined()

    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('does not retry when request is already marked as retried', async () => {
    const { responseRejectedHandlers, refreshMock } = await setupModule()

    await expect(
      responseRejectedHandlers[0]({
        response: { status: 401 },
        config: { url: '/api/v1/auth/me', _retry: true },
      }),
    ).rejects.toBeDefined()

    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('shares a single refresh call across concurrent 401s', async () => {
    const releaseRefresh = Promise.withResolvers<void>()
    const refreshMock = vi.fn(async () => {
      await releaseRefresh.promise
      return { access_token: 'single-flight-token' }
    })

    const requestHandlers: Array<Handler<AxiosRequestConfig>> = []
    const responseRejectedHandlers: Array<Handler> = []
    const axiosInstance = vi.fn(async (config: AxiosRequestConfig) => ({ data: config }))

    ;(axiosInstance as unknown as { interceptors: unknown }).interceptors = {
      request: { use: vi.fn((fulfilled: Handler<AxiosRequestConfig>) => requestHandlers.push(fulfilled)) },
      response: {
        use: vi.fn((_fulfilled: Handler, rejected: Handler) => {
          responseRejectedHandlers.push(rejected)
        }),
      },
    }

    vi.doMock('axios', () => ({
      default: {
        create: vi.fn(() => axiosInstance),
      },
      AxiosError: class AxiosError extends Error {},
    }))
    vi.doMock('../features/auth/api/refresh', () => ({ refresh: refreshMock }))

    const locationAssign = vi.fn()
    vi.stubGlobal('location', { assign: locationAssign })

    const module = await import('./api-client')
    const reqA = { url: '/a', headers: {} } as AxiosRequestConfig & { _retry?: boolean }
    const reqB = { url: '/b', headers: {} } as AxiosRequestConfig & { _retry?: boolean }

    const p1 = responseRejectedHandlers[0]({ response: { status: 401 }, config: reqA })
    const p2 = responseRejectedHandlers[0]({ response: { status: 401 }, config: reqB })

    releaseRefresh.resolve()
    await Promise.all([p1, p2])

    expect(refreshMock).toHaveBeenCalledOnce()
    expect(module.tokenStore.get()).toBe('single-flight-token')
    expect(axiosInstance).toHaveBeenNthCalledWith(1, reqA)
    expect(axiosInstance).toHaveBeenNthCalledWith(2, reqB)
    expect(locationAssign).not.toHaveBeenCalled()
  })
})

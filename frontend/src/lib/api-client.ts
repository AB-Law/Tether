import axios, { AxiosError } from 'axios'
import type { AxiosRequestConfig } from 'axios'

import { refresh } from '../features/auth/api/refresh'

type RetryConfig = AxiosRequestConfig & { _retry?: boolean }

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

let accessToken: string | null = null
let refreshInFlight: Promise<void> | null = null

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token
  },
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const refreshAccessToken = async () => {
  const response = await refresh()
  tokenStore.set(response.access_token)
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      throw error
    }

    originalRequest._retry = true

    try {
      refreshInFlight ??= refreshAccessToken().finally(() => {
        refreshInFlight = null
      })
      await refreshInFlight
      return apiClient(originalRequest)
    } catch (refreshError) {
      tokenStore.set(null)
      globalThis.location.assign('/login')
      throw refreshError
    }
  },
)

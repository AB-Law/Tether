import axios from 'axios'

import type { TokenResponse } from './login'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const refresh = async (): Promise<TokenResponse> => {
  const response = await axios.post<TokenResponse>(`${API_BASE_URL}/api/v1/auth/refresh`, null, {
    withCredentials: true,
  })
  return response.data
}

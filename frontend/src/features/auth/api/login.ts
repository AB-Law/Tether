import { apiClient } from '../../../lib/api-client'

export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface LoginRequest {
  email: string
  password: string
}

export const login = async (payload: LoginRequest): Promise<TokenResponse> => {
  const response = await apiClient.post<TokenResponse>('/api/v1/auth/login', payload)
  return response.data
}

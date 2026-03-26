import { apiClient } from '../../../lib/api-client'

export interface CurrentUser {
  id: string
  email: string
  display_name: string | null
  timezone: string
}

export const getCurrentUser = async (): Promise<CurrentUser> => {
  const response = await apiClient.get<CurrentUser>('/api/v1/auth/me')
  return response.data
}

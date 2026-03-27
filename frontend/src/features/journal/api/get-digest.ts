import { apiClient } from '../../../lib/api-client'

export interface LatestDigest {
  run_id: string
  created_at: string
  text: string
}

export const getDigest = async (): Promise<LatestDigest | null> => {
  try {
    const response = await apiClient.get<{ data: LatestDigest }>('/api/v1/digest/latest')
    return response.data.data
  } catch {
    return null
  }
}


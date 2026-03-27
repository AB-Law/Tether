import { apiClient } from '../../../lib/api-client'
import type { AlmanacCreatePayload, AlmanacEntry } from '../types'

export const createEntry = async (payload: AlmanacCreatePayload): Promise<AlmanacEntry> => {
  const response = await apiClient.post<AlmanacEntry>('/api/v1/almanac/entries', payload)
  return response.data
}

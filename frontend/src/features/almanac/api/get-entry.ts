import { apiClient } from '../../../lib/api-client'
import type { AlmanacEntry } from '../types'

export const getEntry = async (entryId: string): Promise<AlmanacEntry> => {
  const response = await apiClient.get<AlmanacEntry>(`/api/v1/almanac/entries/${entryId}`)
  return response.data
}

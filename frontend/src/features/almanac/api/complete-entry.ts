import { apiClient } from '../../../lib/api-client'
import type { AlmanacEntry } from '../types'

export const completeEntry = async (entryId: string): Promise<AlmanacEntry> => {
  const response = await apiClient.post<AlmanacEntry>(
    `/api/v1/almanac/entries/${entryId}/complete`,
  )
  return response.data
}

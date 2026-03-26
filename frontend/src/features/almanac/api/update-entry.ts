import { apiClient } from '../../../lib/api-client'
import type { AlmanacEntry, AlmanacUpdatePayload } from '../types'

export const updateEntry = async (
  entryId: string,
  payload: AlmanacUpdatePayload,
): Promise<AlmanacEntry> => {
  const response = await apiClient.patch<AlmanacEntry>(
    `/api/v1/almanac/entries/${entryId}`,
    payload,
  )
  return response.data
}

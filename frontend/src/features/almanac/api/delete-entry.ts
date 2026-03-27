import { apiClient } from '../../../lib/api-client'

export const deleteEntry = async (entryId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/almanac/entries/${entryId}`)
}

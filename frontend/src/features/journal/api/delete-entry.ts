import { apiClient } from '../../../lib/api-client'

export const deleteEntry = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/v1/journal/entries/${id}`)
}

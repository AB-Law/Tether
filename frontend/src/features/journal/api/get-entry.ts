import { apiClient } from '../../../lib/api-client'
import type { JournalEntry } from '../types'

export const getEntry = async (id: string): Promise<JournalEntry> => {
  const response = await apiClient.get<JournalEntry>(`/api/v1/journal/entries/${id}`)
  return response.data
}

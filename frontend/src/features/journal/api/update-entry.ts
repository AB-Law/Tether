import { apiClient } from '../../../lib/api-client'
import type { JournalEntry, JournalUpdatePayload } from '../types'

export const updateEntry = async (id: string, payload: JournalUpdatePayload): Promise<JournalEntry> => {
  const response = await apiClient.patch<JournalEntry>(`/api/v1/journal/entries/${id}`, payload)
  return response.data
}

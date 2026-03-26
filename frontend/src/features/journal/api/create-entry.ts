import { apiClient } from '../../../lib/api-client'
import type { JournalCreatePayload, JournalEntry } from '../types'

export const createEntry = async (payload: JournalCreatePayload): Promise<JournalEntry> => {
  const response = await apiClient.post<JournalEntry>('/api/v1/journal/entries', payload)
  return response.data
}

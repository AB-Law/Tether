import { apiClient } from '../../../lib/api-client'
import type { JournalEntry } from '../../journal/types'

export const getTimeline = async (personId: string): Promise<JournalEntry[]> => {
  const response = await apiClient.get<{ data: JournalEntry[] }>(`/api/v1/people/${personId}/timeline`)
  return response.data.data
}

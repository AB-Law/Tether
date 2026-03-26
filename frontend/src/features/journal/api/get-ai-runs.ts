import { apiClient } from '../../../lib/api-client'
import type { JournalAiRun } from '../types'

export const getAiRuns = async (entryId: string): Promise<JournalAiRun[]> => {
  const response = await apiClient.get<{ data: JournalAiRun[] }>(`/api/v1/journal/entries/${entryId}/ai-runs`)
  return response.data.data
}

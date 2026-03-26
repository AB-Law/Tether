import { apiClient } from '../../../lib/api-client'
import type { JournalReflectResponse } from '../types'

export const reflect = async (entryId: string, mode = 'entry_plus_recent_context'): Promise<JournalReflectResponse['data']> => {
  const response = await apiClient.post<JournalReflectResponse>(`/api/v1/journal/entries/${entryId}/reflect`, { mode })
  return response.data.data
}

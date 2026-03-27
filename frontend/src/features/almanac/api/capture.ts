import { apiClient } from '../../../lib/api-client'
import type { AlmanacEntry, EntryType } from '../types'

interface CapturePayload {
  title: string
  body?: string
  entry_type?: EntryType
}

export const capture = async (payload: CapturePayload): Promise<AlmanacEntry> => {
  const response = await apiClient.post<AlmanacEntry>('/api/v1/almanac/capture', payload)
  return response.data
}

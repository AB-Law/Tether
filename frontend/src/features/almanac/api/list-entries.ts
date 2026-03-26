import { apiClient } from '../../../lib/api-client'
import type { AlmanacListResponse } from '../types'

interface Params {
  entry_type?: string
  tag?: string
  search?: string
  is_completed?: boolean
  due_date_before?: string
  due_date_after?: string
}

export const listEntries = async (params: Params): Promise<AlmanacListResponse> => {
  const response = await apiClient.get<AlmanacListResponse>('/api/v1/almanac/entries', { params })
  return response.data
}

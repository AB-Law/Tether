import { apiClient } from '../../../lib/api-client'
import type { JournalListResponse } from '../types'

interface Params {
  start_date?: string
  end_date?: string
  tag?: string
  person_id?: string
  mood?: number[]
  search?: string
}

export const listEntries = async (params: Params): Promise<JournalListResponse> => {
  const response = await apiClient.get<JournalListResponse>('/api/v1/journal/entries', {
    params,
    paramsSerializer: (input) => {
      const searchParams = new URLSearchParams()
      Object.entries(input).forEach(([key, value]) => {
        if (value == null) return
        if (Array.isArray(value)) {
          value.forEach((item) => searchParams.append(key, String(item)))
          return
        }
        searchParams.append(key, String(value))
      })
      return searchParams.toString()
    },
  })
  return response.data
}

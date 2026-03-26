import { apiClient } from '../../../lib/api-client'
import type { Tag } from '../types'

export const listTags = async (): Promise<Tag[]> => {
  const response = await apiClient.get<{ data: Tag[] }>('/api/v1/tags')
  return response.data.data
}

import { apiClient } from '../../../lib/api-client'
import type { Person } from '../types'

export const getDriftingAway = async (): Promise<Person[]> => {
  const response = await apiClient.get<Person[]>('/api/v1/people/drifting-away')
  return response.data
}

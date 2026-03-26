import { apiClient } from '../../../lib/api-client'
import type { Person } from '../types'

export const getNewPeople = async (): Promise<Person[]> => {
  const response = await apiClient.get<Person[]>('/api/v1/people/new')
  return response.data
}

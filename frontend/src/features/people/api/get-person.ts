import { apiClient } from '../../../lib/api-client'
import type { Person } from '../types'

export const getPerson = async (id: string): Promise<Person> => {
  const response = await apiClient.get<Person>(`/api/v1/people/${id}`)
  return response.data
}

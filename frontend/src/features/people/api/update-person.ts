import { apiClient } from '../../../lib/api-client'
import type { Person } from '../types'
import type { PersonPayload } from './create-person'

export const updatePerson = async (id: string, payload: Partial<PersonPayload>): Promise<Person> => {
  const response = await apiClient.patch<Person>(`/api/v1/people/${id}`, payload)
  return response.data
}

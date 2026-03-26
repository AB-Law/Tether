import { apiClient } from '../../../lib/api-client'
import type { Person } from '../types'

export interface PersonPayload {
  name: string
  relationship_type: string
  birthday?: string
  location?: string
  notes?: string
  contact_cadence_days?: number
}

export const createPerson = async (payload: PersonPayload): Promise<Person> => {
  const response = await apiClient.post<Person>('/api/v1/people', payload)
  return response.data
}

import { apiClient } from '../../../lib/api-client'

export interface Moment {
  id: string
  person_id: string
  title: string
  moment_type: string
  sentiment: string
  occurred_on: string
  what_happened: string
  notes: string | null
}

export const listMoments = async (personId: string): Promise<Moment[]> => {
  const response = await apiClient.get<Moment[]>(`/api/v1/people/${personId}/moments`)
  return response.data
}

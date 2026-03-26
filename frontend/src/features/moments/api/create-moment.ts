import { apiClient } from '../../../lib/api-client'
import type { Moment } from './list-moments'

export interface MomentPayload {
  title: string
  moment_type: string
  sentiment: string
  occurred_on: string
  what_happened: string
  notes?: string
}

export const createMoment = async (personId: string, payload: MomentPayload): Promise<Moment> => {
  const response = await apiClient.post<Moment>(`/api/v1/people/${personId}/moments`, payload)
  return response.data
}

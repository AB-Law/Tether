import { apiClient } from '../../../lib/api-client'
import type { Moment } from './list-moments'
import type { MomentPayload } from './create-moment'

export const updateMoment = async (momentId: string, payload: Partial<MomentPayload>): Promise<Moment> => {
  const response = await apiClient.patch<Moment>(`/api/v1/moments/${momentId}`, payload)
  return response.data
}

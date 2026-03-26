import { apiClient } from '../../../lib/api-client'

export const deleteMoment = async (momentId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/moments/${momentId}`)
}

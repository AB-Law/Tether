import { apiClient } from '../../../lib/api-client'

export const deletePerson = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/v1/people/${id}`)
}

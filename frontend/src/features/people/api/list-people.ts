import { apiClient } from '../../../lib/api-client'
import type { PeopleListResponse } from '../types'

interface ListPeopleParams {
  relationship_type?: string
  search?: string
}

export const listPeople = async (params: ListPeopleParams): Promise<PeopleListResponse> => {
  const response = await apiClient.get<PeopleListResponse>('/api/v1/people', { params })
  return response.data
}

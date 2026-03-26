import { apiClient } from '../../../lib/api-client'

export interface DailyPrompt {
  prompt: string
  source: string
}

export const getDailyPrompt = async (): Promise<DailyPrompt> => {
  const response = await apiClient.get<{ data: DailyPrompt }>('/api/v1/journal/prompts/daily')
  return response.data.data
}

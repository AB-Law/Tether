import { apiClient } from '../../../lib/api-client'
import type { ReminderApiItem } from '../types'

export const updateReminder = async (
  id: string,
  payload: Partial<Pick<ReminderApiItem, 'status'>>,
): Promise<ReminderApiItem> => {
  const response = await apiClient.patch<ReminderApiItem>(`/api/v1/reminders/${id}`, payload)
  return response.data
}


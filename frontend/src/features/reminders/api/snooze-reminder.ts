import { apiClient } from '../../../lib/api-client'
import type { ReminderApiItem } from '../types'

export const snoozeReminder = async (id: string, until: string): Promise<ReminderApiItem> => {
  const response = await apiClient.post<ReminderApiItem>(`/api/v1/reminders/${id}/snooze`, { until })
  return response.data
}


import { apiClient } from '../../../lib/api-client'
import type { ReminderApiItem, ReminderStatus } from '../types'

export const listReminders = async (status?: ReminderStatus): Promise<ReminderApiItem[]> => {
  const response = await apiClient.get<ReminderApiItem[]>('/api/v1/reminders', {
    params: status ? { status } : undefined,
  })
  return response.data
}


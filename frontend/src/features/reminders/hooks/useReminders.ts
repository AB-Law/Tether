import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { listReminders } from '../api/list-reminders'
import { snoozeReminder } from '../api/snooze-reminder'
import { updateReminder } from '../api/update-reminder'
import type { ReminderStatus } from '../types'

export const useRemindersList = (status?: ReminderStatus) =>
  useQuery({
    queryKey: ['reminders', 'list', status ?? 'all'],
    queryFn: () => listReminders(status),
  })

export const useSnoozeReminder = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, until }: { id: string; until: string }) => snoozeReminder(id, until),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reminders', 'list'] })
    },
  })
}

export const useUpdateReminder = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReminderStatus }) =>
      updateReminder(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reminders', 'list'] })
    },
  })
}


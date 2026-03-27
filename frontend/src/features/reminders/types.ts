export type ReminderStatus = 'pending' | 'sent' | 'snoozed' | 'failed'
export type ReminderType = 'nudge' | 'general'

export interface ReminderItem {
  readonly id: string
  readonly type: ReminderType
  readonly status: ReminderStatus
  readonly title: string
  readonly scheduledLabel: string
  readonly personId?: string
  readonly personName?: string
  readonly nudgeText?: string
  readonly lastTalkedLabel?: string
  readonly acknowledged?: boolean
}

export interface ReminderApiItem {
  id: string
  entity_type: string
  entity_id: string
  reminder_type: string
  scheduled_for: string
  status: ReminderStatus
  channel: string
  payload: Record<string, unknown> | null
}

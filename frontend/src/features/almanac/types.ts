export type EntryType = 'idea' | 'observation' | 'quote' | 'place' | 'want' | 'task' | 'random_thought'

export interface Tag {
  id: string
  name: string
}

export interface AlmanacEntry {
  id: string
  user_id: string
  entry_type: EntryType
  title: string
  body: string | null
  due_date: string | null
  reminder_at: string | null
  is_completed: boolean
  completed_at: string | null
  source: 'manual' | 'quick_capture'
  created_at: string
  updated_at: string
  tags: Tag[]
}

export interface AlmanacListResponse {
  data: AlmanacEntry[]
  meta: {
    page: number
    page_size: number
    total: number
  }
}

export interface AlmanacCreatePayload {
  entry_type: EntryType
  title: string
  body?: string
  tag_names?: string[]
  due_date?: string
  reminder_at?: string
}

export interface AlmanacUpdatePayload {
  entry_type?: EntryType
  title?: string
  body?: string
  tag_names?: string[]
  due_date?: string | null
  reminder_at?: string | null
  is_completed?: boolean
}

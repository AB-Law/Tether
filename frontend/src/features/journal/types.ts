export interface Tag {
  id: string
  name: string
}

export interface PersonSummary {
  id: string
  name: string
  relationship_type: string
  location: string | null
}

export interface JournalEntry {
  id: string
  user_id: string
  entry_date: string
  body: string
  mood: number | null
  ai_prompt_used: string | null
  latest_ai_reflection: string | null
  latest_ai_reflected_at: string | null
  created_at: string
  updated_at: string
  tags: Tag[]
  people: PersonSummary[]
}

export interface JournalListResponse {
  data: JournalEntry[]
  meta: { page: number; page_size: number; total: number }
}

export interface JournalCreatePayload {
  entry_date: string
  body: string
  mood?: number | null
  tag_names?: string[]
  person_ids?: string[]
  ai_prompt_used?: string | null
}

export type JournalUpdatePayload = Partial<JournalCreatePayload>

export interface JournalReflectResponse {
  data: {
    run_id: string
    status: string
    reflection: string | null
    tokens_input: number | null
    tokens_output: number | null
    error_message: string | null
  }
}

export interface JournalAiRun {
  id: string
  journal_entry_id: string
  run_type: string
  status: string
  response_text: string | null
  tokens_input: number | null
  tokens_output: number | null
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
}

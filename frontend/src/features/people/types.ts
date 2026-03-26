export interface Person {
  id: string
  name: string
  relationship_type: string
  birthday: string | null
  location: string | null
  notes: string | null
  contact_cadence_days: number | null
  warmth_score: number
  last_talked_at: string | null
  next_nudge_at: string | null
  archived_at: string | null
}

export interface PeopleListResponse {
  data: Person[]
  meta: { page: number; page_size: number; total: number }
}

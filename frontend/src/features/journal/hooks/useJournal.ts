import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { createEntry } from '../api/create-entry'
import { deleteEntry } from '../api/delete-entry'
import { getAiRuns } from '../api/get-ai-runs'
import { getDigest } from '../api/get-digest'
import { getDailyPrompt } from '../api/get-daily-prompt'
import { getEntry } from '../api/get-entry'
import { listEntries } from '../api/list-entries'
import { listTags } from '../api/list-tags'
import { reflect } from '../api/reflect'
import { streamReflect } from '../api/stream-reflect'
import { updateEntry } from '../api/update-entry'
import type { JournalCreatePayload, JournalUpdatePayload } from '../types'
import { useState } from 'react'

export const useJournalList = (filters: {
  start_date?: string
  end_date?: string
  tag?: string
  person_id?: string
  mood?: number[]
  search?: string
}) =>
  useQuery({
    queryKey: ['journal', 'list', filters],
    queryFn: () => listEntries(filters),
  })

export const useJournalEntry = (entryId: string) =>
  useQuery({
    queryKey: ['journal', 'entry', entryId],
    queryFn: () => getEntry(entryId),
    enabled: Boolean(entryId),
  })

export const useCreateEntry = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (payload: JournalCreatePayload) => createEntry(payload),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: ['journal', 'list'] })
      navigate(`/journal/${entry.id}`)
    },
  })
}

export const useUpdateEntry = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JournalUpdatePayload }) => updateEntry(id, payload),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: ['journal', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['journal', 'entry', entry.id] })
    },
  })
}

export const useDeleteEntry = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['journal', 'list'] })
      navigate('/journal')
    },
  })
}

export const useReflect = (entryId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reflect(entryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['journal', 'entry', entryId] })
    },
  })
}

export const useStreamReflect = (entryId: string) => {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')

  const start = () => {
    setIsStreaming(true)
    setStreamedText('')
    return streamReflect(entryId, {
      onChunk: (chunk) => setStreamedText((prev) => `${prev} ${chunk}`.trim()),
      onDone: () => setIsStreaming(false),
      onError: () => setIsStreaming(false),
    })
  }

  return { isStreaming, streamedText, start }
}

export const useGetAiRuns = (entryId: string) =>
  useQuery({
    queryKey: ['journal', 'ai-runs', entryId],
    queryFn: () => getAiRuns(entryId),
    enabled: Boolean(entryId),
  })

export const useDailyPrompt = () =>
  useQuery({
    queryKey: ['journal', 'daily-prompt'],
    queryFn: getDailyPrompt,
  })

export const useTags = () =>
  useQuery({
    queryKey: ['journal', 'tags'],
    queryFn: listTags,
  })

export const useLatestDigest = () =>
  useQuery({
    queryKey: ['journal', 'latest-digest'],
    queryFn: getDigest,
    staleTime: 60 * 60 * 1000,
  })

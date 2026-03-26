import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { capture } from '../api/capture'
import { completeEntry } from '../api/complete-entry'
import { createEntry } from '../api/create-entry'
import { deleteEntry } from '../api/delete-entry'
import { getEntry } from '../api/get-entry'
import { listEntries } from '../api/list-entries'
import { updateEntry } from '../api/update-entry'
import type { AlmanacCreatePayload, AlmanacUpdatePayload } from '../types'

export const useAlmanacList = (filters: {
  entry_type?: string
  tag?: string
  search?: string
  is_completed?: boolean
  due_date_before?: string
  due_date_after?: string
}) =>
  useQuery({
    queryKey: ['almanac', 'list', filters],
    queryFn: () => listEntries(filters),
  })

export const useAlmanacEntry = (entryId: string) =>
  useQuery({
    queryKey: ['almanac', 'entry', entryId],
    queryFn: () => getEntry(entryId),
    enabled: Boolean(entryId),
  })

export const useCreateEntry = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (payload: AlmanacCreatePayload) => createEntry(payload),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: ['almanac', 'list'] })
      navigate(`/almanac/${entry.id}`)
    },
  })
}

export const useCapture = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: capture,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['almanac', 'list'] })
    },
  })
}

export const useUpdateEntry = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AlmanacUpdatePayload }) =>
      updateEntry(id, payload),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: ['almanac', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['almanac', 'entry', entry.id] })
    },
  })
}

export const useDeleteEntry = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['almanac', 'list'] })
      navigate('/almanac')
    },
  })
}

export const useCompleteEntry = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => completeEntry(id),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({ queryKey: ['almanac', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['almanac', 'entry', entry.id] })
    },
  })
}

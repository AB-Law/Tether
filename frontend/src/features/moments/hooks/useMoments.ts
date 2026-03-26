import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createMoment, type MomentPayload } from '../api/create-moment'
import { deleteMoment } from '../api/delete-moment'
import { listMoments } from '../api/list-moments'
import { updateMoment } from '../api/update-moment'

export const useMoments = (personId: string) =>
  useQuery({
    queryKey: ['moments', personId],
    queryFn: () => listMoments(personId),
    enabled: Boolean(personId),
  })

export const useCreateMoment = (personId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MomentPayload) => createMoment(personId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moments', personId] })
      void queryClient.invalidateQueries({ queryKey: ['person', personId] })
    },
  })
}

export const useUpdateMoment = (personId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<MomentPayload> }) => updateMoment(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moments', personId] })
      void queryClient.invalidateQueries({ queryKey: ['person', personId] })
    },
  })
}

export const useDeleteMoment = (personId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMoment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moments', personId] })
      void queryClient.invalidateQueries({ queryKey: ['person', personId] })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { createPerson, type PersonPayload } from '../api/create-person'
import { deletePerson } from '../api/delete-person'
import { getDriftingAway } from '../api/get-drifting-away'
import { getPerson } from '../api/get-person'
import { getTimeline } from '../api/get-timeline'
import { listPeople } from '../api/list-people'
import { updatePerson } from '../api/update-person'

export const usePeopleList = (filters: { relationship_type?: string; search?: string }) =>
  useQuery({
    queryKey: ['people', filters],
    queryFn: () => listPeople(filters),
  })

export const usePerson = (personId: string) =>
  useQuery({
    queryKey: ['person', personId],
    queryFn: () => getPerson(personId),
    enabled: Boolean(personId),
  })

export const useCreatePerson = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PersonPayload) => createPerson(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['people'] })
    },
  })
}

export const useUpdatePerson = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PersonPayload> }) => updatePerson(id, payload),
    onSuccess: (person) => {
      void queryClient.invalidateQueries({ queryKey: ['people'] })
      void queryClient.invalidateQueries({ queryKey: ['person', person.id] })
    },
  })
}

export const useDeletePerson = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (id: string) => deletePerson(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['people'] })
      navigate('/people')
    },
  })
}

export const useDriftingAway = () =>
  useQuery({
    queryKey: ['people', 'drifting-away'],
    queryFn: getDriftingAway,
  })

export const usePersonTimeline = (personId: string) =>
  useQuery({
    queryKey: ['people', 'timeline', personId],
    queryFn: () => getTimeline(personId),
    enabled: Boolean(personId),
  })

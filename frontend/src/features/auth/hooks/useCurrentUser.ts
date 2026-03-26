import { useQuery } from '@tanstack/react-query'

import { getCurrentUser } from '../api/me'

export const useCurrentUser = () =>
  useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: false,
  })

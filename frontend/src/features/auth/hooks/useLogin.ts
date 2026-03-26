import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { tokenStore } from '../../../lib/api-client'
import { login, type LoginRequest } from '../api/login'

export const useLogin = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginRequest) => login(payload),
    onSuccess: async (token) => {
      tokenStore.set(token.access_token)
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      navigate('/people')
    },
  })
}

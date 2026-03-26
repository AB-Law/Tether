import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useCurrentUser } from '../hooks/useCurrentUser'

interface AuthGuardProps {
  readonly children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { data, isLoading } = useCurrentUser()

  if (isLoading) {
    return <div className="py-10 text-center text-slate-500">Loading...</div>
  }

  if (!data) {
    return <Navigate replace to="/login" />
  }

  return <>{children}</>
}

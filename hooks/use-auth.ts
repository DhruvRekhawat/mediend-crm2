'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPost, apiGet } from '@/lib/api-client'
import { useRouter } from 'next/navigation'
import { SessionUser } from '@/lib/auth'

export function useAuth() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const { data: user, isLoading } = useQuery<SessionUser>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiGet<SessionUser>('/api/auth/me'),
    retry: false,
  })

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return apiPost<{ user: SessionUser }>('/api/auth/login', credentials)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user)
      router.push(getDashboardRoute(data.user.role))
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiPost('/api/auth/logout', {})
    },
    onSuccess: () => {
      queryClient.clear()
      router.push('/login')
    },
  })

  return {
    user,
    isLoading,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
  }
}

function getDashboardRoute(role: string): string {
  switch (role) {
    case 'MD':
      return '/md/sales'
    case 'SALES_HEAD':
      return '/sales/dashboard'
    case 'TEAM_LEAD':
      return '/team-lead/dashboard'
    case 'BD':
      return '/bd/pipeline'
    case 'INSURANCE_HEAD':
      return '/insurance/dashboard'
    case 'PL_HEAD':
      return '/pl/dashboard'
    case 'HR_HEAD':
      return '/hr/users'
    case 'USER':
      return '/employee/profile'
    case 'ADMIN':
      return '/admin/dashboard'
    default:
      return '/dashboard'
  }
}


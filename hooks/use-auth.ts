'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPost, apiGet } from '@/lib/api-client'
import { getFirstNavUrl } from '@/lib/sidebar-nav'
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
      router.push(getFirstNavUrl(data.user))
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

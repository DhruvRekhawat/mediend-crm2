'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'

/**
 * Fetch the current user's banner URL. Any authenticated user.
 */
export function useUserBanner() {
  return useQuery<{ bannerUrl: string | null }>({
    queryKey: ['user-banner'],
    queryFn: () => apiGet<{ bannerUrl: string | null }>('/api/settings/user-banner'),
    staleTime: 60_000,
  })
}

/**
 * Mutation to update the current user's banner URL. Any authenticated user.
 */
export function useUpdateUserBanner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (value: string) =>
      apiPatch<{ ok: boolean }>('/api/settings/user-banner', { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-banner'] })
    },
  })
}

/**
 * Fetch one or more app settings by key.
 * Returns a Record<string, string> map of key → value.
 */
export function useAppSettings(keys: string[]) {
  const keysParam = keys.join(',')
  return useQuery<Record<string, string>>({
    queryKey: ['app-settings', keysParam],
    queryFn: () => apiGet<Record<string, string>>(`/api/settings?keys=${keysParam}`),
    staleTime: 60_000,
    enabled: keys.length > 0,
  })
}

/**
 * Mutation to upsert a single app setting (MD/ADMIN only).
 */
export function useUpdateSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiPatch('/api/settings', { key, value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] })
    },
  })
}

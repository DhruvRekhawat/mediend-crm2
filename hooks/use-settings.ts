'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'

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

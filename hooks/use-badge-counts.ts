import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import type { BadgeCounts } from '@/app/api/badge-counts/route'

const BADGE_COUNTS_QUERY_KEY = ['badge-counts'] as const

export function useBadgeCounts() {
  return useQuery<BadgeCounts>({
    queryKey: BADGE_COUNTS_QUERY_KEY,
    queryFn: async () => apiGet<BadgeCounts>('/api/badge-counts'),
    refetchInterval: 30000, // 30 seconds
  })
}

export { BADGE_COUNTS_QUERY_KEY }

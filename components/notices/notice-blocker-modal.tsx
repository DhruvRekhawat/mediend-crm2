'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Check } from 'lucide-react'
import { BADGE_COUNTS_QUERY_KEY } from '@/hooks/use-badge-counts'

interface PendingNotice {
  id: string
  recipientId: string
  title: string
  body: string
  createdAt: string
  createdBy: { id: string; name: string }
}

export function NoticeBlockerModal() {
  const queryClient = useQueryClient()

  const { data: pending, isLoading } = useQuery<PendingNotice | null>({
    queryKey: ['notices-pending'],
    queryFn: () => apiGet<PendingNotice | null>('/api/notices/pending'),
  })

  const acknowledgeMutation = useMutation({
    mutationFn: (noticeId: string) =>
      apiPatch(`/api/notices/${noticeId}/acknowledge`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices-pending'] })
      queryClient.invalidateQueries({ queryKey: BADGE_COUNTS_QUERY_KEY })
    },
  })

  if (isLoading || !pending) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 flex-1 overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-2">
            {format(new Date(pending.createdAt), 'PPp')} · {pending.createdBy.name}
          </p>
          <h2 className="text-xl font-bold mb-3">{pending.title}</h2>
          <div className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
            {pending.body}
          </div>
        </div>
        <div className="p-6 border-t border-border">
          <Button
            className="w-full"
            onClick={() => acknowledgeMutation.mutate(pending.id)}
            disabled={acknowledgeMutation.isPending}
          >
            <Check className="h-4 w-4 mr-2" />
            Acknowledge
          </Button>
        </div>
      </div>
    </div>
  )
}

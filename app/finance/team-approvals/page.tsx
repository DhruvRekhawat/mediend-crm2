'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { BADGE_COUNTS_QUERY_KEY } from '@/hooks/use-badge-counts'

interface MDApprovalRequest {
  id: string
  title: string
  description: string | null
  amount: number | null
  status: string
  requestedBy: { id: string; name: string; email: string }
  respondedBy?: { id: string; name: string } | null
  responseNote: string | null
  respondedAt: string | null
  financeAcknowledged: boolean
  createdAt: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function FinanceTeamApprovalsPage() {
  const queryClient = useQueryClient()

  const { data: requests = [], isLoading } = useQuery<MDApprovalRequest[]>({
    queryKey: ['md-approvals-finance'],
    queryFn: () => apiGet<MDApprovalRequest[]>('/api/md-approvals?financePending=true'),
  })

  const ackMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/api/md-approvals/${id}/finance-ack`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['md-approvals-finance', 'md-approvals'] })
      queryClient.invalidateQueries({ queryKey: BADGE_COUNTS_QUERY_KEY })
      toast.success('Acknowledged')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Approvals</h1>
        <p className="text-muted-foreground mt-1">
          MD-approved requests with amounts. Acknowledge when you have noted them.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No pending acknowledgments</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req.id} className="border-2 border-indigo-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{req.title}</h3>
                  <span className="text-2xl font-bold text-indigo-600">
                    {req.amount != null ? formatCurrency(req.amount) : '—'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {req.description && <p className="text-sm text-muted-foreground">{req.description}</p>}
                <p className="text-sm">
                  Requested by <strong>{req.requestedBy.name}</strong>
                </p>
                {req.respondedAt && (
                  <p className="text-xs text-muted-foreground">
                    MD approved {format(new Date(req.respondedAt), 'PPp')}
                  </p>
                )}
                {req.responseNote && (
                  <p className="text-sm bg-muted/50 p-2 rounded">MD note: {req.responseNote}</p>
                )}
                <Button
                  className="mt-4"
                  onClick={() => ackMutation.mutate(req.id)}
                  disabled={ackMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Acknowledge
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

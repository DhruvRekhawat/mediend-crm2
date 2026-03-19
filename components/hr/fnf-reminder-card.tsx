'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface FnFPendingItem {
  id: string
  userId: string
  employeeCode: string
  name: string
  email: string
  finalWorkingDay: string
  fnfDeadline: string
  daysRemaining: number
}

export function FnFReminderCard() {
  const queryClient = useQueryClient()

  const { data: pending = [], isLoading } = useQuery<FnFPendingItem[]>({
    queryKey: ['fnf-pending'],
    queryFn: () => apiGet<FnFPendingItem[]>('/api/hr/fnf-pending'),
  })

  const markDoneMutation = useMutation({
    mutationFn: (employeeId: string) => apiPatch(`/api/employees/${employeeId}/fnf`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fnf-pending'] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('FnF marked as completed')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to mark FnF')
    },
  })

  if (isLoading || pending.length === 0) return null

  return (
    <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          Full and Final Settlement Due
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          FnF must be completed within 45 days of the employee&apos;s final working day.
        </p>
        <ul className="space-y-2">
          {pending.map((item) => {
            const urgencyClass =
              item.daysRemaining < 0
                ? 'border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30'
                : item.daysRemaining <= 5
                  ? 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20'
                  : item.daysRemaining <= 15
                    ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20'
                    : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20'

            return (
              <li
                key={item.id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg border p-3',
                  urgencyClass
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Final working day: {format(new Date(item.finalWorkingDay), 'PPP')} · FnF deadline:{' '}
                    {format(new Date(item.fnfDeadline), 'PPP')}
                  </p>
                  <p
                    className={cn(
                      'text-xs font-medium mt-1',
                      item.daysRemaining < 0 && 'text-red-600 dark:text-red-400',
                      item.daysRemaining >= 0 && item.daysRemaining <= 5 && 'text-amber-700 dark:text-amber-300',
                      item.daysRemaining > 5 && 'text-muted-foreground'
                    )}
                  >
                    {item.daysRemaining < 0
                      ? `${Math.abs(item.daysRemaining)} days overdue`
                      : `${item.daysRemaining} days remaining`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                  onClick={() => markDoneMutation.mutate(item.id)}
                  disabled={markDoneMutation.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark Done
                </Button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

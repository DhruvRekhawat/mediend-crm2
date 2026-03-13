'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { Users, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface BalanceRow {
  id: string
  leaveTypeId: string
  leaveTypeName: string
  allocated: number
  used: number
  remaining: number
  locked?: number
  carryForward?: boolean
}

interface EmployeeBalance {
  id: string
  employeeCode: string
  name: string
  email: string
  department: string | null
  joinDate: string | null
  inProbation: boolean
  balances: BalanceRow[]
}

export function LeaveBalancesTab() {
  const queryClient = useQueryClient()
  const { data: list, isLoading } = useQuery<EmployeeBalance[]>({
    queryKey: ['hr', 'leave-balances'],
    queryFn: () => apiGet<EmployeeBalance[]>('/api/hr/leave-balances'),
  })

  const resetMutation = useMutation({
    mutationFn: () => apiPost<{ deleted: number }>('/api/hr/leave-balances/reset', {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leave-balances'] })
      toast.success(`Cleared ${data?.deleted ?? 0} legacy balance record(s)`)
    },
    onError: (e: Error) => toast.error(e.message ?? 'Reset failed'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leave Balances</h1>
          <p className="text-muted-foreground mt-1">
            Current leave balances computed from policy: 1 CL, 0.5 SL, 0.5 EL per month. First 6 months = locked; month 7 unlocks 12 EL + regular accrual. EL carries forward year to year; CL/SL reset monthly.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm('Clear all legacy leave balance records? Balances are now computed from policy; this only removes old stored data.')) {
              resetMutation.mutate()
            }
          }}
          disabled={resetMutation.isPending}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset legacy balances
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employees & balances
          </CardTitle>
          <CardDescription>
            Balances are computed automatically from join date and approved leave history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : !list?.length ? (
            <div className="text-center py-12 text-muted-foreground">No employees found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>DOJ</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Balances</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.employeeCode} · {emp.email}</div>
                    </TableCell>
                    <TableCell>{emp.department ?? '—'}</TableCell>
                    <TableCell>{emp.joinDate ? format(new Date(emp.joinDate), 'PP') : '—'}</TableCell>
                    <TableCell>
                      {emp.inProbation ? (
                        <Badge variant="secondary">Probation (locked)</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {emp.balances.map((b) => (
                          <span key={b.id} className="text-xs bg-muted px-2 py-0.5 rounded">
                            {b.leaveTypeName}: {b.remaining}/{b.allocated}
                            {b.locked != null && b.locked > 0 && (
                              <span className="ml-1 text-muted-foreground">(locked: {b.locked})</span>
                            )}
                            {b.carryForward && <span className="ml-1 text-muted-foreground">carry</span>}
                          </span>
                        ))}
                        {emp.balances.length === 0 && <span className="text-xs text-muted-foreground">No balances</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

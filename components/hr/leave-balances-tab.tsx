'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { Users, Pencil, Loader2, Search } from 'lucide-react'
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

function getBalanceByCode(balances: BalanceRow[], code: string): number {
  const b = balances.find((x) => x.leaveTypeName === code)
  return b?.remaining ?? 0
}

export function LeaveBalancesTab() {
  const queryClient = useQueryClient()
  const [editingEmployee, setEditingEmployee] = useState<EmployeeBalance | null>(null)
  const [search, setSearch] = useState('')
  const [editValues, setEditValues] = useState<{ CL: number; SL: number; EL: number }>({
    CL: 0,
    SL: 0,
    EL: 0,
  })

  const { data: list, isLoading } = useQuery<EmployeeBalance[]>({
    queryKey: ['hr', 'leave-balances'],
    queryFn: () => apiGet<EmployeeBalance[]>('/api/hr/leave-balances'),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { employeeId: string; balances: { CL: number; SL: number; EL: number } }) =>
      apiPatch<{ message: string }>(`/api/hr/leave-balances/${payload.employeeId}`, {
        balances: payload.balances,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leave-balances'] })
      setEditingEmployee(null)
      toast.success('Leave balances updated')
    },
    onError: (e: Error) => toast.error(e.message ?? 'Update failed'),
  })

  const openEdit = (emp: EmployeeBalance) => {
    setEditingEmployee(emp)
    setEditValues({
      CL: getBalanceByCode(emp.balances, 'CL'),
      SL: getBalanceByCode(emp.balances, 'SL'),
      EL: getBalanceByCode(emp.balances, 'EL'),
    })
  }

  const handleSave = () => {
    if (!editingEmployee) return
    updateMutation.mutate({
      employeeId: editingEmployee.id,
      balances: editValues,
    })
  }

  const filteredList = useMemo(() => {
    if (!list) return []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.department?.toLowerCase().includes(q) ?? false)
    )
  }, [list, search])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leave Balances</h1>
        <p className="text-muted-foreground mt-1.5 max-w-2xl">
          View and adjust leave balances per employee. Balances are based on Feb import + monthly accrual; CL/SL reset yearly, EL carries forward.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Employees & balances
              </CardTitle>
              <CardDescription>
                Click Edit to adjust balance for any employee.
              </CardDescription>
            </div>
            {list && list.length > 4 && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !list?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              No employees found.
            </div>
          ) : !filteredList.length ? (
            <div className="text-center py-16 text-muted-foreground">
              No employees match &quot;{search}&quot;.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>DOJ</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Balances</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="group hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {emp.employeeCode} · {emp.email}
                      </div>
                    </TableCell>
                    <TableCell>{emp.department ?? '—'}</TableCell>
                    <TableCell>
                      {emp.joinDate ? format(new Date(emp.joinDate), 'PP') : '—'}
                    </TableCell>
                    <TableCell>
                      {emp.inProbation ? (
                        <Badge variant="secondary" className="font-normal">
                          Probation
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {emp.balances.map((b) => (
                          <span
                            key={b.id}
                            className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-1 text-xs font-medium"
                          >
                            <span className="text-muted-foreground">{b.leaveTypeName}:</span>
                            <span className="tabular-nums">{b.remaining}</span>
                            {b.locked != null && b.locked > 0 && (
                              <span className="text-muted-foreground">(locked: {b.locked})</span>
                            )}
                            {b.carryForward && (
                              <span className="text-muted-foreground">↗</span>
                            )}
                          </span>
                        ))}
                        {emp.balances.length === 0 && (
                          <span className="text-xs text-muted-foreground">No balances</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-70 group-hover:opacity-100 h-8 w-8 p-0"
                        onClick={() => openEdit(emp)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit balance</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit leave balance</SheetTitle>
            <SheetDescription>
              {editingEmployee ? (
                <>
                  Set baseline balance for {editingEmployee.name}. March onward accrual is added automatically.
                  Use 0.5 for half-days.
                </>
              ) : (
                'Set baseline balance per leave type.'
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cl">Casual Leave (CL)</Label>
                <Input
                  id="edit-cl"
                  type="number"
                  min={0}
                  step={0.5}
                  value={editValues.CL}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, CL: parseFloat(e.target.value) || 0 }))
                  }
                  className="font-mono tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sl">Sick Leave (SL)</Label>
                <Input
                  id="edit-sl"
                  type="number"
                  min={0}
                  step={0.5}
                  value={editValues.SL}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, SL: parseFloat(e.target.value) || 0 }))
                  }
                  className="font-mono tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-el">Earned Leave (EL)</Label>
                <Input
                  id="edit-el"
                  type="number"
                  min={0}
                  step={0.5}
                  value={editValues.EL}
                  onChange={(e) =>
                    setEditValues((v) => ({ ...v, EL: parseFloat(e.target.value) || 0 }))
                  }
                  className="font-mono tabular-nums"
                />
              </div>
            </div>
          </div>
          <SheetFooter className="flex flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditingEmployee(null)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

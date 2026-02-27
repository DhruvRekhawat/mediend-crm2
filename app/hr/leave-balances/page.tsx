'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch, apiPost } from '@/lib/api-client'
import { useState, useRef } from 'react'
import { CalendarCheck, Edit, Upload, Users } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface BalanceRow {
  id: string
  leaveTypeId: string
  leaveTypeName: string
  allocated: number
  used: number
  remaining: number
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

export default function HRLeaveBalancesPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<{
    employeeId: string
    employeeCode: string
    name: string
    balances: BalanceRow[]
  } | null>(null)
  const [balanceEdits, setBalanceEdits] = useState<Record<string, { allocated: number; used: number; remaining: number }>>({})
  const [csvOpen, setCsvOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: list, isLoading } = useQuery<EmployeeBalance[]>({
    queryKey: ['hr', 'leave-balances'],
    queryFn: () => apiGet<EmployeeBalance[]>('/api/hr/leave-balances'),
  })

  const patchMutation = useMutation({
    mutationFn: (payload: {
      employeeId: string
      leaveTypeId: string
      allocated?: number
      used?: number
      remaining?: number
    }) => apiPatch('/api/hr/leave-balances', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leave-balances'] })
      setEditing(null)
      setBalanceEdits({})
      toast.success('Leave balance updated')
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update'),
  })

  const bulkMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/hr/leave-balances/bulk', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Bulk upload failed')
      }
      return res.json()
    },
    onSuccess: (data: { updated: number; errors?: string[] }) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leave-balances'] })
      setCsvOpen(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success(`Updated ${data.updated} record(s)`)
      if (data.errors?.length) {
        data.errors.slice(0, 5).forEach((e) => toast.error(e))
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Bulk upload failed'),
  })

  const openEdit = (emp: EmployeeBalance) => {
    setEditing({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      name: emp.name,
      balances: emp.balances,
    })
    const edits: Record<string, { allocated: number; used: number; remaining: number }> = {}
    emp.balances.forEach((b) => {
      edits[b.leaveTypeId] = {
        allocated: b.allocated,
        used: b.used,
        remaining: b.remaining,
      }
    })
    setBalanceEdits(edits)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Balances</h1>
          <p className="text-muted-foreground mt-1">
            Set and edit paid leave balances per employee. First 6 months = zero leaves.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk upload (CSV)
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employees & balances
          </CardTitle>
          <CardDescription>
            Click Edit to change allocated / used / remaining for each leave type.
            CSV columns: employeeCode, leaveType, allocated, used, remaining
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
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((emp) => (
                  <TableRow key={emp.id}>
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
                        <Badge variant="secondary">Probation (0 leave)</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {emp.balances.map((b) => (
                          <span
                            key={b.id}
                            className="text-xs bg-muted px-2 py-0.5 rounded"
                          >
                            {b.leaveTypeName}: {b.remaining}/{b.allocated}
                          </span>
                        ))}
                        {emp.balances.length === 0 && (
                          <span className="text-xs text-muted-foreground">No balances</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(emp)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit leave balance</DialogTitle>
            <DialogDescription>
              {editing?.name} ({editing?.employeeCode})
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {editing.balances.map((b) => (
                <div key={b.leaveTypeId} className="grid grid-cols-3 gap-2 items-center">
                  <Label className="col-span-1">{b.leaveTypeName}</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Allocated"
                    value={balanceEdits[b.leaveTypeId]?.allocated ?? b.allocated}
                    onChange={(e) =>
                      setBalanceEdits((prev) => ({
                        ...prev,
                        [b.leaveTypeId]: {
                          ...(prev[b.leaveTypeId] ?? {
                            allocated: b.allocated,
                            used: b.used,
                            remaining: b.remaining,
                          }),
                          allocated: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Used"
                    value={balanceEdits[b.leaveTypeId]?.used ?? b.used}
                    onChange={(e) =>
                      setBalanceEdits((prev) => ({
                        ...prev,
                        [b.leaveTypeId]: {
                          ...(prev[b.leaveTypeId] ?? {
                            allocated: b.allocated,
                            used: b.used,
                            remaining: b.remaining,
                          }),
                          used: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Remaining"
                    value={balanceEdits[b.leaveTypeId]?.remaining ?? b.remaining}
                    onChange={(e) =>
                      setBalanceEdits((prev) => ({
                        ...prev,
                        [b.leaveTypeId]: {
                          ...(prev[b.leaveTypeId] ?? {
                            allocated: b.allocated,
                            used: b.used,
                            remaining: b.remaining,
                          }),
                          remaining: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                {editing.balances.map((b) => {
                  const e = balanceEdits[b.leaveTypeId] ?? {
                    allocated: b.allocated,
                    used: b.used,
                    remaining: b.remaining,
                  }
                  return (
                    <Button
                      key={b.leaveTypeId}
                      onClick={() =>
                        patchMutation.mutate({
                          employeeId: editing.employeeId,
                          leaveTypeId: b.leaveTypeId,
                          allocated: e.allocated,
                          used: e.used,
                          remaining: e.remaining,
                        })
                      }
                      disabled={patchMutation.isPending}
                    >
                      Save {b.leaveTypeName}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk upload CSV</DialogTitle>
            <DialogDescription>
              CSV with columns: employeeCode, leaveType, allocated, used, remaining. Leave type names must match existing types.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) bulkMutation.mutate(file)
              }}
            />
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setCsvOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

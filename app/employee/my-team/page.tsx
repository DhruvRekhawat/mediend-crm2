'use client'

import {
  AttendanceHeatmap,
  type AttendanceDay,
} from '@/components/employee/attendance-heatmap'
import { SelectableAttendanceHeatmap } from '@/components/employee/selectable-attendance-heatmap'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { apiGet, apiPatch, apiPost } from '@/lib/api-client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, eachDayOfInterval } from 'date-fns'
import { Calendar, Check, Clock, Users, X, UserCheck, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

interface AttendanceEntry {
  employeeId: string
  name: string
  email: string
  role: string
  attendance: AttendanceDay[]
}

interface TeamAttendanceResponse {
  entries: AttendanceEntry[]
  fromDate: string | null
  toDate: string | null
}

interface TeamMember {
  id: string
  userId: string
  employeeCode: string
  name: string
  email: string
  role: string
  departmentName: string | null
  subordinateCount: number
  hasSubordinates: boolean
}

interface TeamTreeResponse {
  managerEmployeeId: string
  members: TeamMember[]
}

interface TeamLeave {
  id: string
  employeeId: string
  employeeName: string
  employeeEmail: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedAt: string | null
  createdAt: string
}

interface TeamLeavesResponse {
  leaves: TeamLeave[]
}

interface NormalizationRecord {
  id: string
  employeeId: string
  date: string
  type: string
  status: string
  reason: string | null
  employee: { id: string; employeeCode: string; user: { name: string; email: string } }
  requestedBy?: { id: string; user: { name: string } }
  approvedBy?: { id: string; user: { name: string } } | null
}

interface TeamNormalizationResponse {
  list: NormalizationRecord[]
  subordinates: { id: string; employeeCode: string; name: string; email: string }[]
}

export default function MyTeamPage() {
  const queryClient = useQueryClient()
  const [fromDate, setFromDate] = useState(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
  )
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('PENDING')
  const [selectedLeave, setSelectedLeave] = useState<TeamLeave | null>(null)
  const [remarks, setRemarks] = useState('')
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [normEmployeeId, setNormEmployeeId] = useState('')
  const [normReason, setNormReason] = useState('')
  const [selectedNormDates, setSelectedNormDates] = useState<Set<string>>(new Set())
  const [drillDownManager, setDrillDownManager] = useState<TeamMember | null>(null)

  const { data: treeData } = useQuery<TeamTreeResponse>({
    queryKey: ['hierarchy', 'my-team', 'tree'],
    queryFn: () => apiGet<TeamTreeResponse>('/api/hierarchy/my-team/tree'),
  })

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery<TeamAttendanceResponse>({
    queryKey: ['hierarchy', 'my-team', 'attendance', fromDate, toDate],
    queryFn: () =>
      apiGet<TeamAttendanceResponse>(
        `/api/hierarchy/my-team/attendance?fromDate=${fromDate}&toDate=${toDate}`
      ),
  })

  const { data: leavesData, isLoading: leavesLoading } = useQuery<TeamLeavesResponse>({
    queryKey: ['hierarchy', 'my-team', 'leaves', leaveStatusFilter],
    queryFn: () =>
      apiGet<TeamLeavesResponse>(`/api/hierarchy/my-team/leaves?status=${leaveStatusFilter}`),
  })

  const { data: normData, isLoading: normLoading } = useQuery<TeamNormalizationResponse>({
    queryKey: ['attendance', 'normalize', 'team', fromDate, toDate],
    queryFn: () =>
      apiGet<TeamNormalizationResponse>(
        `/api/attendance/normalize/team?fromDate=${fromDate}&toDate=${toDate}`
      ),
  })

  const normalizeMutation = useMutation({
    mutationFn: (payload: { employeeId: string; dates: string[]; reason?: string }) =>
      apiPost<{ created?: number; skipped?: number }>('/api/attendance/normalize/manager', payload),
    onSuccess: (data: { created?: number; skipped?: number }) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'normalize', 'team'] })
      queryClient.invalidateQueries({ queryKey: ['hierarchy', 'my-team', 'attendance'] })
      setSelectedNormDates(new Set())
      const created = data?.created ?? 0
      const skipped = data?.skipped ?? 0
      if (created > 0) toast.success(`Normalized ${created} day(s)${skipped > 0 ? ` (${skipped} already normalized)` : ''}`)
      else if (skipped > 0) toast.info('All selected days were already normalized')
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to normalize'),
  })

  const approveMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      remarks: r,
    }: {
      id: string
      status: 'APPROVED' | 'REJECTED'
      remarks?: string
    }) => apiPatch(`/api/leaves/${id}/approve`, { status, remarks: r }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy', 'my-team', 'leaves'] })
      setApproveDialogOpen(false)
      setSelectedLeave(null)
      setRemarks('')
      toast.success('Leave request updated')
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update leave'),
  })

  const handleApproveClick = (leave: TeamLeave, action: 'APPROVED' | 'REJECTED') => {
    setSelectedLeave(leave)
    setApproveDialogOpen(true)
  }

  const handleApproveSubmit = (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedLeave) return
    approveMutation.mutate({ id: selectedLeave.id, status, remarks: remarks || undefined })
  }

  const entries = attendanceData?.entries ?? []
  const leaves = leavesData?.leaves ?? []
  const from = attendanceData?.fromDate ?? fromDate
  const to = attendanceData?.toDate ?? toDate

  /** Deadline for applying for a month: end of 5th of next month (UTC). */
  const normalizationDisabledDateKeys = useMemo(() => {
    const [sy, sm, sd] = from.split('-').map(Number)
    const [ey, em, ed] = to.split('-').map(Number)
    const start = new Date(sy, sm - 1, sd)
    const end = new Date(ey, em - 1, ed)
    const now = new Date()
    const disabled = new Set<string>()
    eachDayOfInterval({ start, end }).forEach((d) => {
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const deadline = new Date(Date.UTC(y, m, 5, 23, 59, 59, 999))
      if (now > deadline) {
        disabled.add(format(d, 'yyyy-MM-dd'))
      }
    })
    return disabled
  }, [from, to])

  const members = treeData?.members ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Team</h1>
        <p className="text-muted-foreground mt-1">Attendance and leave requests for employees you manage</p>
      </div>

      {members.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team hierarchy
            </CardTitle>
            <CardDescription>
              Your direct reports. Click &quot;View team&quot; on team leads to see their team&apos;s attendance and leaves.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.employeeCode} · {m.role.replace('_', ' ')}
                      {m.subordinateCount > 0 && ` · ${m.subordinateCount} report(s)`}
                    </p>
                  </div>
                  {m.hasSubordinates && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDrillDownManager(m)}
                      className="shrink-0"
                    >
                      <ChevronRight className="h-4 w-4 mr-1" />
                      View team
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <TeamDrillDownSheet
        manager={drillDownManager}
        open={!!drillDownManager}
        onOpenChange={(open) => !open && setDrillDownManager(null)}
        fromDate={fromDate}
        toDate={toDate}
        onDateChange={(f, t) => {
          setFromDate(f)
          setToDate(t)
        }}
      />

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance" className="gap-2">
            <Clock className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leaves" className="gap-2">
            <Calendar className="h-4 w-4" />
            Leaves
          </TabsTrigger>
          <TabsTrigger value="normalization" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Normalization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Date range</CardTitle>
              <CardDescription>Select range for attendance heatmaps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>To</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {attendanceLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading attendance...</div>
          ) : entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No team members with attendance in this range, or you have no direct reports.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {entries.map((entry) => (
                <Card key={entry.employeeId}>
                  <CardHeader>
                    <CardTitle className="text-lg">{entry.name}</CardTitle>
                    <CardDescription>
                      {entry.email} · {entry.role}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AttendanceHeatmap
                      attendance={entry.attendance}
                      fromDate={from}
                      toDate={to}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filter</CardTitle>
              <CardDescription>Leave requests from your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant={leaveStatusFilter === 'PENDING' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLeaveStatusFilter('PENDING')}
                >
                  Pending
                </Button>
                <Button
                  variant={leaveStatusFilter === 'APPROVED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLeaveStatusFilter('APPROVED')}
                >
                  Approved
                </Button>
                <Button
                  variant={leaveStatusFilter === 'REJECTED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLeaveStatusFilter('REJECTED')}
                >
                  Rejected
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leave requests</CardTitle>
              <CardDescription>{leaves.length} request(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {leavesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Leave type</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      {leaveStatusFilter === 'PENDING' && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">
                          {leave.employeeName}
                          <span className="block text-xs text-muted-foreground">
                            {leave.employeeEmail}
                          </span>
                        </TableCell>
                        <TableCell>{leave.leaveType}</TableCell>
                        <TableCell>{format(new Date(leave.startDate), 'PP')}</TableCell>
                        <TableCell>{format(new Date(leave.endDate), 'PP')}</TableCell>
                        <TableCell>{leave.days}</TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          {leave.reason || '—'}
                        </TableCell>
                        <TableCell>
                          {leave.status === 'PENDING' && (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                          {leave.status === 'APPROVED' && (
                            <Badge variant="default">Approved</Badge>
                          )}
                          {leave.status === 'REJECTED' && (
                            <Badge variant="destructive">Rejected</Badge>
                          )}
                        </TableCell>
                        {leaveStatusFilter === 'PENDING' && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveClick(leave, 'APPROVED')}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleApproveClick(leave, 'REJECTED')}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {leaves.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={leaveStatusFilter === 'PENDING' ? 8 : 7}
                          className="text-center text-muted-foreground py-8"
                        >
                          No leave requests found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="normalization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Normalize attendance</CardTitle>
              <CardDescription>
                Select a team member and date range, then click days on the heatmap to apply for normalization. You can apply for a month until the 5th of the next month. Applications go to HR for approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <Label>Date range</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-[140px]"
                    />
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-[140px]"
                    />
                  </div>
                </div>
                <div>
                  <Label>Employee</Label>
                  <select
                    className="mt-1 flex h-9 w-[220px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={normEmployeeId}
                    onChange={(e) => {
                      setNormEmployeeId(e.target.value)
                      setSelectedNormDates(new Set())
                    }}
                  >
                    <option value="">Select team member...</option>
                    {(normData?.subordinates ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {normEmployeeId && (
                <>
                  <SelectableAttendanceHeatmap
                    attendance={
                      (attendanceData?.entries ?? []).find((e) => e.employeeId === normEmployeeId)
                        ?.attendance ?? []
                    }
                    fromDate={from}
                    toDate={to}
                    selectedDates={selectedNormDates}
                    onSelectionChange={setSelectedNormDates}
                    disabledDateKeys={normalizationDisabledDateKeys}
                  />

                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                    <div>
                      <Label className="text-xs text-muted-foreground">Reason (optional)</Label>
                      <Input
                        value={normReason}
                        onChange={(e) => setNormReason(e.target.value)}
                        placeholder="e.g. Official travel"
                        className="mt-1 max-w-xs"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (selectedNormDates.size === 0) {
                          toast.error('Select at least one day on the heatmap')
                          return
                        }
                        normalizeMutation.mutate({
                          employeeId: normEmployeeId,
                          dates: Array.from(selectedNormDates),
                          reason: normReason || undefined,
                        })
                      }}
                      disabled={selectedNormDates.size === 0 || normalizeMutation.isPending}
                      className="mt-6"
                    >
                      {normalizeMutation.isPending
                        ? 'Applying...'
                        : `Apply for ${selectedNormDates.size} day(s)`}
                    </Button>
                  </div>
                </>
              )}

              {!normEmployeeId && (
                <p className="text-sm text-muted-foreground py-4">
                  Select an employee to see their attendance and choose days to normalize.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent normalizations</CardTitle>
              <CardDescription>Manager normalizations in the selected range</CardDescription>
            </CardHeader>
            <CardContent>
              {normLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : !normData?.list?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No normalizations in this range.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {normData.list.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-medium">
                          {n.employee?.user?.name ?? '—'} ({n.employee?.employeeCode})
                        </TableCell>
                        <TableCell>{format(new Date(n.date), 'PPP')}</TableCell>
                        <TableCell>{n.type}</TableCell>
                        <TableCell>
                          <Badge variant={n.status === 'APPROVED' ? 'default' : 'secondary'}>
                            {n.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve / Reject leave</DialogTitle>
            <DialogDescription>
              {selectedLeave &&
                `${selectedLeave.employeeName} · ${selectedLeave.leaveType} (${selectedLeave.days} days)`}
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Start:</span>
                  <p className="font-medium">{format(new Date(selectedLeave.startDate), 'PPP')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">End:</span>
                  <p className="font-medium">{format(new Date(selectedLeave.endDate), 'PPP')}</p>
                </div>
                {selectedLeave.reason && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Reason:</span>
                    <p className="font-medium">{selectedLeave.reason}</p>
                  </div>
                )}
              </div>
              <div>
                <Label>Remarks (optional)</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Remarks..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="destructive"
                  onClick={() => handleApproveSubmit('REJECTED')}
                  disabled={approveMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApproveSubmit('APPROVED')}
                  disabled={approveMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TeamDrillDownSheet({
  manager,
  open,
  onOpenChange,
  fromDate,
  toDate,
  onDateChange,
}: {
  manager: TeamMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
  fromDate: string
  toDate: string
  onDateChange: (from: string, to: string) => void
}) {
  const queryClient = useQueryClient()
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>('PENDING')
  const [selectedLeave, setSelectedLeave] = useState<TeamLeave | null>(null)
  const [remarks, setRemarks] = useState('')
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery<TeamAttendanceResponse>({
    queryKey: ['hierarchy', 'my-team', 'attendance', manager?.id, fromDate, toDate],
    queryFn: () =>
      apiGet<TeamAttendanceResponse>(
        `/api/hierarchy/my-team/attendance?fromDate=${fromDate}&toDate=${toDate}&managerEmployeeId=${manager?.id}`
      ),
    enabled: open && !!manager?.id,
  })

  const { data: leavesData, isLoading: leavesLoading } = useQuery<TeamLeavesResponse>({
    queryKey: ['hierarchy', 'my-team', 'leaves', manager?.id, leaveStatusFilter],
    queryFn: () =>
      apiGet<TeamLeavesResponse>(
        `/api/hierarchy/my-team/leaves?status=${leaveStatusFilter}&managerEmployeeId=${manager?.id}`
      ),
    enabled: open && !!manager?.id,
  })

  const approveMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      remarks: r,
    }: {
      id: string
      status: 'APPROVED' | 'REJECTED'
      remarks?: string
    }) => apiPatch(`/api/leaves/${id}/approve`, { status, remarks: r }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy', 'my-team', 'leaves'] })
      setApproveDialogOpen(false)
      setSelectedLeave(null)
      setRemarks('')
      toast.success('Leave request updated')
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update leave'),
  })

  const handleApproveSubmit = (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedLeave) return
    approveMutation.mutate({ id: selectedLeave.id, status, remarks: remarks || undefined })
  }

  const entries = attendanceData?.entries ?? []
  const leaves = leavesData?.leaves ?? []
  const from = attendanceData?.fromDate ?? fromDate
  const to = attendanceData?.toDate ?? toDate

  if (!manager) return null

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{manager.name}&apos;s team</SheetTitle>
            <SheetDescription>
              {manager.employeeCode} · {manager.role.replace('_', ' ')} · {manager.subordinateCount} report(s)
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Date range</CardTitle>
                <CardDescription>Select range for attendance heatmaps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>From</Label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => onDateChange(e.target.value, toDate)}
                    />
                  </div>
                  <div>
                    <Label>To</Label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => onDateChange(fromDate, e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Attendance
              </h4>
              {attendanceLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm rounded-lg border border-dashed">
                  No attendance in this range
                </div>
              ) : (
                <div className="space-y-4">
                  {entries.map((entry) => (
                    <Card key={entry.employeeId}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">{entry.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {entry.email} · {entry.role.replace('_', ' ')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <AttendanceHeatmap
                          attendance={entry.attendance}
                          fromDate={from}
                          toDate={to}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Leaves
              </h4>
              <div className="flex gap-2 mb-3">
                <Button
                  variant={leaveStatusFilter === 'PENDING' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLeaveStatusFilter('PENDING')}
                >
                  Pending
                </Button>
                <Button
                  variant={leaveStatusFilter === 'APPROVED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLeaveStatusFilter('APPROVED')}
                >
                  Approved
                </Button>
                <Button
                  variant={leaveStatusFilter === 'REJECTED' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLeaveStatusFilter('REJECTED')}
                >
                  Rejected
                </Button>
              </div>
              {leavesLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
                        {leaveStatusFilter === 'PENDING' && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.map((leave) => (
                        <TableRow key={leave.id}>
                          <TableCell className="font-medium text-sm">
                            {leave.employeeName}
                            <span className="block text-xs text-muted-foreground">{leave.employeeEmail}</span>
                          </TableCell>
                          <TableCell className="text-sm">{leave.leaveType}</TableCell>
                          <TableCell className="text-sm">{format(new Date(leave.startDate), 'PP')}</TableCell>
                          <TableCell className="text-sm">{format(new Date(leave.endDate), 'PP')}</TableCell>
                          <TableCell className="text-sm">{leave.days}</TableCell>
                          <TableCell>
                            {leave.status === 'PENDING' && <Badge variant="secondary">Pending</Badge>}
                            {leave.status === 'APPROVED' && <Badge variant="default">Approved</Badge>}
                            {leave.status === 'REJECTED' && <Badge variant="destructive">Rejected</Badge>}
                          </TableCell>
                          {leaveStatusFilter === 'PENDING' && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => {
                                    setSelectedLeave(leave)
                                    setApproveDialogOpen(true)
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setSelectedLeave(leave)
                                    setApproveDialogOpen(true)
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {leaves.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={leaveStatusFilter === 'PENDING' ? 7 : 6}
                            className="text-center text-muted-foreground py-8 text-sm"
                          >
                            No leave requests
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve / Reject leave</DialogTitle>
            <DialogDescription>
              {selectedLeave &&
                `${selectedLeave.employeeName} · ${selectedLeave.leaveType} (${selectedLeave.days} days)`}
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Start:</span>
                  <p className="font-medium">{format(new Date(selectedLeave.startDate), 'PPP')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">End:</span>
                  <p className="font-medium">{format(new Date(selectedLeave.endDate), 'PPP')}</p>
                </div>
                {selectedLeave.reason && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Reason:</span>
                    <p className="font-medium">{selectedLeave.reason}</p>
                  </div>
                )}
              </div>
              <div>
                <Label>Remarks (optional)</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Remarks..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="destructive"
                  onClick={() => handleApproveSubmit('REJECTED')}
                  disabled={approveMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApproveSubmit('APPROVED')}
                  disabled={approveMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { AttendanceHeatmap } from '@/components/employee/attendance-heatmap'
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
import { Textarea } from '@/components/ui/textarea'
import { apiGet, apiPatch, apiPost } from '@/lib/api-client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Calendar, Check, Clock, Users, X, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface AttendanceEntry {
  employeeId: string
  name: string
  email: string
  role: string
  attendance: Array<{
    date: Date
    inTime: Date | null
    outTime: Date | null
    isLate: boolean
  }>
}

interface TeamAttendanceResponse {
  entries: AttendanceEntry[]
  fromDate: string | null
  toDate: string | null
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
  managerLimitPerEmployee: number
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
  const [normDate, setNormDate] = useState('')
  const [normReason, setNormReason] = useState('')

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
    mutationFn: (payload: { employeeId: string; date: string; reason?: string }) =>
      apiPost('/api/attendance/normalize/manager', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'normalize', 'team'] })
      setNormEmployeeId('')
      setNormDate('')
      setNormReason('')
      toast.success('Attendance normalized')
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Team</h1>
        <p className="text-muted-foreground mt-1">Attendance and leave requests for employees you manage</p>
      </div>

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
                Mark a team member&apos;s day as full day. Max 5 days per employee per month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <Label>Employee</Label>
                  <select
                    className="mt-1 flex h-9 w-[200px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={normEmployeeId}
                    onChange={(e) => setNormEmployeeId(e.target.value)}
                  >
                    <option value="">Select...</option>
                    {(normData?.subordinates ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={normDate}
                    onChange={(e) => setNormDate(e.target.value)}
                    className="mt-1 w-[160px]"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (normEmployeeId && normDate) {
                      normalizeMutation.mutate({
                        employeeId: normEmployeeId,
                        date: normDate,
                        reason: normReason || undefined,
                      })
                    } else {
                      toast.error('Select employee and date')
                    }
                  }}
                  disabled={!normEmployeeId || !normDate || normalizeMutation.isPending}
                >
                  {normalizeMutation.isPending ? 'Normalizing...' : 'Normalize'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Remaining this month: 5 per employee (see list below).
              </p>
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

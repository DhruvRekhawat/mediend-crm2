'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { format } from 'date-fns'
import { Calendar, FileText, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { SectionContainer } from '@/components/employee/section-container'
import { TabNavigation, type TabItem } from '@/components/employee/tab-navigation'
import { AttendanceHeatmap, type AttendanceDay as HeatmapAttendanceDay } from '@/components/employee/attendance-heatmap'
import { LeaveBalanceCard } from '@/components/hrms/LeaveBalanceCard'
import { LeaveApplicationForm } from '@/components/hrms/LeaveApplicationForm'
import { useRouter } from 'next/navigation'

const CORE_HR_TABS: TabItem[] = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'leaves', label: 'Leaves' },
  { value: 'documents', label: 'Documents' },
]

interface AttendanceDay {
  date: Date
  inTime: Date | null
  outTime: Date | null
  isLate: boolean
  status?: string
  penalty?: number
  isHalfDay?: boolean
  isNormalized?: boolean
  logs?: Array<{ id: string; logDate: Date; punchDirection: string }>
}

interface AttendanceMyResponse {
  attendance: AttendanceDay[]
  leaveDays: { date: string; isUnpaid: boolean }[]
}

interface AttendanceStats {
  grace1Count: number
  grace2Count: number
  latePenaltyCount: number
  halfDayCount: number
  totalPenalty: number
  normalizationsUsed: number
  normalizationsLimitDays: number
  normalizationsHoursUsed: number
  normalizationsLimitHours: number
}

interface LeaveType {
  id: string
  name: string
  maxDays: number
  isActive: boolean
}

interface LeaveRequest {
  id: string
  leaveType: LeaveType
  startDate: Date
  endDate: Date
  days: number
  reason: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  isUnpaid?: boolean
  approvedAt: Date | null
  approvedBy: { id: string; name: string; email: string } | null
  remarks: string | null
}

interface LeaveData {
  requests: LeaveRequest[]
  balances: Array<{
    id: string
    leaveTypeId: string
    allocated: number
    used: number
    remaining: number
    locked?: number
    isProbation?: boolean
    carryForward?: boolean
    leaveType: LeaveType
  }>
}

interface EmployeeDocument {
  id: string
  documentType: 'OFFER_LETTER' | 'APPRAISAL_LETTER' | 'EXPERIENCE_LETTER' | 'RELIEVING_LETTER'
  generatedAt: string
}

const DOCUMENT_TYPES: Record<string, string> = {
  OFFER_LETTER: 'Offer Letter',
  APPRAISAL_LETTER: 'Appraisal Letter',
  EXPERIENCE_LETTER: 'Experience Letter',
  RELIEVING_LETTER: 'Relieving Letter',
}

function formatTime(date: Date | string | null) {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'N/A'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

export default function CoreHRPage() {
  const [activeTab, setActiveTab] = useState('attendance')
  const router = useRouter()

  return (
    <div className="space-y-6">

      <TabNavigation
        tabs={CORE_HR_TABS}
        value={activeTab}
        onValueChange={setActiveTab}
        variant="core-hr"
      />

      <div className="mt-6">
        {activeTab === 'attendance' && <AttendanceTab />}
        {activeTab === 'leaves' && <LeavesTab />}
        {activeTab === 'documents' && <DocumentsTab router={router} />}
      </div>
    </div>
  )
}

function AttendanceTab() {
  const [fromDate, setFromDate] = useState(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
  )
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [normalizeDialogOpen, setNormalizeDialogOpen] = useState(false)
  const [normalizeDate, setNormalizeDate] = useState('')
  const [normalizeHours, setNormalizeHours] = useState<1 | 2 | 3>(1)
  const queryClient = useQueryClient()

  const { data: attendanceData, isLoading } = useQuery<AttendanceMyResponse>({
    queryKey: ['attendance', 'my', fromDate, toDate],
    queryFn: () =>
      apiGet<AttendanceMyResponse>(
        `/api/attendance/my?fromDate=${fromDate}&toDate=${toDate}`
      ),
  })

  const { data: stats } = useQuery<AttendanceStats>({
    queryKey: ['attendance', 'stats', fromDate, toDate],
    queryFn: () =>
      apiGet<AttendanceStats>(
        `/api/attendance/stats?fromDate=${fromDate}&toDate=${toDate}`
      ),
  })

  const normalizeMutation = useMutation({
    mutationFn: ({ date, hours }: { date: string; hours: 1 | 2 | 3 }) =>
      apiPost<unknown>('/api/attendance/normalize', { date, hours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'my'] })
      queryClient.invalidateQueries({ queryKey: ['attendance', 'stats'] })
      setNormalizeDialogOpen(false)
      setNormalizeDate('')
      setNormalizeHours(1)
      toast.success('Attendance normalized successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to normalize attendance')
    },
  })

  const attendance = attendanceData?.attendance ?? []
  const leaveDays = attendanceData?.leaveDays ?? []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>From</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>To</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Grace 1</p>
            <p className="text-2xl font-semibold">{stats.grace1Count}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Grace 2</p>
            <p className="text-2xl font-semibold">{stats.grace2Count}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Late (penalty)</p>
            <p className="text-2xl font-semibold">{stats.latePenaltyCount}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Half days</p>
            <p className="text-2xl font-semibold">{stats.halfDayCount}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total penalties</p>
            <p className="text-2xl font-semibold">₹{stats.totalPenalty}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Normalizations</p>
            <p className="text-2xl font-semibold">{stats.normalizationsHoursUsed}/{stats.normalizationsLimitHours} hrs, {stats.normalizationsUsed}/{stats.normalizationsLimitDays} days</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">You can use up to 3 hours per month, on up to 3 days. Choose 1, 2, or 3 hours per day. Only days where you were in by 11 AM or worked at least 7 hours can be normalized; leave and absent days cannot.</span>
        <Dialog open={normalizeDialogOpen} onOpenChange={setNormalizeDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">Normalize attendance</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Normalize a day</DialogTitle>
              <DialogDescription>Select a date and how many hours (1, 2, or 3) to use from your monthly allowance. You can use up to 3 hours per month on up to 3 days.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={normalizeDate}
                  onChange={(e) => setNormalizeDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Hours to use (1, 2, or 3)</Label>
                <div className="flex gap-2 mt-2">
                  {([1, 2, 3] as const).map((h) => (
                    <Button
                      key={h}
                      type="button"
                      variant={normalizeHours === h ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNormalizeHours(h)}
                    >
                      {h} hr{h > 1 ? 's' : ''}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNormalizeDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (normalizeDate) normalizeMutation.mutate({ date: normalizeDate, hours: normalizeHours })
                    else toast.error('Select a date')
                  }}
                  disabled={!normalizeDate || normalizeMutation.isPending}
                >
                  {normalizeMutation.isPending ? 'Normalizing...' : 'Normalize'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <SectionContainer title="Attendance records">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (attendance.length > 0 || leaveDays.length > 0) ? (
          <AttendanceHeatmap
            attendance={attendance as HeatmapAttendanceDay[]}
            fromDate={fromDate}
            toDate={toDate}
            leaveDays={leaveDays}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No attendance records found
          </div>
        )}
      </SectionContainer>
    </div>
  )
}

function LeavesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: leaveData, isLoading } = useQuery<LeaveData>({
    queryKey: ['leaves', 'my'],
    queryFn: () => apiGet<LeaveData>('/api/leaves/my'),
  })

  const { data: leaveTypes, isLoading: leaveTypesLoading, error: leaveTypesError } = useQuery<
    LeaveType[]
  >({
    queryKey: ['leaveTypes'],
    queryFn: () => apiGet<LeaveType[]>('/api/leaves/types?activeOnly=true'),
  })

  const isProbation = leaveData?.balances?.[0]?.isProbation ?? false

  const applyLeaveMutation = useMutation({
    mutationFn: (data: {
      leaveTypeId: string
      startDate: Date
      endDate: Date
      reason?: string
    }) =>
      apiPost<LeaveRequest>('/api/leaves/apply', {
        ...data,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves', 'my'] })
      setIsDialogOpen(false)
      toast.success('Leave application submitted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit leave application')
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="default" className="font-medium">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="destructive" className="font-medium">Rejected</Badge>
      default:
        return <Badge variant="secondary" className="font-medium">Pending</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        View your leave balance and history. Policy: 1 CL, 0.5 SL, 0.5 EL per month; EL carries to next year; CL & SL reset yearly.
      </p>

      {isLoading ? (
        <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground">
          Loading your leave balance…
        </div>
      ) : leaveData?.balances && leaveData.balances.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold mb-3">Your leave balance</h2>
          <LeaveBalanceCard balances={leaveData.balances} />
        </div>
      ) : leaveData && !leaveData.balances?.length ? (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          No leave balance data available. Contact HR if this is unexpected.
        </div>
      ) : null}

      <div className="flex items-center justify-between flex-wrap gap-2">
        {isProbation ? (
          <p className="text-sm text-muted-foreground">
            Leave applications are locked during your first 6 months. You will be able to apply after completing probation.
          </p>
        ) : (
          <span />
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={isProbation}
            >
              Apply for Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request. Balances are computed from policy (1 CL, 0.5 SL, 0.5 EL per month; EL carries forward).
              </DialogDescription>
            </DialogHeader>
            {isProbation ? (
              <p className="text-sm text-muted-foreground py-4">
                Leave applications are not available during your probation period (first 6 months).
              </p>
            ) : leaveTypesLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading leave types...</div>
            ) : leaveTypesError ? (
              <div className="text-center py-4 text-red-500">Failed to load leave types.</div>
            ) : leaveTypes && leaveTypes.length > 0 ? (
              <LeaveApplicationForm
                leaveTypes={leaveTypes}
                balances={leaveData?.balances?.map((b) => ({
                  leaveTypeId: b.leaveTypeId,
                  remaining: b.remaining,
                  allocated: b.allocated,
                  locked: b.locked,
                  isProbation: b.isProbation,
                })) ?? []}
                onSubmit={(data) => applyLeaveMutation.mutate(data)}
                isLoading={applyLeaveMutation.isPending}
              />
            ) : (
              <div className="text-center py-4 text-muted-foreground">No leave types available.</div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {leaveData?.requests && leaveData.requests.filter((r) => r.status === 'APPROVED' && r.isUnpaid).length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 p-4">
          <h3 className="font-medium text-rose-800 dark:text-rose-200">Unpaid leave</h3>
          <p className="text-sm text-rose-700 dark:text-rose-300 mt-1">
            {leaveData.requests
              .filter((r) => r.status === 'APPROVED' && r.isUnpaid)
              .reduce((sum, r) => sum + r.days, 0)}{' '}
            day(s) taken as unpaid leave (quota exhausted).
          </p>
        </div>
      )}

      <SectionContainer title="Leave history">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave Type</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveData?.requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.leaveType.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(req.startDate), 'PPP')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(req.endDate), 'PPP')}
                    </div>
                  </TableCell>
                  <TableCell><strong>{req.days}</strong> days</TableCell>
                  <TableCell>{req.reason || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(req.status)}
                      {req.approvedAt && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(req.approvedAt), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {req.approvedBy ? (
                      <div>
                        <p className="text-sm font-medium">{req.approvedBy.name}</p>
                        <p className="text-xs text-muted-foreground">{req.approvedBy.email}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>{req.remarks || 'N/A'}</TableCell>
                </TableRow>
              ))}
              {(!leaveData?.requests || leaveData.requests.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No leave requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </SectionContainer>
    </div>
  )
}

function DocumentsTab({ router }: { router: ReturnType<typeof useRouter> }) {
  const { data: documents, isLoading } = useQuery<EmployeeDocument[]>({
    queryKey: ['my-documents'],
    queryFn: () => apiGet<EmployeeDocument[]>('/api/employee/documents'),
  })

  const handleView = (id: string) => {
    router.push(`/employee/documents/${id}/view`)
  }

  return (
    <div className="space-y-6">
      <SectionContainer title="Employment documents">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : documents && documents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Badge variant="secondary">
                      {DOCUMENT_TYPES[doc.documentType] ?? doc.documentType}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(doc.generatedAt), 'PPP')}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => handleView(doc.id)}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View & Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No documents available yet</p>
            <p className="text-sm mt-1">Documents will appear here once HR generates them</p>
          </div>
        )}
      </SectionContainer>
    </div>
  )
}

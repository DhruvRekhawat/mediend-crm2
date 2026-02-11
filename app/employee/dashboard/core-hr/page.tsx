'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { format } from 'date-fns'
import {
  AlertCircle,
  Calendar,
  Clock,
  User,
  Mail,
  Hash,
  Cake,
  Building,
  DollarSign,
  FileText,
  ExternalLink,
} from 'lucide-react'
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
import { InfoField } from '@/components/employee/info-field'
import { SectionContainer } from '@/components/employee/section-container'
import { TabNavigation, type TabItem } from '@/components/employee/tab-navigation'
import { AttendanceHeatmap } from '@/components/employee/attendance-heatmap'
import { LeaveBalanceCard } from '@/components/hrms/LeaveBalanceCard'
import { LeaveApplicationForm } from '@/components/hrms/LeaveApplicationForm'
import { BirthdayCard } from '@/components/birthday-card'
import { useRouter } from 'next/navigation'

const CORE_HR_TABS: TabItem[] = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'leaves', label: 'Leaves' },
  { value: 'profile', label: 'Profile' },
  { value: 'documents', label: 'Documents' },
]

interface AttendanceDay {
  date: Date
  inTime: Date | null
  outTime: Date | null
  isLate: boolean
  logs: Array<{ id: string; logDate: Date; punchDirection: string }>
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
  approvedAt: Date | null
  approvedBy: { id: string; name: string; email: string } | null
  remarks: string | null
}

interface LeaveData {
  requests: LeaveRequest[]
  balances: Array<{
    id: string
    allocated: number
    used: number
    remaining: number
    leaveType: LeaveType
  }>
}

interface Employee {
  id: string
  employeeCode: string
  joinDate: Date | null
  salary: number | null
  dateOfBirth: Date | null
  user: { id: string; name: string; email: string; role: string }
  department: { id: string; name: string; description: string | null } | null
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

function formatCurrency(amount: number | null) {
  if (amount == null) return 'N/A'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount)
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
        {activeTab === 'profile' && <ProfileTab />}
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

  const { data: attendance, isLoading } = useQuery<AttendanceDay[]>({
    queryKey: ['attendance', 'my', fromDate, toDate],
    queryFn: () =>
      apiGet<AttendanceDay[]>(
        `/api/attendance/my?fromDate=${fromDate}&toDate=${toDate}`
      ),
  })

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

      <SectionContainer title="Attendance records">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : attendance && attendance.length > 0 ? (
          <AttendanceHeatmap
            attendance={attendance}
            fromDate={fromDate}
            toDate={toDate}
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
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground"></span>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              Apply for Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>Submit a new leave request</DialogDescription>
            </DialogHeader>
            {leaveTypesLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading leave types...</div>
            ) : leaveTypesError ? (
              <div className="text-center py-4 text-red-500">Failed to load leave types.</div>
            ) : leaveTypes && leaveTypes.length > 0 ? (
              <LeaveApplicationForm
                leaveTypes={leaveTypes}
                onSubmit={(data) => applyLeaveMutation.mutate(data)}
                isLoading={applyLeaveMutation.isPending}
              />
            ) : (
              <div className="text-center py-4 text-muted-foreground">No leave types available.</div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {leaveData?.balances && leaveData.balances.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Leave balance</h2>
          <LeaveBalanceCard balances={leaveData.balances} />
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

function ProfileTab() {
  const { data: employee, isLoading } = useQuery<Employee>({
    queryKey: ['employee', 'my'],
    queryFn: () => apiGet<Employee>('/api/employees/my'),
  })

  return (
    <div className="space-y-6">
      <BirthdayCard />
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : employee ? (
        <div className="grid gap-6 md:grid-cols-2">
          <SectionContainer title="Personal information">
            <div className="space-y-4">
              <InfoField icon={User} label="Name" value={employee.user.name} />
              <InfoField icon={Mail} label="Email" value={employee.user.email} />
              <InfoField icon={Hash} label="Employee Code" value={employee.employeeCode} />
              {employee.dateOfBirth && (
                <InfoField
                  icon={Cake}
                  label="Date of Birth"
                  value={format(new Date(employee.dateOfBirth), 'PPP')}
                />
              )}
            </div>
          </SectionContainer>
          <SectionContainer title="Employment details">
            <div className="space-y-4">
              <InfoField
                icon={Building}
                label="Department"
                value={employee.department?.name || 'N/A'}
              />
              <InfoField
                icon={Calendar}
                label="Join Date"
                value={
                  employee.joinDate
                    ? format(new Date(employee.joinDate), 'PPP')
                    : 'N/A'
                }
              />
              <InfoField
                icon={DollarSign}
                label="Salary"
                value={formatCurrency(employee.salary)}
              />
              <InfoField
                icon={User}
                label="Role"
                value={employee.user.role.replace('_', ' ')}
              />
            </div>
          </SectionContainer>
        </div>
      ) : (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 py-8 text-center text-muted-foreground">
          Employee record not found
        </div>
      )}
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

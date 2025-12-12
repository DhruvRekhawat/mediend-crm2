'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { useState } from 'react'
import { Calendar, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Department {
  id: string
  name: string
}

interface AttendanceRecord {
  employee: {
    id: string
    employeeCode: string
    user: {
      id: string
      name: string
      email: string
    }
    department: {
      id: string
      name: string
    } | null
  }
  date: string
  inTime: Date | null
  outTime: Date | null
  workHours: number | null
  isLate: boolean
}

interface AttendanceData {
  data: AttendanceRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function HRAttendancePage() {
  const [fromDate, setFromDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'))
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [departmentId, setDepartmentId] = useState<string>('all')
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false)
  const [syncFromDate, setSyncFromDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'))
  const [syncToDate, setSyncToDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
  })

  const { data: attendanceData, isLoading, refetch } = useQuery<AttendanceData>({
    queryKey: ['attendance', fromDate, toDate, departmentId],
    queryFn: () => {
      const params = new URLSearchParams({
        fromDate,
        toDate,
        ...(departmentId && departmentId !== 'all' && { departmentId }),
      })
      return apiGet<AttendanceData>(`/api/attendance?${params.toString()}`)
    },
  })

  const syncAttendanceMutation = useMutation({
    mutationFn: (data: { fromDate: string; toDate: string }) =>
      apiPost('/api/attendance/sync', data),
    onSuccess: (data: any) => {
      toast.success(`Synced ${data.processed} records. Skipped ${data.skipped}.`)
      setIsSyncDialogOpen(false)
      refetch()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync attendance')
    },
  })

  const formatTime = (date: Date | null) => {
    if (!date) return 'N/A'
    return format(new Date(date), 'HH:mm')
  }

  const formatDate = (date: string) => {
    return format(new Date(date), 'PPP')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Monitoring</h1>
          <p className="text-muted-foreground mt-1">Monitor employee attendance across departments</p>
        </div>
        <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Attendance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sync Attendance from Biometric</DialogTitle>
              <DialogDescription>Fetch attendance data from biometric machine</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={syncFromDate}
                    onChange={(e) => setSyncFromDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={syncToDate}
                    onChange={(e) => setSyncToDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    syncAttendanceMutation.mutate({
                      fromDate: syncFromDate,
                      toDate: syncToDate,
                    })
                  }}
                  disabled={syncAttendanceMutation.isPending}
                >
                  {syncAttendanceMutation.isPending ? 'Syncing...' : 'Sync'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>
            Total: {attendanceData?.pagination.total || 0} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry Time</TableHead>
                  <TableHead>Exit Time</TableHead>
                  <TableHead>Work Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData?.data.map((record, index) => (
                  <TableRow key={`${record.employee.id}-${record.date}-${index}`}>
                    <TableCell className="font-medium">
                      {record.employee.user.name}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {record.employee.employeeCode}
                      </span>
                    </TableCell>
                    <TableCell>{record.employee.department?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(record.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatTime(record.inTime)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatTime(record.outTime)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.workHours !== null
                        ? `${record.workHours.toFixed(2)} hours`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {record.isLate ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Late
                        </Badge>
                      ) : (
                        <Badge variant="default">On Time</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!attendanceData?.data || attendanceData.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


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
import { useState, useMemo } from 'react'
import { Calendar, Clock, AlertCircle, RefreshCw, Search, ChevronLeft, ChevronRight, Users, UserCheck, UserX, TrendingUp } from 'lucide-react'
import { format, eachDayOfInterval } from 'date-fns'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'

interface Department {
  id: string
  name: string
}

interface Employee {
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

const COLORS = {
  onTime: '#22c55e',
  late: '#ef4444',
  present: '#3b82f6',
  absent: '#94a3b8',
}

export default function HRAttendancePage() {
  const [fromDate, setFromDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'))
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [departmentId, setDepartmentId] = useState<string>('all')
  const [employeeId, setEmployeeId] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [heatmapEmployeeId, setHeatmapEmployeeId] = useState<string>('all')
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false)
  const [syncFromDate, setSyncFromDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'))
  const [syncToDate, setSyncToDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const { data: departments } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
  })

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['employees', departmentId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (departmentId && departmentId !== 'all') {
        params.set('departmentId', departmentId)
      }
      return apiGet<Employee[]>(`/api/employees?${params.toString()}`)
    },
    enabled: true,
  })

  // Fetch ALL attendance data for charts (no pagination)
  const { data: allAttendanceData } = useQuery<AttendanceData>({
    queryKey: ['attendance-all', fromDate, toDate, departmentId, employeeId, search],
    queryFn: () => {
      const params = new URLSearchParams({
        fromDate,
        toDate,
        page: '1',
        limit: '10000', // Large limit to get all records for charts
      })
      if (departmentId && departmentId !== 'all') {
        params.set('departmentId', departmentId)
      }
      if (employeeId && employeeId !== 'all') {
        params.set('employeeId', employeeId)
      }
      if (search) {
        params.set('search', search)
      }
      return apiGet<AttendanceData>(`/api/attendance?${params.toString()}`)
    },
  })

  const { data: attendanceData, isLoading, refetch } = useQuery<AttendanceData>({
    queryKey: ['attendance', fromDate, toDate, departmentId, employeeId, search, page],
    queryFn: () => {
      const params = new URLSearchParams({
        fromDate,
        toDate,
        page: page.toString(),
        limit: '30',
      })
      if (departmentId && departmentId !== 'all') {
        params.set('departmentId', departmentId)
      }
      if (employeeId && employeeId !== 'all') {
        params.set('employeeId', employeeId)
      }
      if (search) {
        params.set('search', search)
      }
      return apiGet<AttendanceData>(`/api/attendance?${params.toString()}`)
    },
  })

  const syncAttendanceMutation = useMutation({
    mutationFn: (data: { fromDate: string; toDate: string }) =>
      apiPost<{ processed: number; skipped: number }>('/api/attendance/sync', data),
    onSuccess: (data) => {
      toast.success(`Synced ${data.processed} records. Skipped ${data.skipped}.`)
      setIsSyncDialogOpen(false)
      refetch()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync attendance')
    },
  })

  // Daily trend data - On Time vs Late per day
  const dailyTrendData = useMemo(() => {
    if (!allAttendanceData?.data) return []

    const dateMap = new Map<string, { onTime: number; late: number }>()
    
    allAttendanceData.data.forEach(record => {
      const dateKey = record.date
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { onTime: 0, late: 0 })
      }
      const stats = dateMap.get(dateKey)!
      if (record.isLate) {
        stats.late++
      } else {
        stats.onTime++
      }
    })

    return Array.from(dateMap.entries())
      .map(([date, stats]) => {
        const [y, m, d] = date.split('-').map(Number)
        const dateObj = new Date(y, m - 1, d)
        return {
          date: format(dateObj, 'dd'),
          fullDate: format(dateObj, 'MMM dd'),
          onTime: stats.onTime,
          late: stats.late,
          total: stats.onTime + stats.late,
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [allAttendanceData])

  // Pie chart data - Overall On Time vs Late
  const pieData = useMemo(() => {
    if (!allAttendanceData?.data) return []
    
    const onTime = allAttendanceData.data.filter(r => !r.isLate).length
    const late = allAttendanceData.data.filter(r => r.isLate).length
    
    if (onTime === 0 && late === 0) return []
    
    return [
      { name: 'On Time', value: onTime, color: COLORS.onTime },
      { name: 'Late', value: late, color: COLORS.late },
    ]
  }, [allAttendanceData])

  // Work hours trend data - Average work hours per day
  const workHoursTrendData = useMemo(() => {
    if (!allAttendanceData?.data) return []

    const dateMap = new Map<string, { totalHours: number; count: number }>()
    
    allAttendanceData.data.forEach(record => {
      if (record.workHours !== null && record.workHours > 0) {
        const dateKey = record.date
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, { totalHours: 0, count: 0 })
        }
        const stats = dateMap.get(dateKey)!
        stats.totalHours += record.workHours
        stats.count++
      }
    })

    return Array.from(dateMap.entries())
      .map(([date, stats]) => {
        const [y, m, d] = date.split('-').map(Number)
        const dateObj = new Date(y, m - 1, d)
        const avgHours = stats.count > 0 ? stats.totalHours / stats.count : 0
        return {
          date: format(dateObj, 'dd'),
          fullDate: format(dateObj, 'MMM dd'),
          avgHours: Number(avgHours.toFixed(2)),
          totalEmployees: stats.count,
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [allAttendanceData])

  // Attendance heatmap data - all days in selected range, filterable by employee
  const heatmapData = useMemo(() => {
    if (!allAttendanceData?.data) return { employees: [], dates: [], dateKeys: [] }

    const employeeMap = new Map<string, { name: string; code: string; attendance: Map<string, boolean> }>()
    
    allAttendanceData.data.forEach(record => {
      if (!employeeMap.has(record.employee.id)) {
        employeeMap.set(record.employee.id, {
          name: record.employee.user.name,
          code: record.employee.employeeCode,
          attendance: new Map(),
        })
      }
      employeeMap.get(record.employee.id)!.attendance.set(record.date, true)
    })

    // Get all days in the selected date range (fromDate to toDate)
    const [startYear, startMonth, startDay] = fromDate.split('-').map(Number)
    const [endYear, endMonth, endDay] = toDate.split('-').map(Number)
    const start = new Date(startYear, startMonth - 1, startDay)
    const end = new Date(endYear, endMonth - 1, endDay)
    const allDatesInRange = eachDayOfInterval({ start, end })
    
    // Get all dates in the range (not just last 7)
    const allDates = allDatesInRange.map(date => format(date, 'yyyy-MM-dd'))

    // Filter employees based on heatmapEmployeeId
    let employeesToShow = Array.from(employeeMap.entries())
    if (heatmapEmployeeId && heatmapEmployeeId !== 'all') {
      employeesToShow = employeesToShow.filter(([id]) => id === heatmapEmployeeId)
    }

    const employeesList = employeesToShow.map(([id, emp]) => ({
      id,
      name: emp.name,
      code: emp.code,
      days: allDates.map(date => emp.attendance.has(date)),
    }))

    return {
      employees: employeesList,
      dates: allDates.map(d => {
        const [y, m, day] = d.split('-').map(Number)
        return format(new Date(y, m - 1, day), 'MMM dd')
      }),
      dateKeys: allDates, // Keep original date keys for tooltips
    }
  }, [allAttendanceData, fromDate, toDate, heatmapEmployeeId])

  const formatTime = (date: Date | string | null) => {
    if (!date) return 'N/A'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return 'N/A'
    
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dateObj)
  }

  const formatDate = (date: string) => {
    const [y, m, d] = date.split('-').map(Number)
    return format(new Date(y, m - 1, d), 'PPP')
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleEmployeeChange = (value: string) => {
    setEmployeeId(value)
    setPage(1)
  }

  const totalPresent = allAttendanceData?.data.length || 0
  const totalLate = allAttendanceData?.data.filter(r => r.isLate).length || 0
  const totalOnTime = totalPresent - totalLate
  const onTimePercentage = totalPresent > 0 ? Math.round((totalOnTime / totalPresent) * 100) : 0

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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPresent}</div>
            <p className="text-xs text-muted-foreground">Attendance entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Time</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalOnTime}</div>
            <p className="text-xs text-muted-foreground">Before 11:00 AM</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalLate}</div>
            <p className="text-xs text-muted-foreground">After 11:00 AM</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Punctuality Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onTimePercentage}%</div>
            <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${onTimePercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Daily Trend Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Daily Attendance Trend</CardTitle>
            <CardDescription>On Time vs Late arrivals per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {dailyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border rounded-lg shadow-lg p-3">
                              <p className="font-medium mb-1">{payload[0]?.payload?.fullDate}</p>
                              <p className="text-sm text-green-600">On Time: {payload[0]?.value}</p>
                              <p className="text-sm text-red-600">Late: {payload[1]?.value}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="onTime" fill={COLORS.onTime} radius={[4, 4, 0, 0]} name="On Time" />
                    <Bar dataKey="late" fill={COLORS.late} radius={[4, 4, 0, 0]} name="Late" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No attendance data for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Punctuality Distribution</CardTitle>
            <CardDescription>Overall on-time vs late ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-sm">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Work Hours Chart */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Average Work Hours Trend</CardTitle>
            <CardDescription>Average work hours per day across all employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {workHoursTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={workHoursTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const hours = typeof payload[0]?.value === 'number' ? payload[0].value : Number(payload[0]?.value) || 0
                          return (
                            <div className="bg-white border rounded-lg shadow-lg p-3">
                              <p className="font-medium mb-1">{payload[0]?.payload?.fullDate}</p>
                              <p className="text-sm text-blue-600">
                                Avg Hours: {isFinite(hours) ? hours.toFixed(2) : 'N/A'}h
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Employees: {payload[0]?.payload?.totalEmployees}
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgHours" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Avg Hours"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No work hours data available for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third Row: Heatmap */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Attendance Heatmap */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Attendance Heatmap</CardTitle>
                <CardDescription>
                  {heatmapEmployeeId === 'all' 
                    ? 'View attendance pattern for all employees' 
                    : 'View attendance pattern for selected employee'}
                </CardDescription>
              </div>
              <Select value={heatmapEmployeeId} onValueChange={setHeatmapEmployeeId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.user.name} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {heatmapData.employees.length > 0 ? (
              <div className="space-y-3">
                {/* Scrollable container */}
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full">
                    {/* Header row with dates */}
                    <div className="flex items-center gap-2 min-w-fit">
                      <div className="w-32 text-xs text-muted-foreground font-medium flex-shrink-0">Employee</div>
                      <div className="flex gap-1">
                        {heatmapData.dates.map((date, idx) => (
                          <div key={idx} className="w-10 text-center text-xs text-muted-foreground flex-shrink-0">
                            {date}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Employee rows */}
                    {heatmapData.employees.map((emp, idx) => (
                      <div key={emp.id || idx} className="flex items-center gap-2 min-w-fit">
                        <div className="w-32 truncate text-sm flex-shrink-0" title={`${emp.name} (${emp.code})`}>
                          {emp.name}
                        </div>
                        <div className="flex gap-1">
                          {emp.days.map((present, dayIdx) => (
                            <div
                              key={dayIdx}
                              className={`w-10 h-10 rounded-md flex items-center justify-center text-xs font-medium transition-colors flex-shrink-0 ${
                                present
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                              title={`${heatmapData.dateKeys?.[dayIdx] ? format(new Date(heatmapData.dateKeys[dayIdx] + 'T00:00:00'), 'MMM dd, yyyy') : heatmapData.dates[dayIdx]}: ${present ? 'Present' : 'Absent'}`}
                            >
                              {present ? '✓' : '—'}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                {heatmapEmployeeId === 'all' 
                  ? 'No attendance data available' 
                  : 'No attendance data for selected employee'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={(value) => {
                setDepartmentId(value)
                setEmployeeId('all')
                setPage(1)
              }}>
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
            <div>
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={handleEmployeeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.user.name} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>
            Showing {attendanceData?.data.length || 0} of {attendanceData?.pagination.total || 0} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <>
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
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertCircle className="h-3 w-3" />
                            Late
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500 hover:bg-green-600 w-fit">On Time</Badge>
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
              
              {/* Pagination */}
              {attendanceData && attendanceData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {attendanceData.pagination.page} of {attendanceData.pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(attendanceData.pagination.totalPages, p + 1))}
                      disabled={page >= attendanceData.pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

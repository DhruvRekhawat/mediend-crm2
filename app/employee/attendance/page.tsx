'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useState, useMemo } from 'react'
import { Calendar, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface AttendanceDay {
  date: Date
  inTime: Date | null
  outTime: Date | null
  workHours: number | null
  isLate: boolean
  logs: Array<{
    id: string
    logDate: Date
    punchDirection: string
  }>
}

export default function EmployeeAttendancePage() {
  const [fromDate, setFromDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'))
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const { data: attendance, isLoading } = useQuery<AttendanceDay[]>({
    queryKey: ['attendance', 'my', fromDate, toDate],
    queryFn: () => apiGet<AttendanceDay[]>(`/api/attendance/my?fromDate=${fromDate}&toDate=${toDate}`),
  })

  const formatTime = (date: Date | string | null) => {
    if (!date) return 'N/A'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return 'N/A'

    // IMPORTANT: No conversions.
    // We store IOTime clock-components as UTC, so formatting with UTC shows the exact HH:mm
    // that came from the biometric API (which is already in IST wall-clock time).
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dateObj)
  }

  const formatDate = (date: Date) => {
    return format(new Date(date), 'PPP')
  }

  // Work hours trend data for the chart
  const workHoursTrendData = useMemo(() => {
    if (!attendance) return []

    return attendance
      .filter(day => day.workHours !== null && day.workHours > 0)
      .map(day => {
        const dateStr = format(day.date, 'yyyy-MM-dd')
        const [y, m, d] = dateStr.split('-').map(Number)
        const dateObj = new Date(y, m - 1, d)
        return {
          date: format(dateObj, 'dd'),
          fullDate: format(dateObj, 'MMM dd'),
          workHours: Number(day.workHours!.toFixed(2)),
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [attendance])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Attendance</h1>
        <p className="text-muted-foreground mt-1">View your attendance records</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Select date range to view attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Work Hours Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Work Hours Trend</CardTitle>
          <CardDescription>Your work hours over the selected period</CardDescription>
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
                        const raw = payload[0]?.value
                        const hours = typeof raw === 'number' ? raw : Number(raw)
                        return (
                          <div className="bg-white border rounded-lg shadow-lg p-3">
                            <p className="font-medium mb-1">{payload[0]?.payload?.fullDate}</p>
                            <p className="text-sm text-blue-600">
                              Work Hours: {Number.isFinite(hours) ? hours.toFixed(2) : 'N/A'}h
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="workHours" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Work Hours"
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

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>Your attendance history</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry Time</TableHead>
                  <TableHead>Exit Time</TableHead>
                  <TableHead>Work Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance?.map((day) => (
                  <TableRow key={day.date.toString()}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(day.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatTime(day.inTime)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatTime(day.outTime)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {day.workHours !== null
                        ? `${day.workHours.toFixed(2)} hours`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {day.isLate ? (
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
                {(!attendance || attendance.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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


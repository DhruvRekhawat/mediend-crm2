"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/api-client"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { Clock, FileText, Calendar, User as UserIcon } from "lucide-react"
import { useTasks } from "@/hooks/use-tasks"
import { useWorkLogs } from "@/hooks/use-work-logs"
import { TaskList } from "./task-list"
import type { Task } from "@/hooks/use-tasks"
import type { WorkLog } from "@/hooks/use-work-logs"

interface Employee {
  id: string
  employeeCode: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  department: {
    id: string
    name: string
  } | null
}

interface AttendanceRecord {
  data: Array<{
    date: string
    inTime: string | null
    outTime: string | null
    workHours: number | null
    isLate: boolean
  }>
}

interface EmployeeDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee | null
  onAssignTask?: () => void
  onDeleteTask?: (task: Task) => void
}

export function EmployeeDetailSheet({
  open,
  onOpenChange,
  employee,
  onAssignTask,
  onDeleteTask,
}: EmployeeDetailSheetProps) {
  const [selectedWeek, setSelectedWeek] = useState(new Date())

  const weekStart = useMemo(() => startOfWeek(selectedWeek), [selectedWeek])
  const weekEnd = useMemo(() => endOfWeek(selectedWeek), [selectedWeek])

  const { data: tasks = [], isLoading: tasksLoading } = useTasks(
    employee
      ? {
          assigneeId: employee.user.id,
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
        }
      : undefined
  )

  const { data: workLogs = [], isLoading: logsLoading } = useWorkLogs(
    weekStart,
    weekEnd,
    employee?.user.id
  )

  const { data: attendanceRes } = useQuery<AttendanceRecord>({
    queryKey: ["attendance", employee?.id, weekStart, weekEnd],
    queryFn: () =>
      apiGet<AttendanceRecord>(
        `/api/attendance?employeeId=${employee?.id}&fromDate=${format(weekStart, "yyyy-MM-dd")}&toDate=${format(weekEnd, "yyyy-MM-dd")}`
      ),
    enabled: !!employee?.id,
  })
  const attendance = attendanceRes?.data ?? []

  const workLogsByDate = useMemo(() => {
    const grouped = new Map<string, WorkLog[]>()
    workLogs.forEach((log) => {
      const dateKey = format(new Date(log.logDate), "yyyy-MM-dd")
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)!.push(log)
    })
    return grouped
  }, [workLogs])

  if (!employee) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto px-6">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            {employee.user.name}
          </SheetTitle>
          <SheetDescription>
            {employee.employeeCode} · {employee.user.email}
            {employee.department && ` · ${employee.department.name}`}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="tasks" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks">
              <Calendar className="h-4 w-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="logs">
              <FileText className="h-4 w-4 mr-2" />
              Work Logs
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <Clock className="h-4 w-4 mr-2" />
              Attendance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Tasks</h3>
                  <p className="text-sm text-muted-foreground">
                    Week of {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  >
                    ←
                  </Button>
                  <input
                    type="date"
                    value={format(weekStart, "yyyy-MM-dd")}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedWeek(new Date(e.target.value))
                      }
                    }}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                  >
                    →
                  </Button>
                </div>
              </div>
              <TaskList
                tasks={tasks}
                isLoading={tasksLoading}
                showAddButton={false}
                onDeleteTask={onDeleteTask}
              />
              {onAssignTask && (
                <Button onClick={onAssignTask} className="w-full">
                  Assign New Task
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Work Logs</h3>
                  <p className="text-sm text-muted-foreground">
                    Week of {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  >
                    ←
                  </Button>
                  <input
                    type="date"
                    value={format(weekStart, "yyyy-MM-dd")}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedWeek(new Date(e.target.value))
                      }
                    }}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                  >
                    →
                  </Button>
                </div>
              </div>
              {logsLoading ? (
                <p className="text-muted-foreground text-sm py-4">Loading logs...</p>
              ) : workLogsByDate.size === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No work logs for this week</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {Array.from(workLogsByDate.entries())
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([date, logs]) => (
                        <Card key={date}>
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm">
                              {format(new Date(date), "EEEE, MMMM d, yyyy")}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0 px-4 pb-3 space-y-2">
                            {logs
                              .sort((a, b) => a.intervalStart - b.intervalStart)
                              .map((log) => (
                                <div key={log.id} className="border-l-2 border-primary pl-3 py-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">
                                      {log.intervalStart}:00 - {log.intervalEnd}:00
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {log.description}
                                  </p>
                                </div>
                              ))}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Attendance</h3>
                  <p className="text-sm text-muted-foreground">
                    Week of {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  >
                    ←
                  </Button>
                  <input
                    type="date"
                    value={format(weekStart, "yyyy-MM-dd")}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedWeek(new Date(e.target.value))
                      }
                    }}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                  >
                    →
                  </Button>
                </div>
              </div>
              {attendance.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No attendance records for this week</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {attendance.map((a) => (
                      <Card key={a.date}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {format(new Date(a.date), "EEEE, MMM d")}
                              </p>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-sm text-muted-foreground">
                                  In: {a.inTime ? format(new Date(a.inTime), "HH:mm") : "—"}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  Out: {a.outTime ? format(new Date(a.outTime), "HH:mm") : "—"}
                                </span>
                                {a.workHours != null && (
                                  <span className="text-sm text-muted-foreground">
                                    Hours: {a.workHours.toFixed(1)}h
                                  </span>
                                )}
                              </div>
                            </div>
                            {a.isLate && (
                              <Badge variant="destructive">Late</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

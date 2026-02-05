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
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto px-3 sm:px-6 border-l-4 border-l-primary/60">
        <SheetHeader className="rounded-lg bg-primary/5 border border-border/50 p-3 sm:p-4 mt-4 sm:mt-8">
          <SheetTitle className="flex items-center gap-2 text-foreground text-base sm:text-lg">
            <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <span className="truncate">{employee.user.name}</span>
          </SheetTitle>
          <SheetDescription className="text-muted-foreground mt-1 text-xs sm:text-sm truncate">
            {employee.employeeCode} · {employee.user.email}
            {employee.department && ` · ${employee.department.name}`}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="tasks" className="mt-4 sm:mt-6">
          <TabsList className="grid w-full grid-cols-3 bg-muted/60 p-1">
            <TabsTrigger
              value="tasks"
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm text-xs sm:text-sm"
            >
              <Calendar className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm text-xs sm:text-sm"
            >
              <FileText className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Work Logs</span>
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300 data-[state=active]:shadow-sm text-xs sm:text-sm"
            >
              <Clock className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Attendance</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-3 sm:mt-4">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2 sm:p-3">
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">Tasks</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
                  </p>
                </div>
                <div className="flex gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/30 hover:bg-primary/10 h-9 w-9 sm:h-8 sm:w-auto px-2"
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
                    className="rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-xs sm:text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/30 w-[110px] sm:w-auto"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/30 hover:bg-primary/10 h-9 w-9 sm:h-8 sm:w-auto px-2"
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
                <Button onClick={onAssignTask} className="w-full shadow-sm">
                  Assign New Task
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-3 sm:mt-4">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-teal-500/20 bg-teal-500/5 p-2 sm:p-3">
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">Work Logs</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
                  </p>
                </div>
                <div className="flex gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-teal-500/30 hover:bg-teal-500/10 h-9 w-9 sm:h-8 sm:w-auto px-2"
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
                    className="rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-xs sm:text-sm focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 w-[110px] sm:w-auto"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-teal-500/30 hover:bg-teal-500/10 h-9 w-9 sm:h-8 sm:w-auto px-2"
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
                <ScrollArea className="h-[400px] sm:h-[500px]">
                  <div className="space-y-3 sm:space-y-4">
                    {Array.from(workLogsByDate.entries())
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([date, logs]) => (
                        <Card key={date} className="overflow-hidden border-l-4 border-l-teal-500/50">
                          <CardHeader className="py-2 sm:py-3 px-3 sm:px-4 bg-teal-500/5 border-b border-border/50">
                            <CardTitle className="text-xs sm:text-sm font-medium">
                              {format(new Date(date), "EEE, MMM d, yyyy")}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-2 sm:pt-3 px-3 sm:px-4 pb-2 sm:pb-3 space-y-2">
                            {logs
                              .sort((a, b) => a.intervalStart - b.intervalStart)
                              .map((log) => (
                                <div
                                  key={log.id}
                                  className="border-l-2 border-teal-500 bg-teal-500/5 pl-2 sm:pl-3 py-2 rounded-r"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs sm:text-sm font-medium text-foreground">
                                      {log.intervalStart}:00 - {log.intervalEnd}:00
                                    </span>
                                  </div>
                                  <p className="text-xs sm:text-sm text-muted-foreground">
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

          <TabsContent value="attendance" className="mt-3 sm:mt-4">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 sm:p-3">
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">Attendance</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
                  </p>
                </div>
                <div className="flex gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-500/30 hover:bg-amber-500/10 h-9 w-9 sm:h-8 sm:w-auto px-2"
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
                    className="rounded-md border border-input bg-background px-2 sm:px-3 py-2 text-xs sm:text-sm focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 w-[110px] sm:w-auto"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-500/30 hover:bg-amber-500/10 h-9 w-9 sm:h-8 sm:w-auto px-2"
                    onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                  >
                    →
                  </Button>
                </div>
              </div>
              {attendance.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No attendance records for this week</p>
              ) : (
                <ScrollArea className="h-[400px] sm:h-[500px]">
                  <div className="space-y-2">
                    {attendance.map((a) => (
                      <Card
                        key={a.date}
                        className={`overflow-hidden border-l-4 ${a.isLate ? "border-l-red-500/60" : "border-l-amber-500/50"}`}
                      >
                        <CardContent className="py-2 sm:py-3 px-3 sm:px-4">
                          <div className="flex items-start sm:items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground text-sm sm:text-base">
                                {format(new Date(a.date), "EEE, MMM d")}
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                                <span className="text-xs sm:text-sm text-muted-foreground">
                                  In: {a.inTime ? format(new Date(a.inTime), "HH:mm") : "—"}
                                </span>
                                <span className="text-xs sm:text-sm text-muted-foreground">
                                  Out: {a.outTime ? format(new Date(a.outTime), "HH:mm") : "—"}
                                </span>
                                {a.workHours != null && (
                                  <span className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">
                                    {a.workHours.toFixed(1)}h
                                  </span>
                                )}
                              </div>
                            </div>
                            {a.isLate && (
                              <Badge variant="destructive" className="font-medium text-xs shrink-0">Late</Badge>
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

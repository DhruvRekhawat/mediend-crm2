"use client"

import { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useTasks, useUpdateTaskDueDate } from "@/hooks/use-tasks"
import { useWorkLogs } from "@/hooks/use-work-logs"
import { FullCalendarTasks, type CalendarTask } from "@/components/calendar/full-calendar"
import { TaskList } from "@/components/calendar/task-list"
import { WorkLogPanel } from "@/components/calendar/work-log-panel"
import { TaskDetailModal } from "@/components/calendar/task-detail-modal"
import { Calendar as CalendarIcon, ListTodo, FileText } from "lucide-react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
} from "date-fns"
import { toast } from "sonner"

export default function CalendarPage() {
  const [calendarDateRange, setCalendarDateRange] = useState<{
    start: Date
    end: Date
  }>(() => {
    const now = new Date()
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
    }
  })
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const tasksParams = useMemo(
    () => ({
      startDate: calendarDateRange.start.toISOString(),
      endDate: calendarDateRange.end.toISOString(),
    }),
    [calendarDateRange]
  )

  const { data: tasks = [], isLoading: tasksLoading } = useTasks(tasksParams)
  const updateDueDateMutation = useUpdateTaskDueDate()
  const { data: workLogs = [], isLoading: logsLoading } = useWorkLogs(
    selectedDate,
    selectedDate
  )

  const calendarTasks: CalendarTask[] = useMemo(
    () =>
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate,
        startTime: t.startTime,
        endTime: t.endTime,
        allDay: t.allDay,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee,
      })),
    [tasks]
  )

  const handleDatesSet = (start: Date, end: Date) => {
    setCalendarDateRange({
      start: startOfWeek(start),
      end: endOfWeek(end),
    })
  }

  const handleEventClick = (taskId: string) => {
    setSelectedTaskId(taskId)
  }

  const handleEventDrop = async (
    taskId: string,
    newStart: Date,
    _newEnd?: Date,
    revert?: () => void
  ) => {
    try {
      const result = await updateDueDateMutation.mutateAsync({
        id: taskId,
        dueDate: newStart.toISOString(),
      })
      if ("approvalId" in result) {
        revert?.()
        toast.info("Due date change submitted for MD approval")
      } else {
        toast.success("Task updated")
      }
    } catch (err) {
      revert?.()
      toast.error(err instanceof Error ? err.message : "Failed to update task")
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-linear-to-br from-primary/5 via-primary/2 to-transparent p-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          My Calendar
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your tasks and work logs
        </p>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/60 p-1">
          <TabsTrigger
            value="calendar"
            className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <CalendarIcon className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
          >
            <ListTodo className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="gap-2 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-300 data-[state=active]:shadow-sm"
          >
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card className="overflow-hidden border-l-4 border-l-primary/60">
            <CardHeader className="bg-primary/5 border-b border-border/50 py-4">
              <CardTitle className="text-lg">Calendar</CardTitle>
              <CardDescription>
                Drag events to reschedule. Click an event for details.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4">
                <FullCalendarTasks
                  events={calendarTasks}
                  onEventClick={handleEventClick}
                  onEventDrop={handleEventDrop}
                  onDatesSet={handleDatesSet}
                  className="min-h-[500px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card className="overflow-hidden border-l-4 border-l-primary/60">
            <CardHeader className="bg-primary/5 border-b border-border/50">
              <CardTitle className="text-lg">My Tasks</CardTitle>
              <CardDescription>
                View and manage your tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <TaskList
                tasks={tasks}
                isLoading={tasksLoading}
                showAddButton={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card className="overflow-hidden border-l-4 border-l-teal-500/60 lg:max-w-4xl">
            <CardHeader className="bg-teal-500/5 border-b border-border/50">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400">
                      <FileText className="h-4 w-4" />
                    </span>
                    Work Logs
                  </CardTitle>
                  <CardDescription>
                    Log your work in 3-hour intervals (9-12, 12-3, 3-6)
                  </CardDescription>
                </div>
                <input
                  type="date"
                  value={format(selectedDate, "yyyy-MM-dd")}
                  onChange={(e) =>
                    setSelectedDate(new Date(e.target.value + "T12:00:00"))
                  }
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <WorkLogPanel
                logs={workLogs}
                selectedDate={selectedDate}
                isLoading={logsLoading}
                onLogSubmitted={() => {}}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TaskDetailModal
        open={!!selectedTaskId}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null)
        }}
        taskId={selectedTaskId}
      />
    </div>
  )
}

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
      <div>
        <h1 className="text-3xl font-bold">My Calendar</h1>
        <p className="text-muted-foreground mt-1">
          Manage your tasks and work logs
        </p>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <FullCalendarTasks
                events={calendarTasks}
                onEventClick={handleEventClick}
                onEventDrop={handleEventDrop}
                onDatesSet={handleDatesSet}
                className="min-h-[500px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>
                View and manage your tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskList
                tasks={tasks}
                isLoading={tasksLoading}
                showAddButton={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Work Logs</CardTitle>
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
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <WorkLogPanel
                  logs={workLogs}
                  selectedDate={selectedDate}
                  isLoading={logsLoading}
                  onLogSubmitted={() => {}}
                />
              </CardContent>
            </Card>
          </div>
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

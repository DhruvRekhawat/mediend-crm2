"use client"

import { useState, useCallback } from "react"
import { useTasks } from "@/hooks/use-tasks"
import { useAuth } from "@/hooks/use-auth"
import { FullCalendarTasks, type CalendarTask } from "@/components/calendar/full-calendar"
import { TaskDetailModal } from "@/components/calendar/task-detail-modal"
import { MarkCompleteDrawer } from "./mark-complete-drawer"
import type { Task } from "@/hooks/use-tasks"

function taskToCalendarTask(t: {
  id: string
  title: string
  description?: string | null
  dueDate: string | null
  startTime?: string | null
  endTime?: string | null
  allDay: boolean
  status: string
  priority: string
  assignee?: { id: string; name: string; email: string }
  project?: { id: string; name: string } | null
}): CalendarTask {
  return {
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
    project: t.project,
  }
}

export function CalendarTab() {
  const { user } = useAuth()
  const { data: tasks = [], isLoading } = useTasks()
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null)

  const events: CalendarTask[] = tasks
    .filter((t) => t.status !== "CANCELLED")
    .map(taskToCalendarTask)

  const handleEventClick = useCallback((taskId: string) => {
    setDetailTaskId(taskId)
  }, [])

  const handleMarkCompleteRequest = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (task) setTaskToComplete(task)
  }, [tasks])

  if (isLoading) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Loading calendar...
      </div>
    )
  }

  return (
    <div className="min-h-[400px]">
      <FullCalendarTasks
        events={events}
        onEventClick={handleEventClick}
        onMarkCompleteRequest={handleMarkCompleteRequest}
        className="w-full"
      />
      <TaskDetailModal
        open={!!detailTaskId}
        onOpenChange={(open) => !open && setDetailTaskId(null)}
        taskId={detailTaskId}
      />
      <MarkCompleteDrawer
        task={taskToComplete}
        open={!!taskToComplete}
        onOpenChange={(open) => !open && setTaskToComplete(null)}
        onSuccess={() => setTaskToComplete(null)}
      />
    </div>
  )
}

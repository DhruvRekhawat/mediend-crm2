"use client"

import { useState, useCallback } from "react"
import { useTasks } from "@/hooks/use-tasks"
import { FullCalendarTasks, type CalendarTask } from "@/components/calendar/full-calendar"
import { TaskDetailModal } from "@/components/calendar/task-detail-modal"

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
  const { data: tasks = [], isLoading } = useTasks()
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)

  const events: CalendarTask[] = tasks
    .filter((t) => t.status !== "CANCELLED")
    .map(taskToCalendarTask)

  const handleEventClick = useCallback((taskId: string) => {
    setDetailTaskId(taskId)
  }, [])

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
        className="w-full"
      />
      <TaskDetailModal
        open={!!detailTaskId}
        onOpenChange={(open) => !open && setDetailTaskId(null)}
        taskId={detailTaskId}
      />
    </div>
  )
}

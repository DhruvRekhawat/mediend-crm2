"use client"

import { useCallback } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventClickArg, EventDropArg, DatesSetArg, EventInput } from "@fullcalendar/core"
import { cn } from "@/lib/utils"

export interface CalendarTask {
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
}

interface FullCalendarTasksProps {
  events: CalendarTask[]
  onEventClick?: (taskId: string) => void
  onEventDrop?: (
    taskId: string,
    newStart: Date,
    newEnd?: Date,
    revert?: () => void
  ) => void | Promise<void>
  onDatesSet?: (start: Date, end: Date) => void
  className?: string
}

function getStatusColor(status: string, priority: string): string {
  if (status === "COMPLETED") return "#22c55e"
  if (status === "CANCELLED") return "#ef4444"
  if (priority === "URGENT") return "#ef4444"
  if (status === "PENDING") return "#eab308"
  return "#3b82f6"
}

function tasksToEvents(tasks: CalendarTask[]): EventInput[] {
  return tasks.map((task) => {
    let startStr: string
    let endStr: string | undefined

    if (task.allDay) {
      const d = task.dueDate ? new Date(task.dueDate) : new Date()
      startStr = d.toISOString()
      endStr = undefined
    } else if (task.startTime && task.endTime) {
      startStr =
        typeof task.startTime === "string"
          ? task.startTime
          : new Date(task.startTime).toISOString()
      endStr =
        typeof task.endTime === "string"
          ? task.endTime
          : new Date(task.endTime).toISOString()
    } else {
      const d = task.dueDate ? new Date(task.dueDate) : new Date()
      startStr = d.toISOString()
      endStr = undefined
    }

    const assigneeName = task.assignee?.name ? ` - ${task.assignee.name}` : ""
    const eventTitle = `${task.title}${assigneeName}`

    return {
      id: task.id,
      title: eventTitle,
      start: startStr,
      end: endStr,
      allDay: task.allDay,
      backgroundColor: getStatusColor(task.status, task.priority),
      borderColor: getStatusColor(task.status, task.priority),
      textColor: "#ffffff",
      extendedProps: {
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
      },
    }
  })
}

export function FullCalendarTasks({
  events,
  onEventClick,
  onEventDrop,
  onDatesSet,
  className,
}: FullCalendarTasksProps) {
  const fcEvents = tasksToEvents(events)

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      onEventClick?.(arg.event.id)
    },
    [onEventClick]
  )

  const handleEventDrop = useCallback(
    (arg: EventDropArg) => {
      onEventDrop?.(
        arg.event.id,
        arg.event.start!,
        arg.event.end ?? undefined,
        arg.revert
      )
    },
    [onEventDrop]
  )

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      onDatesSet?.(arg.start, arg.end)
    },
    [onDatesSet]
  )

  return (
    <div className={cn("fc-theme-mediend", className)}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        buttonText={{
          today: "Today",
          month: "Month",
          week: "Week",
          day: "Day",
        }}
        editable={!!onEventDrop}
        droppable={!!onEventDrop}
        events={fcEvents}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        datesSet={handleDatesSet}
        height="auto"
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        dayMaxEvents={3}
        moreLinkClick="popover"
      />
    </div>
  )
}

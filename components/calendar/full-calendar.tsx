"use client"

import { useState, useMemo } from "react"
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  startOfDay,
  isToday,
  getDay,
} from "date-fns"
import { ChevronLeft, ChevronRight, ChevronDown, GripVertical, Pencil, MessageSquare, MoreHorizontal, Plus } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useUpdateTask } from "@/hooks/use-tasks"
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
  project?: { id: string; name: string } | null
}

interface FullCalendarTasksProps {
  events: CalendarTask[]
  onEventClick?: (taskId: string) => void
  /** When provided, marking a task complete will call this instead of updating directly (to open rating drawer). */
  onMarkCompleteRequest?: (taskId: string) => void
  onEventDrop?: (
    taskId: string,
    newStart: Date,
    newEnd?: Date,
    revert?: () => void
  ) => void | Promise<void>
  onDatesSet?: (start: Date, end: Date) => void
  onAddTask?: (date: Date) => void
  className?: string
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getTaskDate(task: CalendarTask): Date | null {
  if (task.dueDate) return startOfDay(new Date(task.dueDate))
  if (task.startTime) return startOfDay(new Date(task.startTime))
  return null
}

export function FullCalendarTasks({
  events,
  onEventClick,
  onMarkCompleteRequest,
  onAddTask,
  className,
}: FullCalendarTasksProps) {
  const [viewStart, setViewStart] = useState(() => {
    const d = new Date()
    return startOfWeek(d, { weekStartsOn: 1 })
  })
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const updateTask = useUpdateTask()

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(viewStart, i))
  }, [viewStart])

  const monthLabel = format(viewStart, "MMMM yyyy")
  const visibleStart = viewStart
  const visibleEnd = addDays(viewStart, 6)

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>()
    for (const task of events) {
      if (task.status === "CANCELLED") continue
      const d = getTaskDate(task)
      if (!d) continue
      const key = format(d, "yyyy-MM-dd")
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        const da = getTaskDate(a)?.getTime() ?? 0
        const db = getTaskDate(b)?.getTime() ?? 0
        return da - db
      })
    }
    return map
  }, [events])

  const dateSections = useMemo(() => {
    const sections: { date: Date; key: string; tasks: CalendarTask[] }[] = []
    let d = startOfDay(visibleStart)
    while (d <= visibleEnd) {
      const key = format(d, "yyyy-MM-dd")
      const tasks = tasksByDate.get(key) ?? []
      sections.push({ date: d, key, tasks })
      d = addDays(d, 1)
    }
    return sections
  }, [visibleStart, visibleEnd, tasksByDate])

  const goPrev = () => setViewStart((prev) => subWeeks(prev, 1))
  const goNext = () => setViewStart((prev) => addWeeks(prev, 1))
  const goToday = () => {
    const today = new Date()
    setSelectedDate(today)
    setViewStart(startOfWeek(today, { weekStartsOn: 1 }))
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <header className="space-y-3 border-b pb-4">
        <h2 className="text-lg font-semibold text-foreground">Upcoming</h2>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            {monthLabel}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-muted"
            >
              Today
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-0.5">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate)
            const dayNum = format(day, "d")
            const weekday = WEEKDAY_NAMES[getDay(day)]
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-1 flex-col items-center rounded-md py-2 text-xs transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="font-medium">{weekday}</span>
                <span className="mt-0.5 font-medium">{dayNum}</span>
              </button>
            )
          })}
        </div>
      </header>

      <div className="mt-4 space-y-6">
        {dateSections.map(({ date, key, tasks }) => {
          const dayLabel = format(date, "d MMM")
          const weekdayFull = format(date, "EEEE")
          const isTodayDate = isToday(date)
          const heading =
            isTodayDate
              ? `${dayLabel} · Today · ${weekdayFull}`
              : `${dayLabel} · ${weekdayFull}`

          return (
            <section key={key}>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                {heading}
              </h3>
              <div className="space-y-0.5">
                {tasks.map((task) => (
                  <UpcomingTaskRow
                    key={task.id}
                    task={task}
                    onToggleComplete={updateTask}
                    onMarkCompleteRequest={onMarkCompleteRequest}
                    onClick={() => onEventClick?.(task.id)}
                  />
                ))}
              </div>
              {onAddTask && (
                <button
                  type="button"
                  onClick={() => onAddTask(date)}
                  className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Add task
                </button>
              )}
              <div className="mt-4 border-b border-border/60" />
            </section>
          )
        })}
      </div>
    </div>
  )
}

function UpcomingTaskRow({
  task,
  onToggleComplete,
  onMarkCompleteRequest,
  onClick,
}: {
  task: CalendarTask
  onToggleComplete: ReturnType<typeof useUpdateTask>
  onMarkCompleteRequest?: (taskId: string) => void
  onClick: () => void
}) {
  const isCompleted = task.status === "COMPLETED"

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isCompleted && onMarkCompleteRequest) {
      onMarkCompleteRequest(task.id)
      return
    }
    try {
      await onToggleComplete.mutateAsync({
        id: task.id,
        data: { status: isCompleted ? "PENDING" : "COMPLETED" },
      })
    } catch {
      // ignore
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md px-1 py-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isCompleted && "opacity-70"
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => {}}
        onClick={handleToggle}
        aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm text-foreground",
            isCompleted && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </span>
        {task.project && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            {task.project.name}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className="rounded p-1 hover:bg-muted hover:text-foreground"
          aria-label="Edit task"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className="rounded p-1 hover:bg-muted hover:text-foreground"
          aria-label="Comments"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="rounded p-1 hover:bg-muted hover:text-foreground"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

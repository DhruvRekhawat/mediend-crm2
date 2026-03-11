"use client"

import { useRef, useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { PriorityIcon } from "./priority-icon"
import { format } from "date-fns"
import { type Task } from "@/hooks/use-tasks"
import { useUpdateTask } from "@/hooks/use-tasks"
import { cn } from "@/lib/utils"
import { Star } from "lucide-react"

const DING_SOUND = "/ding-sound-effect_1.mp3"

function playDoneSound() {
  try {
    const audio = new Audio(DING_SOUND)
    audio.volume = 0.5
    audio.play().catch(() => {})
  } catch {}
}

const PRIORITY_COLORS: Record<string, string> = {
  GENERAL: "text-muted-foreground",
  LOW: "text-blue-600",
  MEDIUM: "text-amber-600",
  HIGH: "text-orange-600",
  URGENT: "text-red-600",
}

const RATING_COLORS: Record<string, string> = {
  "1": "text-red-500",
  "2": "text-orange-500",
  "3": "text-amber-500",
  "4": "text-emerald-500",
  "5": "text-emerald-600",
}

function RatingStars({ grade }: { grade: string }) {
  const num = parseInt(grade)
  if (isNaN(num) || num < 1 || num > 5) return null
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            "h-3 w-3",
            s <= num
              ? cn("fill-current", RATING_COLORS[grade])
              : "text-muted-foreground/20"
          )}
        />
      ))}
    </div>
  )
}

interface TaskRowProps {
  task: Task
  onClick?: () => void
  showAssignee?: boolean
  showProject?: boolean
  isAssignee?: boolean
  canMarkComplete?: boolean
  onMarkCompleteRequest?: (task: Task) => void
  showCompletionRating?: boolean
  className?: string
}

export function TaskRow({
  task,
  onClick,
  showAssignee = true,
  showProject = true,
  isAssignee = false,
  canMarkComplete = true,
  onMarkCompleteRequest,
  showCompletionRating = false,
  className,
}: TaskRowProps) {
  const updateMutation = useUpdateTask()
  const isCompleted = task.status === "COMPLETED"
  const isEmployeeDone = task.status === "EMPLOYEE_DONE"
  const isDone = isCompleted || isEmployeeDone
  const wasDoneRef = useRef(isDone)
  const [runStrikethrough, setRunStrikethrough] = useState(false)

  useEffect(() => {
    if (isDone && !wasDoneRef.current) {
      playDoneSound()
      setRunStrikethrough(true)
      const t = setTimeout(() => setRunStrikethrough(false), 450)
      return () => clearTimeout(t)
    }
    wasDoneRef.current = isDone
  }, [isDone])

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCompleted && canMarkComplete) {
      try {
        await updateMutation.mutateAsync({
          id: task.id,
          data: { status: "PENDING" },
        })
      } catch {}
      return
    }
    if (isEmployeeDone && canMarkComplete && onMarkCompleteRequest) {
      onMarkCompleteRequest(task)
      return
    }
    if ((task.status === "PENDING" || task.status === "IN_PROGRESS") && isAssignee) {
      try {
        await updateMutation.mutateAsync({
          id: task.id,
          data: { status: "EMPLOYEE_DONE" },
        })
      } catch {}
    }
  }

  const showCheckbox =
    (isAssignee && (task.status === "PENDING" || task.status === "IN_PROGRESS")) ||
    (canMarkComplete && (isEmployeeDone || isCompleted))

  const dueLabel = task.dueDate
    ? format(new Date(task.dueDate), "MMM d")
    : null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isCompleted && "opacity-70",
        className
      )}
    >
      {showCheckbox && (
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => {}}
          onClick={handleToggleComplete}
          aria-label={isCompleted ? "Mark incomplete" : isEmployeeDone ? "Review task" : "Mark done for review"}
          className="shrink-0"
        />
      )}
      {showCompletionRating && isCompleted && task.grade && (
        <RatingStars grade={task.grade} />
      )}
      <div className="min-w-0 flex-1">
        <span className="relative inline-block min-w-0 max-w-full">
          <span
            className={cn(
              "block truncate text-base md:text-sm",
              isDone && "text-muted-foreground"
            )}
          >
            {task.title}
          </span>
          {isDone && (
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current pointer-events-none origin-left opacity-60",
                runStrikethrough && "animate-[strikethrough_0.4s_ease-out_forwards]"
              )}
              style={runStrikethrough ? undefined : { transform: "scaleX(1)" }}
            />
          )}
        </span>
        {(showAssignee || showProject) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm md:text-xs">
            {showProject && task.project && (
              <span className="truncate text-purple-600 dark:text-purple-400">{task.project.name}</span>
            )}
            {showAssignee && task.assignee && task.assigneeId !== task.createdById && (
              <span className="truncate text-blue-600 dark:text-blue-400">→ {task.assignee.name}</span>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {task.priority && task.priority !== "GENERAL" && (
          <PriorityIcon
            priority={task.priority}
            className={cn("h-4 w-4", PRIORITY_COLORS[task.priority] ?? "text-muted-foreground")}
          />
        )}
        {dueLabel && (
          <span
            className={cn(
              "text-xs",
              task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED" && task.status !== "EMPLOYEE_DONE"
                ? "text-red-600"
                : "text-muted-foreground"
            )}
          >
            {dueLabel}
          </span>
        )}
      </div>
    </div>
  )
}

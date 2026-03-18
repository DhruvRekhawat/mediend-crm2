"use client"

import { useRef, useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { PriorityIcon } from "./priority-icon"
import { format, differenceInDays } from "date-fns"
import { type Task } from "@/hooks/use-tasks"
import { useUpdateTask } from "@/hooks/use-tasks"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { isSelfAssigned } from "@/lib/task-utils"
import { Star, AlertTriangle, CalendarClock, Clock, UserCircle } from "lucide-react"

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
  /** Number of warnings attached to this task. When > 0, shows warning icon with count. */
  warningCount?: number
  /** Number of date extensions for this task. When > 0, shows extension icon with count. */
  extensionCount?: number
  /** Unseen activity count (comments, extension requests, approvals). When > 0, shows notification badge. */
  activityCount?: number
  /** When false, strikethrough is not shown for done tasks (e.g. in Approval tab). */
  showStrikethrough?: boolean
  /** When true, applies exit pop animation (task is being removed from list). */
  exitAnimation?: boolean
  onExitAnimationEnd?: () => void
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
  warningCount = 0,
  extensionCount = 0,
  activityCount = 0,
  showStrikethrough = true,
  exitAnimation = false,
  onExitAnimationEnd,
  className,
}: TaskRowProps) {
  const { user } = useAuth()
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

  const now = new Date()
  const isOverdue = !!task.dueDate && new Date(task.dueDate) < now && !isDone

  const dueLabel = task.dueDate
    ? format(new Date(task.dueDate), "MMM d")
    : null

  const givenLabel = task.createdAt
    ? format(new Date(task.createdAt), "MMM d, h:mm a")
    : null

  const daysGiven =
    task.dueDate && task.createdAt
      ? differenceInDays(new Date(task.dueDate), new Date(task.createdAt))
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
      onAnimationEnd={exitAnimation ? onExitAnimationEnd : undefined}
      className={cn(
        "cursor-pointer rounded-md px-2 py-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isCompleted && "opacity-70",
        exitAnimation && "animate-[task-exit-pop_0.35s_ease-out_forwards]",
        className
      )}
    >
      {/* ── Row 1: checkbox + title + activity badge ── */}
      <div className="flex items-start gap-2">
        {showCheckbox && (
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => {}}
            onClick={handleToggleComplete}
            aria-label={isCompleted ? "Mark incomplete" : isEmployeeDone ? "Review task" : "Mark done for review"}
            className="shrink-0 mt-0.5"
          />
        )}
        {showCompletionRating && isCompleted && task.grade && (
          <RatingStars grade={task.grade} />
        )}
        <span className="relative min-w-0 flex-1">
          <span
            className={cn(
              "block wrap-break-word text-base md:text-sm font-medium leading-snug",
              isDone && "text-muted-foreground"
            )}
          >
            {task.title}
          </span>
          {isDone && showStrikethrough && (
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
        {activityCount > 0 && (
          <span
            className="shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground"
            title={`${activityCount} new activit${activityCount !== 1 ? "ies" : "y"}`}
          >
            {activityCount > 99 ? "99+" : activityCount}
          </span>
        )}
      </div>

      {/* ── Row 2: meta left | badges+due right ── */}
      <div className={cn(
        "mt-1.5 flex items-center justify-between gap-2",
        showCheckbox && "pl-6"
      )}>
        {/* Left: given date, days given, project, assignee */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
          {givenLabel && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              {givenLabel}
            </span>
          )}
          {daysGiven !== null && daysGiven > 0 && (
            <span className="text-xs text-muted-foreground">
              · {daysGiven}d
            </span>
          )}
          {showProject && task.project && (
            <span className="text-xs text-purple-600 dark:text-purple-400 truncate max-w-[120px]">
              {task.project.name}
            </span>
          )}
          {showAssignee && task.assignee && task.assigneeId !== task.createdById && (
            <span className="text-xs text-blue-600 dark:text-blue-400 truncate max-w-[100px]">
              → {task.assignee.name}
            </span>
          )}
          {showAssignee && isSelfAssigned(task) && (
            <span
              className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400 truncate max-w-[140px]"
              title={user?.id === task.createdById ? "You assigned this task to yourself" : undefined}
            >
              <UserCircle className="h-3 w-3 shrink-0" />
              {user?.id === task.createdById
                ? "Self assigned"
                : `Assigned by ${task.createdBy?.name ?? "—"}`}
            </span>
          )}
        </div>

        {/* Right: badges + priority + due date */}
        <div className="flex shrink-0 items-center gap-1.5">
          {extensionCount > 0 && (
            <span
              className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400"
              title={`${extensionCount} extension${extensionCount !== 1 ? "s" : ""}`}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{extensionCount}</span>
            </span>
          )}
          {warningCount > 0 && (
            <span
              className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400"
              title={`${warningCount} warning${warningCount !== 1 ? "s" : ""}`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{warningCount}</span>
            </span>
          )}
          {task.priority && task.priority !== "GENERAL" && (
            <PriorityIcon
              priority={task.priority}
              className={cn("h-3.5 w-3.5", PRIORITY_COLORS[task.priority] ?? "text-muted-foreground")}
            />
          )}
          {dueLabel && (
            <span
              className={cn(
                "text-xs font-medium",
                isOverdue ? "text-red-600" : "text-muted-foreground"
              )}
            >
              {dueLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

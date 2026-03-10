"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Flag } from "lucide-react"
import { format } from "date-fns"
import { type Task } from "@/hooks/use-tasks"
import { useUpdateTask } from "@/hooks/use-tasks"
import { cn } from "@/lib/utils"

const PRIORITY_COLORS: Record<string, string> = {
  GENERAL: "text-muted-foreground",
  LOW: "text-blue-600",
  MEDIUM: "text-amber-600",
  HIGH: "text-orange-600",
  URGENT: "text-red-600",
}

const GRADE_CLASS: Record<string, string> = {
  "A+": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  "A": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "B+": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "B": "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  "C": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
}

interface TaskRowProps {
  task: Task
  onClick?: () => void
  showAssignee?: boolean
  showProject?: boolean
  /** True if current user is the task assignee */
  isAssignee?: boolean
  /** True if current user can review/approve (manager) */
  canMarkComplete?: boolean
  /** When manager clicks to review EMPLOYEE_DONE task, open review drawer */
  onMarkCompleteRequest?: (task: Task) => void
  /** When true, show grade badge for completed tasks */
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
      {isEmployeeDone && canMarkComplete && (
        <Badge variant="secondary" className="shrink-0 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          Review
        </Badge>
      )}
      {showCompletionRating && isCompleted && task.grade && (
        <Badge variant="secondary" className={cn("shrink-0 text-xs", GRADE_CLASS[task.grade] ?? "bg-muted")}>
          {task.grade}
        </Badge>
      )}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-base md:text-sm",
            isCompleted && "text-muted-foreground line-through"
          )}
        >
          {task.title}
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
          <Flag
            className={cn("h-4 w-4", PRIORITY_COLORS[task.priority] ?? "text-muted-foreground")}
            aria-hidden
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

"use client"

import { Checkbox } from "@/components/ui/checkbox"
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

interface TaskRowProps {
  task: Task
  onClick?: () => void
  showAssignee?: boolean
  showProject?: boolean
  className?: string
}

export function TaskRow({
  task,
  onClick,
  showAssignee = true,
  showProject = true,
  className,
}: TaskRowProps) {
  const updateMutation = useUpdateTask()
  const isCompleted = task.status === "COMPLETED"

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await updateMutation.mutateAsync({
        id: task.id,
        data: {
          status: isCompleted ? "PENDING" : "COMPLETED",
        },
      })
    } catch {
      // toast handled by mutation
    }
  }

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
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => {}}
        onClick={handleToggleComplete}
        aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm",
            isCompleted && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </span>
        {(showAssignee || showProject) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {showProject && task.project && (
              <span className="truncate">{task.project.name}</span>
            )}
            {showAssignee && task.assignee && task.assigneeId !== task.createdById && (
              <span className="truncate">→ {task.assignee.name}</span>
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
              task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "COMPLETED"
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

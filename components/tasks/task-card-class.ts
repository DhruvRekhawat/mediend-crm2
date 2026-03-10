import { cn } from "@/lib/utils"

export interface TaskLike {
  priority?: string | null
  status?: string
}

/**
 * Returns Tailwind classes for a task card wrapper (rounded border, left accent, background tint).
 * Use for All tasks, Completed, Team member detail, and Calendar list.
 */
export function getTaskCardClass(
  task: TaskLike,
  opts?: { isOverdue?: boolean; forCompletedSection?: boolean }
): string {
  const base = "rounded-lg border border-l-4 bg-card shadow-sm overflow-hidden"
  const isOverdue = opts?.isOverdue ?? false
  const forCompletedSection = opts?.forCompletedSection ?? false

  if (forCompletedSection && task.status === "COMPLETED") {
    return cn(
      base,
      "border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20",
      "mb-2"
    )
  }

  const priorityBorder: Record<string, string> = {
    URGENT: "border-l-red-500 bg-red-50/40 dark:bg-red-950/20",
    HIGH: "border-l-orange-500 bg-orange-50/40 dark:bg-orange-950/20",
    MEDIUM: "border-l-amber-400 bg-amber-50/30 dark:bg-amber-950/10",
    LOW: "border-l-blue-400 bg-blue-50/30 dark:bg-blue-950/10",
    GENERAL: "border-l-slate-300 bg-muted/20",
  }
  const priority = task.priority ?? "GENERAL"
  const priorityClass = priorityBorder[priority] ?? priorityBorder.GENERAL
  const overdueTint = isOverdue ? "bg-red-50/60 dark:bg-red-950/20" : ""

  if (task.status === "EMPLOYEE_DONE") {
    return cn(
      base,
      "border-l-amber-400 bg-amber-50/40 dark:bg-amber-950/20",
      overdueTint,
      "mb-2"
    )
  }

  return cn(base, priorityClass, overdueTint, "mb-2")
}

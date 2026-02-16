import { isBefore, isEqual, startOfDay, differenceInDays } from "date-fns"
import type { Task } from "@/hooks/use-tasks"

export type TaskStatusType = 'expired' | 'due-today' | 'expiring-soon' | 'normal'

export function getTaskStatus(task: Task): TaskStatusType {
  if (!task.dueDate) return 'normal'

  const due = new Date(task.dueDate)
  const now = new Date()
  const today = startOfDay(now)

  // If task is already completed, it's normal
  if (task.status === 'COMPLETED') return 'normal'

  // Check if due date has passed
  if (isBefore(due, now)) return 'expired'

  // Check if due today
  const dueDay = startOfDay(due)
  if (isEqual(dueDay, today)) return 'due-today'

  // Check if expiring soon (within 3 days)
  if (differenceInDays(due, now) <= 3) return 'expiring-soon'

  return 'normal'
}

export function getTaskStatusColor(status: TaskStatusType): string {
  switch (status) {
    case 'expired':
      return 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
    case 'due-today':
      return 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800'
    case 'expiring-soon':
      return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800'
    default:
      return 'bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-700'
  }
}

export function getTaskStatusBadge(status: TaskStatusType): {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
} {
  switch (status) {
    case 'expired':
      return { label: 'Delayed', variant: 'destructive' }
    case 'due-today':
      return { label: 'Due Today', variant: 'destructive' }
    case 'expiring-soon':
      return { label: 'Expiring Soon', variant: 'secondary' }
    default:
      return { label: '', variant: 'outline' }
  }
}
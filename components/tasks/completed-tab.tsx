"use client"

import { useMemo, useState } from "react"
import { useTasks } from "@/hooks/use-tasks"
import { useAuth } from "@/hooks/use-auth"
import { TaskRow } from "./task-row"
import { TaskDetailModal } from "@/components/calendar/task-detail-modal"
import { format } from "date-fns"
import { CheckCircle } from "lucide-react"
import type { Task } from "@/hooks/use-tasks"

export function CompletedTab() {
  const { user } = useAuth()
  const { data: tasks = [], isLoading } = useTasks()
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)

  const canMarkComplete = (task: Task) =>
    !!user && (user.role === "MD" || user.role === "ADMIN" || task.createdById === user.id)

  const completedTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === "COMPLETED")
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
  }, [tasks])

  if (isLoading) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (completedTasks.length === 0) {
    return (
      <div className="py-12 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          No completed tasks yet. Complete tasks to see them here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {completedTasks.length} task{completedTasks.length !== 1 ? "s" : ""}{" "}
        completed
      </p>
      <div className="space-y-0.5">
        {completedTasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2">
            <TaskRow
              task={task}
              onClick={() => setDetailTaskId(task.id)}
              showAssignee
              showProject
              showCompletionRating
              canMarkComplete={canMarkComplete(task)}
            />
            <span className="text-xs text-muted-foreground shrink-0">
              {format(new Date(task.updatedAt), "MMM d")}
            </span>
          </div>
        ))}
      </div>

      <TaskDetailModal
        open={!!detailTaskId}
        onOpenChange={(open) => !open && setDetailTaskId(null)}
        taskId={detailTaskId}
      />
    </div>
  )
}

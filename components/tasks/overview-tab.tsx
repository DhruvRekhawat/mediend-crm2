"use client"

import { useState, useMemo } from "react"
import { startOfDay } from "date-fns"
import { useTaskStats, useTasks } from "@/hooks/use-tasks"
import { useAuth } from "@/hooks/use-auth"
import { Progress } from "@/components/ui/progress"
import { TaskRow } from "./task-row"
import { TaskDetailModal } from "@/components/calendar/task-detail-modal"
import { MarkCompleteDrawer } from "./mark-complete-drawer"
import { ChevronDown, ChevronRight, LayoutGrid, Users } from "lucide-react"
import type { Task } from "@/hooks/use-tasks"

export function OverviewTab() {
  const { user } = useAuth()
  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrorDetail } = useTaskStats()
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)
  const [expandedAssigneeId, setExpandedAssigneeId] = useState<string | null>(null)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null)

  const canMarkComplete = (task: Task) =>
    !!user && (user.role === "MD" || user.role === "ADMIN" || task.createdById === user.id)

  const overdueTasks = useMemo(() => {
    const today = startOfDay(new Date())
    return tasks
      .filter(
        (t) =>
          t.status !== "COMPLETED" &&
          t.status !== "CANCELLED" &&
          t.dueDate &&
          new Date(t.dueDate) < today
      )
      .sort(
        (a, b) =>
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      )
  }, [tasks])

  if (statsError) {
    return (
      <div className="py-6 text-center text-sm text-destructive">
        Failed to load stats. {statsErrorDetail instanceof Error ? statsErrorDetail.message : "Please try again."}
      </div>
    )
  }

  if (statsLoading || !stats) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Loading stats...
      </div>
    )
  }

  const projectTasks = expandedProjectId
    ? tasks.filter((t) => (t.projectId ?? null) === expandedProjectId)
    : []
  const assigneeTasks = expandedAssigneeId
    ? tasks.filter((t) => t.assigneeId === expandedAssigneeId)
    : []

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-muted/30 px-3 py-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 px-3 py-3">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-2xl font-semibold text-green-600">{stats.completed}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 px-3 py-3">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-semibold">{stats.pending}</p>
        </div>
        <div className="rounded-lg border bg-muted/30 px-3 py-3">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className="text-2xl font-semibold text-red-600">{stats.overdue}</p>
        </div>
      </section>

      {overdueTasks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-600 mb-2">
            Overdue ({overdueTasks.length})
          </h2>
          <div className="space-y-0.5 rounded-md border">
            {overdueTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => setDetailTaskId(task.id)}
                showAssignee
                showProject
                canMarkComplete={canMarkComplete(task)}
                onMarkCompleteRequest={() => setTaskToComplete(task)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Users className="h-4 w-4" />
          By person
        </h2>
        <div className="space-y-2">
          {stats.employeeWise.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            stats.employeeWise.map((e) => {
              const isExpanded = expandedAssigneeId === e.assigneeId
              return (
                <div
                  key={e.assigneeId}
                  className="rounded-md border"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                    onClick={() =>
                      setExpandedAssigneeId(
                        isExpanded ? null : e.assigneeId
                      )
                    }
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <span className="flex-1 font-medium">{e.assigneeName}</span>
                    <span className="text-muted-foreground">
                      {e.completed}/{e.total}
                    </span>
                    <Progress
                      value={e.total ? (e.completed / e.total) * 100 : 0}
                      className="w-16 h-1.5"
                    />
                  </button>
                  {isExpanded && (
                    <div className="border-t px-2 py-2 space-y-0.5">
                      {tasksLoading ? (
                        <p className="text-xs text-muted-foreground py-2">
                          Loading...
                        </p>
                      ) : assigneeTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          No tasks
                        </p>
                      ) : (
                        assigneeTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onClick={() => setDetailTaskId(task.id)}
                            showAssignee={false}
                            showProject
                            canMarkComplete={canMarkComplete(task)}
                            onMarkCompleteRequest={() => setTaskToComplete(task)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <LayoutGrid className="h-4 w-4" />
          By project
        </h2>
        <div className="space-y-2">
          {stats.projectWise.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            stats.projectWise.map((p) => {
              const total = p.count
              const completed = tasks.filter(
                (t) => (t.projectId ?? null) === p.projectId && t.status === "COMPLETED"
              ).length
              const isExpanded = expandedProjectId === p.projectId
              return (
                <div
                  key={p.projectId ?? "none"}
                  className="rounded-md border"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                    onClick={() =>
                      setExpandedProjectId(isExpanded ? null : p.projectId)
                    }
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <span className="flex-1 font-medium">{p.projectName}</span>
                    <span className="text-muted-foreground">
                      {completed}/{total}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="border-t px-2 py-2 space-y-0.5">
                      {tasksLoading ? (
                        <p className="text-xs text-muted-foreground py-2">
                          Loading...
                        </p>
                      ) : projectTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          No tasks
                        </p>
                      ) : (
                        projectTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onClick={() => setDetailTaskId(task.id)}
                            showAssignee
                            showProject={false}
                            canMarkComplete={canMarkComplete(task)}
                            onMarkCompleteRequest={() => setTaskToComplete(task)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>



      <TaskDetailModal
        open={!!detailTaskId}
        onOpenChange={(open) => !open && setDetailTaskId(null)}
        taskId={detailTaskId}
      />
      <MarkCompleteDrawer
        task={taskToComplete}
        open={!!taskToComplete}
        onOpenChange={(open) => !open && setTaskToComplete(null)}
        onSuccess={() => setTaskToComplete(null)}
      />
    </div>
  )
}

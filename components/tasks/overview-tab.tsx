"use client"

import { useState, useMemo } from "react"
import { startOfDay } from "date-fns"
import { useTaskStats, useTasks, useWarnings } from "@/hooks/use-tasks"
import { useAuth } from "@/hooks/use-auth"
import { Progress } from "@/components/ui/progress"
import { StatCard } from "@/components/ui/stat-card"
import { TaskRow } from "./task-row"
import { getTaskCardClass } from "./task-card-class"
import { TaskDetailModal } from "@/components/calendar/task-detail-modal"
import { MarkCompleteDrawer } from "./mark-complete-drawer"
import { ChevronDown, ChevronRight, LayoutGrid, Users } from "lucide-react"
import type { Task } from "@/hooks/use-tasks"

export function OverviewTab() {
  const { user } = useAuth()
  const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrorDetail } = useTaskStats()
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const { data: allWarnings = [] } = useWarnings()
  const taskWarningCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const w of allWarnings) {
      if (w.taskId) map[w.taskId] = (map[w.taskId] ?? 0) + 1
    }
    return map
  }, [allWarnings])
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

  const projectList = useMemo(
    () => stats?.projectWise.filter((p) => p.projectId != null) ?? [],
    [stats]
  )

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
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total" value={stats.total} accent="blue" />
        <StatCard label="Completed" value={stats.completed} accent="green" valueAccent />
        <StatCard label="Pending" value={stats.pending} accent="amber" />
        <StatCard label="Pending review" value={stats.pendingReview ?? 0} accent="purple" valueAccent />
        <StatCard label="Overdue" value={stats.overdue} accent="red" valueAccent />
        <StatCard label="Employees w/ warnings" value={stats.employeesWithWarnings ?? 0} accent="orange" valueAccent />
      </section>

      {overdueTasks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-600 mb-2">
            Overdue ({overdueTasks.length})
          </h2>
          <div className="space-y-2">
            {overdueTasks.map((task) => (
              <div key={task.id} className={getTaskCardClass(task, { isOverdue: true })}>
                <TaskRow
                  task={task}
                  onClick={() => setDetailTaskId(task.id)}
                  showAssignee
                  showProject
                  warningCount={taskWarningCountMap[task.id] ?? 0}
                  isAssignee={task.assigneeId === user?.id}
                  canMarkComplete={canMarkComplete(task)}
                  onMarkCompleteRequest={() => setTaskToComplete(task)}
                />
              </div>
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
                    <div className="border-t px-2 py-2 space-y-2">
                      {tasksLoading ? (
                        <p className="text-xs text-muted-foreground py-2">
                          Loading...
                        </p>
                      ) : assigneeTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          No tasks
                        </p>
                      ) : (
                        assigneeTasks.map((task) => {
                          const today = startOfDay(new Date())
                          const isOverdue = !!task.dueDate && new Date(task.dueDate) < today && task.status !== "COMPLETED"
                          return (
                            <div key={task.id} className={getTaskCardClass(task, { isOverdue })}>
                              <TaskRow
                                task={task}
                                onClick={() => setDetailTaskId(task.id)}
                                showAssignee={false}
                                showProject
                                warningCount={taskWarningCountMap[task.id] ?? 0}
                                isAssignee={task.assigneeId === user?.id}
                                canMarkComplete={canMarkComplete(task)}
                                onMarkCompleteRequest={() => setTaskToComplete(task)}
                              />
                            </div>
                          )
                        })
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
          {projectList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            projectList.map((p) => {
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
                    <div className="border-t px-2 py-2 space-y-2">
                      {tasksLoading ? (
                        <p className="text-xs text-muted-foreground py-2">
                          Loading...
                        </p>
                      ) : projectTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          No tasks
                        </p>
                      ) : (
                        projectTasks.map((task) => {
                          const today = startOfDay(new Date())
                          const isOverdue = !!task.dueDate && new Date(task.dueDate) < today && task.status !== "COMPLETED"
                          return (
                            <div key={task.id} className={getTaskCardClass(task, { isOverdue })}>
                              <TaskRow
                                task={task}
                                onClick={() => setDetailTaskId(task.id)}
                                showAssignee
                                showProject={false}
                                warningCount={taskWarningCountMap[task.id] ?? 0}
                                isAssignee={task.assigneeId === user?.id}
                                canMarkComplete={canMarkComplete(task)}
                                onMarkCompleteRequest={() => setTaskToComplete(task)}
                              />
                            </div>
                          )
                        })
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

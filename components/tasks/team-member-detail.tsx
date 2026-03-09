"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useTasks } from "@/hooks/use-tasks"
import { TaskRow } from "./task-row"
import { TaskInput } from "./task-input"
import { TaskDetailModal } from "@/components/calendar/task-detail-modal"
import { startOfDay } from "date-fns"
import type { MDTeamOverviewMember } from "@/hooks/use-md-team"
import { cn } from "@/lib/utils"

export interface TeamMemberDetailContentProps {
  member: MDTeamOverviewMember
}

export function TeamMemberDetailContent({ member }: TeamMemberDetailContentProps) {
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)

  const { data: tasks = [], isLoading, isError } = useTasks(
    { assigneeId: member.id },
    { enabled: !!member.id }
  )
  const today = startOfDay(new Date())
  const overdueTasks = tasks.filter(
    (t) =>
      t.status !== "COMPLETED" &&
      t.status !== "CANCELLED" &&
      t.dueDate &&
      new Date(t.dueDate) < today
  )
  const otherPending = tasks.filter(
    (t) =>
      t.status !== "COMPLETED" &&
      t.status !== "CANCELLED" &&
      (!t.dueDate || new Date(t.dueDate) >= today)
  )

  const isIn = member.attendanceStatus === "in"
  const isLeave = member.attendanceStatus === "leave"

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        <header className="shrink-0 space-y-1 pb-4">
          <h1 className="text-xl font-semibold tracking-tight">{member.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded px-2 py-1 text-xs font-medium",
                isLeave && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
                isIn && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
                !isIn && !isLeave && "bg-muted text-muted-foreground"
              )}
            >
              {isLeave ? "Leave" : isIn ? "IN" : "OUT"}
            </span>
            {member.designation && (
              <span className="text-xs text-muted-foreground">{member.designation}</span>
            )}
            {member.department && (
              <span className="text-xs text-muted-foreground">{member.department.name}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </header>

        <Separator className="shrink-0 mb-4" />

        <ScrollArea className="flex-1 min-h-0 -mx-2 px-2">
          <div className="space-y-6 pb-6">
            <section>
              <h2 className="text-sm font-semibold mb-2">Overdue tasks</h2>
              {overdueTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">None</p>
              ) : (
                <ul className="space-y-1">
                  {overdueTasks.map((task) => (
                    <li key={task.id}>
                      <TaskRow
                        task={task}
                        onClick={() => setDetailTaskId(task.id)}
                        showAssignee={false}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-2">Tasks</h2>
              {isError ? (
                <p className="text-xs text-destructive">Failed to load tasks.</p>
              ) : isLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : otherPending.length === 0 && overdueTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No pending tasks</p>
              ) : (
                <ul className="space-y-1">
                  {otherPending.map((task) => (
                    <li key={task.id}>
                      <TaskRow
                        task={task}
                        onClick={() => setDetailTaskId(task.id)}
                        showAssignee={false}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </ScrollArea>

        <div className="shrink-0 mt-4 pt-4 border-t border-border">
          <TaskInput
            onSuccess={() => {}}
            prefillAssignee={{ id: member.id, name: member.name }}
            isMD
            className="w-full min-w-0"
          />
        </div>
      </div>

      <TaskDetailModal
        open={!!detailTaskId}
        onOpenChange={(o) => !o && setDetailTaskId(null)}
        taskId={detailTaskId}
      />
    </>
  )
}

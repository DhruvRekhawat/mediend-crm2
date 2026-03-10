"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useTasks, useWarnings } from "@/hooks/use-tasks"
import { useAuth } from "@/hooks/use-auth"
import { useIsMobile } from "@/hooks/use-mobile"
import { TaskRow } from "./task-row"
import { TaskInput } from "./task-input"
import { MobileTaskDrawer } from "./mobile-task-drawer"
import { TaskDetailModal } from "@/components/calendar/task-detail-modal"
import { MarkCompleteDrawer } from "./mark-complete-drawer"
import { IssueWarningDialog } from "./issue-warning-dialog"
import { startOfDay, format } from "date-fns"
import type { MDTeamOverviewMember } from "@/hooks/use-md-team"
import type { Task } from "@/hooks/use-tasks"
import { cn } from "@/lib/utils"

export interface TeamMemberDetailContentProps {
  member: MDTeamOverviewMember
}

export function TeamMemberDetailContent({ member }: TeamMemberDetailContentProps) {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [issueWarningOpen, setIssueWarningOpen] = useState(false)

  const canMarkComplete = (task: Task) =>
    !!user && (user.role === "MD" || user.role === "ADMIN" || task.createdById === user.id)

  const { data: tasks = [], isLoading, isError } = useTasks(
    { assigneeId: member.id },
    { enabled: !!member.id }
  )
  const { data: allWarnings = [] } = useWarnings()
  const warnings = allWarnings.filter((w) => w.employeeId === member.id)
  const canIssueWarning = user?.role === "MD" || user?.role === "ADMIN"
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
          <h1 className="text-2xl md:text-xl font-semibold tracking-tight">{member.name}</h1>
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
            {canIssueWarning && (
              <section>
                <h2 className="text-base md:text-sm font-semibold mb-2">Warnings</h2>
                {warnings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No warnings on record.</p>
                ) : (
                  <ul className="space-y-2">
                    {warnings.map((w) => (
                      <li key={w.id} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        <p className="font-medium capitalize">{w.type.replace(/_/g, " ").toLowerCase()}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{w.note}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(w.createdAt), "MMM d, yyyy")}
                          {w.issuedBy && ` · by ${w.issuedBy.name}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setIssueWarningOpen(true)}>
                  Issue warning
                </Button>
              </section>
            )}

            <section>
              <h2 className="text-base md:text-sm font-semibold mb-2">Overdue tasks</h2>
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
                        isAssignee={task.assigneeId === user?.id}
                        canMarkComplete={canMarkComplete(task)}
                        onMarkCompleteRequest={() => setTaskToComplete(task)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-base md:text-sm font-semibold mb-2">Tasks</h2>
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
                        showProject
                        isAssignee={task.assigneeId === user?.id}
                        canMarkComplete={canMarkComplete(task)}
                        onMarkCompleteRequest={() => setTaskToComplete(task)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </ScrollArea>

        {!isMobile && (
          <div className="shrink-0 mt-4 pt-4 border-t border-border">
            <TaskInput
              onSuccess={() => {}}
              prefillAssignee={{ id: member.id, name: member.name }}
              isMD
              className="w-full min-w-0"
            />
          </div>
        )}
      </div>

      {isMobile && (
        <>
          <Button
            size="icon"
            className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
            onClick={() => setDrawerOpen(true)}
            aria-label="New task"
          >
            <Plus className="h-12 w-12 font-bold" />
          </Button>
          <MobileTaskDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            onSuccess={() => {}}
            prefillAssignee={{ id: member.id, name: member.name }}
            isMD
          />
        </>
      )}

      <TaskDetailModal
        open={!!detailTaskId}
        onOpenChange={(o) => !o && setDetailTaskId(null)}
        taskId={detailTaskId}
      />
      <MarkCompleteDrawer
        task={taskToComplete}
        open={!!taskToComplete}
        onOpenChange={(open) => !open && setTaskToComplete(null)}
        onSuccess={() => setTaskToComplete(null)}
      />
      <IssueWarningDialog
        open={issueWarningOpen}
        onOpenChange={setIssueWarningOpen}
        employeeId={member.id}
        employeeName={member.name}
        onSuccess={() => {}}
      />
    </>
  )
}

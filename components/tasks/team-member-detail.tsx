"use client"

import { useState, useMemo } from "react"
import { Plus, AlertTriangle, Star, ArrowUpRight, Crown, Users } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTasks, useWarnings, useTaskApprovals } from "@/hooks/use-tasks"
import { useAuth } from "@/hooks/use-auth"
import { useIsMobile } from "@/hooks/use-mobile"
import { TaskRow } from "./task-row"
import { getTaskCardClass } from "./task-card-class"
import { TaskInput } from "./task-input"
import { MobileTaskDrawer } from "./mobile-task-drawer"
import { TaskDetailModal } from "@/components/calendar/task-detail-modal"
import { MarkCompleteDrawer } from "./mark-complete-drawer"
import { IssueWarningDialog } from "./issue-warning-dialog"
import { startOfDay, format } from "date-fns"
import type { MDTeamOverviewMember } from "@/hooks/use-md-team"
import type { Task } from "@/hooks/use-tasks"
import { cn } from "@/lib/utils"
import { getAvatarColor } from "@/lib/avatar-colors"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase() || "?"
}

const STAR_COLOR: Record<number, string> = {
  1: "text-red-500",
  2: "text-orange-500",
  3: "text-amber-500",
  4: "text-emerald-500",
  5: "text-emerald-600",
}

function getStarColor(rating: number): string {
  const rounded = Math.round(rating)
  return STAR_COLOR[Math.min(5, Math.max(1, rounded))] ?? "text-amber-500"
}

function RatingStars({ rating }: { rating: number }) {
  const color = getStarColor(rating)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            "h-4 w-4",
            s <= Math.round(rating) ? cn("fill-current", color) : "text-muted-foreground/20"
          )}
        />
      ))}
      <span className={cn("ml-1.5 text-sm font-semibold", color)}>{rating.toFixed(1)}</span>
    </div>
  )
}

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
  const { data: allApprovals = [] } = useTaskApprovals()
  const warnings = allWarnings.filter((w) => w.employeeId === member.id)
  const canIssueWarning = user?.role === "MD" || user?.role === "ADMIN"
  const today = startOfDay(new Date())

  const extensionRequests = useMemo(() => {
    return allApprovals.filter((a) => a.task.assignee?.id === member.id)
  }, [allApprovals, member.id])

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED"),
    [tasks]
  )

  const mdTasks = useMemo(
    () => activeTasks.filter((t) => user && t.createdById === user.id),
    [activeTasks, user]
  )

  const teamTasks = useMemo(
    () => activeTasks.filter((t) => user && t.createdById !== user.id),
    [activeTasks, user]
  )

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === "COMPLETED"),
    [tasks]
  )

  const avgRating = useMemo(() => {
    const graded = completedTasks.filter((t) => t.grade)
    if (graded.length === 0) return null
    const sum = graded.reduce((acc, t) => {
      const n = parseInt(t.grade!)
      return acc + (isNaN(n) ? 0 : n)
    }, 0)
    return Math.round((sum / graded.length) * 10) / 10
  }, [completedTasks])

  const isIn = member.attendanceStatus === "in"
  const isLeave = member.attendanceStatus === "leave"

  const overdueMdTasks = mdTasks.filter((t) => t.dueDate && new Date(t.dueDate) < today)
  const onTimeMdTasks = mdTasks.filter((t) => !t.dueDate || new Date(t.dueDate) >= today)
  const overdueTeamTasks = teamTasks.filter((t) => t.dueDate && new Date(t.dueDate) < today)
  const onTimeTeamTasks = teamTasks.filter((t) => !t.dueDate || new Date(t.dueDate) >= today)

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header card */}
        <header className="shrink-0 rounded-xl border bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-950/40 dark:to-violet-950/40 p-4 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback className={cn("text-base font-semibold", getAvatarColor(member.name).bg, getAvatarColor(member.name).text)}>
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-lg font-semibold tracking-tight truncate">{member.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium",
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
                  <span className="text-xs text-muted-foreground">· {member.department.name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-3 flex flex-wrap gap-3">
            {avgRating != null && (
              <div className="flex items-center gap-1.5 rounded-lg bg-white/60 dark:bg-white/5 px-2.5 py-1.5 border">
                <RatingStars rating={avgRating} />
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-lg bg-white/60 dark:bg-white/5 px-2.5 py-1.5 border text-sm">
              <span className="font-semibold text-amber-600 dark:text-amber-400">{activeTasks.length}</span>
              <span className="text-muted-foreground">active</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-white/60 dark:bg-white/5 px-2.5 py-1.5 border text-sm">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{completedTasks.length}</span>
              <span className="text-muted-foreground">completed</span>
            </div>
            {extensionRequests.length > 0 && (
              <div className="flex items-center gap-1 rounded-lg bg-white/60 dark:bg-white/5 px-2.5 py-1.5 border text-sm">
                <ArrowUpRight className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span className="font-semibold text-violet-600 dark:text-violet-400">{extensionRequests.length}</span>
                <span className="text-muted-foreground">extensions</span>
              </div>
            )}
          </div>
        </header>

        <ScrollArea className="flex-1 min-h-0 -mx-2 px-2">
          <div className="space-y-4 pb-6">
            {/* Warnings */}
            {canIssueWarning && warnings.length > 0 && (
              <section className="rounded-xl border border-l-4 border-l-amber-500 bg-amber-50/80 dark:bg-amber-950/30 p-3">
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Warnings ({warnings.length})
                </h2>
                <ul className="space-y-1.5">
                  {warnings.map((w) => (
                    <li
                      key={w.id}
                      className="rounded-md bg-amber-100/60 dark:bg-amber-900/20 px-2.5 py-1.5 text-sm text-amber-900 dark:text-amber-100"
                    >
                      <span className="font-medium capitalize">{w.type.replace(/_/g, " ").toLowerCase()}</span>
                      <span className="text-xs text-amber-700/80 dark:text-amber-300/80 ml-2">{w.note}</span>
                      <span className="text-xs text-amber-600/70 dark:text-amber-400/70 ml-2">
                        {format(new Date(w.createdAt), "MMM d")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Extension Requests */}
            {extensionRequests.length > 0 && (
              <section className="rounded-xl border border-l-4 border-l-violet-500 bg-violet-50/80 dark:bg-violet-950/30 p-3">
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-2 text-violet-800 dark:text-violet-200">
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
                  Extension Requests ({extensionRequests.length})
                </h2>
                <ul className="space-y-1.5">
                  {extensionRequests.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-md bg-violet-100/60 dark:bg-violet-900/20 px-2.5 py-1.5 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-violet-900 dark:text-violet-100 truncate">{a.task.title}</span>
                        <span className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
                          a.status === "PENDING" && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
                          a.status === "APPROVED" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
                          a.status === "REJECTED" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
                        )}>
                          {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                      <p className="text-xs text-violet-700/80 dark:text-violet-300/80 mt-0.5">
                        {a.oldDueDate ? format(new Date(a.oldDueDate), "MMM d") : "No date"}
                        {" → "}
                        {a.newDueDate ? format(new Date(a.newDueDate), "MMM d") : "No date"}
                        {a.reason && ` · ${a.reason}`}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* MD Tasks card */}
            <section className="rounded-xl border border-l-4 border-l-blue-500 bg-blue-50/40 dark:bg-blue-950/20 p-3">
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <Crown className="h-4 w-4 shrink-0" />
                MD Tasks ({mdTasks.length})
              </h2>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/60 mb-2">Tasks assigned by you</p>
              {isError ? (
                <p className="text-xs text-destructive">Failed to load tasks.</p>
              ) : isLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : mdTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active MD tasks</p>
              ) : (
                <div className="space-y-1.5">
                  {overdueMdTasks.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Overdue</p>
                      <ul className="space-y-1.5">
                        {overdueMdTasks.map((task) => (
                          <li key={task.id} className={getTaskCardClass(task, { isOverdue: true })}>
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
                    </div>
                  )}
                  <ul className="space-y-1.5">
                    {onTimeMdTasks.map((task) => (
                      <li key={task.id} className={getTaskCardClass(task, { isOverdue: false })}>
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
                </div>
              )}
            </section>

            {/* Team Tasks card */}
            <section className="rounded-xl border border-l-4 border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 p-3">
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                <Users className="h-4 w-4 shrink-0" />
                Team Tasks ({teamTasks.length})
              </h2>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/60 mb-2">Tasks assigned by others</p>
              {isError ? (
                <p className="text-xs text-destructive">Failed to load tasks.</p>
              ) : isLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : teamTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active team tasks</p>
              ) : (
                <div className="space-y-1.5">
                  {overdueTeamTasks.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Overdue</p>
                      <ul className="space-y-1.5">
                        {overdueTeamTasks.map((task) => (
                          <li key={task.id} className={getTaskCardClass(task, { isOverdue: true })}>
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
                    </div>
                  )}
                  <ul className="space-y-1.5">
                    {onTimeTeamTasks.map((task) => (
                      <li key={task.id} className={getTaskCardClass(task, { isOverdue: false })}>
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
                </div>
              )}
            </section>

            {/* Issue warning button */}
            {canIssueWarning && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-950/30"
                  onClick={() => setIssueWarningOpen(true)}
                >
                  <AlertTriangle className="h-4 w-4 mr-1.5 shrink-0" />
                  Issue warning
                </Button>
              </div>
            )}
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

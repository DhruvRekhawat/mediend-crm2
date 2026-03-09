"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useTasks } from "@/hooks/use-tasks"
import { TaskRow } from "./task-row"
import { TaskInput } from "./task-input"
import { TaskDetailModal } from "@/components/calendar/task-detail-modal"
import { PlusCircle } from "lucide-react"
import { startOfDay } from "date-fns"
import type { MDTeamOverviewMember } from "@/hooks/use-md-team"
import { cn } from "@/lib/utils"

interface TeamMemberDetailProps {
  member: MDTeamOverviewMember | null
  open: boolean
  onClose: () => void
  onAssignTask?: () => void
}

export function TeamMemberDetail({
  member,
  open,
  onClose,
  onAssignTask,
}: TeamMemberDetailProps) {
  const [showAssignInput, setShowAssignInput] = useState(false)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)

  const { data: tasks = [], isLoading } = useTasks(
    member ? { assigneeId: member.id } : undefined
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

  const handleAssignSuccess = () => {
    setShowAssignInput(false)
  }

  if (!member) return null

  const isIn = member.attendanceStatus === "in"
  const isLeave = member.attendanceStatus === "leave"

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="bottom"
          className="h-[85vh] max-h-[85dvh] rounded-t-2xl flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="text-left">{member.name}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-6">
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

              <Separator />

              <section>
                <h3 className="text-sm font-semibold mb-2">Overdue tasks</h3>
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
                <h3 className="text-sm font-semibold mb-2">Tasks</h3>
                {isLoading ? (
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

              {!showAssignInput ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAssignInput(true)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Assign task
                </Button>
              ) : (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-medium">New task for {member.name}</p>
                  <TaskInput
                    onSuccess={handleAssignSuccess}
                    prefillAssignee={{ id: member.id, name: member.name }}
                    isMD
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAssignInput(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <TaskDetailModal
        open={!!detailTaskId}
        onOpenChange={(o) => !o && setDetailTaskId(null)}
        taskId={detailTaskId}
      />
    </>
  )
}

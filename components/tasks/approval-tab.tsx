"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTaskApprovals, useApproveTaskDueDate } from "@/hooks/use-tasks"
import { TaskDetailModal } from "@/components/calendar/task-detail-modal"

export function ApprovalTab() {
  const { data: approvals = [], isLoading, isError } = useTaskApprovals()
  const approveMutation = useApproveTaskDueDate()
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Loading approvals…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-6 text-center text-sm text-destructive">
        Failed to load due date change requests.
      </div>
    )
  }

  if (approvals.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No pending due date change requests.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Approve or reject due date change requests from your team.
      </p>
      <ul className="space-y-3">
        {approvals.map((approval) => (
          <li
            key={approval.id}
            className="rounded-lg border bg-card p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                <button
                  type="button"
                  onClick={() => setDetailTaskId(approval.task.id)}
                  className="text-left font-medium text-sm hover:underline focus:outline-none focus:underline"
                >
                  {approval.task.title}
                </button>
                <p className="text-xs text-muted-foreground">
                  Requested by {approval.requestedBy.name}
                  {approval.task.assignee && (
                    <> · Assignee: {approval.task.assignee.name}</>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {approval.oldDueDate
                    ? format(new Date(approval.oldDueDate), "MMM d, yyyy")
                    : "No date"}
                  {" → "}
                  {approval.newDueDate
                    ? format(new Date(approval.newDueDate), "MMM d, yyyy")
                    : "No date"}
                </p>
                {approval.reason && (
                  <div className="rounded bg-muted/50 px-2 py-1.5 mt-1">
                    <p className="text-xs font-medium text-muted-foreground">Reason</p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">{approval.reason}</p>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() =>
                    approveMutation.mutateAsync({ id: approval.id, status: "APPROVED" })
                  }
                  disabled={approveMutation.isPending}
                  className="gap-1"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    approveMutation.mutateAsync({ id: approval.id, status: "REJECTED" })
                  }
                  disabled={approveMutation.isPending}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <TaskDetailModal
        open={!!detailTaskId}
        onOpenChange={(open) => !open && setDetailTaskId(null)}
        taskId={detailTaskId}
      />
    </div>
  )
}

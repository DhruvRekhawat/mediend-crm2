"use client"

import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Clock, User, FolderOpen } from "lucide-react"
import { PriorityIcon } from "@/components/tasks/priority-icon"
import { format } from "date-fns"
import {
  useTask,
  useTaskComments,
  useCreateTaskComment,
  useTaskActivity,
  useUpdateTask,
  type Task,
  type UpdateTaskInput,
} from "@/hooks/use-tasks"
import { useAuth } from "@/hooks/use-auth"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getAvatarColor } from "@/lib/avatar-colors"
import { CompletionFeedback } from "@/components/tasks/completion-feedback"
import { MarkCompleteDrawer } from "@/components/tasks/mark-complete-drawer"
import { IssueWarningDialog } from "@/components/tasks/issue-warning-dialog"

interface TaskDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string | null
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "EMPLOYEE_DONE", label: "Done (pending review)" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const

const PRESET_COMMENTS = [
  "Good job",
  "Excellent work",
  "Delivered on time",
  "Slight delay",
  "Very delayed",
  "Bad quality of work",
  "Needs improvement",
  "Rework required",
]

const PRIORITY_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const

const PRIORITY_LABELS: Record<string, string> = {
  GENERAL: "General",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
}

const ACTIVITY_LABELS: Record<string, string> = {
  TITLE_CHANGED: "Title changed",
  DUE_DATE_CHANGED: "Due date changed",
  PRIORITY_CHANGED: "Priority changed",
  STATUS_CHANGED: "Status changed",
  PROJECT_CHANGED: "Project changed",
}

const ACTIVITY_COLORS: Record<string, { border: string; bg: string; icon: string }> = {
  TITLE_CHANGED: { border: "border-blue-200 dark:border-blue-800", bg: "bg-blue-50/60 dark:bg-blue-950/30", icon: "text-blue-600 dark:text-blue-400" },
  DUE_DATE_CHANGED: { border: "border-purple-200 dark:border-purple-800", bg: "bg-purple-50/60 dark:bg-purple-950/30", icon: "text-purple-600 dark:text-purple-400" },
  PRIORITY_CHANGED: { border: "border-orange-200 dark:border-orange-800", bg: "bg-orange-50/60 dark:bg-orange-950/30", icon: "text-orange-600 dark:text-orange-400" },
  STATUS_CHANGED: { border: "border-emerald-200 dark:border-emerald-800", bg: "bg-emerald-50/60 dark:bg-emerald-950/30", icon: "text-emerald-600 dark:text-emerald-400" },
  PROJECT_CHANGED: { border: "border-violet-200 dark:border-violet-800", bg: "bg-violet-50/60 dark:bg-violet-950/30", icon: "text-violet-600 dark:text-violet-400" },
}

function formatActivityDetails(action: string, details: string | null): string {
  if (!details) return ""
  if (action === "DUE_DATE_CHANGED") {
    return details
      .split(/\s*→\s*/)
      .map((part) => {
        const trimmed = part.trim()
        if (trimmed === "None" || !trimmed) return trimmed
        const d = new Date(trimmed)
        return isNaN(d.getTime()) ? trimmed : format(d, "MMM d, yyyy")
      })
      .join(" → ")
  }
  return details
}

function TaskDetailContent({
  taskId,
  onClose,
}: {
  taskId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { data: task, isLoading } = useTask(taskId)
  const { data: comments = [], refetch: refetchComments } = useTaskComments(taskId)
  const createComment = useCreateTaskComment(taskId)
  const { data: activity = [], refetch: refetchActivity } = useTaskActivity(taskId)
  const updateTask = useUpdateTask()

  const [commentText, setCommentText] = useState("")
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState("")
  const [statusValue, setStatusValue] = useState<string>("")
  const [priorityValue, setPriorityValue] = useState<string>("")
  const [dueDateValue, setDueDateValue] = useState<Date | null>(null)
  const [pendingDueDate, setPendingDueDate] = useState<Date | null>(null)
  const [dueDateChangeReason, setDueDateChangeReason] = useState("")
  const [showCompletionFeedbackModal, setShowCompletionFeedbackModal] = useState(false)
  const [hasShownCompletionModal, setHasShownCompletionModal] = useState(false)
  const [issueWarningOpen, setIssueWarningOpen] = useState(false)

  const canEditDueDateDirectly =
    !!task &&
    !!user &&
    (user.role === "MD" || user.role === "ADMIN" || task.createdById === user.id)
  const canReviewTask = canEditDueDateDirectly
  const [markCompleteDrawerOpen, setMarkCompleteDrawerOpen] = useState(false)
  const [replyingToId, setReplyingToId] = useState<string | null>(null)

  useEffect(() => {
    setHasShownCompletionModal(false)
  }, [taskId])

  useEffect(() => {
    if (task) {
      setTitleValue(task.title)
      setStatusValue(task.status)
      setPriorityValue(task.priority)
      setDueDateValue(task.dueDate ? new Date(task.dueDate) : null)
      if (
        user &&
        task.assigneeId === user.id &&
        task.status === "COMPLETED" &&
        task.grade &&
        !hasShownCompletionModal
      ) {
        setShowCompletionFeedbackModal(true)
        setHasShownCompletionModal(true)
      }
    }
  }, [task, user, hasShownCompletionModal])

  const handleAddComment = async () => {
    const trimmed = commentText.trim()
    if (!trimmed) return
    try {
      await createComment.mutateAsync({ content: trimmed, ...(replyingToId && { parentId: replyingToId }) })
      setCommentText("")
      setReplyingToId(null)
      refetchComments()
    } catch {
      toast.error("Failed to add comment")
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return
    if (newStatus === "COMPLETED" && canReviewTask) {
      setMarkCompleteDrawerOpen(true)
      return
    }
    try {
      await updateTask.mutateAsync({
        id: task.id,
        data: { status: newStatus as UpdateTaskInput["status"] },
      })
      setStatusValue(newStatus)
      refetchActivity()
    } catch {
      toast.error("Failed to update status")
    }
  }

  const handleSaveTitle = async () => {
    if (!task || titleValue.trim() === task.title) {
      setEditingTitle(false)
      return
    }
    try {
      await updateTask.mutateAsync({ id: task.id, data: { title: titleValue.trim() } })
      setEditingTitle(false)
      refetchActivity()
    } catch {
      toast.error("Failed to update title")
    }
  }

  const handlePriorityChange = async (newPriority: string) => {
    if (!task || newPriority === task.priority) return
    try {
      await updateTask.mutateAsync({
        id: task.id,
        data: { priority: newPriority as UpdateTaskInput["priority"] },
      })
      setPriorityValue(newPriority)
      refetchActivity()
    } catch {
      toast.error("Failed to update priority")
    }
  }

  const handleDueDateChange = async (newDate: Date | null) => {
    if (!task) return
    const currentDue = task.dueDate ? new Date(task.dueDate).toISOString() : null
    const newDue = newDate ? newDate.toISOString() : null
    if (currentDue === newDue) return
    if (canEditDueDateDirectly) {
      try {
        await updateTask.mutateAsync({
          id: task.id,
          data: { dueDate: newDue },
        })
        setDueDateValue(newDate)
        refetchActivity()
      } catch {
        toast.error("Failed to update due date")
      }
      return
    }
    setPendingDueDate(newDate)
    setDueDateChangeReason("")
  }

  const handleRequestDueDateChange = async () => {
    if (!task || !pendingDueDate || !dueDateChangeReason.trim()) return
    try {
      const result = await updateTask.mutateAsync({
        id: task.id,
        data: {
          dueDate: pendingDueDate.toISOString(),
          dueDateChangeReason: dueDateChangeReason.trim(),
        },
      }) as { message?: string; approvalId?: string }
      if (result?.message && result?.approvalId) {
        toast.success("Due date change requested. Waiting for approval.")
        setPendingDueDate(null)
        setDueDateChangeReason("")
        queryClient.invalidateQueries({ queryKey: ["task-approvals"] })
      } else {
        setDueDateValue(pendingDueDate)
        setPendingDueDate(null)
        setDueDateChangeReason("")
        refetchActivity()
      }
    } catch {
      toast.error("Failed to submit request")
    }
  }

  if (isLoading || !task) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const isAssignee = task.assigneeId === user?.id
  const showStatusDropdown =
    isAssignee &&
    (task.status === "PENDING" || task.status === "IN_PROGRESS" || task.status === "EMPLOYEE_DONE")
  const statusBadgeClass = {
    PENDING: "border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
    IN_PROGRESS: "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    EMPLOYEE_DONE: "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    COMPLETED: "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
    CANCELLED: "border-muted bg-muted/50 text-muted-foreground",
  }[task.status] ?? "border-muted bg-muted/50"

  return (
    <div className="flex flex-col md:flex-row md:min-h-0 h-full">
      <div className="flex-1 min-w-0 flex flex-col border-b md:border-b-0 md:border-r border-border">
        <div className="p-4 md:p-4 space-y-4 shrink-0">
          <div className="flex items-start gap-2">
            {editingTitle ? (
              <div className="flex-1 flex gap-2">
                <input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                  className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-lg md:text-base font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <h2
                className="flex-1 text-xl md:text-lg font-semibold cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1 -mx-1 min-w-0"
                onClick={() => setEditingTitle(true)}
              >
                {task.title}
              </h2>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {showStatusDropdown ? (
              <select
                value={statusValue}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={cn(
                  "text-sm md:text-xs rounded-md border-2 px-3 py-1.5 font-medium",
                  statusValue === "IN_PROGRESS" && "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                  statusValue === "EMPLOYEE_DONE" && "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                  statusValue === "COMPLETED" && "border-emerald-500 bg-emerald-50 text-emerald-700 dark:text-emerald-300",
                  statusValue === "PENDING" && "border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
                  statusValue === "CANCELLED" && "border-muted bg-muted/50 text-muted-foreground"
                )}
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="EMPLOYEE_DONE">Mark done (pending review)</option>
              </select>
            ) : (
              <Badge variant="outline" className={cn("text-sm md:text-xs font-medium border-2 px-2.5 py-0.5", statusBadgeClass)}>
                {STATUS_OPTIONS.find((o) => o.value === task.status)?.label ?? task.status}
              </Badge>
            )}
            {task.project && (
              <Badge variant="outline" className="text-sm md:text-xs border-2 border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
                {task.project.name}
              </Badge>
            )}
          </div>
          {task.description && (
            <p className="text-base md:text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        <Separator className="my-0" />

        <div className="flex-1 min-h-0 flex flex-col p-4 border-t border-border">
          <h3 className="text-base md:text-sm font-semibold mb-3 text-foreground">Comments</h3>
          <ScrollArea className="flex-1 min-h-[120px] max-h-[240px] pr-2">
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-base md:text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                (() => {
                  const topLevel = comments.filter((c) => !c.parentId)
                  return topLevel.map((c) => (
                    <div key={c.id} className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                      <div className="flex gap-3">
                        <div className={cn("shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium", getAvatarColor(c.user.name).bg, getAvatarColor(c.user.name).text)}>
                          {c.user.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm md:text-xs text-muted-foreground">
                            {c.user.name} · {format(new Date(c.createdAt), "MMM d, HH:mm")}
                          </p>
                          <p className="text-base md:text-sm mt-1 whitespace-pre-wrap">{c.content}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-sm md:text-xs mt-1"
                            onClick={() => setReplyingToId(c.id)}
                          >
                            Reply
                          </Button>
                        </div>
                      </div>
                      {(c.replies?.length ?? 0) > 0 && (
                        <div className="pl-11 space-y-2 border-l-2 border-blue-200 dark:border-blue-800 ml-1">
                          {c.replies?.map((r) => (
                            <div key={r.id} className="flex gap-2 py-1 pl-2">
                              <div className={cn("shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium", getAvatarColor(r.user.name).bg, getAvatarColor(r.user.name).text)}>
                                {r.user.name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm md:text-xs text-muted-foreground">
                                  {r.user.name} · {format(new Date(r.createdAt), "MMM d, HH:mm")}
                                </p>
                                <p className="text-base md:text-sm mt-0.5 whitespace-pre-wrap">{r.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                })()
              )}
            </div>
          </ScrollArea>
          <div className="space-y-2 mt-3 shrink-0">
            <Select onValueChange={(v) => setCommentText((prev) => (prev ? `${prev}\n${v}` : v))}>
              <SelectTrigger className="h-10 md:h-9 text-base md:text-sm">
                <SelectValue placeholder="Quick comment..." />
              </SelectTrigger>
              <SelectContent>
                {PRESET_COMMENTS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {replyingToId && (
              <p className="text-sm md:text-xs text-muted-foreground">
                Replying to comment · <Button variant="link" className="h-auto p-0 text-sm md:text-xs" onClick={() => setReplyingToId(null)}>Cancel</Button>
              </p>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleAddComment()
                  }
                }}
                className="min-h-[64px] md:min-h-[60px] resize-none flex-1 text-base md:text-sm"
                rows={2}
              />
              <Button
                size="sm"
                className="h-10 md:h-9 text-sm"
                onClick={handleAddComment}
                disabled={!commentText.trim() || createComment.isPending}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="md:w-72 shrink-0 p-4 space-y-4 bg-muted/30 border-l border-border">
        <div className="space-y-4">
          <h3 className="text-base md:text-sm font-semibold text-foreground border-b border-border pb-2">Details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-base md:text-sm">
              <CalendarIcon className="h-5 w-5 md:h-4 md:w-4 shrink-0 text-purple-600 dark:text-purple-400" />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-left font-medium text-purple-700 dark:text-purple-300 hover:underline focus:outline-none focus:underline"
                  >
                    {dueDateValue
                      ? format(dueDateValue, "MMM d, yyyy")
                      : "Set due date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={(pendingDueDate ?? dueDateValue) ?? undefined}
                    onSelect={(d) => {
                      const date = d ?? null
                      if (canEditDueDateDirectly) {
                        handleDueDateChange(date)
                      } else {
                        setPendingDueDate(date)
                        if (!date) setDueDateChangeReason("")
                      }
                    }}
                    initialFocus
                  />
                  {(dueDateValue || pendingDueDate) && canEditDueDateDirectly && (
                    <div className="border-t p-2">
                      <button
                        type="button"
                        className="text-xs text-destructive hover:underline"
                        onClick={() => handleDueDateChange(null)}
                      >
                        Clear date
                      </button>
                    </div>
                  )}
                  {(dueDateValue || pendingDueDate) && !canEditDueDateDirectly && (
                    <div className="border-t p-2">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:underline"
                        onClick={() => { setPendingDueDate(null); setDueDateChangeReason("") }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            {pendingDueDate != null && !canEditDueDateDirectly && (
              <div className="rounded-md border bg-muted/30 p-2 space-y-2">
                <p className="text-xs font-medium">Request due date change</p>
                <p className="text-xs text-muted-foreground">
                  New date: {format(pendingDueDate, "MMM d, yyyy")}. Reason is required.
                </p>
                <Textarea
                  placeholder="Reason for change (required)"
                  value={dueDateChangeReason}
                  onChange={(e) => setDueDateChangeReason(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleRequestDueDateChange}
                    disabled={!dueDateChangeReason.trim() || updateTask.isPending}
                  >
                    Request change
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setPendingDueDate(null); setDueDateChangeReason("") }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
          {task.assignee && (
            <div className="flex items-center gap-3 text-base md:text-sm">
              <User className="h-5 w-5 md:h-4 md:w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-700 dark:text-blue-300">{task.assignee.name}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-base md:text-sm">
            <PriorityIcon
              priority={priorityValue}
              className={cn(
                "h-5 w-5 md:h-4 md:w-4 shrink-0",
                priorityValue === "HIGH" && "text-orange-600 dark:text-orange-400",
                priorityValue === "URGENT" && "text-red-600 dark:text-red-400",
                priorityValue === "MEDIUM" && "text-amber-600 dark:text-amber-400",
                priorityValue === "LOW" && "text-blue-600 dark:text-blue-400",
                (priorityValue === "GENERAL" || !priorityValue) && "text-muted-foreground"
              )}
            />
            <select
              value={priorityValue}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="flex-1 rounded-md border-2 border-border bg-background px-2 py-1.5 text-base md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {task.project && (
            <div className="flex items-center gap-3 text-base md:text-sm">
              <FolderOpen className="h-5 w-5 md:h-4 md:w-4 shrink-0 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-purple-700 dark:text-purple-300">{task.project.name}</span>
            </div>
          )}
          {task.createdBy && (
            <div className="flex items-center gap-2 text-base md:text-sm text-muted-foreground">
              <span>Created by {task.createdBy.name}</span>
            </div>
          )}
          {task.status === "COMPLETED" && task.grade && (
            <CompletionFeedback
              grade={task.grade}
              comments={task.completionComments}
              completedBy={task.completedBy}
              completedAt={task.completedAt}
            />
          )}
          <div className="flex items-center gap-2 text-sm md:text-xs text-muted-foreground">
            <Clock className="h-4 w-4 md:h-3 md:w-3" />
            <span>Updated {format(new Date(task.updatedAt), "MMM d")}</span>
          </div>
        </div>

        <Separator className="my-2" />

        <MarkCompleteDrawer
          task={task.status === "EMPLOYEE_DONE" ? task : null}
          open={markCompleteDrawerOpen}
          onOpenChange={setMarkCompleteDrawerOpen}
          onSuccess={() => {
            setStatusValue("COMPLETED")
            refetchActivity()
          }}
        />

        {task.status === "EMPLOYEE_DONE" && canReviewTask && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-2">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Pending your review</p>
            <Button size="sm" className="mt-2" onClick={() => setMarkCompleteDrawerOpen(true)}>
              Review task
            </Button>
          </div>
        )}

        {canReviewTask && task.assigneeId && (() => {
          const overdue = task.dueDate && new Date(task.dueDate) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          const rejected = (task.rejectionCount ?? 0) >= 2
          const lowRating = task.grade && parseInt(task.grade) <= 2
          if (overdue || rejected || lowRating) {
            return (
              <div className="rounded-lg border border-muted bg-muted/30 p-2">
                <p className="text-xs font-medium text-muted-foreground">Consider issuing a warning</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {overdue && "Task overdue by more than 3 days."}
                  {rejected && " Task rejected multiple times."}
                  {lowRating && ` Task completed with low rating (${task.grade}/5).`}
                </p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setIssueWarningOpen(true)}>
                  Issue warning
                </Button>
              </div>
            )
          }
          return null
        })()}

        <IssueWarningDialog
          open={issueWarningOpen}
          onOpenChange={setIssueWarningOpen}
          employeeId={task.assigneeId}
          employeeName={task.assignee?.name}
          taskId={task.id}
          taskTitle={task.title}
        />

        <Dialog open={showCompletionFeedbackModal} onOpenChange={setShowCompletionFeedbackModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Task completed</DialogTitle>
            </DialogHeader>
            {task && task.grade && (
              <CompletionFeedback
                grade={task.grade}
                comments={task.completionComments}
                completedBy={task.completedBy}
                completedAt={task.completedAt}
              />
            )}
            <Button onClick={() => setShowCompletionFeedbackModal(false)}>Close</Button>
          </DialogContent>
        </Dialog>

        <div className="space-y-2 border-t border-border pt-3">
          <h3 className="text-base md:text-sm font-semibold text-foreground">Activity</h3>
          {activity.length === 0 ? (
            <p className="text-sm md:text-xs text-muted-foreground">No activity yet.</p>
          ) : (
            <ScrollArea className="max-h-[200px]">
              <ul className="space-y-2 text-sm md:text-xs">
                {activity.map((a) => {
                  const colors = ACTIVITY_COLORS[a.action] ?? { border: "border-border", bg: "bg-background/50", icon: "text-muted-foreground" }
                  return (
                    <li key={a.id} className={cn("flex flex-col gap-0.5 rounded-md border-l-2 px-2.5 py-1.5", colors.border, colors.bg)}>
                      <span className={cn("font-semibold", colors.icon)}>
                        {ACTIVITY_LABELS[a.action] ?? a.action}
                      </span>
                      <span className="text-foreground/80">
                        {a.user.name}
                        {a.details ? ` · ${formatActivityDetails(a.action, a.details)}` : ""}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(a.createdAt), "MMM d, HH:mm")}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  )
}

export function TaskDetailModal({ open, onOpenChange, taskId }: TaskDetailModalProps) {
  const isMobile = useIsMobile()

  if (!taskId) return null

  const content = (
    <TaskDetailContent
      taskId={taskId}
      onClose={() => onOpenChange(false)}
    />
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full max-w-full sm:max-w-full p-0 flex flex-col"
        >
          <SheetHeader className="p-4 border-b shrink-0">
            <SheetTitle className="sr-only">Task details</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-auto">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] min-h-[80vh] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 shrink-0">
          <DialogTitle className="sr-only">Task details</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
}

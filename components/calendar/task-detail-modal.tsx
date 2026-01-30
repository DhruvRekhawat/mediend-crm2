"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { Calendar, Clock, User, CheckCircle, XCircle, Loader } from "lucide-react"
import { useTask } from "@/hooks/use-tasks"
import { Skeleton } from "@/components/ui/skeleton"

interface TaskDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string | null
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }
> = {
  PENDING: { label: "Pending", variant: "secondary", icon: Clock },
  IN_PROGRESS: { label: "In Progress", variant: "default", icon: Loader },
  COMPLETED: { label: "Completed", variant: "outline", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", variant: "destructive", icon: XCircle },
}

const PRIORITY_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  LOW: { label: "Low", variant: "secondary" },
  MEDIUM: { label: "Medium", variant: "default" },
  HIGH: { label: "High", variant: "outline" },
  URGENT: { label: "Urgent", variant: "destructive" },
}

export function TaskDetailModal({ open, onOpenChange, taskId }: TaskDetailModalProps) {
  const { data: task, isLoading } = useTask(taskId)

  if (!taskId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <>
                {task?.title}
                {task && (
                  <>
                    <Badge variant={STATUS_CONFIG[task.status]?.variant ?? "secondary"}>
                      {STATUS_CONFIG[task.status]?.label ?? task.status}
                    </Badge>
                    <Badge variant={PRIORITY_CONFIG[task.priority]?.variant ?? "secondary"}>
                      {PRIORITY_CONFIG[task.priority]?.label ?? task.priority}
                    </Badge>
                  </>
                )}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isLoading ? (
              <Skeleton className="h-4 w-32 mt-2" />
            ) : task ? (
              `Created ${format(new Date(task.createdAt), "MMM d, yyyy")}`
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : task ? (
          <div className="space-y-4 py-4">
            {task.description && (
              <div>
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="text-sm font-medium">
                    {task.dueDate
                      ? format(new Date(task.dueDate), "MMM d, yyyy HH:mm")
                      : "No due date"}
                  </p>
                </div>
              </div>

              {task.assignee && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assignee</p>
                    <p className="text-sm font-medium">{task.assignee.name}</p>
                  </div>
                </div>
              )}

              {task.createdBy && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created By</p>
                    <p className="text-sm font-medium">{task.createdBy.name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium">
                    {format(new Date(task.updatedAt), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-4">Task not found</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { useCreateTask, useUpdateTask, type Task } from "@/hooks/use-tasks"
import { format } from "date-fns"
import { toast } from "sonner"

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  employees?: { id: string; name: string; email: string }[]
  onSuccess?: () => void
}

export function TaskForm({
  open,
  onOpenChange,
  task,
  employees = [],
  onSuccess,
}: TaskFormProps) {
  const { user } = useAuth()
  const isMDOrAdmin = user?.role === "MD" || user?.role === "ADMIN"

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM")
  const [status, setStatus] = useState<"PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED">("PENDING")
  const [assigneeId, setAssigneeId] = useState("")

  const createMutation = useCreateTask()
  const updateMutation = useUpdateTask()

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? "")
      setDueDate(task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd'T'HH:mm") : "")
      setPriority(task.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT")
      setStatus(task.status as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED")
      setAssigneeId(task.assigneeId)
    } else {
      setTitle("")
      setDescription("")
      setDueDate("")
      setPriority("MEDIUM")
      setStatus("PENDING")
      setAssigneeId(user?.id ?? "")
    }
  }, [task, user?.id, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }

    const effectiveAssigneeId = assigneeId || user?.id
    if (!effectiveAssigneeId) {
      toast.error("Assignee is required")
      return
    }

    try {
      if (task) {
        await updateMutation.mutateAsync({
          id: task.id,
          data: {
            title: title.trim(),
            description: description.trim() || null,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            priority,
            status,
          },
        })
        toast.success("Task updated")
      } else {
        await createMutation.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          priority,
          assigneeId: effectiveAssigneeId,
        })
        toast.success("Task created")
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save task")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Add Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description"
              rows={3}
              className="resize-none"
            />
          </div>
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as "LOW" | "MEDIUM" | "HIGH" | "URGENT")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {task && (
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {isMDOrAdmin && employees.length > 0 && (
            <div>
              <Label htmlFor="assignee">Assign to</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {task ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

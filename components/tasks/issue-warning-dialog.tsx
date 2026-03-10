"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateWarning, type WarningType } from "@/hooks/use-tasks"
import { toast } from "sonner"

const WARNING_TYPES: { value: WarningType; label: string }[] = [
  { value: "REPEATED_DEADLINE_MISS", label: "Repeated deadline miss" },
  { value: "LOW_QUALITY_WORK", label: "Low quality work" },
  { value: "UNRESPONSIVE", label: "Unresponsive" },
  { value: "TASK_ABANDONMENT", label: "Task abandonment" },
  { value: "OTHER", label: "Other" },
]

interface IssueWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-filled when opening from a task or team member context */
  employeeId: string
  employeeName?: string
  /** Optional task to link the warning to */
  taskId?: string | null
  taskTitle?: string
  onSuccess?: () => void
}

export function IssueWarningDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  taskId,
  taskTitle,
  onSuccess,
}: IssueWarningDialogProps) {
  const [type, setType] = useState<WarningType | "">("")
  const [note, setNote] = useState("")
  const createWarning = useCreateWarning()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type || !note.trim()) {
      toast.error("Please select a type and enter a note")
      return
    }
    try {
      await createWarning.mutateAsync({
        employeeId,
        taskId: taskId ?? undefined,
        type: type as WarningType,
        note: note.trim(),
      })
      toast.success("Warning issued")
      setType("")
      setNote("")
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error("Failed to issue warning")
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setType("")
      setNote("")
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue warning</DialogTitle>
        </DialogHeader>
        {employeeName && (
          <p className="text-sm text-muted-foreground">
            Employee: <span className="font-medium text-foreground">{employeeName}</span>
            {taskTitle && (
              <>
                {" · Task: "}
                <span className="font-medium text-foreground">{taskTitle}</span>
              </>
            )}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Type</label>
            <Select value={type} onValueChange={(v) => setType(v as WarningType)} required>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {WARNING_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Note</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe the reason for this warning..."
              className="min-h-[100px] resize-none"
              rows={4}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!type || !note.trim() || createWarning.isPending}>
              Issue warning
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

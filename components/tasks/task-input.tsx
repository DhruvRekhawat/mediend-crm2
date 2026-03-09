"use client"

import { useState, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarIcon, Flag, User, FolderPlus, SendHorizonal } from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import {
  useCreateTask,
  useAssignableUsers,
  useTaskProjects,
  useCreateTaskProject,
  type CreateTaskInput,
} from "@/hooks/use-tasks"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const PRIORITIES = [
  { value: "GENERAL", label: "No priority", color: "text-muted-foreground" },
  { value: "LOW", label: "Low", color: "text-blue-600" },
  { value: "MEDIUM", label: "Medium", color: "text-amber-600" },
  { value: "HIGH", label: "High", color: "text-orange-600" },
  { value: "URGENT", label: "Urgent", color: "text-red-600" },
] as const

interface TaskInputProps {
  onSuccess?: () => void
  className?: string
  /** When true, input is anchored at bottom (e.g. mobile) */
  bottomAnchored?: boolean
  /** Pre-fill assignee (e.g. from team member detail); hides assignee selector */
  prefillAssignee?: { id: string; name: string }
  /** When true (MD role), assignee is required and "Me" is not an option */
  isMD?: boolean
}

export function TaskInput({
  onSuccess,
  className,
  bottomAnchored,
  prefillAssignee,
  isMD = false,
}: TaskInputProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [priority, setPriority] = useState<CreateTaskInput["priority"]>("MEDIUM")
  const [assigneeId, setAssigneeId] = useState<string>(() => {
    if (prefillAssignee) return prefillAssignee.id
    if (isMD) return ""
    return user?.id ?? ""
  })
  const [projectId, setProjectId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const createMutation = useCreateTask()
  const { data: assignableUsers = [] } = useAssignableUsers()
  const { data: projects = [], refetch: refetchProjects } = useTaskProjects()
  const createProjectMutation = useCreateTaskProject()

  const effectiveAssigneeId = prefillAssignee ? prefillAssignee.id : assigneeId
  const assigneeRequired = isMD || !!prefillAssignee
  const canSubmit =
    !!title.trim() &&
    !createMutation.isPending &&
    (!assigneeRequired || !!effectiveAssigneeId)

  const reset = useCallback(() => {
    setTitle("")
    setDueDate(undefined)
    setPriority("MEDIUM")
    setAssigneeId(prefillAssignee ? prefillAssignee.id : isMD ? "" : user?.id ?? "")
    setProjectId(null)
    setNewProjectName("")
    setExpanded(false)
    inputRef.current?.focus()
  }, [user?.id, isMD, prefillAssignee])

  const handleSubmit = async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    if (assigneeRequired && !effectiveAssigneeId) {
      toast.error("Please select a person to assign the task to.")
      return
    }

    const payload: CreateTaskInput = {
      title: trimmed,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      priority,
      assigneeId: effectiveAssigneeId || undefined,
      projectId: projectId || undefined,
    }

    try {
      await createMutation.mutateAsync(payload)
      toast.success("Task added")
      reset()
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create task")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleCreateProject = async () => {
    const name = newProjectName.trim()
    if (!name) return
    try {
      const created = await createProjectMutation.mutateAsync({ name })
      setProjectId(created.id)
      setNewProjectName("")
      refetchProjects()
    } catch {
      toast.error("Failed to create project")
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-background shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-primary/20",
        bottomAnchored && "w-full md:rounded-none md:border-x-0 md:border-b-0 md:border-t",
        className
      )}
    >
      <div className="flex items-center gap-2 p-2">
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (!expanded && e.target.value) setExpanded(true)
          }}
          onFocus={() => setExpanded(true)}
          onBlur={() => {
            if (!title.trim()) setExpanded(false)
          }}
          onKeyDown={handleKeyDown}
          placeholder="What would you like to do?"
          className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
          aria-label="New task title"
        />
        <Button
          type="button"
          size="icon"
          variant="default"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="shrink-0 h-9 w-9 rounded-full md:rounded-md"
          aria-label="Send"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>

      {expanded && (
        <div className="flex flex-nowrap items-center gap-2 border-t px-2 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground"
              >
                <CalendarIcon className="h-4 w-4" />
                {dueDate ? format(dueDate, "MMM d") : "Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Select
            value={priority ?? "MEDIUM"}
            onValueChange={(v) => setPriority(v as CreateTaskInput["priority"])}
          >
            <SelectTrigger className="h-8 w-[120px] gap-1.5">
              <Flag className="h-4 w-4" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <span className={cn(p.color)}>{p.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!prefillAssignee && (
            <Select
              value={assigneeId || (isMD ? "__none__" : "me")}
              onValueChange={(v) => {
                if (v === "__none__") setAssigneeId("")
                else setAssigneeId(v === "me" ? user?.id ?? "" : v)
              }}
            >
              <SelectTrigger className="h-8 min-w-[140px] w-[140px] gap-1.5 shrink-0">
                <User className="h-4 w-4" />
                <SelectValue placeholder={isMD ? "Select person" : "Assign to"} />
              </SelectTrigger>
              <SelectContent>
                {isMD && (
                  <SelectItem value="__none__" className="text-muted-foreground">
                    Select person
                  </SelectItem>
                )}
                {!isMD && user && (
                  <SelectItem key={user.id} value={user.id}>
                    Me
                  </SelectItem>
                )}
                {assignableUsers
                  .filter((u) => !isMD || u.id !== user?.id)
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
          {prefillAssignee && (
            <span className="h-8 inline-flex items-center gap-1.5 rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground shrink-0">
              <User className="h-4 w-4" />
              {prefillAssignee.name}
            </span>
          )}

          <Select
            value={projectId ?? "none"}
            onValueChange={(v) => setProjectId(v === "none" ? null : v)}
          >
            <SelectTrigger className="h-8 w-[130px] gap-1.5">
              <FolderPlus className="h-4 w-4" />
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
                <FolderPlus className="h-4 w-4" />
                New project
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="flex gap-2">
                <Input
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateProject())}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8"
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || createProjectMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  )
}

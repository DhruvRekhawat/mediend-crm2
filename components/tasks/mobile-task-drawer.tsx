"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DrawerDatePicker } from "./drawer-date-picker"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CalendarIcon,
  ChevronRight,
  FolderPlus,
  User,
  X,
  Search,
  Check,
} from "lucide-react"
import { PriorityIcon } from "./priority-icon"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { getAvatarColor } from "@/lib/avatar-colors"
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
  { value: "GENERAL" as const, label: "No priority", color: "text-muted-foreground" },
  { value: "LOW" as const, label: "Low", color: "text-blue-600" },
  { value: "MEDIUM" as const, label: "Medium", color: "text-amber-600" },
  { value: "HIGH" as const, label: "High", color: "text-orange-600" },
  { value: "URGENT" as const, label: "Urgent", color: "text-red-600" },
]

const priorityColorMap: Record<string, string> = {
  GENERAL: "text-muted-foreground",
  LOW: "text-blue-600",
  MEDIUM: "text-amber-600",
  HIGH: "text-orange-600",
  URGENT: "text-red-600",
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || "?"
}

export interface MobileTaskDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  prefillAssignee?: { id: string; name: string }
  isMD?: boolean
}

type PickerType = "assignee" | "date" | "priority" | "project" | null

export function MobileTaskDrawer({
  open,
  onOpenChange,
  onSuccess,
  prefillAssignee,
  isMD = false,
}: MobileTaskDrawerProps) {
  const { user } = useAuth()
  const titleRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [priority, setPriority] = useState<CreateTaskInput["priority"]>("MEDIUM")
  const [assigneeId, setAssigneeId] = useState<string>(() => {
    if (prefillAssignee) return prefillAssignee.id
    if (isMD) return ""
    return user?.id ?? ""
  })
  const [projectId, setProjectId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState("")
  const [pickerOpen, setPickerOpen] = useState<PickerType>(null)
  const [assigneeSearch, setAssigneeSearch] = useState("")

  const createMutation = useCreateTask()
  const { data: assignableUsers = [] } = useAssignableUsers()
  const { data: projects = [], refetch: refetchProjects } = useTaskProjects()
  const createProjectMutation = useCreateTaskProject()

  const assigneeOptions = useMemo(() => {
    const list = isMD
      ? assignableUsers.filter((u) => u.id !== user?.id)
      : assignableUsers
    if (!assigneeSearch.trim()) return list
    const q = assigneeSearch.trim().toLowerCase()
    return list.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    )
  }, [assignableUsers, assigneeSearch, isMD, user?.id])

  const effectiveAssigneeId = prefillAssignee ? prefillAssignee.id : assigneeId
  const assigneeRequired = isMD || !!prefillAssignee

  const selectedAssigneeName = effectiveAssigneeId
    ? effectiveAssigneeId === user?.id
      ? "Me"
      : assignableUsers.find((u) => u.id === effectiveAssigneeId)?.name ?? prefillAssignee?.name ?? "Add assignees"
    : "Add assignees"

  const selectedPriority = PRIORITIES.find((p) => p.value === (priority ?? "MEDIUM"))
  const selectedProjectName = projectId ? projects.find((p) => p.id === projectId)?.name : null

  const canSubmit =
    !!title.trim() &&
    !createMutation.isPending &&
    (!assigneeRequired || !!effectiveAssigneeId)

  const reset = useCallback(() => {
    setTitle("")
    setDescription("")
    setDueDate(undefined)
    setPriority("MEDIUM")
    setAssigneeId(prefillAssignee ? prefillAssignee.id : isMD ? "" : user?.id ?? "")
    setProjectId(null)
    setNewProjectName("")
    setPickerOpen(null)
    setAssigneeSearch("")
  }, [user?.id, isMD, prefillAssignee])

  useEffect(() => {
    if (open) {
      reset()
      setTimeout(() => titleRef.current?.focus(), 300)
    }
  }, [open, reset])

  const handleSubmit = async () => {
    const trimmed = title.trim()
    if (!trimmed) return
    if (assigneeRequired && !effectiveAssigneeId) {
      toast.error("Please select a person to assign the task to.")
      return
    }

    const payload: CreateTaskInput = {
      title: trimmed,
      description: description.trim() || undefined,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      priority,
      assigneeId: effectiveAssigneeId || undefined,
      projectId: projectId || undefined,
    }

    try {
      await createMutation.mutateAsync(payload)
      toast.success("Task added")
      onOpenChange(false)
      reset()
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create task")
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
      setPickerOpen(null)
    } catch {
      toast.error("Failed to create project")
    }
  }

  const RowButton = ({
    icon: Icon,
    label,
    value,
    accent,
    disabled = false,
    onClick,
  }: {
    icon: React.ElementType
    label: string
    value?: string | null
    accent?: boolean
    disabled?: boolean
    onClick: () => void
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-[52px] w-full items-center gap-4 border-b border-border py-4 px-4 text-left text-base touch-manipulation",
        !disabled && "active:bg-muted/50",
        disabled && "cursor-default",
        accent && "text-primary font-medium"
      )}
    >
      <Icon className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{value ?? label}</span>
      {!disabled && <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />}
    </button>
  )

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom" repositionInputs={false}>
        <DrawerContent
          className={cn(
            "inset-x-0 bottom-0 mt-0 flex h-dvh max-h-dvh flex-col rounded-t-2xl border-t",
            "[&>div:first-child]:hidden"
          )}
        >
          <DrawerHeader className="flex flex-row items-center justify-between border-b border-border py-4 px-4">
            <DrawerTitle className="text-xl font-semibold">New Task</DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col pb-4">
              <div className="border-b border-border px-4 py-4">
                <Input
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task name"
                  className="text-xl font-semibold border-0 px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground min-h-[48px]"
                  aria-label="Task name"
                />
              </div>
              <div className="border-b border-border px-4 py-3">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="min-h-[80px] resize-none border-0 px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground text-base"
                  aria-label="Description"
                />
              </div>

              <RowButton
                icon={User}
                label="Add assignees"
                value={effectiveAssigneeId ? selectedAssigneeName : undefined}
                accent={!!effectiveAssigneeId}
                disabled={!!prefillAssignee}
                onClick={() => {
                  if (prefillAssignee) return
                  setPickerOpen("assignee")
                }}
              />
              <RowButton
                icon={CalendarIcon}
                label="Set dates"
                value={dueDate ? format(dueDate, "MMM d, yyyy") : undefined}
                accent={!!dueDate}
                onClick={() => setPickerOpen("date")}
              />
              <RowButton
                icon={({ className }) => (
                  <PriorityIcon
                    priority={priority ?? "MEDIUM"}
                    className={cn(
                      "h-6 w-6 shrink-0",
                      (priority ?? "MEDIUM") !== "MEDIUM" ? priorityColorMap[priority ?? "MEDIUM"] : "text-muted-foreground",
                      className
                    )}
                  />
                )}
                label="Priority"
                value={selectedPriority?.label}
                accent={(priority ?? "MEDIUM") !== "MEDIUM"}
                onClick={() => setPickerOpen("priority")}
              />
              <RowButton
                icon={FolderPlus}
                label="Project"
                value={selectedProjectName ?? undefined}
                accent={!!selectedProjectName}
                onClick={() => setPickerOpen("project")}
              />
            </div>
          </ScrollArea>

          <DrawerFooter className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              size="lg"
              className="w-full text-base font-medium h-12"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              Create
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Assignee picker */}
      <Sheet open={pickerOpen === "assignee"} onOpenChange={(o) => !o && setPickerOpen(null)}>
        <SheetContent
          side="right"
          className="w-full max-w-full sm:max-w-full flex flex-col p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="text-xl font-semibold pr-8">Assignees</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search people and teams..."
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                className="h-12 pl-10 text-base"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-2 pb-4">
              <p className="text-sm font-medium text-muted-foreground px-2 py-2">People</p>
              {!isMD && user && (
                <button
                  type="button"
                  className={cn(
                    "flex w-full min-h-[52px] items-center gap-3 rounded-lg px-3 py-3 text-base text-left touch-manipulation active:bg-muted/50",
                    effectiveAssigneeId === user.id && "bg-muted"
                  )}
                  onClick={() => {
                    setAssigneeId(user.id)
                    setPickerOpen(null)
                  }}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className={cn(getAvatarColor(user.name ?? "Me").bg, getAvatarColor(user.name ?? "Me").text, "text-sm font-medium")}>
                      {getInitials(user.name ?? "Me")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">Me</span>
                  {effectiveAssigneeId === user.id && <Check className="h-5 w-5 shrink-0 text-primary" />}
                </button>
              )}
              {isMD && (
                <button
                  type="button"
                  className={cn(
                    "flex w-full min-h-[52px] items-center gap-3 rounded-lg px-3 py-3 text-base text-left touch-manipulation active:bg-muted/50",
                    !effectiveAssigneeId && "bg-muted"
                  )}
                  onClick={() => {
                    setAssigneeId("")
                    setPickerOpen(null)
                  }}
                >
                  <span className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    —
                  </span>
                  <span className="flex-1 truncate">Select person</span>
                  {!effectiveAssigneeId && <Check className="h-5 w-5 shrink-0 text-primary" />}
                </button>
              )}
              {assigneeOptions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className={cn(
                    "flex w-full min-h-[52px] items-center gap-3 rounded-lg px-3 py-3 text-base text-left touch-manipulation active:bg-muted/50",
                    effectiveAssigneeId === u.id && "bg-muted"
                  )}
                  onClick={() => {
                    setAssigneeId(u.id)
                    setPickerOpen(null)
                  }}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className={cn(getAvatarColor(u.name ?? u.email ?? "?").bg, getAvatarColor(u.name ?? u.email ?? "?").text, "text-sm font-medium")}>
                      {getInitials(u.name ?? u.email ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">{u.name ?? u.email}</span>
                  {effectiveAssigneeId === u.id && <Check className="h-5 w-5 shrink-0 text-primary" />}
                </button>
              ))}
              {assigneeOptions.length === 0 && !user && (
                <p className="px-3 py-6 text-center text-base text-muted-foreground">No one found.</p>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Date picker */}
      <Sheet open={pickerOpen === "date"} onOpenChange={(o) => !o && setPickerOpen(null)}>
        <SheetContent side="right" className="w-full max-w-full sm:max-w-full flex flex-col p-0 gap-0">
          <SheetHeader className="border-b px-3 py-4 shrink-0">
            <SheetTitle className="text-xl font-semibold pr-8">Set date</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-2 py-3 pb-6">
              <DrawerDatePicker
                selected={dueDate}
                onSelect={(d) => {
                  setDueDate(d ?? undefined)
                  setPickerOpen(null)
                }}
                onClear={() => {
                  setDueDate(undefined)
                  setPickerOpen(null)
                }}
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Priority picker */}
      <Sheet open={pickerOpen === "priority"} onOpenChange={(o) => !o && setPickerOpen(null)}>
        <SheetContent side="right" className="w-full max-w-full sm:max-w-full flex flex-col p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="text-xl font-semibold pr-8">Priority</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col p-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                className={cn(
                  "flex min-h-[52px] w-full items-center gap-3 rounded-lg px-4 py-3 text-base text-left touch-manipulation active:bg-muted/50",
                  priority === p.value && "bg-muted"
                )}
                onClick={() => {
                  setPriority(p.value)
                  setPickerOpen(null)
                }}
              >
                <PriorityIcon priority={p.value} className={cn("h-5 w-5 shrink-0", priorityColorMap[p.value] ?? "text-muted-foreground")} />
                <span className={cn("flex-1", priorityColorMap[p.value] ?? "text-muted-foreground")}>{p.label}</span>
                {priority === p.value && <Check className="h-5 w-5 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Project picker */}
      <Sheet open={pickerOpen === "project"} onOpenChange={(o) => !o && setPickerOpen(null)}>
        <SheetContent side="right" className="w-full max-w-full sm:max-w-full flex flex-col p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="text-xl font-semibold pr-8">Project</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col p-2 pb-4">
              <button
                type="button"
                className={cn(
                  "flex min-h-[52px] w-full items-center gap-3 rounded-lg px-4 py-3 text-base text-left touch-manipulation active:bg-muted/50",
                  !projectId && "bg-muted"
                )}
                onClick={() => {
                  setProjectId(null)
                  setPickerOpen(null)
                }}
              >
                <span className="flex-1">No project</span>
                {!projectId && <Check className="h-5 w-5 shrink-0 text-primary" />}
              </button>
              {projects.map((p) => {
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={cn(
                      "flex min-h-[52px] w-full items-center gap-3 rounded-lg px-4 py-3 text-base text-left touch-manipulation active:bg-muted/50",
                      projectId === p.id && "bg-muted"
                    )}
                    onClick={() => {
                      setProjectId(p.id)
                      setPickerOpen(null)
                    }}
                  >
                    <span className="flex-1 truncate">{p.name}</span>
                    {projectId === p.id && <Check className="h-5 w-5 shrink-0 text-primary" />}
                  </button>
                )
              })}
              <div className="border-t border-border mt-2 pt-4 px-2 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Create new project</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="flex-1 h-11 text-base"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateProject())}
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim() || createProjectMutation.isPending}
                    className="h-11 px-4"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}

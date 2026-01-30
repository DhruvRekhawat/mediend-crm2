"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, Trash2, Calendar } from "lucide-react"
import type { Task } from "@/hooks/use-tasks"
import { TaskForm } from "./task-form"

interface TaskListProps {
  tasks: Task[]
  isLoading?: boolean
  onCreateTask?: () => void
  onEditTask?: (task: Task) => void
  onDeleteTask?: (task: Task) => void
  showAddButton?: boolean
}

const PRIORITY_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  LOW: "secondary",
  MEDIUM: "default",
  HIGH: "outline",
  URGENT: "destructive",
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
}

export function TaskList({
  tasks,
  isLoading,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  showAddButton = true,
}: TaskListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const filteredTasks =
    statusFilter === "all"
      ? tasks
      : tasks.filter((t) => t.status === statusFilter)

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {showAddButton && (
          <Button onClick={() => { setEditingTask(null); setFormOpen(true); onCreateTask?.() }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-center py-8">Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tasks found</p>
            {showAddButton && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => { setEditingTask(null); setFormOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add your first task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:bg-muted/50 transition-colors">
              <CardHeader className="py-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-medium truncate">
                      {task.title}
                    </CardTitle>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={PRIORITY_COLORS[task.priority] ?? "secondary"}>
                      {task.priority}
                    </Badge>
                    <Badge variant={STATUS_COLORS[task.status] ?? "secondary"}>
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {task.dueDate
                      ? `Due: ${format(new Date(task.dueDate), "MMM d, yyyy HH:mm")}`
                      : "No due date"}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(task)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {onDeleteTask && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDeleteTask(task)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <TaskForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingTask(null)
        }}
        task={editingTask}
        onSuccess={() => {
          setEditingTask(null)
          setFormOpen(false)
        }}
      />
    </div>
  )
}

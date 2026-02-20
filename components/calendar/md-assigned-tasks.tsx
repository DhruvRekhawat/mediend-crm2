"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Pencil, Trash2, Calendar, AlertTriangle, Clock, CheckCircle } from "lucide-react"
import { useTasks } from "@/hooks/use-tasks"
import { getTaskStatus, getTaskStatusColor, getTaskStatusBadge } from "@/lib/task-utils"
import { useAuth } from "@/hooks/use-auth"
import type { Task } from "@/hooks/use-tasks"

interface MDAssignedTasksProps {
  onEditTask?: (task: Task) => void
  onDeleteTask?: (task: Task) => void
}

const PRIORITY_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  GENERAL: "secondary",
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

export function MDAssignedTasks({
  onEditTask,
  onDeleteTask
}: MDAssignedTasksProps) {
  const { user } = useAuth()

  // Fetch all tasks
  const { data: allTasks = [], isLoading } = useTasks()

  const userId = user?.id
  // Filter tasks to only show those assigned by the current MD user
  const assignedTasks = useMemo(() => {
    if (!userId) return []

    return allTasks.filter(task =>
      task.createdById === userId
    ).map(task => ({
      ...task,
      statusType: getTaskStatus(task)
    }))
  }, [allTasks, userId])

  // Sort tasks by status priority (expired first, then due today, then expiring soon, then normal)
  const sortedTasks = useMemo(() => {
    const priorityOrder = { 'expired': 0, 'due-today': 1, 'expiring-soon': 2, 'normal': 3 }
    return assignedTasks.sort((a, b) =>
      priorityOrder[a.statusType] - priorityOrder[b.statusType]
    )
  }, [assignedTasks])

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'CANCELLED':
        return <AlertTriangle className="h-4 w-4 text-gray-600" />
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <Card className="overflow-hidden border-l-4 border-l-blue-500/60">
        <CardHeader className="bg-blue-500/5 border-b border-border/50 p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Assigned Tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <p className="text-muted-foreground text-sm">Loading tasks...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-l-4 border-l-blue-500/60">
      <CardHeader className="bg-blue-500/5 border-b border-border/50 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            Assigned Tasks
          </CardTitle>
          {sortedTasks.length > 0 && (
            <Badge className="bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-500/30 font-semibold text-xs">
              {sortedTasks.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              No tasks assigned by you yet
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] sm:h-[500px]">
            <div className="space-y-3">
              {sortedTasks.map((task) => {
                const statusBadge = getTaskStatusBadge(task.statusType)
                const statusColor = getTaskStatusColor(task.statusType)

                return (
                  <Card
                    key={task.id}
                    className={`overflow-hidden border-2 ${statusColor} hover:shadow-sm transition-all`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Task Title */}
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(task.status)}
                            <h4 className="font-medium text-sm text-foreground truncate">
                              {task.title}
                            </h4>
                          </div>

                          {/* Assignee and Priority */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">
                              {task.assignee?.name || 'Unknown'}
                            </span>
                            <Badge variant={PRIORITY_COLORS[task.priority] ?? "secondary"} className="text-xs">
                              {task.priority}
                            </Badge>
                          </div>

                          {/* Due Date */}
                          <div className="text-xs text-muted-foreground mb-2">
                            {task.dueDate
                              ? `Due: ${format(new Date(task.dueDate), "MMM d, yyyy")}`
                              : "No due date"
                            }
                          </div>

                          {/* Status Indicators */}
                          <div className="flex items-center gap-2">
                            <Badge variant={STATUS_COLORS[task.status] ?? "secondary"} className="text-xs">
                              {task.status.replace("_", " ")}
                            </Badge>
                            {statusBadge.label && (
                              <Badge variant={statusBadge.variant} className="text-xs">
                                {statusBadge.label}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1 shrink-0">
                          {onEditTask && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onEditTask(task)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
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
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
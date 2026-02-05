"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiDelete } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { Search, CheckCircle, XCircle, Clock, Plus, UserPlus } from "lucide-react"
import { TaskForm } from "@/components/calendar/task-form"
import { EmployeeDetailSheet } from "@/components/calendar/employee-detail-sheet"
import {
  useTaskApprovals,
  useApproveTaskDueDate,
  useDeleteTask,
  type Task,
} from "@/hooks/use-tasks"
import { toast } from "sonner"

interface Employee {
  id: string
  employeeCode: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  department: {
    id: string
    name: string
  } | null
}

interface WatchlistEmployee extends Employee {
  watchlistId?: string // The watchlist entry ID for deletion
}

interface WatchlistEntry {
  id: string
  employeeId: string
  employee: Employee
  createdAt: string
}

interface EmployeeStatus {
  status: 'in' | 'not-in' | 'leave'
  inTime: string | null
}

interface WatchlistData {
  employees: WatchlistEmployee[]
  status: Record<string, EmployeeStatus>
}

export default function MDTasksPage() {
  const queryClient = useQueryClient()
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [addEmployeeDialogOpen, setAddEmployeeDialogOpen] = useState(false)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set())
  const [addDialogSearchQuery, setAddDialogSearchQuery] = useState("")

  // Fetch watchlist with today's status
  const { data: watchlistData, isLoading: watchlistLoading } = useQuery<WatchlistData>({
    queryKey: ["md-watchlist"],
    queryFn: () => apiGet<WatchlistData>("/api/md/watchlist"),
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 60000, // Refetch every minute
  })

  // Fetch all employees for the add dialog
  const { data: allEmployees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => apiGet<Employee[]>("/api/employees"),
  })

  const { data: approvals = [], isLoading: approvalsLoading } = useTaskApprovals()
  const approveMutation = useApproveTaskDueDate()
  const deleteMutation = useDeleteTask()

  // Add employees to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: (employeeIds: string[]) =>
      apiPost("/api/md/watchlist", { employeeIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["md-watchlist"] })
      toast.success("Employees added to watchlist")
      setAddEmployeeDialogOpen(false)
      setSelectedEmployeeIds(new Set())
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add employees"),
  })

  // Remove employee from watchlist mutation
  const removeFromWatchlistMutation = useMutation({
    mutationFn: (watchlistEntryId: string) =>
      apiDelete(`/api/md/watchlist/${watchlistEntryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["md-watchlist"] })
      toast.success("Employee removed from watchlist")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove employee"),
  })

  const watchlistEmployees = watchlistData?.employees || []
  const statusMap = watchlistData?.status || {}

  // Filter watchlist employees by search
  const filteredWatchlistEmployees = useMemo(() => {
    if (!searchQuery.trim()) return watchlistEmployees
    const query = searchQuery.toLowerCase()
    return watchlistEmployees.filter((emp) =>
      emp.user.name.toLowerCase().includes(query) ||
      emp.user.email.toLowerCase().includes(query) ||
      emp.employeeCode.toLowerCase().includes(query) ||
      emp.department?.name.toLowerCase().includes(query)
    )
  }, [watchlistEmployees, searchQuery])

  // Filter employees for add dialog (exclude already in watchlist)
  const watchlistEmployeeIds = new Set(watchlistEmployees.map(emp => emp.id))
  const availableEmployees = useMemo(() => {
    const filtered = allEmployees.filter(emp => !watchlistEmployeeIds.has(emp.id))
    
    // Apply search filter
    if (!addDialogSearchQuery.trim()) return filtered
    
    const query = addDialogSearchQuery.toLowerCase()
    return filtered.filter(emp =>
      emp.user.name.toLowerCase().includes(query) ||
      emp.user.email.toLowerCase().includes(query) ||
      emp.employeeCode.toLowerCase().includes(query) ||
      emp.department?.name.toLowerCase().includes(query)
    )
  }, [allEmployees, watchlistEmployeeIds, addDialogSearchQuery])

  const employeeList = useMemo(() => {
    return allEmployees.map((e) => ({
      id: e.user.id,
      name: e.user.name,
      email: e.user.email,
    }))
  }, [allEmployees])

  const handleApprove = async (approvalId: string, status: "APPROVED" | "REJECTED") => {
    try {
      await approveMutation.mutateAsync({ id: approvalId, status })
      toast.success(status === "APPROVED" ? "Due date change approved" : "Due date change rejected")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    }
  }

  const handleDeleteTask = async (task: Task) => {
    if (!confirm("Delete this task?")) return
    try {
      await deleteMutation.mutateAsync(task.id)
      toast.success("Task deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  const handleAssignTask = () => {
    setEditingTask(null)
    setFormOpen(true)
  }

  const handleAddEmployees = () => {
    if (selectedEmployeeIds.size === 0) {
      toast.error("Please select at least one employee")
      return
    }
    addToWatchlistMutation.mutate(Array.from(selectedEmployeeIds))
  }

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev)
      if (next.has(employeeId)) next.delete(employeeId)
      else next.add(employeeId)
      return next
    })
  }

  const handleDialogClose = () => {
    setAddEmployeeDialogOpen(false)
    setSelectedEmployeeIds(new Set())
    setAddDialogSearchQuery("")
  }

  const getStatusColor = (status: 'in' | 'not-in' | 'leave') => {
    switch (status) {
      case 'in':
        return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
      case 'leave':
        return 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
      default:
        return 'bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-700'
    }
  }

  const getStatusBadge = (status: 'in' | 'not-in' | 'leave') => {
    switch (status) {
      case 'in':
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-xs">In</Badge>
      case 'leave':
        return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-xs">On Leave</Badge>
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 dark:bg-slate-800 dark:text-slate-400 text-xs">Not In</Badge>
    }
  }

  const departmentBadgeColor = (name: string) => {
    const palette = [
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
      "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
      "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800",
      "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800",
      "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
      "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
    ]
    let n = 0
    for (let i = 0; i < name.length; i++) n += name.charCodeAt(i)
    return palette[n % palette.length]
  }

  // Format time correctly - time is stored as UTC but represents IST wall-clock time
  const formatTime = (date: Date | string | null) => {
    if (!date) return 'N/A'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return 'N/A'
    
    // Use UTC getters directly since time is stored as UTC with IST clock components
    const hours = dateObj.getUTCHours()
    const minutes = dateObj.getUTCMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    const minutesStr = minutes.toString().padStart(2, '0')
    return `${hour12}:${minutesStr} ${ampm}`
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border bg-linear-to-br from-primary/5 via-primary/2 to-transparent p-4 sm:p-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Task Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor employees and manage tasks
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddEmployeeDialogOpen(true)} variant="outline" size="sm" className="shadow-sm">
            <UserPlus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Employee</span>
          </Button>
          <Button onClick={handleAssignTask} size="sm" className="shadow-sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Assign Task</span>
          </Button>
        </div>
      </div>

      {/* Employee Watchlist Grid */}
      <Card className="overflow-hidden border-l-4 border-l-primary/60">
        <CardHeader className="bg-primary/5 border-b border-border/50 p-4 sm:p-6">
          <div className="space-y-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Employee Watchlist</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Click on an employee to view their tasks and attendance
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {watchlistLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading watchlist...</p>
          ) : filteredWatchlistEmployees.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm mb-4">
                {searchQuery ? "No employees match your search" : "No employees in your watchlist yet"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setAddEmployeeDialogOpen(true)} variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Employees
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredWatchlistEmployees.map((emp) => {
                const empStatus = statusMap[emp.id]
                const status = empStatus?.status || 'not-in'
                const inTime = empStatus?.inTime

                return (
                  <div
                    key={emp.id}
                    className={`rounded-lg border-2 p-3 cursor-pointer transition-all hover:shadow-md ${getStatusColor(status)}`}
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <div className="space-y-2">
                      {/* Status badge */}
                      <div className="flex items-center justify-between gap-2">
                        {getStatusBadge(status)}
                        {emp.department && (
                          <Badge variant="outline" className={`text-xs px-2 py-0.5 whitespace-nowrap ${departmentBadgeColor(emp.department.name)}`}>
                            {emp.department.name}
                          </Badge>
                        )}
                      </div>

                      {/* Name */}
                      <div>
                        <p className="font-semibold text-sm truncate text-foreground">
                          {emp.user.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {emp.employeeCode}
                        </p>
                      </div>

                      {/* In time */}
                      {status === 'in' && inTime && (
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          ⏰ {formatTime(inTime)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Due Date Change Requests */}
      <Card className="overflow-hidden border-l-4 border-l-amber-500/60">
        <CardHeader className="bg-amber-500/5 border-b border-border/50 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                Due Date Change Requests
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Approve or reject employee requests to change task due dates
              </CardDescription>
            </div>
            {approvals.length > 0 && (
              <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/30 font-semibold text-xs">
                {approvals.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:pt-6">
          {approvalsLoading ? (
            <p className="text-muted-foreground text-sm py-4">Loading...</p>
          ) : approvals.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No pending due date change requests
            </p>
          ) : (
            <div className="space-y-3">
              {approvals.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-amber-500/3 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{a.task.title}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Requested by {a.requestedBy.name} · Assignee:{" "}
                        {a.task.assignee.name}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {a.oldDueDate
                          ? format(new Date(a.oldDueDate), "MMM d, yyyy")
                          : "None"}{" "}
                        →{" "}
                        {a.newDueDate
                          ? format(new Date(a.newDueDate), "MMM d, yyyy")
                          : "None"}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 h-8 px-2"
                        onClick={() => handleApprove(a.id, "APPROVED")}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 border-red-200 dark:border-red-800 h-8 px-2"
                        onClick={() => handleApprove(a.id, "REJECTED")}
                        disabled={approveMutation.isPending}
                      >
                        <XCircle className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Reject</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Detail Sheet */}
      <EmployeeDetailSheet
        open={!!selectedEmployee}
        onOpenChange={(open) => {
          if (!open) setSelectedEmployee(null)
        }}
        employee={selectedEmployee}
        onAssignTask={() => {
          if (selectedEmployee) {
            setEditingTask(null)
            setFormOpen(true)
          }
        }}
        onDeleteTask={handleDeleteTask}
      />

      {/* Task Form */}
      <TaskForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setEditingTask(null)
            setSelectedEmployee(null)
          }
        }}
        task={editingTask}
        employees={employeeList}
        defaultAssigneeId={selectedEmployee?.user.id}
        onSuccess={() => {
          setFormOpen(false)
          setEditingTask(null)
        }}
      />

      {/* Add Employee Dialog */}
      <Dialog open={addEmployeeDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0">
            <DialogTitle>Add Employees to Watchlist</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 pb-3 sm:pb-4 gap-3 sm:gap-4 overflow-hidden">
            {/* Search Bar */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees by name, code, email, or department..."
                value={addDialogSearchQuery}
                onChange={(e) => setAddDialogSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm w-full"
              />
            </div>

            {/* Selected count */}
            <div className="text-sm text-muted-foreground flex-shrink-0">
              {selectedEmployeeIds.size} {selectedEmployeeIds.size === 1 ? 'employee' : 'employees'} selected
            </div>

            {/* Employee List */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full rounded-md border">
                <div className="p-2">
                  {employeesLoading ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Loading employees...</p>
                  ) : availableEmployees.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {addDialogSearchQuery ? "No employees match your search" : "All employees are already in your watchlist"}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {availableEmployees.map((emp) => {
                        const isSelected = selectedEmployeeIds.has(emp.id)
                        return (
                          <div
                            key={emp.id}
                            onClick={() => toggleEmployeeSelection(emp.id)}
                            className={`
                              flex items-center gap-3 rounded-md px-3 py-2.5 cursor-pointer transition-colors
                              ${isSelected 
                                ? 'bg-primary/10 border-2 border-primary/30' 
                                : 'hover:bg-muted/60 border-2 border-transparent'
                              }
                            `}
                          >
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-sm font-medium truncate text-foreground">{emp.user.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {emp.employeeCode} · {emp.user.email}
                              </p>
                            </div>
                            {emp.department && (
                              <Badge 
                                variant="outline" 
                                className={`shrink-0 text-xs whitespace-nowrap ${departmentBadgeColor(emp.department.name)}`}
                              >
                                {emp.department.name}
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4 border-t flex-shrink-0 gap-2">
            <Button variant="outline" onClick={handleDialogClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleAddEmployees}
              disabled={selectedEmployeeIds.size === 0 || addToWatchlistMutation.isPending}
              className="w-full sm:w-auto"
            >
              Add {selectedEmployeeIds.size > 0 && `(${selectedEmployeeIds.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

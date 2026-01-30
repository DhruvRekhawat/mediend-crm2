"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { User, Search, CheckCircle, XCircle, Clock } from "lucide-react"
import { TaskList } from "@/components/calendar/task-list"
import { TaskForm } from "@/components/calendar/task-form"
import {
  usePendingTasks,
  useUpdateTask,
  useDeleteTask,
  useTaskApprovals,
  useApproveTaskDueDate,
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

interface AttendanceRecord {
  data: Array<{
    date: string
    inTime: string | null
    outTime: string | null
    workHours: number | null
    isLate: boolean
    employee: { user: { name: string } }
  }>
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export default function MDTasksPage() {
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const { data: employees = [], isLoading: employeesLoading } = useQuery<
    Employee[]
  >({
    queryKey: ["employees"],
    queryFn: () => apiGet<Employee[]>("/api/employees"),
  })

  const { data: pendingTasks = [], isLoading: pendingLoading } =
    usePendingTasks(selectedUserId || undefined)

  const selectedEmployeeForAttendance = employees.find(
    (e) => e.user.id === selectedUserId
  )
  const selectedEmployeeIdForAttendance = selectedEmployeeForAttendance?.id
  const { data: attendanceRes } = useQuery<AttendanceRecord>({
    queryKey: ["attendance", selectedEmployeeIdForAttendance],
    queryFn: () =>
      apiGet<AttendanceRecord>(
        `/api/attendance?employeeId=${selectedEmployeeIdForAttendance}&fromDate=${format(new Date(), "yyyy-MM-dd")}&toDate=${format(new Date(), "yyyy-MM-dd")}`
      ),
    enabled: !!selectedEmployeeIdForAttendance,
  })
  const attendance = attendanceRes?.data ?? []

  const filteredEmployees = employees.filter(
    (e) =>
      e.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const employeeList = filteredEmployees.map((e) => ({
    id: e.user.id,
    name: e.user.name,
    email: e.user.email,
  }))

  const selectedEmployee = selectedEmployeeForAttendance

  const updateMutation = useUpdateTask()
  const deleteMutation = useDeleteTask()
  const { data: approvals = [], isLoading: approvalsLoading } = useTaskApprovals()
  const approveMutation = useApproveTaskDueDate()

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Task Management</h1>
        <p className="text-muted-foreground mt-1">
          View and manage tasks across all employees
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Select Employee
            </CardTitle>
            <CardDescription>
              Search and select an employee to view their tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {filteredEmployees.map((emp) => (
                  <SelectItem key={emp.user.id} value={emp.user.id}>
                    <div className="flex flex-col">
                      <span>{emp.user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {emp.employeeCode} · {emp.user.email}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedEmployee && (
              <div className="rounded-lg border p-3 space-y-2">
                <p className="font-medium">{selectedEmployee.user.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedEmployee.employeeCode}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedEmployee.department?.name ?? "No department"}
                </p>
                {attendance.length > 0 && (
                  <div className="pt-2 border-t space-y-1">
                    <p className="text-xs font-medium">Today&apos;s In/Out</p>
                    {attendance.slice(0, 3).map((a) => (
                      <p key={a.date} className="text-xs text-muted-foreground">
                        {format(new Date(a.date), "MMM d")}:{" "}
                        {a.inTime
                          ? format(new Date(a.inTime), "HH:mm")
                          : "—"}{" "}
                        /{" "}
                        {a.outTime
                          ? format(new Date(a.outTime), "HH:mm")
                          : "—"}
                        {a.workHours != null &&
                          ` (${a.workHours.toFixed(1)}h)`}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Tasks</CardTitle>
                  <CardDescription>
                    {selectedUserId
                      ? `Tasks for ${selectedEmployee?.user.name ?? "selected employee"}`
                      : "All pending tasks across organization"}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingTask(null)
                    setFormOpen(true)
                  }}
                >
                  Assign Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TaskList
                tasks={pendingTasks}
                isLoading={pendingLoading}
                showAddButton={false}
                onDeleteTask={handleDeleteTask}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Due Date Change Requests
                  </CardTitle>
                  <CardDescription>
                    Approve or reject employee requests to change task due dates
                  </CardDescription>
                </div>
                {approvals.length > 0 && (
                  <Badge variant="secondary">{approvals.length} pending</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
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
                      className="flex flex-col gap-2 rounded-lg border p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{a.task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Requested by {a.requestedBy.name} · Assignee:{" "}
                            {a.task.assignee.name}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {a.oldDueDate
                              ? format(new Date(a.oldDueDate), "MMM d, yyyy HH:mm")
                              : "None"}{" "}
                            →{" "}
                            {a.newDueDate
                              ? format(new Date(a.newDueDate), "MMM d, yyyy HH:mm")
                              : "None"}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(a.id, "APPROVED")}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleApprove(a.id, "REJECTED")}
                            disabled={approveMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <TaskForm
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open)
              if (!open) setEditingTask(null)
            }}
            task={editingTask}
            employees={employeeList}
            onSuccess={() => {
              setFormOpen(false)
              setEditingTask(null)
            }}
          />
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useMemo } from "react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { Search, CheckCircle, XCircle, Clock, Plus } from "lucide-react"
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

interface Department {
  id: string
  name: string
  headcount?: number
}

export default function MDTasksPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => apiGet<Employee[]>("/api/employees"),
  })

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: () => apiGet<Department[]>("/api/departments"),
  })

  const { data: approvals = [], isLoading: approvalsLoading } = useTaskApprovals()
  const approveMutation = useApproveTaskDueDate()
  const deleteMutation = useDeleteTask()

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchesSearch =
        e.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDepartment =
        departmentFilter === "all" || e.department?.id === departmentFilter
      return matchesSearch && matchesDepartment
    })
  }, [employees, searchQuery, departmentFilter])

  const employeeList = employees.map((e) => ({
    id: e.user.id,
    name: e.user.name,
    email: e.user.email,
  }))

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage tasks across all employees
          </p>
        </div>
        <Button onClick={handleAssignTask}>
          <Plus className="h-4 w-4 mr-2" />
          Assign Task
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>
            Click on an employee to view their tasks, work logs, and attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {employeesLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading employees...</p>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No employees found
            </p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow
                      key={emp.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <TableCell className="font-medium">{emp.employeeCode}</TableCell>
                      <TableCell>{emp.user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.user.email}</TableCell>
                      <TableCell>
                        {emp.department ? (
                          <Badge variant="secondary">{emp.department.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{emp.user.role}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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
    </div>
  )
}

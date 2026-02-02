"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client"
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
import { Search, CheckCircle, XCircle, Clock, Plus, Users, Pencil, Trash2, ListTodo } from "lucide-react"
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

interface MDTaskTeamMember {
  id: string
  employeeId: string
  employee: {
    id: string
    employeeCode: string
    user: { id: string; name: string; email: string; role: string }
    department: { id: string; name: string } | null
  }
}

interface MDTaskTeam {
  id: string
  name: string
  ownerId: string
  members: MDTaskTeamMember[]
  createdAt: string
  updatedAt: string
}

export default function MDTasksPage() {
  const queryClient = useQueryClient()
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [teamFormOpen, setTeamFormOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<MDTaskTeam | null>(null)
  const [teamFormName, setTeamFormName] = useState("")
  const [teamFormEmployeeIds, setTeamFormEmployeeIds] = useState<Set<string>>(new Set())
  const [assignTaskToTeamId, setAssignTaskToTeamId] = useState<string | null>(null)

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => apiGet<Employee[]>("/api/employees"),
  })

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: () => apiGet<Department[]>("/api/departments"),
  })

  const { data: taskTeams = [], isLoading: taskTeamsLoading } = useQuery<MDTaskTeam[]>({
    queryKey: ["md-task-teams"],
    queryFn: () => apiGet<MDTaskTeam[]>("/api/md/task-teams"),
  })

  const createTeamMutation = useMutation({
    mutationFn: (data: { name: string; employeeIds: string[] }) =>
      apiPost<MDTaskTeam>("/api/md/task-teams", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["md-task-teams"] })
      toast.success("Team created")
      setTeamFormOpen(false)
      setEditingTeam(null)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create team"),
  })
  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; employeeIds?: string[] } }) =>
      apiPatch<MDTaskTeam>(`/api/md/task-teams/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["md-task-teams"] })
      toast.success("Team updated")
      setTeamFormOpen(false)
      setEditingTeam(null)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update team"),
  })
  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/md/task-teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["md-task-teams"] })
      toast.success("Team deleted")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete team"),
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

  const employeeList = useMemo(() => {
    if (assignTaskToTeamId) {
      const team = taskTeams.find((t) => t.id === assignTaskToTeamId)
      if (team) {
        return team.members.map((m) => ({
          id: m.employee.user.id,
          name: m.employee.user.name,
          email: m.employee.user.email,
        }))
      }
    }
    return employees.map((e) => ({
      id: e.user.id,
      name: e.user.name,
      email: e.user.email,
    }))
  }, [assignTaskToTeamId, taskTeams, employees])

  const openTeamFormCreate = () => {
    setEditingTeam(null)
    setTeamFormName("")
    setTeamFormEmployeeIds(new Set())
    setTeamFormOpen(true)
  }
  const openTeamFormEdit = (team: MDTaskTeam) => {
    setEditingTeam(team)
    setTeamFormName(team.name)
    setTeamFormEmployeeIds(new Set(team.members.map((m) => m.employee.id)))
    setTeamFormOpen(true)
  }
  const saveTeamForm = () => {
    if (!teamFormName.trim()) {
      toast.error("Team name is required")
      return
    }
    const ids = Array.from(teamFormEmployeeIds)
    if (editingTeam) {
      updateTeamMutation.mutate({
        id: editingTeam.id,
        data: { name: teamFormName.trim(), employeeIds: ids },
      })
    } else {
      createTeamMutation.mutate({ name: teamFormName.trim(), employeeIds: ids })
    }
  }
  const toggleTeamFormEmployee = (employeeId: string) => {
    setTeamFormEmployeeIds((prev) => {
      const next = new Set(prev)
      if (next.has(employeeId)) next.delete(employeeId)
      else next.add(employeeId)
      return next
    })
  }
  const assignTaskToTeam = (teamId: string | null) => {
    setAssignTaskToTeamId(teamId)
    setFormOpen(true)
  }

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
    setAssignTaskToTeamId(null)
    setEditingTask(null)
    setFormOpen(true)
  }

  const departmentBadgeColor = (name: string) => {
    const palette = [
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
      "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
      "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800",
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
      "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
      "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
    ]
    let n = 0
    for (let i = 0; i < name.length; i++) n += name.charCodeAt(i)
    return palette[n % palette.length]
  }

  const roleBadgeColor = (role: string) => {
    const r = role.toLowerCase()
    if (r === "admin") return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800"
    if (r === "manager" || r === "md") return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800"
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border bg-linear-to-br from-primary/5 via-primary/2 to-transparent p-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Task Management
          </h1>
          <p className="text-muted-foreground">
            View and manage tasks across all employees
          </p>
        </div>
        <Button onClick={handleAssignTask} className="shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Assign Task
        </Button>
      </div>

      <Card className="overflow-hidden border-l-4 border-l-emerald-500/60">
        <CardHeader className="bg-emerald-500/5 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                My task teams
              </CardTitle>
              <CardDescription>
                Create teams of employees you often assign tasks to, then assign tasks to a team quickly
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openTeamFormCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create team
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {taskTeamsLoading ? (
            <p className="text-muted-foreground text-sm py-4">Loading teams...</p>
          ) : taskTeams.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No teams yet. Create a team and add employees to quickly assign tasks to them.
            </p>
          ) : (
            <div className="space-y-2">
              {taskTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{team.name}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {team.members.length} {team.members.length === 1 ? "member" : "members"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                      onClick={() => assignTaskToTeam(team.id)}
                      title="Assign task to this team"
                    >
                      <ListTodo className="h-4 w-4 mr-1" />
                      Assign task
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openTeamFormEdit(team)}
                      title="Edit team"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete team "${team.name}"?`)) {
                          deleteTeamMutation.mutate(team.id)
                        }
                      }}
                      disabled={deleteTeamMutation.isPending}
                      title="Delete team"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-l-4 border-l-primary/60">
        <CardHeader className="bg-primary/5 border-b border-border/50">
          <CardTitle className="text-lg">Employees</CardTitle>
          <CardDescription>
            Click on an employee to view their tasks, work logs, and attendance
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-muted-foreground/20 focus-visible:ring-primary/30"
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
            <div className="rounded-lg border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60 border-b">
                    <TableHead className="font-semibold text-foreground">Employee Code</TableHead>
                    <TableHead className="font-semibold text-foreground">Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Email</TableHead>
                    <TableHead className="font-semibold text-foreground">Department</TableHead>
                    <TableHead className="font-semibold text-foreground">Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp, idx) => (
                    <TableRow
                      key={emp.id}
                      className={`cursor-pointer transition-colors hover:bg-primary/5 ${idx % 2 === 1 ? "bg-muted/20" : ""}`}
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <TableCell className="font-medium text-foreground">{emp.employeeCode}</TableCell>
                      <TableCell className="font-medium">{emp.user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.user.email}</TableCell>
                      <TableCell>
                        {emp.department ? (
                          <Badge variant="outline" className={`font-medium ${departmentBadgeColor(emp.department.name)}`}>
                            {emp.department.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleBadgeColor(emp.user.role)}>
                          {emp.user.role}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-l-4 border-l-amber-500/60">
        <CardHeader className="bg-amber-500/5 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Due Date Change Requests
              </CardTitle>
              <CardDescription>
                Approve or reject employee requests to change task due dates
              </CardDescription>
            </div>
            {approvals.length > 0 && (
              <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/30 font-semibold">
                {approvals.length} pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
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
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        onClick={() => handleApprove(a.id, "APPROVED")}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300 border-red-200 dark:border-red-800"
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
            setAssignTaskToTeamId(null)
          }
        }}
        task={editingTask}
        employees={employeeList}
        defaultAssigneeId={selectedEmployee?.user.id}
        onSuccess={() => {
          setFormOpen(false)
          setEditingTask(null)
          setAssignTaskToTeamId(null)
        }}
      />

      <Dialog open={teamFormOpen} onOpenChange={setTeamFormOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit team" : "Create team"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                value={teamFormName}
                onChange={(e) => setTeamFormName(e.target.value)}
                placeholder="e.g. Sales focus, HR team"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="mb-2 block">Select employees</Label>
              <ScrollArea className="h-[240px] rounded-md border border-border/80 p-2">
                <div className="space-y-2">
                  {employees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60 cursor-pointer"
                    >
                      <Checkbox
                        checked={teamFormEmployeeIds.has(emp.id)}
                        onCheckedChange={() => toggleTeamFormEmployee(emp.id)}
                      />
                      <span className="text-sm truncate">{emp.user.name}</span>
                      <span className="text-xs text-muted-foreground truncate shrink-0">
                        {emp.user.email}
                      </span>
                      {emp.department && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {emp.department.name}
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-1">
                {teamFormEmployeeIds.size} selected
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveTeamForm}
              disabled={
                !teamFormName.trim() ||
                createTeamMutation.isPending ||
                updateTeamMutation.isPending
              }
            >
              {editingTeam ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

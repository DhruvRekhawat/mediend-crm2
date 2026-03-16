'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Hash, UserCog, Plus, Pencil, Trash2, CheckSquare } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useState } from 'react'

export interface DepartmentHierarchy {
  department: { id: string; name: string; description: string | null }
  head: { id: string; name: string; email: string; role: string } | null
  teams: Array<{
    id: string
    name: string
    teamLead: {
      id: string
      user: { id: string; name: string; email: string; role: string }
      employeeCode: string
    } | null
    members: Array<{
      id: string
      user: { id: string; name: string; email: string; role: string }
      employeeCode: string
    }>
  }>
  unassignedEmployees: Array<{
    id: string
    user: { id: string; name: string; email: string; role: string }
    employeeCode: string
  }>
  stats: { totalEmployees: number; teams: number; unassigned: number }
}

interface DepartmentHierarchyTeamsProps {
  departmentId: string
  showCreateButton?: boolean
  title?: string
}

export function DepartmentHierarchyTeams({
  departmentId,
  showCreateButton = true,
  title = 'Teams',
}: DepartmentHierarchyTeamsProps) {
  const queryClient = useQueryClient()

  const { data: hierarchy, isLoading } = useQuery<DepartmentHierarchy>({
    queryKey: ['department-hierarchy', departmentId],
    queryFn: () => apiGet<DepartmentHierarchy>(`/api/departments/${departmentId}/hierarchy`),
    enabled: !!departmentId,
  })

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['department-employees', departmentId],
    queryFn: () => apiGet<any[]>(`/api/employees?departmentId=${departmentId}`),
    enabled: !!departmentId,
  })

  const createTeamMutation = useMutation({
    mutationFn: (data: { name: string; teamLeadId: string | null }) =>
      apiPost(`/api/departments/${departmentId}/teams`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-hierarchy', departmentId] })
      queryClient.invalidateQueries({ queryKey: ['department-teams', departmentId] })
      toast.success('Team created successfully')
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to create team'),
  })

  const updateTeamMutation = useMutation({
    mutationFn: ({
      teamId,
      name,
      teamLeadId,
    }: { teamId: string; name?: string; teamLeadId?: string | null }) =>
      apiPatch(`/api/departments/${departmentId}/teams/${teamId}`, {
        ...(name !== undefined && { name }),
        ...(teamLeadId !== undefined && { teamLeadId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-hierarchy', departmentId] })
      queryClient.invalidateQueries({ queryKey: ['department-teams', departmentId] })
      toast.success('Team updated successfully')
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update team'),
  })

  const deleteTeamMutation = useMutation({
    mutationFn: (teamId: string) =>
      apiDelete(`/api/departments/${departmentId}/teams/${teamId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-hierarchy', departmentId] })
      queryClient.invalidateQueries({ queryKey: ['department-teams', departmentId] })
      toast.success('Team deleted successfully')
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to delete team'),
  })

  const bulkAssignMutation = useMutation({
    mutationFn: ({ employeeIds, teamId }: { employeeIds: string[]; teamId: string | null }) =>
      apiPost('/api/employees/bulk-assign-team', { employeeIds, teamId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-hierarchy', departmentId] })
      toast.success('Employees assigned to team successfully')
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to assign employees'),
  })

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading teams...
      </div>
    )
  }

  if (!hierarchy) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Department not found
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>{title}</CardTitle>
            </div>
            {showCreateButton && (
              <CreateTeamDialog
                departmentId={departmentId}
                employees={allEmployees}
                onCreate={(data) => createTeamMutation.mutate(data)}
                isLoading={createTeamMutation.isPending}
              />
            )}
          </div>
        </CardHeader>
        {hierarchy.teams.length > 0 ? (
          <CardContent className="space-y-4">
            {hierarchy.teams.map((team) => (
              <div key={team.id} className="border-l-4 border-blue-500 pl-4 space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lg">{team.name}</div>
                    {team.teamLead && (
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <UserCog className="h-3 w-3 shrink-0" />
                        Team Lead: {team.teamLead.user.name} ({team.teamLead.employeeCode})
                      </div>
                    )}
                    {!team.teamLead && (
                      <div className="text-sm text-muted-foreground mt-1">No team lead assigned</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{team.members.length} members</Badge>
                    {showCreateButton && (
                      <>
                        <EditTeamDialog
                          team={team}
                          employees={allEmployees}
                          onUpdate={(data) =>
                            updateTeamMutation.mutate({
                              teamId: team.id,
                              name: data.name,
                              teamLeadId: data.teamLeadId,
                            })
                          }
                          isLoading={updateTeamMutation.isPending}
                        />
                        <DeleteTeamDialog
                          teamName={team.name}
                          onConfirm={() => deleteTeamMutation.mutate(team.id)}
                          isLoading={deleteTeamMutation.isPending}
                        />
                      </>
                    )}
                  </div>
                </div>
                {team.members.length > 0 && (
                  <div className="ml-4 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Team Members:</div>
                    {team.members.map((member) => (
                      <div key={member.id} className="flex items-center gap-4 p-2 bg-background border rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{member.user.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Hash className="h-3 w-3" />
                            {member.employeeCode} • {member.user.email}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {member.user.role.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        ) : (
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No teams yet. Create a team to get started.
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Unassigned Employees</CardTitle>
            </div>
            {hierarchy.unassignedEmployees.length > 0 && showCreateButton && (
              <BulkAssignDialog
                departmentId={departmentId}
                employees={hierarchy.unassignedEmployees}
                teams={hierarchy.teams}
                onAssign={(employeeIds, teamId) =>
                  bulkAssignMutation.mutate({ employeeIds, teamId })
                }
                isLoading={bulkAssignMutation.isPending}
              />
            )}
          </div>
        </CardHeader>
        {hierarchy.unassignedEmployees.length > 0 ? (
          <CardContent>
            <div className="space-y-2">
              {hierarchy.unassignedEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{employee.user.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Hash className="h-3 w-3" />
                      {employee.employeeCode} • {employee.user.email}
                    </div>
                  </div>
                  <Badge variant="outline">{employee.user.role.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              All employees are assigned to teams.
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

function CreateTeamDialog({
  departmentId: _departmentId,
  employees,
  onCreate,
  isLoading,
}: {
  departmentId: string
  employees: Array<{ id: string; user: { id: string; name: string; email: string; role: string }; employeeCode: string }>
  onCreate: (data: { name: string; teamLeadId: string | null }) => void
  isLoading: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', teamLeadId: '' as string | null })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      toast.error('Please enter a team name')
      return
    }
    onCreate({ name: formData.name, teamLeadId: formData.teamLeadId || null })
    setIsOpen(false)
    setFormData({ name: '', teamLeadId: null })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Create a new team and optionally assign an existing employee as team lead.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Team Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Team Alpha"
            />
          </div>
          <div>
            <Label>Team Lead (Optional)</Label>
            <Select
              value={formData.teamLeadId || 'none'}
              onValueChange={(value) =>
                setFormData({ ...formData, teamLeadId: value === 'none' ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Team Lead (Assign Later)</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.user.name} ({emp.employeeCode}) - {emp.user.role.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create Team'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type TeamForEdit = DepartmentHierarchy['teams'][number]

function EditTeamDialog({
  team,
  employees,
  onUpdate,
  isLoading,
}: {
  team: TeamForEdit
  employees: Array<{ id: string; user: { id: string; name: string; email: string; role: string }; employeeCode: string }>
  onUpdate: (data: { name: string; teamLeadId: string | null }) => void
  isLoading: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(team.name)
  const [teamLeadId, setTeamLeadId] = useState<string | null>(team.teamLead?.id ?? null)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(team.name)
      setTeamLeadId(team.teamLead?.id ?? null)
    }
    setIsOpen(open)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter a team name')
      return
    }
    onUpdate({ name: name.trim(), teamLeadId })
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>Change the team name or assign a different team lead.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Team Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Team Alpha" />
          </div>
          <div>
            <Label>Team Lead (Optional)</Label>
            <Select value={teamLeadId || 'none'} onValueChange={(v) => setTeamLeadId(v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Select team lead" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Team Lead</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.user.name} ({emp.employeeCode}) - {emp.user.role.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteTeamDialog({
  teamName,
  onConfirm,
  isLoading,
}: {
  teamName: string
  onConfirm: () => void
  isLoading: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setIsOpen(true)}>
        <Trash2 className="h-4 w-4 mr-1" />
        Delete
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete team</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{teamName}&quot;? Members will be unassigned from this team but remain in the department.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); onConfirm(); setIsOpen(false) }} disabled={isLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function BulkAssignDialog({
  departmentId,
  employees,
  teams,
  onAssign,
  isLoading,
}: {
  departmentId: string
  employees: Array<{ id: string; user: { id: string; name: string; email: string; role: string }; employeeCode: string }>
  teams: Array<{ id: string; name: string }>
  onAssign: (employeeIds: string[], teamId: string | null) => void
  isLoading: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('none')

  const handleAssign = () => {
    if (selectedEmployeeIds.length === 0) {
      toast.error('Please select at least one employee')
      return
    }
    onAssign(selectedEmployeeIds, selectedTeamId === 'none' ? null : selectedTeamId)
    setIsOpen(false)
    setSelectedEmployeeIds([])
    setSelectedTeamId('none')
  }

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    )
  }

  const selectAll = () => {
    setSelectedEmployeeIds((prev) =>
      prev.length === employees.length ? [] : employees.map((e) => e.id)
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CheckSquare className="h-4 w-4 mr-2" />
          Assign to Team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Employees to Team</DialogTitle>
          <DialogDescription>Select employees and assign them to a team in one click.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Select Team</Label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassign (Remove from Teams)</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Select Employees ({selectedEmployeeIds.length} selected)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                {selectedEmployeeIds.length === employees.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-2">
              {employees.map((emp) => (
                <div key={emp.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md">
                  <Checkbox
                    id={`emp-${emp.id}`}
                    checked={selectedEmployeeIds.includes(emp.id)}
                    onCheckedChange={() => toggleEmployee(emp.id)}
                  />
                  <label htmlFor={`emp-${emp.id}`} className="flex-1 flex items-center justify-between cursor-pointer text-sm">
                    <span>{emp.user.name} ({emp.employeeCode})</span>
                    <Badge variant="outline" className="text-xs">{emp.user.role.replace('_', ' ')}</Badge>
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={selectedEmployeeIds.length === 0 || isLoading}>
              {isLoading ? 'Assigning...' : `Assign ${selectedEmployeeIds.length} Employee(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

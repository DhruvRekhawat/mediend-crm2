'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useState } from 'react'
import { getAvatarColor } from '@/lib/avatar-colors'
import {
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Users,
  Crown,
  ChevronDown,
  ChevronUp,
  Target,
} from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  profilePicture?: string | null
  _count?: { assignedLeads: number }
}

interface Team {
  id: string
  name: string
  salesHeadId: string
  salesHead: { id: string; name: string; email: string }
  teamLeadId?: string | null
  teamLead?: { id: string; name: string; email: string } | null
  members: TeamMember[]
}

interface User {
  id: string
  name: string
  email: string
  role: string
  teamId?: string | null
}

function UserAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const colors = getAvatarColor(name)
  const sz = size === 'md' ? 'h-9 w-9' : 'h-7 w-7'
  return (
    <Avatar className={sz}>
      <AvatarFallback className={`${colors.bg} ${colors.text} text-xs font-semibold`}>
        {name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}

function CreateTeamDialog({
  salesHeads,
  teamLeads,
  onCreate,
}: {
  salesHeads: User[]
  teamLeads: User[]
  onCreate: (data: { name?: string; teamLeadId?: string; salesHeadId: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [teamLeadId, setTeamLeadId] = useState('none')
  const [salesHeadId, setSalesHeadId] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!salesHeadId) return toast.error('Sales Head is required')
    onCreate({ name: name.trim() || undefined, teamLeadId: teamLeadId === 'none' ? undefined : teamLeadId, salesHeadId })
    setOpen(false)
    setName('')
    setTeamLeadId('none')
    setSalesHeadId('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>Set up a new BD team. Name defaults to &quot;Team {'{LeadName}'}&quot; when a team lead is selected.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Team Name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Team Mohit" />
          </div>
          <div className="space-y-1.5">
            <Label>Team Lead (optional)</Label>
            <Select value={teamLeadId} onValueChange={setTeamLeadId}>
              <SelectTrigger><SelectValue placeholder="Select team lead" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team lead</SelectItem>
                {teamLeads.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sales Head *</Label>
            <Select value={salesHeadId} onValueChange={setSalesHeadId}>
              <SelectTrigger><SelectValue placeholder="Select Sales Head" /></SelectTrigger>
              <SelectContent>
                {salesHeads.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Create Team</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditTeamDialog({
  team,
  salesHeads,
  teamLeads,
  onUpdate,
}: {
  team: Team
  salesHeads: User[]
  teamLeads: User[]
  onUpdate: (data: { name?: string; teamLeadId?: string | null; salesHeadId?: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(team.name)
  const [teamLeadId, setTeamLeadId] = useState(team.teamLeadId ?? 'none')
  const [salesHeadId, setSalesHeadId] = useState(team.salesHeadId)

  const handleOpen = (v: boolean) => {
    if (v) {
      setName(team.name)
      setTeamLeadId(team.teamLeadId ?? 'none')
      setSalesHeadId(team.salesHeadId)
    }
    setOpen(v)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Team name is required')
    onUpdate({ name: name.trim(), teamLeadId: teamLeadId === 'none' ? null : teamLeadId, salesHeadId })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Team Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Team Lead (optional)</Label>
            <Select value={teamLeadId} onValueChange={setTeamLeadId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team lead</SelectItem>
                {teamLeads.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Sales Head *</Label>
            <Select value={salesHeadId} onValueChange={setSalesHeadId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {salesHeads.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteTeamDialog({ team, onDelete }: { team: Team; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const hasMembers = team.members.length > 0

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
        disabled={hasMembers}
        title={hasMembers ? 'Remove all members before deleting' : undefined}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{team.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the team. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => { onDelete(); setOpen(false) }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function AssignBdsDialog({
  team,
  allBds,
  onAssign,
}: {
  team: Team
  allBds: User[]
  onAssign: (bdIds: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const currentMemberIds = new Set(team.members.map((m) => m.id))
  const availableBds = allBds.filter((u) => !currentMemberIds.has(u.id))

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const handleAssign = () => {
    if (selected.length === 0) return toast.error('Select at least one BD')
    onAssign(selected)
    setOpen(false)
    setSelected([])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          Add BDs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add BDs to {team.name}</DialogTitle>
          <DialogDescription>Select Business Development members to add.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{availableBds.length} available BDs</span>
            {availableBds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setSelected(selected.length === availableBds.length ? [] : availableBds.map((b) => b.id))}
              >
                {selected.length === availableBds.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>
          <ScrollArea className="h-64 rounded-md border">
            <div className="p-2 space-y-1">
              {availableBds.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">All BDs are already assigned to teams.</p>
              )}
              {availableBds.map((bd) => (
                <label
                  key={bd.id}
                  className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selected.includes(bd.id)}
                    onCheckedChange={() => toggle(bd.id)}
                  />
                  <UserAvatar name={bd.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{bd.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{bd.email}</p>
                  </div>
                  {!bd.teamId && (
                    <Badge variant="outline" className="text-xs shrink-0">Unassigned</Badge>
                  )}
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={selected.length === 0}>
            Add {selected.length > 0 ? `${selected.length} BD${selected.length > 1 ? 's' : ''}` : 'BDs'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TeamCard({
  team,
  salesHeads,
  teamLeads,
  allBds,
  onEdit,
  onDelete,
  onAssignBds,
  onRemoveBd,
}: {
  team: Team
  salesHeads: User[]
  teamLeads: User[]
  allBds: User[]
  onEdit: (data: { name?: string; teamLeadId?: string | null; salesHeadId?: string }) => void
  onDelete: () => void
  onAssignBds: (bdIds: string[]) => void
  onRemoveBd: (bdId: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <Card className="border-l-4 border-blue-500 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{team.name}</CardTitle>
              {team.teamLead && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Crown className="h-3 w-3" />
                  {team.teamLead.name}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {team.members.length} BD{team.members.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-sm text-muted-foreground">Sales Head: {team.salesHead.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AssignBdsDialog team={team} allBds={allBds} onAssign={onAssignBds} />
            <EditTeamDialog team={team} salesHeads={salesHeads} teamLeads={teamLeads} onUpdate={onEdit} />
            <DeleteTeamDialog team={team} onDelete={onDelete} />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {team.members.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center text-muted-foreground gap-2">
              <Users className="h-8 w-8 opacity-30" />
              <p className="text-sm">No BDs assigned yet</p>
              <AssignBdsDialog team={team} allBds={allBds} onAssign={onAssignBds} />
            </div>
          ) : (
            <div className="space-y-1.5">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
                >
                  <UserAvatar name={member.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {member.role.replace('_', ' ')}
                  </Badge>
                  {member._count && (
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {member._count.assignedLeads} leads
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => onRemoveBd(member.id)}
                    title={`Remove ${member.name} from team`}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default function SalesTeamsPage() {
  const queryClient = useQueryClient()
  const [filterSalesHead, setFilterSalesHead] = useState<string>('all')
  const [search, setSearch] = useState('')

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['sales-teams'],
    queryFn: () => apiGet<Team[]>('/api/teams'),
  })

  const { data: salesHeads = [] } = useQuery<User[]>({
    queryKey: ['users-salesheads'],
    queryFn: () => apiGet<User[]>('/api/users?role=SALES_HEAD'),
  })

  const { data: teamLeads = [] } = useQuery<User[]>({
    queryKey: ['users-teamleads'],
    queryFn: () => apiGet<User[]>('/api/users?role=TEAM_LEAD'),
  })

  const { data: allBds = [] } = useQuery<User[]>({
    queryKey: ['users-bds'],
    queryFn: () => apiGet<User[]>('/api/users?role=BD'),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sales-teams'] })
    queryClient.invalidateQueries({ queryKey: ['users-bds'] })
  }

  const createMutation = useMutation({
    mutationFn: (data: { name?: string; teamLeadId?: string; salesHeadId: string }) =>
      apiPost('/api/teams', data),
    onSuccess: () => { invalidate(); toast.success('Team created') },
    onError: (e: Error) => toast.error(e.message || 'Failed to create team'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: { name?: string; teamLeadId?: string | null; salesHeadId?: string } }) =>
      apiPatch(`/api/teams/${teamId}`, data),
    onSuccess: () => { invalidate(); toast.success('Team updated') },
    onError: (e: Error) => toast.error(e.message || 'Failed to update team'),
  })

  const deleteMutation = useMutation({
    mutationFn: (teamId: string) => apiDelete(`/api/teams/${teamId}`),
    onSuccess: () => { invalidate(); toast.success('Team deleted') },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete team'),
  })

  const assignBdsMutation = useMutation({
    mutationFn: ({ teamId, bdIds }: { teamId: string; bdIds: string[] }) =>
      apiPost(`/api/teams/${teamId}/assign-bds`, { bdIds }),
    onSuccess: () => { invalidate(); toast.success('BDs assigned') },
    onError: (e: Error) => toast.error(e.message || 'Failed to assign BDs'),
  })

  const removeBdMutation = useMutation({
    mutationFn: ({ teamId, bdId }: { teamId: string; bdId: string }) =>
      apiPost(`/api/teams/${teamId}/remove-bds`, { bdIds: [bdId] }),
    onSuccess: () => { invalidate(); toast.success('BD removed from team') },
    onError: (e: Error) => toast.error(e.message || 'Failed to remove BD'),
  })

  const uniqueSalesHeads = [...new Map(teams.map((t) => [t.salesHeadId, t.salesHead])).values()]

  const filteredTeams = teams.filter((t) => {
    if (filterSalesHead !== 'all' && t.salesHeadId !== filterSalesHead) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const unassignedBdCount = allBds.filter((b) => !b.teamId).length

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Target className="h-6 w-6 text-blue-600" />
              Sales Teams
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {teams.length} teams · {allBds.length} BDs
              {unassignedBdCount > 0 && (
                <span className="ml-2 text-amber-600 font-medium">· {unassignedBdCount} unassigned</span>
              )}
            </p>
          </div>
          <CreateTeamDialog
            salesHeads={salesHeads}
            teamLeads={teamLeads}
            onCreate={(data) => createMutation.mutate(data)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search teams…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-48"
          />
          <Select value={filterSalesHead} onValueChange={setFilterSalesHead}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder="All sales heads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sales heads</SelectItem>
              {uniqueSalesHeads.map((sh) => (
                <SelectItem key={sh.id} value={sh.id}>{sh.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterSalesHead !== 'all' || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => { setFilterSalesHead('all'); setSearch('') }}
            >
              Clear
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Teams</p>
              <p className="text-2xl font-bold">{teams.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total BDs</p>
              <p className="text-2xl font-bold">{allBds.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Assigned</p>
              <p className="text-2xl font-bold text-emerald-600">{allBds.length - unassignedBdCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Unassigned</p>
              <p className={`text-2xl font-bold ${unassignedBdCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {unassignedBdCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {teamsLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading teams…</div>
        ) : filteredTeams.length === 0 ? (
          <div className="rounded-xl border bg-muted/30 p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            {teams.length === 0 ? (
              <>
                <p className="font-medium">No teams yet</p>
                <p className="text-sm mt-1">Create your first team to get started.</p>
              </>
            ) : (
              <p>No teams match the current filters.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                salesHeads={salesHeads}
                teamLeads={teamLeads}
                allBds={allBds}
                onEdit={(data) => updateMutation.mutate({ teamId: team.id, data })}
                onDelete={() => deleteMutation.mutate(team.id)}
                onAssignBds={(bdIds) => assignBdsMutation.mutate({ teamId: team.id, bdIds })}
                onRemoveBd={(bdId) => removeBdMutation.mutate({ teamId: team.id, bdId })}
              />
            ))}
          </div>
        )}

        {unassignedBdCount > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Unassigned BDs ({unassignedBdCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {allBds.filter((b) => !b.teamId).map((bd) => (
                  <div key={bd.id} className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2">
                    <UserAvatar name={bd.name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{bd.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{bd.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  )
}

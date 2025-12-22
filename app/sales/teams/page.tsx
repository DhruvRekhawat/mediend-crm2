'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client'
import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import {
  Users,
  Plus,
  UserPlus,
  FileText,
  Zap,
  Grid3x3,
  Table as TableIcon,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  UserMinus,
  ArrowRightLeft,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Team {
  id: string
  name: string
  circle: string
  salesHeadId: string
  salesHead: {
    id: string
    name: string
    email: string
  }
  members: Array<{
    id: string
    name: string
    email: string
    role: string
    _count?: {
      assignedLeads: number
    }
  }>
  createdAt: string
  updatedAt: string
}

interface BD {
  id: string
  name: string
  email: string
  role: string
  teamId: string | null
  team: {
    id: string
    name: string
    circle: string
    salesHead: {
      id: string
      name: string
    }
  } | null
  _count: {
    assignedLeads: number
  }
}

interface Lead {
  id: string
  leadRef: string
  patientName: string
  status: string
  pipelineStage: string
  circle: string
  city: string
  bd: {
    id: string
    name: string
  }
}

interface TeamDetails extends Team {
  leads: Array<{
    id: string
    leadRef: string
    patientName: string
    status: string
    city: string
    bd?: {
      id: string
      name: string
    }
  }>
}

export default function TeamsManagementPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showAssignBds, setShowAssignBds] = useState(false)
  const [showAssignLeads, setShowAssignLeads] = useState(false)
  const [showTeamDetails, setShowTeamDetails] = useState(false)
  const [showRemoveBds, setShowRemoveBds] = useState(false)
  const [showReassignLeads, setShowReassignLeads] = useState(false)

  // Form states
  const [newTeam, setNewTeam] = useState({ name: '', circle: '' })
  const [selectedBds, setSelectedBds] = useState<string[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [selectedLeadsToReassign, setSelectedLeadsToReassign] = useState<string[]>([])
  const [targetTeamId, setTargetTeamId] = useState<string>('')

  // Fetch teams
  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['teams', user?.id],
    queryFn: () => apiGet<Team[]>(`/api/teams?salesHeadId=${user?.id}`),
    enabled: !!user?.id,
  })

  // Fetch BDs
  const { data: bds, isLoading: bdsLoading } = useQuery<BD[]>({
    queryKey: ['bds', user?.id],
    queryFn: () => apiGet<BD[]>(`/api/teams/bds?salesHeadId=${user?.id}`),
    enabled: !!user?.id,
  })

  // Fetch unassigned BDs
  const { data: unassignedBds } = useQuery<BD[]>({
    queryKey: ['bds', 'unassigned', user?.id],
    queryFn: () => apiGet<BD[]>(`/api/teams/bds?salesHeadId=${user?.id}&unassignedOnly=true`),
    enabled: !!user?.id,
  })

  // Fetch unassigned leads
  const { data: unassignedLeads } = useQuery<Lead[]>({
    queryKey: ['leads', 'unassigned'],
    queryFn: () => apiGet<Lead[]>('/api/leads/unassigned'),
  })

  // Fetch team details
  const { data: teamDetails, isLoading: teamDetailsLoading } = useQuery<TeamDetails>({
    queryKey: ['team', selectedTeam?.id],
    queryFn: () => apiGet<TeamDetails>(`/api/teams/${selectedTeam?.id}`),
    enabled: !!selectedTeam?.id && (showTeamDetails || showReassignLeads || showRemoveBds),
  })

  // Fetch team leads - try team-specific first, then fallback to circle-based
  const { data: teamLeads } = useQuery<Lead[]>({
    queryKey: ['team', selectedTeam?.id, 'leads', 'reassign'],
    queryFn: async () => {
      // First try to get leads from team members
      try {
        const teamLeadsData = await apiGet<Lead[]>(`/api/teams/${selectedTeam?.id}/leads`)
        if (teamLeadsData && teamLeadsData.length > 0) {
          return teamLeadsData
        }
      } catch (error) {
        // Fall through to circle-based fetch
      }
      // If no leads from team members, fetch by circle
      if (selectedTeam?.circle) {
        return apiGet<Lead[]>(`/api/teams/leads-by-circle?circle=${selectedTeam.circle}&salesHeadId=${user?.id}`)
      }
      return []
    },
    enabled: !!selectedTeam?.id && showReassignLeads,
  })

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: (data: { name: string; circle: string }) =>
      apiPost('/api/teams', { ...data, salesHeadId: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setShowCreateTeam(false)
      setNewTeam({ name: '', circle: '' })
      toast.success('Team created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create team')
    },
  })

  // Assign BDs mutation
  const assignBdsMutation = useMutation({
    mutationFn: ({ teamId, bdIds }: { teamId: string; bdIds: string[] }) =>
      apiPost(`/api/teams/${teamId}/assign-bds`, { bdIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['bds'] })
      setShowAssignBds(false)
      setSelectedBds([])
      toast.success('BDs assigned successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign BDs')
    },
  })

  // Assign leads mutation
  const assignLeadsMutation = useMutation({
    mutationFn: ({
      teamId,
      leadIds,
      distributionType,
    }: {
      teamId: string
      leadIds: string[]
      distributionType: 'equal' | 'manual'
    }) =>
      apiPost(`/api/teams/${teamId}/assign-leads`, {
        leadIds,
        distributionType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['team', selectedTeam?.id] })
      setShowAssignLeads(false)
      setSelectedLeads([])
      toast.success('Leads assigned successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign leads')
    },
  })

  // Auto-assign leads mutation
  const autoAssignLeadsMutation = useMutation({
    mutationFn: ({ teamId, circle }: { teamId: string; circle?: string }) =>
      apiPost<{ assigned: number }>(`/api/teams/${teamId}/auto-assign-leads`, {
        circle,
        unassignedOnly: true,
      }),
    onSuccess: (data: { assigned: number }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['team', selectedTeam?.id] })
      toast.success(`Successfully auto-assigned ${data.assigned} leads`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to auto-assign leads')
    },
  })

  // Remove BDs mutation
  const removeBdsMutation = useMutation({
    mutationFn: ({ teamId, bdIds }: { teamId: string; bdIds: string[] }) =>
      apiPost(`/api/teams/${teamId}/remove-bds`, { bdIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['bds'] })
      queryClient.invalidateQueries({ queryKey: ['team', selectedTeam?.id] })
      setShowRemoveBds(false)
      setSelectedBds([])
      toast.success('BDs removed from team successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove BDs')
    },
  })

  // Reassign leads mutation
  const reassignLeadsMutation = useMutation({
    mutationFn: ({
      leadIds,
      targetTeamId,
    }: {
      leadIds: string[]
      targetTeamId: string
    }) =>
      apiPost('/api/teams/reassign-leads', {
        leadIds,
        targetTeamId,
        distributionType: 'equal',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['team'] })
      setShowReassignLeads(false)
      setSelectedLeadsToReassign([])
      setTargetTeamId('')
      toast.success('Leads reassigned successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reassign leads')
    },
  })

  const handleCreateTeam = () => {
    if (!newTeam.name || !newTeam.circle) {
      toast.error('Please fill all fields')
      return
    }
    createTeamMutation.mutate(newTeam)
  }

  const handleAssignBds = (teamId: string) => {
    if (selectedBds.length === 0) {
      toast.error('Please select at least one BD')
      return
    }
    assignBdsMutation.mutate({ teamId, bdIds: selectedBds })
  }

  const handleAssignLeads = (teamId: string) => {
    if (selectedLeads.length === 0) {
      toast.error('Please select at least one lead')
      return
    }
    assignLeadsMutation.mutate({
      teamId,
      leadIds: selectedLeads,
      distributionType: 'equal',
    })
  }

  const handleAutoAssignLeads = (teamId: string) => {
    const team = teams?.find((t) => t.id === teamId)
    autoAssignLeadsMutation.mutate({
      teamId,
      circle: team?.circle,
    })
  }

  const handleRemoveBds = (teamId: string) => {
    if (selectedBds.length === 0) {
      toast.error('Please select at least one BD to remove')
      return
    }
    removeBdsMutation.mutate({ teamId, bdIds: selectedBds })
  }

  const handleReassignLeads = () => {
    if (selectedLeadsToReassign.length === 0) {
      toast.error('Please select at least one lead to reassign')
      return
    }
    if (!targetTeamId) {
      toast.error('Please select a target team')
      return
    }
    reassignLeadsMutation.mutate({
      leadIds: selectedLeadsToReassign,
      targetTeamId,
    })
  }

  const pendingBdsCount = unassignedBds?.length || 0

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Management</h1>
            <p className="text-muted-foreground mt-1">Manage teams, assign BDs and leads</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingBdsCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {pendingBdsCount} BDs without teams
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
            >
              {viewMode === 'table' ? <Grid3x3 className="h-4 w-4 mr-2" /> : <TableIcon className="h-4 w-4 mr-2" />}
              {viewMode === 'table' ? 'Grid View' : 'Table View'}
            </Button>
            <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                  <DialogDescription>Create a new team and assign BDs to it</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="team-name">Team Name</Label>
                    <Input
                      id="team-name"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                      placeholder="Enter team name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="team-circle">Circle</Label>
                    <Select
                      value={newTeam.circle}
                      onValueChange={(value) => setNewTeam({ ...newTeam, circle: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select circle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="North">North</SelectItem>
                        <SelectItem value="South">South</SelectItem>
                        <SelectItem value="East">East</SelectItem>
                        <SelectItem value="West">West</SelectItem>
                        <SelectItem value="Central">Central</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateTeam(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTeam} disabled={createTeamMutation.isPending}>
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Pending BDs Alert */}
        {pendingBdsCount > 0 && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Pending BDs Assignment
              </CardTitle>
              <CardDescription>
                {pendingBdsCount} BD{pendingBdsCount > 1 ? 's' : ''} {pendingBdsCount > 1 ? 'are' : 'is'} not assigned to any team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {unassignedBds?.slice(0, 10).map((bd) => (
                  <Badge key={bd.id} variant="outline" className="text-sm">
                    {bd.name}
                  </Badge>
                ))}
                {pendingBdsCount > 10 && (
                  <Badge variant="outline" className="text-sm">
                    +{pendingBdsCount - 10} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Teams View */}
        {teamsLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading teams...</div>
        ) : viewMode === 'table' ? (
          <Card>
            <CardHeader>
              <CardTitle>Teams</CardTitle>
              <CardDescription>All teams under your management</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Circle</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Total Leads</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams?.map((team) => {
                    const totalLeads = team.members.reduce(
                      (sum, member) => sum + (member._count?.assignedLeads || 0),
                      0
                    )
                    return (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{team.circle}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {team.members.length} BD{team.members.length !== 1 ? 's' : ''}
                          </div>
                        </TableCell>
                        <TableCell>{totalLeads}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTeam(team)
                                setShowTeamDetails(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTeam(team)
                                setShowAssignBds(true)
                              }}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTeam(team)
                                setShowAssignLeads(true)
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAutoAssignLeads(team.id)}
                              disabled={autoAssignLeadsMutation.isPending}
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTeam(team)
                                setSelectedBds([])
                                setShowRemoveBds(true)
                              }}
                              disabled={team.members.length === 0}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTeam(team)
                                setSelectedLeadsToReassign([])
                                setTargetTeamId('')
                                setShowReassignLeads(true)
                              }}
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {(!teams || teams.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No teams found. Create your first team to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams?.map((team) => {
              const totalLeads = team.members.reduce(
                (sum, member) => sum + (member._count?.assignedLeads || 0),
                0
              )
              return (
                <Card key={team.id}>
                  <CardHeader>
                    <CardTitle>{team.name}</CardTitle>
                    <CardDescription>
                      <Badge variant="outline">{team.circle}</Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Members</span>
                      <span className="font-medium">
                        {team.members.length} BD{team.members.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Leads</span>
                      <span className="font-medium">{totalLeads}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTeam(team)
                          setShowTeamDetails(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTeam(team)
                          setShowAssignBds(true)
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Assign BDs
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTeam(team)
                          setShowAssignLeads(true)
                        }}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Assign Leads
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoAssignLeads(team.id)}
                        disabled={autoAssignLeadsMutation.isPending}
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Auto Assign
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTeam(team)
                          setSelectedBds([])
                          setShowRemoveBds(true)
                        }}
                        disabled={team.members.length === 0}
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        Remove BDs
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTeam(team)
                          setSelectedLeadsToReassign([])
                          setTargetTeamId('')
                          setShowReassignLeads(true)
                        }}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-1" />
                        Reassign Leads
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {(!teams || teams.length === 0) && (
              <div className="col-span-full text-center text-muted-foreground py-8">
                No teams found. Create your first team to get started.
              </div>
            )}
          </div>
        )}

        {/* Assign BDs Dialog */}
        <Dialog open={showAssignBds} onOpenChange={setShowAssignBds}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign BDs to Team</DialogTitle>
              <DialogDescription>
                Select BDs to assign to {selectedTeam?.name}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {bdsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading BDs...</div>
                ) : (
                  bds?.map((bd) => (
                    <div key={bd.id} className="flex items-center space-x-2 p-2 rounded border">
                      <Checkbox
                        id={bd.id}
                        checked={selectedBds.includes(bd.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBds([...selectedBds, bd.id])
                          } else {
                            setSelectedBds(selectedBds.filter((id) => id !== bd.id))
                          }
                        }}
                        disabled={bd.teamId === selectedTeam?.id}
                      />
                      <Label
                        htmlFor={bd.id}
                        className="flex-1 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">{bd.name}</div>
                          <div className="text-sm text-muted-foreground">{bd.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {bd.teamId === selectedTeam?.id && (
                            <Badge variant="secondary">Already in team</Badge>
                          )}
                          {bd.teamId && bd.teamId !== selectedTeam?.id && (
                            <Badge variant="outline">{bd.team?.name}</Badge>
                          )}
                          {!bd.teamId && (
                            <Badge variant="destructive">Unassigned</Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {bd._count.assignedLeads} leads
                          </span>
                        </div>
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignBds(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedTeam && handleAssignBds(selectedTeam.id)}
                disabled={assignBdsMutation.isPending || selectedBds.length === 0}
              >
                Assign {selectedBds.length} BD{selectedBds.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Leads Dialog */}
        <Dialog open={showAssignLeads} onOpenChange={setShowAssignLeads}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Leads to Team</DialogTitle>
              <DialogDescription>
                Select leads to assign to {selectedTeam?.name} (will be distributed equally among team BDs)
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {unassignedLeads && unassignedLeads.length > 0 ? (
                  unassignedLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center space-x-2 p-2 rounded border">
                      <Checkbox
                        id={lead.id}
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedLeads([...selectedLeads, lead.id])
                          } else {
                            setSelectedLeads(selectedLeads.filter((id) => id !== lead.id))
                          }
                        }}
                      />
                      <Label htmlFor={lead.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{lead.patientName}</div>
                            <div className="text-sm text-muted-foreground">
                              {lead.leadRef} • {lead.city}, {lead.circle}
                            </div>
                          </div>
                          <Badge variant="outline">{lead.status}</Badge>
                        </div>
                      </Label>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No unassigned leads available
                  </div>
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignLeads(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedTeam && handleAutoAssignLeads(selectedTeam.id)}
                variant="outline"
                disabled={autoAssignLeadsMutation.isPending}
              >
                <Zap className="h-4 w-4 mr-2" />
                Auto Assign All
              </Button>
              <Button
                onClick={() => selectedTeam && handleAssignLeads(selectedTeam.id)}
                disabled={assignLeadsMutation.isPending || selectedLeads.length === 0}
              >
                Assign {selectedLeads.length} Lead{selectedLeads.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Team Details Dialog */}
        <Dialog open={showTeamDetails} onOpenChange={setShowTeamDetails}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedTeam?.name} - Details</DialogTitle>
              <DialogDescription>Team members, leads, and statistics</DialogDescription>
            </DialogHeader>
            {teamDetails && (
              <Tabs defaultValue="members" className="w-full">
                <TabsList>
                  <TabsTrigger value="members">Members</TabsTrigger>
                  <TabsTrigger value="leads">Leads</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                </TabsList>
                <TabsContent value="members" className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBds([])
                        setShowRemoveBds(true)
                      }}
                      disabled={!teamDetails.members || teamDetails.members.length === 0}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove BDs
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Leads</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamDetails.members?.map((member: any) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>{member._count?.assignedLeads || 0}</TableCell>
                        </TableRow>
                      ))}
                      {(!teamDetails.members || teamDetails.members.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                            No members in this team
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="leads" className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLeadsToReassign([])
                        setTargetTeamId('')
                        setShowReassignLeads(true)
                      }}
                      disabled={!teamDetails.leads || teamDetails.leads.length === 0}
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Reassign Leads
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead Ref</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>BD</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>City</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamDetails.leads?.map((lead: any) => (
                          <TableRow key={lead.id}>
                            <TableCell className="font-medium">{lead.leadRef}</TableCell>
                            <TableCell>{lead.patientName}</TableCell>
                            <TableCell>{lead.bd?.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{lead.status}</Badge>
                            </TableCell>
                            <TableCell>{lead.city}</TableCell>
                          </TableRow>
                        ))}
                        {(!teamDetails.leads || teamDetails.leads.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                              No leads assigned to this team
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="stats" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Total Members</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{teamDetails.members?.length || 0}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Total Leads</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{teamDetails.leads?.length || 0}</div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTeamDetails(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove BDs Dialog */}
        <Dialog open={showRemoveBds} onOpenChange={setShowRemoveBds}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Remove BDs from Team</DialogTitle>
              <DialogDescription>
                Select BDs to remove from {selectedTeam?.name}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {teamDetailsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading members...</div>
                ) : (
                  <>
                    {(teamDetails?.members || selectedTeam?.members || []).length > 0 ? (
                      (teamDetails?.members || selectedTeam?.members || []).map((member: any) => (
                        <div key={member.id} className="flex items-center space-x-2 p-2 rounded border">
                          <Checkbox
                            id={`remove-${member.id}`}
                            checked={selectedBds.includes(member.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedBds([...selectedBds, member.id])
                              } else {
                                setSelectedBds(selectedBds.filter((id) => id !== member.id))
                              }
                            }}
                          />
                          <Label
                            htmlFor={`remove-${member.id}`}
                            className="flex-1 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium">{member.name}</div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {member._count?.assignedLeads || 0} leads
                            </span>
                          </Label>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No members in this team
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRemoveBds(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedTeam && handleRemoveBds(selectedTeam.id)}
                disabled={removeBdsMutation.isPending || selectedBds.length === 0}
                variant="destructive"
              >
                Remove {selectedBds.length} BD{selectedBds.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reassign Leads Dialog */}
        <Dialog open={showReassignLeads} onOpenChange={setShowReassignLeads}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Reassign Leads</DialogTitle>
              <DialogDescription>
                Select leads from {selectedTeam?.name} to reassign to another team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="target-team">Target Team</Label>
                <Select value={targetTeamId} onValueChange={setTargetTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams
                      ?.filter((t) => t.id !== selectedTeam?.id)
                      .map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} ({team.circle})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {((teamLeads && teamLeads.length > 0) || (teamDetails?.leads && teamDetails.leads.length > 0)) ? (
                    (teamLeads && teamLeads.length > 0 ? teamLeads : teamDetails?.leads || []).map((lead: any) => (
                      <div key={lead.id} className="flex items-center space-x-2 p-2 rounded border">
                        <Checkbox
                          id={`reassign-${lead.id}`}
                          checked={selectedLeadsToReassign.includes(lead.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedLeadsToReassign([...selectedLeadsToReassign, lead.id])
                            } else {
                              setSelectedLeadsToReassign(
                                selectedLeadsToReassign.filter((id) => id !== lead.id)
                              )
                            }
                          }}
                        />
                        <Label htmlFor={`reassign-${lead.id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{lead.patientName}</div>
                              <div className="text-sm text-muted-foreground">
                                {lead.leadRef} • {lead.city}, {lead.circle} • BD: {lead.bd?.name}
                              </div>
                            </div>
                            <Badge variant="outline">{lead.status}</Badge>
                          </div>
                        </Label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      {teamLeads === undefined ? 'Loading leads...' : 'No leads in this team'}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReassignLeads(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReassignLeads}
                disabled={reassignLeadsMutation.isPending || selectedLeadsToReassign.length === 0 || !targetTeamId}
              >
                Reassign {selectedLeadsToReassign.length} Lead{selectedLeadsToReassign.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  )
}


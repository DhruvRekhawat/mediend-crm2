'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useParams } from 'next/navigation'
import { Building, User, Users, Hash, Crown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface DepartmentHierarchy {
  department: {
    id: string
    name: string
    description: string | null
  }
  head: {
    id: string
    name: string
    email: string
    role: string
  } | null
  teamLeads: Array<{
    id: string
    user: {
      id: string
      name: string
      email: string
      role: string
    }
    employeeCode: string
    members: Array<{
      id: string
      user: {
        id: string
        name: string
        email: string
        role: string
      }
      employeeCode: string
    }>
  }>
  unassignedUsers: Array<{
    id: string
    user: {
      id: string
      name: string
      email: string
      role: string
    }
    employeeCode: string
  }>
  stats: {
    totalEmployees: number
    teamLeads: number
    users: number
  }
}

export default function DepartmentHierarchyPage() {
  const params = useParams()
  const departmentId = params.id as string

  const { data: hierarchy, isLoading } = useQuery<DepartmentHierarchy>({
    queryKey: ['department-hierarchy', departmentId],
    queryFn: () => apiGet<DepartmentHierarchy>(`/api/departments/${departmentId}/hierarchy`),
    enabled: !!departmentId,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!hierarchy) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Department Hierarchy</h1>
          <p className="text-muted-foreground mt-1">Department not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Department Hierarchy</h1>
        <p className="text-muted-foreground mt-1">{hierarchy.department.name}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hierarchy.stats.totalEmployees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Leads</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hierarchy.stats.teamLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users/BD</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hierarchy.stats.users}</div>
          </CardContent>
        </Card>
      </div>

      {/* Hierarchy Tree */}
      <div className="space-y-4">
        {/* Department Head */}
        {hierarchy.head && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <CardTitle>Department Head</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex-1">
                  <div className="font-semibold">{hierarchy.head.name}</div>
                  <div className="text-sm text-muted-foreground">{hierarchy.head.email}</div>
                </div>
                <Badge variant="default">{hierarchy.head.role.replace('_', ' ')}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Leads */}
        {hierarchy.teamLeads.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle>Team Leads</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {hierarchy.teamLeads.map((tl) => (
                <div key={tl.id} className="border-l-4 border-blue-500 pl-4 space-y-2">
                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold">{tl.user.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Hash className="h-3 w-3" />
                        {tl.employeeCode} • {tl.user.email}
                      </div>
                    </div>
                    <Badge variant="secondary">{tl.user.role.replace('_', ' ')}</Badge>
                  </div>
                  {tl.members.length > 0 && (
                    <div className="ml-4 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Team Members:</div>
                      {tl.members.map((member) => (
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
          </Card>
        )}

        {/* Unassigned Users */}
        {hierarchy.unassignedUsers.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle>Unassigned Users</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {hierarchy.unassignedUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{user.user.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Hash className="h-3 w-3" />
                        {user.employeeCode} • {user.user.email}
                      </div>
                    </div>
                    <Badge variant="outline">{user.user.role.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {hierarchy.stats.totalEmployees === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No employees in this department yet
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

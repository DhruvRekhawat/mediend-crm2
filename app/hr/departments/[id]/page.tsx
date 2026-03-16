'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useParams } from 'next/navigation'
import { User, Users, Crown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DepartmentHierarchyTeams } from '@/components/hr/department-hierarchy-teams'

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
  teams: Array<{
    id: string
    name: string
    teamLead: {
      id: string
      user: {
        id: string
        name: string
        email: string
        role: string
      }
      employeeCode: string
    } | null
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
  unassignedEmployees: Array<{
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
    teams: number
    unassigned: number
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
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hierarchy.stats.teams}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hierarchy.stats.unassigned}</div>
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

        <DepartmentHierarchyTeams departmentId={departmentId} />

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

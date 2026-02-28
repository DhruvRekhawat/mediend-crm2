'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OrgNode, type OrgChartNode } from './org-node'
import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { hasPermission } from '@/lib/rbac'
import { toast } from 'sonner'

interface OrgChartResponse {
  roots: OrgChartNode[]
}

interface EmployeeOption {
  id: string
  employeeCode: string
  user: { name: string; email: string; role: string }
}

export function OrgChart() {
  const [selectedNode, setSelectedNode] = useState<OrgChartNode | null>(null)
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const canEditHierarchy = user && hasPermission(user, 'hierarchy:write')

  const { data, isLoading, error } = useQuery<OrgChartResponse>({
    queryKey: ['hierarchy', 'org-chart'],
    queryFn: () => apiGet<OrgChartResponse>('/api/hierarchy/org-chart'),
  })

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ['employees', 'list'],
    queryFn: () => apiGet<EmployeeOption[]>('/api/employees'),
    enabled: canEditHierarchy && !!selectedNode,
  })

  const assignManagerMutation = useMutation({
    mutationFn: ({ employeeId, managerId }: { employeeId: string; managerId: string | null }) =>
      apiPatch('/api/hierarchy/assign-manager', { employeeId, managerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy', 'org-chart'] })
      toast.success('Manager updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update manager'),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load org chart. You may not have permission to view it.
        </CardContent>
      </Card>
    )
  }

  const roots = data.roots ?? []

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Organization Chart</CardTitle>
          <CardDescription>Click a node to see details. Expand or collapse branches with the arrow.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {roots.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No hierarchy data yet. Assign managers to build the org chart.</p>
            ) : (
              roots.map((node) => (
                <OrgNode
                  key={node.id}
                  node={node}
                  onSelect={setSelectedNode}
                  selectedId={selectedNode?.id}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
            <CardDescription>{selectedNode.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Role</span>
              <p className="mt-0.5">{selectedNode.role.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Email</span>
              <p className="mt-0.5 break-all">{selectedNode.email}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Employee code</span>
              <p className="mt-0.5">{selectedNode.employeeCode}</p>
            </div>
            {selectedNode.departmentName && (
              <div>
                <span className="font-medium text-muted-foreground">Department</span>
                <p className="mt-0.5">{selectedNode.departmentName}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-muted-foreground">Direct reports</span>
              <p className="mt-0.5">{selectedNode.subordinateCount}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Current manager</span>
              <p className="mt-0.5">{selectedNode.managerName ?? '—'}</p>
            </div>
            {canEditHierarchy && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-muted-foreground">Change manager</Label>
                <Select
                  value={selectedNode.managerId ?? '__none__'}
                  onValueChange={(value) => {
                    const managerId = value === '__none__' ? null : value
                    assignManagerMutation.mutate({
                      employeeId: selectedNode.id,
                      managerId,
                    })
                  }}
                  disabled={assignManagerMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No manager</SelectItem>
                    {employees
                      .filter((e) => e.id !== selectedNode.id)
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.user.name} ({emp.employeeCode})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a new manager for this employee. The tree will refresh after saving.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

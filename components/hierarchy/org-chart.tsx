'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { OrgNode, type OrgChartNode } from './org-node'
import { useState } from 'react'

interface OrgChartResponse {
  roots: OrgChartNode[]
}

export function OrgChart() {
  const [selectedNode, setSelectedNode] = useState<OrgChartNode | null>(null)

  const { data, isLoading, error } = useQuery<OrgChartResponse>({
    queryKey: ['hierarchy', 'org-chart'],
    queryFn: () => apiGet<OrgChartResponse>('/api/hierarchy/org-chart'),
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}

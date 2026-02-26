'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronRight, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface OrgChartNode {
  id: string
  userId: string
  employeeCode: string
  name: string
  email: string
  role: string
  departmentName: string | null
  subordinateCount: number
  subordinates: OrgChartNode[]
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ')
}

interface OrgNodeProps {
  node: OrgChartNode
  depth?: number
  onSelect?: (node: OrgChartNode) => void
  selectedId?: string | null
}

export function OrgNode({ node, depth = 0, onSelect, selectedId }: OrgNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.subordinates.length > 0
  const isSelected = selectedId === node.id

  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border transition-colors',
          isSelected && 'border-primary bg-muted/50',
          onSelect && 'cursor-pointer hover:bg-muted/50'
        )}
        style={{ marginLeft: depth * 20 }}
      >
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded p-0 hover:bg-muted"
          onClick={() => hasChildren && setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>
        <Card
          className="flex flex-1 flex-row items-center gap-3 border-0 bg-transparent p-3 shadow-none"
          onClick={() => onSelect?.(node)}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardContent className="flex flex-1 flex-wrap items-center gap-2 p-0">
            <span className="font-medium">{node.name}</span>
            <Badge variant="secondary" className="text-xs">
              {formatRole(node.role)}
            </Badge>
            {node.departmentName && (
              <span className="text-xs text-muted-foreground">{node.departmentName}</span>
            )}
            {node.subordinateCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {node.subordinateCount} report{node.subordinateCount !== 1 ? 's' : ''}
              </span>
            )}
          </CardContent>
        </Card>
      </div>
      {hasChildren && expanded && (
        <div className="flex flex-col gap-1 border-l-2 border-muted pl-2">
          {node.subordinates.map((child) => (
            <OrgNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

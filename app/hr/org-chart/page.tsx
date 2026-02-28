'use client'

import { OrgChart } from '@/components/hierarchy/org-chart'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldX } from 'lucide-react'

const ALLOWED_ORG_CHART_ROLES = ['ADMIN', 'HR_HEAD']

export default function HROrgChartPage() {
  const { user } = useAuth()

  if (!user || !ALLOWED_ORG_CHART_ROLES.includes(user.role)) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldX className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Access restricted</h2>
            <p className="text-muted-foreground mt-1 max-w-sm">
              The organization chart is available only to Admin and HR Head.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organization Chart</h1>
        <p className="text-muted-foreground mt-1">
          View and explore the company hierarchy. Click a person to see details and change their manager from the panel on the right.
        </p>
      </div>
      <OrgChart />
    </div>
  )
}

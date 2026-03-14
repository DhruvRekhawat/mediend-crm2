'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { TabNavigation, type TabItem } from '@/components/employee/tab-navigation'
import { IncrementsTab } from '@/components/hr/increments-tab'
import { DocumentsTab } from '@/components/hr/documents-tab'
import { useAuth } from '@/hooks/use-auth'
import { hasPermission } from '@/lib/rbac'
import type { BadgeCounts } from '@/app/api/badge-counts/route'

const ALL_TABS: (TabItem & { permission?: string })[] = [
  { value: 'documents', label: 'Documents', permission: 'hrms:employees:read' },
  { value: 'increments', label: 'Increments', permission: 'hrms:employees:read' },
]

export default function HRCompensationPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')

  const { data: badges } = useQuery<BadgeCounts>({
    queryKey: ['badge-counts'],
    queryFn: () => apiGet<BadgeCounts>('/api/badge-counts'),
    refetchInterval: 60_000,
  })

  const tabs = useMemo(() => {
    if (!user) return []
    return ALL_TABS.filter((t) => !t.permission || hasPermission(user, t.permission as any)).map(({ value, label }) => {
      const badge = value === 'increments' ? badges?.hrPendingIncrements : undefined
      return { value, label, badge }
    })
  }, [user, badges])

  const [activeTab, setActiveTab] = useState(tabs[0]?.value ?? 'documents')

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.value === activeTab)) {
      setActiveTab(tabs[0].value)
    }
  }, [tabs, activeTab])

  useEffect(() => {
    if (tabParam && tabs.some((t) => t.value === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam, tabs])

  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        You do not have permission to view any section in Compensation & Docs.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TabNavigation
        tabs={tabs}
        value={activeTab}
        onValueChange={setActiveTab}
        variant="hr-compensation"
      />
      <div className="mt-6">
        {activeTab === 'increments' && <IncrementsTab />}
        {activeTab === 'documents' && <DocumentsTab />}
      </div>
    </div>
  )
}

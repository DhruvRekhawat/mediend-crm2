'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { TabNavigation, type TabItem } from '@/components/employee/tab-navigation'
import { FeedbackTab } from '@/components/hr/feedback-tab'
import { TicketsTab } from '@/components/hr/tickets-tab'
import { MentalHealthTab } from '@/components/hr/mental-health-tab'
import { IJPTab } from '@/components/hr/ijp-tab'
import { useAuth } from '@/hooks/use-auth'
import { hasPermission } from '@/lib/rbac'
import type { BadgeCounts } from '@/app/api/badge-counts/route'

const ALL_TABS: (TabItem & { permission?: string })[] = [
  { value: 'feedback', label: 'Feedback', permission: 'hrms:employees:read' },
  { value: 'tickets', label: 'Tickets', permission: 'hrms:employees:read' },
  { value: 'mental-health', label: 'Mental Health', permission: 'hrms:employees:read' },
  { value: 'ijp', label: 'IJP', permission: 'hrms:employees:read' },
]

export default function HREngagementPage() {
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
      let badge: number | undefined
      if (value === 'feedback') badge = badges?.hrPendingFeedback
      else if (value === 'tickets') badge = badges?.hrPendingTickets
      else if (value === 'mental-health') badge = badges?.hrPendingMentalHealth
      return { value, label, badge }
    })
  }, [user, badges])

  const [activeTab, setActiveTab] = useState(tabs[0]?.value ?? 'feedback')

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
        You do not have permission to view any section in Engagement.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TabNavigation
        tabs={tabs}
        value={activeTab}
        onValueChange={setActiveTab}
        variant="hr-engagement"
      />
      <div className="mt-6">
        {activeTab === 'feedback' && <FeedbackTab />}
        {activeTab === 'tickets' && <TicketsTab />}
        {activeTab === 'mental-health' && <MentalHealthTab />}
        {activeTab === 'ijp' && <IJPTab />}
      </div>
    </div>
  )
}

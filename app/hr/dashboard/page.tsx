'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { HRDashboard } from '@/components/hr/hr-dashboard'

export default function HRDashboardPage() {
  return (
    <AuthenticatedLayout>
      <HRDashboard
        title="HR Dashboard"
        description="Strength, salary, and ticket analytics"
      />
    </AuthenticatedLayout>
  )
}

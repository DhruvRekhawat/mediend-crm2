'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { DepartmentHierarchyTeams } from '@/components/hr/department-hierarchy-teams'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

const SURGERY_SALES_DEPT_NAME = 'SURGERY SALES'

interface Department {
  id: string
  name: string
  description?: string | null
}

export default function TeamsManagementPage() {
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
  })

  const surgerySalesDept = departments.find(
    (d) => d.name.toUpperCase() === SURGERY_SALES_DEPT_NAME
  )

  if (!surgerySalesDept) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Team Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage teams for SURGERY SALES department
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-8 text-center text-muted-foreground">
            <p>
              The &quot;{SURGERY_SALES_DEPT_NAME}&quot; department was not found.
            </p>
            <p className="text-sm mt-2">
              Create it from HR → People & Org → Departments, or ensure the department name matches exactly.
            </p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage teams for {SURGERY_SALES_DEPT_NAME} — same hierarchy as HR Departments
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/hr/departments/${surgerySalesDept.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Full department view
            </Link>
          </Button>
        </div>

        <DepartmentHierarchyTeams
          departmentId={surgerySalesDept.id}
          showCreateButton={true}
          title={`${SURGERY_SALES_DEPT_NAME} Teams`}
        />
      </div>
    </AuthenticatedLayout>
  )
}

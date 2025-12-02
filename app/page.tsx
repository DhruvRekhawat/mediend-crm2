'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export default function Home() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Redirect based on role
        const routes: Record<string, string> = {
          MD: '/md/dashboard',
          SALES_HEAD: '/sales/dashboard',
          TEAM_LEAD: '/team-lead/dashboard',
          BD: '/bd/pipeline',
          INSURANCE_HEAD: '/insurance/dashboard',
          PL_HEAD: '/pl/dashboard',
          HR_HEAD: '/hr/users',
          ADMIN: '/admin/dashboard',
        }
        router.push(routes[user.role] || '/login')
      } else {
        router.push('/login')
      }
    }
  }, [user, isLoading, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

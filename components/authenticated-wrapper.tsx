'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/protected-route'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { NotificationBell } from '@/components/notifications/notification-bell'

export function AuthenticatedWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  
  // Don't show sidebar on login page, payslip page, or document view page
  const isLoginPage = pathname === '/login'
  const isPayslipPage = pathname?.includes('/payroll/') && pathname?.includes('/slip')
  const isDocumentViewPage = pathname?.includes('/documents/') && pathname?.includes('/view')
  
  // Show sidebar if user is authenticated and not on special pages
  const shouldShowSidebar = !isLoading && user && !isLoginPage && !isPayslipPage && !isDocumentViewPage

  if (isLoginPage || isPayslipPage || isDocumentViewPage) {
    return <>{children}</>
  }

  return (
    <ProtectedRoute>
      {shouldShowSidebar ? (
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex flex-1 items-center gap-2 justify-end">
                <NotificationBell />
              </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:p-6 bg-background">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      ) : (
        <>{children}</>
      )}
    </ProtectedRoute>
  )
}


'use client'

import Link from 'next/link'
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
import { WorkLogEnforcer } from '@/components/calendar/work-log-enforcer'
import { Button } from '@/components/ui/button'
import { CalendarIcon, CheckSquare, ListTodo, MessageSquare, Calendar, Sparkles } from 'lucide-react'
import { useAI } from '@/components/ai/ai-provider'

function AIHeaderButton() {
  const ai = useAI()
  if (!ai) return null
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={ai.openAI}
      className="md:hidden"
      aria-label="Open mediendAI"
    >
      <Sparkles className="h-5 w-5 text-purple-500" />
    </Button>
  )
}

export function AuthenticatedWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  
  // Don't show sidebar on login page, payslip page, or document view page
  const isLoginPage = pathname === '/login'
  const isPayslipPage = pathname?.includes('/payroll/') && pathname?.includes('/slip')
  const isDocumentViewPage = pathname?.includes('/documents/') && pathname?.includes('/view')
  const isMdOrAdmin = user?.role === 'MD' || user?.role === 'ADMIN'
  const isMdContext = pathname?.startsWith('/md') || pathname === '/finance/approvals'
  // Show sidebar if user is authenticated and not on special pages
  const shouldShowSidebar = !isLoading && user && !isLoginPage && !isPayslipPage && !isDocumentViewPage
  const showMdBottomNav = isMdOrAdmin && isMdContext && shouldShowSidebar

  if (isLoginPage || isPayslipPage || isDocumentViewPage) {
    return <>{children}</>
  }

  return (
    <ProtectedRoute>
      {shouldShowSidebar && <WorkLogEnforcer />}
      {shouldShowSidebar ? (
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex flex-1 items-center gap-2 justify-end">
                <AIHeaderButton />
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/calendar" title="Calendar">
                    <CalendarIcon className="h-5 w-5" />
                  </Link>
                </Button>
                <NotificationBell />
              </div>
            </header>
            <main className={`flex flex-1 flex-col gap-4 p-4 md:p-6 bg-background ${showMdBottomNav ? 'pb-20 md:pb-6' : ''}`}>
              {children}
            </main>
            {showMdBottomNav && (
              <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background">
                <div className="flex items-center justify-around h-16">
                  <Link
                    href="/finance/approvals"
                    className={`flex flex-col items-center justify-center flex-1 gap-1 py-2 ${pathname?.startsWith('/finance/approvals') ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    <CheckSquare className="h-5 w-5" />
                    <span className="text-xs">Approvals</span>
                  </Link>
                  <Link
                    href="/md/tasks"
                    className={`flex flex-col items-center justify-center flex-1 gap-1 py-2 ${pathname?.startsWith('/md/tasks') ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    <ListTodo className="h-5 w-5" />
                    <span className="text-xs">Tasks</span>
                  </Link>
                  <Link
                    href="/md/anonymous-messages"
                    className={`flex flex-col items-center justify-center flex-1 gap-1 py-2 ${pathname?.startsWith('/md/anonymous-messages') ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-xs">Messages</span>
                  </Link>
                  <Link
                    href="/md/appointments"
                    className={`flex flex-col items-center justify-center flex-1 gap-1 py-2 ${pathname?.startsWith('/md/appointments') ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    <Calendar className="h-5 w-5" />
                    <span className="text-xs">Appointments</span>
                  </Link>
                </div>
              </nav>
            )}
          </SidebarInset>
        </SidebarProvider>
      ) : (
        <>{children}</>
      )}
    </ProtectedRoute>
  )
}


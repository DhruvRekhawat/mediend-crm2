'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { useBadgeCounts } from '@/hooks/use-badge-counts'
import { useAuth } from '@/hooks/use-auth'
import { useSidebar } from '@/components/ui/sidebar'
import { getFilteredNavItemsWithUrls } from '@/lib/sidebar-nav'
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle,
  ChevronDown,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  FolderTree,
  Heart,
  LogOut,
  MessageSquare,
  Package,
  ShieldCheck,
  Target,
  Ticket,
  TrendingUp,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import logo from '@/public/logo-mediend.png'
import { UserRole } from '@/generated/prisma/enums'

function getBadgeCount(
  itemTitle: string,
  counts: {
    pendingFinanceApprovals: number
    unreadMessages: number
    pendingAppointments: number
    pendingTaskReviews: number
    pendingDueDateApprovals: number
    myOverdueTasks: number
    myPendingTasks: number
  } | undefined,
  isMdOrAdmin: boolean
): number {
  if (!counts) return 0
  if (itemTitle === 'Tasks') {
    return isMdOrAdmin
      ? counts.pendingTaskReviews + counts.pendingDueDateApprovals
      : counts.myPendingTasks
  }
  if (itemTitle === 'Fin Approvals') return counts.pendingFinanceApprovals
  if (itemTitle === 'MD Messages') return counts.unreadMessages
  if (itemTitle === 'MD Appointments') return counts.pendingAppointments
  return 0
}

export function AppSidebar() {
  const { user, logout, isTester, setActiveRole } = useAuth()
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const { data: badgeCounts } = useBadgeCounts()
  const isMdOrAdmin = user?.role === 'MD' || user?.role === 'ADMIN'

  const closeSidebarOnMobile = React.useCallback(() => {
    if (isMobile) setOpenMobile(false)
  }, [isMobile, setOpenMobile])
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    services: false,
    finance: false,
  })

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  if (!user) {
    return null
  }

  const itemsWithUrls = getFilteredNavItemsWithUrls(user)
  const navigationItems =
    user.role === 'MD'
      ? itemsWithUrls.filter(
          (item) =>
            item.title === 'Home' ||
            item.title === 'Tasks' ||
            item.title === 'Sales Dashboard' ||
            item.title === 'Finance Dashboard' ||
            item.title === 'HR Dashboard' ||
            item.title.startsWith('MD ')
        )
      : user.role === 'ADMIN' || user.role === 'TESTER'
        ? itemsWithUrls.filter(
            (item) =>
              item.title === 'Home' ||
              item.title === 'Tasks' ||
              item.title === 'Sales Dashboard' ||
              item.title === 'Finance Dashboard' ||
              item.title === 'HR Dashboard' ||
              item.title.startsWith('MD ') ||
              item.title.startsWith('HR ') ||
              item.title === 'Departments' ||
              item.title === 'Leave Types' ||
              item.title === 'Leave Balances'
          )
        : user.role === 'USER'
          ? itemsWithUrls.filter(
              (item) =>
                item.title === 'Home' ||
                item.title === 'Tasks' ||
                item.title.startsWith('My ')
            )
          : itemsWithUrls.filter(
              (item) =>
                item.title === 'Home' ||
                item.title.startsWith('My ') ||
                item.title.startsWith('HR ') ||
                item.title === 'Departments' ||
                item.title === 'Leave Types' ||
                item.title === 'Leave Balances' ||
                (!item.title.startsWith('Svc ') &&
                  !item.title.startsWith('MD ') &&
                  !item.title.startsWith('Fin '))
            )

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-1 p-2">
          <div className="relative h-8 w-32 shrink-0">
            <Image
              src={logo}
              alt="Mediend"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-md text-white font-bold">Workspace Beta</p>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-1">
        <SidebarGroup className="pb-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.url || pathname.startsWith(item.url + '/')
                const label = item.title.startsWith('MD ') ? item.title.replace('MD ', '') : item.title
                const badgeCount = getBadgeCount(item.title, badgeCounts, !!isMdOrAdmin)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                      <Link href={item.url} onClick={closeSidebarOnMobile}>
                        <Icon />
                        <span>{label}</span>
                        {badgeCount > 0 && (
                          <SidebarMenuBadge className="bg-destructive text-white">
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {user.role !== 'ADMIN' && user.role !== 'TESTER' && itemsWithUrls.some((item) => item.title.startsWith('Svc ')) && (
          <SidebarGroup className="pb-1">
            <button
              onClick={() => toggleSection('services')}
              className="text-sidebar-foreground ring-sidebar-ring flex h-9 w-full shrink-0 items-center justify-between rounded-md px-2.5 text-sm font-semibold outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>Services</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  openSections.services ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                openSections.services ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {openSections.services && (
                <SidebarGroupContent>
                  <SidebarMenu>
                  {itemsWithUrls
                    .filter((item) => item.title.startsWith('Svc '))
                    .map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.url || pathname.startsWith(item.url + '/')
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild isActive={isActive} tooltip={item.title.replace('Svc ', '')}>
                            <Link href={item.url} onClick={closeSidebarOnMobile}>
                              <Icon />
                              <span>{item.title.replace('Svc ', '')}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                )}
              </div>
            </SidebarGroup>
        )}
        {itemsWithUrls.some((item) => item.title.startsWith('Fin ')) && (
          <SidebarGroup className="pb-1">
            <button
              onClick={() => toggleSection('finance')}
              className="text-sidebar-foreground ring-sidebar-ring flex h-9 w-full shrink-0 items-center justify-between rounded-md px-2.5 text-sm font-semibold outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Finance</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  openSections.finance ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                openSections.finance ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {openSections.finance && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {itemsWithUrls
                      .filter((item) => item.title.startsWith('Fin '))
                      .map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.url || pathname.startsWith(item.url + '/')
                        const badgeCount = getBadgeCount(item.title, badgeCounts, !!isMdOrAdmin)
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={isActive} tooltip={item.title.replace('Fin ', '')}>
                              <Link href={item.url} onClick={closeSidebarOnMobile}>
                                <Icon />
                                <span>{item.title.replace('Fin ', '')}</span>
                                {badgeCount > 0 && (
                                  <SidebarMenuBadge className="bg-destructive text-white">
                                    {badgeCount > 99 ? '99+' : badgeCount}
                                  </SidebarMenuBadge>
                                )}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {isTester && (
            <SidebarMenuItem>
              <div className="px-2 py-2 space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground font-bold">View as role</p>
                <select
                  value={user?.role ?? 'TESTER'}
                  onChange={(e) => setActiveRole(e.target.value as UserRole)}
                  className="w-full text-xs border rounded px-2 py-1 bg-background text-foreground"
                >
                  <option value="TESTER">— TESTER (default) —</option>
                  <option value="MD">MD</option>
                  <option value="SALES_HEAD">SALES_HEAD</option>
                  <option value="TEAM_LEAD">TEAM_LEAD</option>
                  <option value="BD">BD</option>
                  <option value="INSURANCE_HEAD">INSURANCE_HEAD</option>
                  <option value="PL_HEAD">PL_HEAD</option>
                  <option value="OUTSTANDING_HEAD">OUTSTANDING_HEAD</option>
                  <option value="HR_HEAD">HR_HEAD</option>
                  <option value="FINANCE_HEAD">FINANCE_HEAD</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="USER">USER</option>
                </select>
              </div>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Profile">
              <Link href="/profile" onClick={closeSidebarOnMobile}>
                <User />
                <span>Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => logout()} tooltip="Logout" asChild={false}>
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}


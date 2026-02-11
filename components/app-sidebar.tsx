'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
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
  Mail,
  MessageSquare,
  Package,
  ShieldCheck,
  Target,
  Ticket,
  TrendingUp,
  User,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import logo from '@/public/logo-mediend.png'

export function AppSidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const closeSidebarOnMobile = React.useCallback(() => {
    if (isMobile) setOpenMobile(false)
  }, [isMobile, setOpenMobile])
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    myHrms: false,
    services: false,
    hrManagement: false,
    finance: false,
    mdPortal: false,
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
    user.role === 'MD' || user.role === 'ADMIN'
      ? itemsWithUrls.filter(
          (item) =>
            item.title === 'Sales Dashboard' ||
            item.title === 'Finance Dashboard' ||
            item.title === 'HR Dashboard' ||
            item.title.startsWith('MD ')
        )
      : itemsWithUrls.filter(
          (item) =>
            !item.title.startsWith('My ') &&
            !item.title.startsWith('Svc ') &&
            !item.title.startsWith('HR ') &&
            !item.title.startsWith('MD ') &&
            !item.title.startsWith('Fin ') &&
            item.title !== 'Departments' &&
            item.title !== 'Leave Types'
        )

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border bg-[#062D4C]">
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
          <p className="text-md text-white font-bold">Workspace</p>
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
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                      <Link href={item.url} onClick={closeSidebarOnMobile}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {user.role !== 'ADMIN' && (
          <SidebarGroup className="pb-1">
            <button
              onClick={() => toggleSection('myHrms')}
              className="text-sidebar-foreground ring-sidebar-ring flex h-9 w-full shrink-0 items-center justify-between rounded-md px-2.5 text-sm font-semibold outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                <span>My HRMS</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  openSections.myHrms ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                openSections.myHrms ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {openSections.myHrms && (
                <SidebarGroupContent>
                  <SidebarMenu>
                  {itemsWithUrls
                    .filter((item) => item.title.startsWith('My '))
                    .map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.url || pathname.startsWith(item.url + '/')
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                            <Link href={item.url} onClick={closeSidebarOnMobile}>
                              <Icon />
                              <span>{item.title}</span>
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
        {user.role !== 'ADMIN' && itemsWithUrls.some((item) => item.title.startsWith('Svc ')) && (
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
        {user.role !== 'ADMIN' && itemsWithUrls.some((item) => item.title.startsWith('HR ')) && (
          <SidebarGroup className="pb-1">
            <button
              onClick={() => toggleSection('hrManagement')}
              className="text-sidebar-foreground ring-sidebar-ring flex h-9 w-full shrink-0 items-center justify-between rounded-md px-2.5 text-sm font-semibold outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>HR Management</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  openSections.hrManagement ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                openSections.hrManagement ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {openSections.hrManagement && (
                <SidebarGroupContent>
                  <SidebarMenu>
                  {itemsWithUrls
                    .filter((item) => item.title.startsWith('HR ') || item.title === 'Departments' || item.title === 'Leave Types')
                    .map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.url || pathname.startsWith(item.url + '/')
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                            <Link href={item.url} onClick={closeSidebarOnMobile}>
                              <Icon />
                              <span>{item.title}</span>
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
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={isActive} tooltip={item.title.replace('Fin ', '')}>
                              <Link href={item.url} onClick={closeSidebarOnMobile}>
                                <Icon />
                                <span>{item.title.replace('Fin ', '')}</span>
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
        {(user.role === 'MD' || user.role === 'ADMIN') && (
          <SidebarGroup className="pb-1">
            <button
              onClick={() => toggleSection('mdPortal')}
              className="text-sidebar-foreground ring-sidebar-ring flex h-9 w-full shrink-0 items-center justify-between rounded-md px-2.5 text-sm font-semibold outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>MD Portal</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  openSections.mdPortal ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                openSections.mdPortal ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {openSections.mdPortal && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {itemsWithUrls
                      .filter((item) => item.title.startsWith('MD '))
                      .map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.url || pathname.startsWith(item.url + '/')
                        return (
                          <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild isActive={isActive} tooltip={item.title.replace('MD ', '')}>
                            <Link href={item.url} onClick={closeSidebarOnMobile}>
                                <Icon />
                                <span>{item.title.replace('MD ', '')}</span>
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


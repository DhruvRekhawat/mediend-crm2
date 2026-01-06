'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  Shield,
  DollarSign,
  ClipboardList,
  Building2,
  LogOut,
  User,
  Clock,
  Calendar,
  Wallet,
  UserCircle,
  MessageSquare,
  ShieldCheck,
  CalendarCheck,
  Heart,
  Ticket,
  TrendingUp,
  Briefcase,
  Mail,
  BookOpen,
  FolderTree,
  CheckCircle,
  BarChart3,
  CreditCard,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { hasPermission, type Permission } from '@/lib/rbac'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  permission?: Permission
  roles?: string[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'INSURANCE_HEAD', 'PL_HEAD', 'ADMIN'],
  },
  {
    title: 'Pipeline',
    url: '/pipeline',
    icon: ClipboardList,
    roles: ['BD', 'TEAM_LEAD'],
  },
  {
    title: 'Targets',
    url: '/sales/targets',
    icon: Target,
    roles: ['SALES_HEAD'],
  },
  {
    title: 'Teams',
    url: '/sales/teams',
    icon: Users,
    roles: ['SALES_HEAD'],
  },
  {
    title: 'Insurance',
    url: '/insurance/dashboard',
    icon: Shield,
    permission: 'insurance:read',
  },
  {
    title: 'P/L',
    url: '/pl/dashboard',
    icon: DollarSign,
    permission: 'pl:read',
  },
  {
    title: 'Users',
    url: '/hr/users',
    icon: Users,
    permission: 'users:read',
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: FileText,
    permission: 'reports:export',
  },
  // HRMS - Available to all users
  {
    title: 'My Attendance',
    url: '/employee/attendance',
    icon: Clock,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Leaves',
    url: '/employee/leaves',
    icon: Calendar,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Profile',
    url: '/employee/profile',
    icon: UserCircle,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Payroll',
    url: '/employee/payroll',
    icon: Wallet,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Documents',
    url: '/employee/documents',
    icon: FileText,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Feedback',
    url: '/employee/feedback',
    icon: MessageSquare,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Tickets',
    url: '/employee/tickets',
    icon: Ticket,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Increment',
    url: '/employee/increment',
    icon: TrendingUp,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  // Employee Services
  {
    title: 'Svc Anonymous Msg',
    url: '/employee/anonymous-message',
    icon: ShieldCheck,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'Svc MD Appointment',
    url: '/employee/md-appointment',
    icon: CalendarCheck,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'Svc Mental Health',
    url: '/employee/mental-health',
    icon: Heart,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'Svc Job Postings',
    url: '/employee/ijp',
    icon: Briefcase,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  // HR Management - Only for HR_HEAD and ADMIN
  {
    title: 'HR Attendance',
    url: '/hr/attendance',
    icon: Clock,
    permission: 'hrms:attendance:read',
  },
  {
    title: 'HR Leaves',
    url: '/hr/leaves',
    icon: Calendar,
    permission: 'hrms:leaves:read',
  },
  {
    title: 'HR Employees',
    url: '/hr/employees',
    icon: Users,
    permission: 'hrms:employees:read',
  },
  {
    title: 'HR Payroll',
    url: '/hr/payroll',
    icon: Wallet,
    permission: 'hrms:payroll:read',
  },
  {
    title: 'Departments',
    url: '/hr/departments',
    icon: Building2,
    permission: 'hrms:employees:read',
  },
  {
    title: 'Leave Types',
    url: '/hr/leave-types',
    icon: Calendar,
    permission: 'hrms:leaves:read',
  },
  {
    title: 'HR Documents',
    url: '/hr/documents',
    icon: FileText,
    permission: 'hrms:employees:read',
  },
  {
    title: 'HR Feedback',
    url: '/hr/feedback',
    icon: MessageSquare,
    permission: 'hrms:employees:read',
  },
  {
    title: 'HR Mental Health',
    url: '/hr/mental-health',
    icon: Heart,
    permission: 'hrms:employees:read',
  },
  {
    title: 'HR Tickets',
    url: '/hr/tickets',
    icon: Ticket,
    permission: 'hrms:employees:read',
  },
  {
    title: 'HR Increments',
    url: '/hr/increments',
    icon: TrendingUp,
    permission: 'hrms:employees:read',
  },
  {
    title: 'HR IJP',
    url: '/hr/ijp',
    icon: Briefcase,
    permission: 'hrms:employees:read',
  },
  // MD Only
  {
    title: 'MD Messages',
    url: '/md/anonymous-messages',
    icon: Mail,
    roles: ['MD', 'ADMIN'],
  },
  {
    title: 'MD Appointments',
    url: '/md/appointments',
    icon: CalendarCheck,
    roles: ['MD', 'ADMIN'],
  },
  // Finance Management - Only for FINANCE_HEAD, MD, and ADMIN
  {
    title: 'Fin Ledger',
    url: '/finance/ledger',
    icon: BookOpen,
    permission: 'finance:read',
  },
  {
    title: 'Fin Parties',
    url: '/finance/parties',
    icon: Building2,
    permission: 'finance:read',
  },
  {
    title: 'Fin Heads',
    url: '/finance/heads',
    icon: FolderTree,
    permission: 'finance:read',
  },
  {
    title: 'Fin Payment Modes',
    url: '/finance/payment-modes',
    icon: CreditCard,
    permission: 'finance:read',
  },
  {
    title: 'Fin Approvals',
    url: '/finance/approvals',
    icon: CheckCircle,
    permission: 'finance:approve',
  },
  {
    title: 'Fin Reports',
    url: '/finance/reports',
    icon: BarChart3,
    permission: 'finance:read',
  },
]

function getDashboardUrl(role: string): string {
  const routes: Record<string, string> = {
    MD: '/md/dashboard',
    SALES_HEAD: '/sales/dashboard',
    TEAM_LEAD: '/team-lead/dashboard',
    BD: '/bd/pipeline',
    INSURANCE_HEAD: '/insurance/dashboard',
    PL_HEAD: '/pl/dashboard',
    HR_HEAD: '/hr/users',
    FINANCE_HEAD: '/finance/ledger',
    ADMIN: '/admin/dashboard',
  }
  return routes[role] || '/dashboard'
}

export function AppSidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  if (!user) {
    return null
  }

  const filteredItems = navItems.filter((item) => {
    // HRMS items (starting with "My " or "Svc ") are available to all authenticated users
    if (item.title.startsWith('My ') || item.title.startsWith('Svc ')) {
      return true
    }
    // Admin users see all pages
    if (user.role === 'ADMIN') {
      return true
    }
    // If item has specific roles, check if user role matches
    if (item.roles) {
      return item.roles.includes(user.role)
    }
    // If item has permission requirement, check permission
    if (item.permission) {
      return hasPermission(user, item.permission)
    }
    return false
  })

  // Replace dashboard URL with role-specific dashboard and fix route mappings
  const itemsWithUrls = filteredItems.map((item) => {
    if (item.title === 'Dashboard') {
      return {
        ...item,
        url: getDashboardUrl(user.role),
      }
    }
    // Map Pipeline to role-specific paths
    if (item.title === 'Pipeline') {
      if (user.role === 'BD') {
        return { ...item, url: '/bd/pipeline' }
      }
      if (user.role === 'TEAM_LEAD') {
        return { ...item, url: '/team-lead/pipeline' }
      }
      // Admin can access BD pipeline as default
      if (user.role === 'ADMIN') {
        return { ...item, url: '/bd/pipeline' }
      }
    }
    // All other items already have correct URLs in navItems
    return item
  })

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Mediend CRM</span>
            <span className="text-xs text-muted-foreground">{user.name}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itemsWithUrls
                .filter((item) => 
                  !item.title.startsWith('My ') && 
                  !item.title.startsWith('Svc ') && 
                  !item.title.startsWith('HR ') && 
                  !item.title.startsWith('MD ') &&
                  !item.title.startsWith('Fin ') &&
                  item.title !== 'Departments' &&
                  item.title !== 'Leave Types'
                )
                .map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.url || pathname.startsWith(item.url + '/')
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.url}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>My HRMS</SidebarGroupLabel>
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
                        <Link href={item.url}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Services</SidebarGroupLabel>
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
                        <Link href={item.url}>
                          <Icon />
                          <span>{item.title.replace('Svc ', '')}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {itemsWithUrls.some((item) => item.title.startsWith('HR ')) && (
          <SidebarGroup>
            <SidebarGroupLabel>HR Management</SidebarGroupLabel>
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
                          <Link href={item.url}>
                            <Icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {itemsWithUrls.some((item) => item.title.startsWith('Fin ')) && (
          <SidebarGroup>
            <SidebarGroupLabel>Finance</SidebarGroupLabel>
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
                          <Link href={item.url}>
                            <Icon />
                            <span>{item.title.replace('Fin ', '')}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {(user.role === 'MD' || user.role === 'ADMIN') && (
          <SidebarGroup>
            <SidebarGroupLabel>MD Portal</SidebarGroupLabel>
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
                          <Link href={item.url}>
                            <Icon />
                            <span>{item.title.replace('MD ', '')}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Profile">
              <Link href="/profile">
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


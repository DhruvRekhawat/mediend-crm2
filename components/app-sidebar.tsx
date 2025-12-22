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
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'ADMIN'],
  },
  {
    title: 'My Leaves',
    url: '/employee/leaves',
    icon: Calendar,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'ADMIN'],
  },
  {
    title: 'My Profile',
    url: '/employee/profile',
    icon: UserCircle,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'ADMIN'],
  },
  {
    title: 'My Payroll',
    url: '/employee/payroll',
    icon: Wallet,
    roles: ['MD', 'SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'ADMIN'],
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
    // HRMS items (starting with "My ") are available to all authenticated users
    if (item.title.startsWith('My ')) {
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
                .filter((item) => !item.title.startsWith('My '))
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
        {itemsWithUrls.some((item) => item.title.startsWith('HR ')) && (
          <SidebarGroup>
            <SidebarGroupLabel>HR Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {itemsWithUrls
                  .filter((item) => item.title.startsWith('HR ') || item.title === 'Departments')
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


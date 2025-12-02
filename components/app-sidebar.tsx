'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  Users,
  Target,
  BarChart3,
  FileText,
  Shield,
  DollarSign,
  ClipboardList,
  Building2,
  LogOut,
  User,
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
    title: 'Leads',
    url: '/leads',
    icon: FileText,
    permission: 'leads:read',
  },
  {
    title: 'Targets',
    url: '/targets',
    icon: Target,
    permission: 'targets:read',
  },
  {
    title: 'Analytics',
    url: '/analytics',
    icon: BarChart3,
    permission: 'analytics:read',
  },
  {
    title: 'Insurance',
    url: '/insurance',
    icon: Shield,
    permission: 'insurance:read',
  },
  {
    title: 'P/L',
    url: '/pl',
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

  // Replace dashboard URL with role-specific dashboard
  const itemsWithUrls = filteredItems.map((item) => {
    if (item.title === 'Dashboard') {
      return {
        ...item,
        url: getDashboardUrl(user.role),
      }
    }
    // Map other items to role-specific paths
    if (item.title === 'Pipeline') {
      if (user.role === 'BD') {
        return { ...item, url: '/bd/pipeline' }
      }
      if (user.role === 'TEAM_LEAD') {
        return { ...item, url: '/team-lead/pipeline' }
      }
    }
    if (item.title === 'Targets' && user.role === 'SALES_HEAD') {
      return { ...item, url: '/sales/targets' }
    }
    if (item.title === 'Insurance' && user.role === 'INSURANCE_HEAD') {
      return { ...item, url: '/insurance/dashboard' }
    }
    if (item.title === 'P/L' && user.role === 'PL_HEAD') {
      return { ...item, url: '/pl/dashboard' }
    }
    if (item.title === 'Users' && user.role === 'HR_HEAD') {
      return { ...item, url: '/hr/users' }
    }
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
              {itemsWithUrls.map((item) => {
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


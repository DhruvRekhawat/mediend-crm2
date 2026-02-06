import * as React from 'react'
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  FolderTree,
  Heart,
  IndianRupee,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Package,
  Plus,
  Shield,
  ShieldCheck,
  Target,
  Ticket,
  TrendingUp,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react'
import { SessionUser } from '@/lib/auth'
import { hasPermission, type Permission } from '@/lib/rbac'

export interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  permission?: Permission
  roles?: string[]
}

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    roles: ['SALES_HEAD', 'TEAM_LEAD', 'INSURANCE_HEAD', 'PL_HEAD', 'ADMIN'],
  },
  {
    title: 'Sales Dashboard',
    url: '/md/sales',
    icon: TrendingUp,
    roles: ['MD', 'ADMIN'],
  },
  {
    title: 'Finance Dashboard',
    url: '/md/finance',
    icon: DollarSign,
    roles: ['MD', 'ADMIN'],
  },
  {
    title: 'HR Dashboard',
    url: '/md/hr',
    icon: Users,
    roles: ['MD', 'ADMIN'],
  },
  {
    title: 'Pipeline',
    url: '/pipeline',
    icon: ClipboardList,
    roles: ['BD', 'TEAM_LEAD'],
  },
  {
    title: 'KYP',
    url: '/bd/kyp',
    icon: FileText,
    roles: ['BD', 'TEAM_LEAD', 'SALES_HEAD'],
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
  {
    title: 'My Attendance',
    url: '/employee/attendance',
    icon: Clock,
    roles: ['SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Leaves',
    url: '/employee/leaves',
    icon: Calendar,
    roles: ['SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Profile',
    url: '/employee/profile',
    icon: UserCircle,
    roles: ['SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Payroll',
    url: '/employee/payroll',
    icon: Wallet,
    roles: ['SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Documents',
    url: '/employee/documents',
    icon: FileText,
    roles: ['SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Feedback',
    url: '/employee/feedback',
    icon: MessageSquare,
    roles: ['SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Tickets',
    url: '/employee/tickets',
    icon: Ticket,
    roles: ['SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'My Increment',
    url: '/employee/increment',
    icon: TrendingUp,
    roles: ['SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'Svc Anonymous Msg',
    url: '/employee/anonymous-message',
    icon: ShieldCheck,
    roles: ['SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'Svc MD Appointment',
    url: '/employee/md-appointment',
    icon: CalendarCheck,
    roles: ['SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'Svc Mental Health',
    url: '/employee/mental-health',
    icon: Heart,
    roles: ['SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
  {
    title: 'Svc Job Postings',
    url: '/employee/ijp',
    icon: Briefcase,
    roles: ['SALES_HEAD', 'TEAM_LEAD', 'BD', 'INSURANCE_HEAD', 'PL_HEAD', 'HR_HEAD', 'FINANCE_HEAD', 'ADMIN', 'USER'],
  },
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
  {
    title: 'MD Task Management',
    url: '/md/tasks',
    icon: ClipboardList,
    roles: ['MD', 'ADMIN'],
  },
  {
    title: 'Fin Ledger',
    url: '/finance/ledger',
    icon: BookOpen,
    permission: 'finance:read',
  },
  {
    title: 'Fin New Ledger Entry',
    url: '/finance/ledger/new',
    icon: Plus,
    permission: 'finance:write',
  },
  {
    title: 'Fin Sales',
    url: '/finance/sales',
    icon: IndianRupee,
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
    title: 'Fin Projects',
    url: '/finance/projects',
    icon: Target,
    permission: 'finance:read',
  },
  {
    title: 'Fin Payment Modes',
    url: '/finance/payment-modes',
    icon: CreditCard,
    permission: 'finance:read',
  },
  {
    title: 'Fin Inventory',
    url: '/finance/inventory',
    icon: Package,
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

export function getDashboardUrl(role: string): string {
  const routes: Record<string, string> = {
    MD: '/md/sales',
    SALES_HEAD: '/sales/dashboard',
    TEAM_LEAD: '/team-lead/dashboard',
    BD: '/bd/pipeline',
    INSURANCE_HEAD: '/insurance/dashboard',
    PL_HEAD: '/pl/dashboard',
    HR_HEAD: '/hr/users',
    FINANCE_HEAD: '/finance/ledger',
    ADMIN: '/md/sales',
  }
  return routes[role] ?? '/dashboard'
}

function filterNavItems(user: SessionUser | null): NavItem[] {
  if (!user) return []
  return navItems.filter((item) => {
    if (user.role === 'MD') {
      return (
        item.title === 'Sales Dashboard' ||
        item.title === 'Finance Dashboard' ||
        item.title === 'HR Dashboard' ||
        item.title.startsWith('MD ')
      )
    }
    if (item.title.startsWith('My ') || item.title.startsWith('Svc ')) {
      return true
    }
    if (user.role === 'ADMIN') {
      return true
    }
    if (item.roles) {
      return item.roles.includes(user.role)
    }
    if (item.permission) {
      return hasPermission(user, item.permission)
    }
    return false
  })
}

function mapItemUrls(items: NavItem[], role: string): (NavItem & { url: string })[] {
  return items.map((item) => {
    if (item.title === 'Dashboard') {
      return { ...item, url: getDashboardUrl(role) }
    }
    if (item.title === 'Pipeline') {
      if (role === 'BD') return { ...item, url: '/bd/pipeline' }
      if (role === 'TEAM_LEAD') return { ...item, url: '/team-lead/pipeline' }
      if (role === 'ADMIN') return { ...item, url: '/bd/pipeline' }
    }
    return item
  })
}

/**
 * Returns the full list of nav items allowed for the user, with URLs resolved (dashboard, pipeline, etc.).
 * Same order as sidebar. Used by sidebar and by getFirstNavUrl.
 */
export function getFilteredNavItemsWithUrls(user: SessionUser | null): (NavItem & { url: string })[] {
  const filtered = filterNavItems(user)
  return mapItemUrls(filtered, user?.role ?? '')
}

/**
 * Returns the URL of the first nav item for the user (first link they see in the sidebar).
 * Use for post-login and root redirect so users never hit 404.
 */
export function getFirstNavUrl(user: SessionUser | null): string {
  const items = getFilteredNavItemsWithUrls(user)
  const first = items[0]
  return first?.url ?? '/dashboard'
}

'use client'

import { useRef, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/hooks/use-auth'
import { useBadgeCounts } from '@/hooks/use-badge-counts'
import { useNotifications } from '@/hooks/use-notifications'
import { useAppSettings, useUpdateSetting } from '@/hooks/use-settings'
import { useFileUpload } from '@/hooks/use-file-upload'
import { getFilteredNavItemsWithUrls } from '@/lib/sidebar-nav'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Camera,
  Edit3,
  Check,
  X,
  Bell,
  ExternalLink,
  Clock,
  Quote,
  Home,
  BarChart3,
  Target,
  Users,
  FileText,
  MessageSquare,
  Calendar,
  CreditCard,
  Shield,
  DollarSign,
  Wallet,
  ClipboardList,
  UserCircle,
  TrendingUp,
  Briefcase,
  Heart,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Nav item → accent color mapping ─────────────────────────────────────────

const ICON_COLOR_MAP: Record<string, string> = {
  Tasks: 'bg-blue-100 text-blue-600',
  Dashboard: 'bg-indigo-100 text-indigo-600',
  'Sales Dashboard': 'bg-emerald-100 text-emerald-600',
  'Finance Dashboard': 'bg-amber-100 text-amber-600',
  'HR Dashboard': 'bg-purple-100 text-purple-600',
  Pipeline: 'bg-orange-100 text-orange-600',
  KYP: 'bg-cyan-100 text-cyan-600',
  Targets: 'bg-rose-100 text-rose-600',
  Teams: 'bg-violet-100 text-violet-600',
  Insurance: 'bg-sky-100 text-sky-600',
  'Cash Cases': 'bg-teal-100 text-teal-600',
  Chat: 'bg-pink-100 text-pink-600',
  'P/L': 'bg-lime-100 text-lime-600',
  Outstanding: 'bg-red-100 text-red-600',
  Users: 'bg-slate-100 text-slate-600',
  Reports: 'bg-yellow-100 text-yellow-600',
  'My Core HR': 'bg-purple-100 text-purple-600',
  'My Financial': 'bg-green-100 text-green-600',
  'My Support & Services': 'bg-blue-100 text-blue-600',
  'My Team': 'bg-indigo-100 text-indigo-600',
  'HR Attendance': 'bg-orange-100 text-orange-600',
  'HR Leaves': 'bg-cyan-100 text-cyan-600',
  'HR Employees': 'bg-violet-100 text-violet-600',
  'Fin Payroll': 'bg-emerald-100 text-emerald-600',
  Departments: 'bg-amber-100 text-amber-600',
  'MD Messages': 'bg-pink-100 text-pink-600',
  Appointments: 'bg-sky-100 text-sky-600',
  Surgeries: 'bg-red-100 text-red-600',
  Finance: 'bg-yellow-100 text-yellow-600',
  'Finance Ledger': 'bg-lime-100 text-lime-600',
  Calendar: 'bg-teal-100 text-teal-600',
}

function getNavIconColor(title: string) {
  return ICON_COLOR_MAP[title] ?? 'bg-primary/10 text-primary'
}

// ─── Banner section ────────────────────────────────────────────────────────────

function BannerSection({
  bannerUrl,
  greeting,
  firstName,
  canEdit,
  onBannerChange,
}: {
  bannerUrl?: string
  greeting: string
  firstName: string
  canEdit: boolean
  onBannerChange: (file: File) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative w-full rounded-2xl overflow-hidden min-h-[180px] md:min-h-[220px]">
      {bannerUrl ? (
        <Image
          src={bannerUrl}
          alt="Home banner"
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-[#062D4C] via-[#0a4a7a] to-[#1EC5B7]" />
      )}
      {/* Overlay gradient for text legibility */}
      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />

      {/* Greeting text */}
      <div className="relative z-10 flex flex-col justify-end h-full min-h-[180px] md:min-h-[220px] p-5 md:p-8">
        <p className="text-white/80 text-sm md:text-base font-medium mb-1">{greeting},</p>
        <h1 className="text-white text-2xl md:text-4xl font-bold tracking-tight">{firstName} 👋</h1>
      </div>

      {/* Change banner button - MD/ADMIN only */}
      {canEdit && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-1.5 hover:bg-black/60 transition-colors"
        >
          <Camera className="h-3.5 w-3.5" />
          Change banner
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onBannerChange(file)
        }}
      />
    </div>
  )
}

// ─── Thought of the Day ───────────────────────────────────────────────────────

const DEFAULT_THOUGHT =
  'The secret of getting ahead is getting started. — Mark Twain'

const DEFAULT_BANNER = '/Multicolored Mountain Landscape.png'

function ThoughtOfTheDay({
  thought,
  canEdit,
  onSave,
}: {
  thought: string
  canEdit: boolean
  onSave: (val: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(thought)

  const handleSave = () => {
    onSave(draft)
    setEditing(false)
  }

  const handleCancel = () => {
    setDraft(thought)
    setEditing(false)
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex gap-3 items-start shadow-sm">
      <Quote className="h-5 w-5 text-[#1EC5B7] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex flex-col gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="gap-1">
                <Check className="h-3.5 w-3.5" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} className="gap-1">
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic leading-relaxed">{thought}</p>
        )}
      </div>
      {canEdit && !editing && (
        <button
          type="button"
          onClick={() => { setDraft(thought); setEditing(true) }}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Edit thought of the day"
        >
          <Edit3 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// ─── Notifications panel ───────────────────────────────────────────────────────

function RecentNotifications() {
  const { data: notifications = [] } = useNotifications(true)
  const recent = notifications.slice(0, 5)

  if (recent.length === 0) return null

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Recent Notifications</span>
        </div>
        <span className="text-xs text-muted-foreground">{recent.length} unread</span>
      </div>
      <ul className="divide-y divide-border">
        {recent.map((n) => (
          <li key={n.id}>
            {n.link ? (
              <Link
                href={n.link}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <span className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n.message}</p>
                </span>
                <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                  <ExternalLink className="h-3 w-3 ml-1" />
                </div>
              </Link>
            ) : (
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n.message}</p>
                </span>
                <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── KPI section ──────────────────────────────────────────────────────────────

function KPISection() {
  const { user } = useAuth()
  const { data: badgeCounts } = useBadgeCounts()
  const isMdOrAdmin = user?.role === 'MD' || user?.role === 'ADMIN'

  if (isMdOrAdmin) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        <StatCard
          label="Pending task reviews"
          value={badgeCounts?.pendingTaskReviews ?? '—'}
          accent="amber"
          valueAccent
        />
        <StatCard
          label="My overdue tasks"
          value={badgeCounts?.myOverdueTasks ?? '—'}
          accent="red"
          valueAccent
        />
        <StatCard
          label="Finance approvals"
          value={badgeCounts?.pendingFinanceApprovals ?? '—'}
          accent="purple"
          valueAccent
        />
        <StatCard
          label="Pending appointments"
          value={badgeCounts?.pendingAppointments ?? '—'}
          accent="blue"
        />
        <StatCard
          label="Unread messages"
          value={badgeCounts?.unreadMessages ?? '—'}
          accent="teal"
        />
        <StatCard
          label="Due date approvals"
          value={badgeCounts?.pendingDueDateApprovals ?? '—'}
          accent="orange"
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <StatCard
        label="My pending tasks"
        value={badgeCounts?.myPendingTasks ?? '—'}
        accent="amber"
        valueAccent
      />
      <StatCard
        label="Overdue tasks"
        value={badgeCounts?.myOverdueTasks ?? '—'}
        accent="red"
        valueAccent
      />
      <StatCard
        label="Due date approvals"
        value={badgeCounts?.pendingDueDateApprovals ?? '—'}
        accent="purple"
      />
    </div>
  )
}

// ─── Navigation cards ─────────────────────────────────────────────────────────

function NavCard({
  title,
  url,
  icon: Icon,
  badge,
}: {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}) {
  const colorClass = getNavIconColor(title)

  return (
    <Link
      href={url}
      className="bg-card border border-border rounded-xl p-4 flex flex-col items-start gap-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-95 group shadow-sm"
    >
      <div className={cn('rounded-xl p-2.5 flex items-center justify-center relative', colorClass)}>
        <Icon className="h-5 w-5" />
        {badge != null && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none px-[3px] ring-[1.5px] ring-background">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-tight">
        {title}
      </span>
    </Link>
  )
}

function NavCards() {
  const { user } = useAuth()
  const { data: badgeCounts } = useBadgeCounts()
  const navItems = useMemo(() => getFilteredNavItemsWithUrls(user ?? null), [user])

  const getBadge = (title: string) => {
    if (!badgeCounts) return undefined
    if (title === 'Tasks') return (badgeCounts.pendingTaskReviews ?? 0) + (badgeCounts.pendingDueDateApprovals ?? 0)
    if (title === 'MD Messages') return badgeCounts.unreadMessages
    if (title === 'Appointments') return badgeCounts.pendingAppointments
    if (title === 'Finance' || title === 'Finance Ledger') return badgeCounts.pendingFinanceApprovals
    return undefined
  }

  if (navItems.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Quick Navigation
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {navItems.map((item) => (
          <NavCard
            key={item.url}
            title={item.title}
            url={item.url}
            icon={item.icon}
            badge={getBadge(item.title)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth()
  const canEdit = user?.role === 'MD' || user?.role === 'ADMIN'

  const { data: settings } = useAppSettings(['banner_image_url', 'thought_of_the_day'])
  const updateSetting = useUpdateSetting()
  const { uploadFile, uploading } = useFileUpload({ folder: 'home-banners' })

  const greeting = getGreeting()
  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there'
  const bannerUrl = settings?.banner_image_url || DEFAULT_BANNER
  const thought = settings?.thought_of_the_day || DEFAULT_THOUGHT

  const handleBannerChange = useCallback(
    async (file: File) => {
      const result = await uploadFile(file)
      if (result?.url) {
        updateSetting.mutate({ key: 'banner_image_url', value: result.url })
      }
    },
    [uploadFile, updateSetting]
  )

  const handleSaveThought = useCallback(
    (value: string) => {
      updateSetting.mutate({ key: 'thought_of_the_day', value })
    },
    [updateSetting]
  )

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
      {/* Banner + Greeting */}
      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-card rounded-xl px-6 py-4 flex items-center gap-3 shadow-xl">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm font-medium">Uploading banner…</span>
          </div>
        </div>
      )}

      <BannerSection
        bannerUrl={bannerUrl}
        greeting={greeting}
        firstName={firstName}
        canEdit={canEdit}
        onBannerChange={handleBannerChange}
      />

      {/* Thought of the Day */}
      <ThoughtOfTheDay
        thought={thought}
        canEdit={canEdit}
        onSave={handleSaveThought}
      />

      {/* KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          At a Glance
        </h2>
        <KPISection />
      </div>

      {/* Recent Notifications */}
      <RecentNotifications />

      {/* Navigation cards */}
      <NavCards />
    </div>
  )
}

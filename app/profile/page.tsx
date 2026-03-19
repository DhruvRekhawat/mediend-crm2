'use client'

import { Button } from '@/components/ui/button'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useState } from 'react'
import {
  User,
  Mail,
  Hash,
  Calendar,
  Building,
  Cake,
  Edit,
  Key,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Info,
} from 'lucide-react'
import { format } from 'date-fns'
import { BirthdayCard } from '@/components/birthday-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { ChangePasswordDialog } from './change-password-dialog'
import { EditProfileDialog, type ProfileData } from './edit-profile-dialog'

function maskPan(pan: string) {
  if (pan.length < 5) return pan
  return pan.slice(0, 5) + '••••' + pan.slice(-1)
}

function maskAadhar(aadhar: string) {
  const cleaned = aadhar.replace(/\s/g, '')
  if (cleaned.length < 4) return aadhar
  return '•••• •••• ' + cleaned.slice(-4)
}

function maskBankAccount(acc: string) {
  if (acc.length < 4) return acc
  return '••••' + acc.slice(-4)
}

function maskUan(uan: string) {
  const cleaned = uan.replace(/\s/g, '')
  if (cleaned.length < 4) return uan
  return '••••••••' + cleaned.slice(-4)
}

// ── Field row (mobile-friendly tap target) ───────────────────────────────────
function FieldRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType
  label: string
  value: string | null
  mono?: boolean
}) {
  const display = value || 'Not set'
  const empty = !value
  return (
    <div className="flex items-center gap-3 py-3 min-h-[44px]">
      <div className="w-9 h-9 rounded-lg bg-muted/80 flex items-center justify-center shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            'text-sm font-medium truncate',
            empty && 'text-muted-foreground italic',
            mono && 'font-mono text-[13px]'
          )}
        >
          {display}
        </p>
      </div>
    </div>
  )
}

// ── Section block ─────────────────────────────────────────────────────────────
function Section({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-2xl border bg-card p-4 sm:p-5', className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-1">
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: () => apiGet<ProfileData>('/api/profile'),
    retry: false,
  })

  const user = profile?.user
  const employee = profile?.employee

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        User not found
      </div>
    )
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="pb-8">
      {employee && <BirthdayCard />}

      {/* Profile card - photo left, info & buttons right */}
      <div className="px-4 sm:px-6 max-w-2xl mx-auto">
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
            {/* Photo - left */}
            <Avatar className="size-20 sm:size-24 border-2 border-border shrink-0">
              <AvatarImage src={user.profilePicture ?? undefined} alt={user.name} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info & buttons - right */}
            <div className="flex-1 min-w-0 w-full text-center sm:text-left">
              <h1 className="text-xl font-semibold truncate">{user.name}</h1>
              <span className="mt-1 inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                {user.role.replace(/_/g, ' ')}
              </span>
              {employee?.employeeCode && (
                <p className="mt-0.5 text-xs text-muted-foreground">#{employee.employeeCode}</p>
              )}
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground justify-center sm:justify-start">
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 justify-center sm:justify-start text-[11px] text-muted-foreground">
                {employee?.joinDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3" />
                    Joined {format(new Date(employee.joinDate), 'MMM yyyy')}
                  </span>
                )}
                {employee?.dateOfBirth && (
                  <span className="inline-flex items-center gap-1">
                    <Cake className="size-3" />
                    Birthday {format(new Date(employee.dateOfBirth), 'MMM d')}
                  </span>
                )}
                {employee?.department?.name && (
                  <span className="inline-flex items-center gap-1">
                    <Building className="size-3" />
                    {employee.department.name}
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                <Button
                  size="sm"
                  onClick={() => setIsEditOpen(true)}
                  className="h-9 px-4 gap-2 rounded-lg"
                >
                  <Edit className="size-4" />
                  Edit profile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPasswordOpen(true)}
                  className="h-9 px-4 gap-2 rounded-lg"
                >
                  <Key className="size-4" />
                  Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - single column, stacked sections */}
      <div className="space-y-4 px-4 sm:px-6 max-w-2xl mx-auto">
        {/* Personal */}
        <Section title="Personal">
          <div className="divide-y divide-border/60 -mx-4 sm:-mx-5">
            <div className="px-4 sm:px-5">
              <FieldRow icon={User} label="Name" value={user.name} />
            </div>
            <div className="px-4 sm:px-5">
              <FieldRow icon={Mail} label="Email" value={user.email} />
            </div>
            <div className="px-4 sm:px-5">
              <FieldRow icon={Phone} label="Phone" value={user.phoneNumber} />
            </div>
            <div className="px-4 sm:px-5">
              <FieldRow icon={MapPin} label="Address" value={user.address} />
            </div>
          </div>
        </Section>

        {/* Employment */}
        {employee ? (
          <Section title="Employment">
            <div className="divide-y divide-border/60 -mx-4 sm:-mx-5">
              <div className="px-4 sm:px-5">
                <FieldRow icon={Hash} label="Employee code" value={employee.employeeCode} mono />
              </div>
              <div className="px-4 sm:px-5">
                <FieldRow
                  icon={FileText}
                  label="Position"
                  value={employee.designation ?? user.role ?? null}
                />
              </div>
              <div className="px-4 sm:px-5">
                <FieldRow
                  icon={Building}
                  label="Department"
                  value={employee.department?.name ?? null}
                />
              </div>
              {employee.joinDate && (
                <div className="px-4 sm:px-5">
                  <FieldRow
                    icon={Calendar}
                    label="Join date"
                    value={format(new Date(employee.joinDate), 'PPP')}
                  />
                </div>
              )}
              {employee.dateOfBirth && (
                <div className="px-4 sm:px-5">
                  <FieldRow
                    icon={Cake}
                    label="Date of birth"
                    value={format(new Date(employee.dateOfBirth), 'PPP')}
                  />
                </div>
              )}
              <div className="px-4 sm:px-5">
                <FieldRow
                  icon={FileText}
                  label="PAN"
                  value={employee.panNumber ? maskPan(employee.panNumber) : null}
                  mono
                />
              </div>
              <div className="px-4 sm:px-5">
                <FieldRow
                  icon={FileText}
                  label="Aadhar"
                  value={employee.aadharNumber ? maskAadhar(employee.aadharNumber) : null}
                  mono
                />
              </div>
              <div className="px-4 sm:px-5">
                <FieldRow
                  icon={CreditCard}
                  label="UAN"
                  value={employee.uanNumber ? maskUan(employee.uanNumber) : null}
                  mono
                />
              </div>
            </div>
          </Section>
        ) : (
          <Section title="Employment">
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p>Employee record not found</p>
              <p className="text-xs mt-1">Contact HR to set up your profile</p>
            </div>
          </Section>
        )}

        {/* Bank */}
        {employee && (
          <Section title="Bank account">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Account holder</p>
                <p className="text-sm font-medium">
                  {employee.bankAccountName || (
                    <span className="text-muted-foreground italic">Not set</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Account number</p>
                <p className="text-sm font-mono">
                  {employee.bankAccountNumber
                    ? maskBankAccount(employee.bankAccountNumber)
                    : <span className="text-muted-foreground italic font-sans">Not set</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">IFSC</p>
                <p className="text-sm font-mono">
                  {employee.ifscCode || (
                    <span className="text-muted-foreground italic font-sans">Not set</span>
                  )}
                </p>
              </div>
            </div>
            <p className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="size-3.5 shrink-0" />
              Bank details can only be changed by HR once saved
            </p>
          </Section>
        )}
      </div>

      <ChangePasswordDialog
        userId={user.id}
        isOpen={isPasswordOpen}
        onOpenChange={setIsPasswordOpen}
      />
      <EditProfileDialog
        profile={profile!}
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['profile'] })}
      />
    </div>
  )
}

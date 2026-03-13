'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMutation } from '@tanstack/react-query'
import { apiPatch, apiPost } from '@/lib/api-client'
import { useState, useRef } from 'react'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export interface ProfileUser {
  id: string
  name: string
  email: string
  role: string
  teamId: string | null
  phoneNumber: string | null
  address: string | null
  profilePicture: string | null
}

export interface ProfileEmployee {
  id: string
  employeeCode: string
  joinDate: Date | null
  dateOfBirth: Date | null
  panNumber: string | null
  aadharNumber: string | null
  bankAccountName: string | null
  bankAccountNumber: string | null
  ifscCode: string | null
  department: {
    id: string
    name: string
    description: string | null
  } | null
}

export interface ProfileData {
  user: ProfileUser
  employee: ProfileEmployee | null
}

interface EditProfileDialogProps {
  profile: ProfileData
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditProfileDialog({ profile, isOpen, onOpenChange, onSuccess }: EditProfileDialogProps) {
  const { user, employee } = profile
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState(() => ({
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber ?? '',
    address: user.address ?? '',
    profilePicture: user.profilePicture ?? '',
    panNumber: employee?.panNumber ?? '',
    aadharNumber: employee?.aadharNumber ?? '',
    bankAccountName: employee?.bankAccountName ?? '',
    bankAccountNumber: employee?.bankAccountNumber ?? '',
    ifscCode: employee?.ifscCode ?? '',
  }))

  const panLocked = !!(employee?.panNumber)
  const aadharLocked = !!(employee?.aadharNumber)
  const bankLocked =
    !!(employee?.bankAccountName) || !!(employee?.bankAccountNumber) || !!(employee?.ifscCode)

  const uploadPhoto = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await apiPost<{ url: string }>('/api/profile/upload', fd)
      if (res?.url) {
        setFormData((p) => ({ ...p, profilePicture: res.url }))
        toast.success('Photo uploaded')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const mutation = useMutation({
    mutationFn: (data: Record<string, string | null>) => apiPatch('/api/profile', data),
    onSuccess: () => {
      toast.success('Profile updated')
      onOpenChange(false)
      onSuccess()
    },
    onError: (e: Error) => toast.error(e.message || 'Update failed'),
  })

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (open) {
      setFormData({
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber ?? '',
        address: user.address ?? '',
        profilePicture: user.profilePicture ?? '',
        panNumber: employee?.panNumber ?? '',
        aadharNumber: employee?.aadharNumber ?? '',
        bankAccountName: employee?.bankAccountName ?? '',
        bankAccountNumber: employee?.bankAccountNumber ?? '',
        ifscCode: employee?.ifscCode ?? '',
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, string | null> = {
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phoneNumber || null,
      address: formData.address || null,
      profilePicture: formData.profilePicture || null,
    }
    if (employee) {
      if (!panLocked) payload.panNumber = formData.panNumber || null
      if (!aadharLocked) payload.aadharNumber = formData.aadharNumber || null
      if (!bankLocked) {
        payload.bankAccountName = formData.bankAccountName || null
        payload.bankAccountNumber = formData.bankAccountNumber || null
        payload.ifscCode = formData.ifscCode || null
      }
    }
    mutation.mutate(payload)
  }

  const initials = formData.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            PAN, Aadhar and bank details can only be changed by HR once saved.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
          />
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={formData.profilePicture || undefined} alt={formData.name} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              <Camera className="size-4" />
              {uploading ? 'Uploading…' : 'Change photo'}
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value.toLowerCase().trim() }))}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phoneNumber}
                onChange={(e) => setFormData((p) => ({ ...p, phoneNumber: e.target.value }))}
                placeholder="+91 98765 43210"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                placeholder="Your address"
                className="mt-1.5"
              />
            </div>
          </div>

          {employee && (
            <div className="space-y-3 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground">Identity & bank (first-time only)</p>
              <div>
                <Label>PAN</Label>
                <Input
                  value={formData.panNumber}
                  onChange={(e) => setFormData((p) => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  disabled={panLocked}
                  className="mt-1.5 font-mono"
                />
                {panLocked && <p className="text-xs text-muted-foreground mt-1">Contact HR to update</p>}
              </div>
              <div>
                <Label>Aadhar</Label>
                <Input
                  value={formData.aadharNumber}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, aadharNumber: e.target.value.replace(/\D/g, '').slice(0, 12) }))
                  }
                  placeholder="12 digits"
                  maxLength={12}
                  disabled={aadharLocked}
                  className="mt-1.5 font-mono"
                />
                {aadharLocked && <p className="text-xs text-muted-foreground mt-1">Contact HR to update</p>}
              </div>
              <div>
                <Label>Bank account holder</Label>
                <Input
                  value={formData.bankAccountName}
                  onChange={(e) => setFormData((p) => ({ ...p, bankAccountName: e.target.value }))}
                  disabled={bankLocked}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Account number</Label>
                <Input
                  value={formData.bankAccountNumber}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, bankAccountNumber: e.target.value.replace(/\D/g, '') }))
                  }
                  disabled={bankLocked}
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <Label>IFSC</Label>
                <Input
                  value={formData.ifscCode}
                  onChange={(e) => setFormData((p) => ({ ...p, ifscCode: e.target.value.toUpperCase() }))}
                  placeholder="SBIN0001234"
                  maxLength={11}
                  disabled={bankLocked}
                  className="mt-1.5 font-mono"
                />
                {bankLocked && <p className="text-xs text-muted-foreground mt-1">Contact HR to update</p>}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="flex-1">
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

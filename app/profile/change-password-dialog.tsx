'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMutation } from '@tanstack/react-query'
import { apiPatch } from '@/lib/api-client'
import { useState } from 'react'
import { toast } from 'sonner'

interface ChangePasswordDialogProps {
  userId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({ userId, isOpen, onOpenChange }: ChangePasswordDialogProps) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const mutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiPatch(`/api/users/${userId}/password`, data),
    onSuccess: () => {
      toast.success('Password changed')
      onOpenChange(false)
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to change password'),
  })

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (!open) setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    mutation.mutate({ currentPassword: formData.currentPassword, newPassword: formData.newPassword })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="current">Current password</Label>
            <Input
              id="current"
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData((p) => ({ ...p, currentPassword: e.target.value }))}
              required
              placeholder="••••••••"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="new">New password</Label>
            <Input
              id="new"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData((p) => ({ ...p, newPassword: e.target.value }))}
              required
              minLength={6}
              placeholder="Min 6 characters"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
              required
              minLength={6}
              placeholder="••••••••"
              className="mt-1.5"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="flex-1">
              {mutation.isPending ? 'Updating…' : 'Update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

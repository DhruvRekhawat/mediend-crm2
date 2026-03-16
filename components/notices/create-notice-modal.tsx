'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from 'sonner'
import { BADGE_COUNTS_QUERY_KEY } from '@/hooks/use-badge-counts'
import { Search } from 'lucide-react'

interface CreateNoticeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Department {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export function CreateNoticeModal({ open, onOpenChange }: CreateNoticeModalProps) {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetType, setTargetType] = useState<'EVERYONE' | 'EVERYONE_EXCEPT_MD' | 'DEPARTMENT' | 'SPECIFIC'>('EVERYONE')
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>('')
  const [targetUserIds, setTargetUserIds] = useState<string[]>([])
  const [peopleSearch, setPeopleSearch] = useState('')

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiGet<Department[]>('/api/departments'),
    enabled: open && targetType === 'DEPARTMENT',
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users-list'],
    queryFn: () => apiGet<User[]>('/api/users'),
    enabled: open && targetType === 'SPECIFIC',
  })

  const filteredUsers = useMemo(() => {
    if (!peopleSearch.trim()) return users
    const q = peopleSearch.toLowerCase().trim()
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    )
  }, [users, peopleSearch])

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string
      body: string
      targetType: string
      targetDepartmentId?: string | null
      targetUserIds?: string[]
    }) => apiPost('/api/notices', data),
    onSuccess: () => {
      toast.success('Notice created successfully')
      onOpenChange(false)
      setStep(1)
      setTitle('')
      setBody('')
      setTargetType('EVERYONE')
      setTargetDepartmentId('')
      setTargetUserIds([])
      setPeopleSearch('')
      queryClient.invalidateQueries({ queryKey: ['notices-list', 'notices-pending'] })
      queryClient.invalidateQueries({ queryKey: BADGE_COUNTS_QUERY_KEY })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!body.trim()) {
      toast.error('Body is required')
      return
    }
    if (targetType === 'DEPARTMENT' && !targetDepartmentId) {
      toast.error('Please select a department')
      return
    }
    if (targetType === 'SPECIFIC' && targetUserIds.length === 0) {
      toast.error('Please select at least one person')
      return
    }
    createMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      targetType,
      targetDepartmentId: targetType === 'DEPARTMENT' ? targetDepartmentId : null,
      targetUserIds: targetType === 'SPECIFIC' ? targetUserIds : undefined,
    })
  }

  const toggleUser = (userId: string) => {
    setTargetUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const content = (
    <div className="space-y-6">
      {step === 1 ? (
        <>
          <div>
            <Label className="mb-3 block">Select recipients</Label>
            <Select value={targetType} onValueChange={(v) => setTargetType(v as typeof targetType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EVERYONE">Everyone</SelectItem>
                <SelectItem value="EVERYONE_EXCEPT_MD">Everyone except MD</SelectItem>
                <SelectItem value="DEPARTMENT">Department</SelectItem>
                <SelectItem value="SPECIFIC">Specific people</SelectItem>
              </SelectContent>
            </Select>
            {targetType === 'DEPARTMENT' && (
              <div className="mt-3">
                <Select value={targetDepartmentId} onValueChange={setTargetDepartmentId}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {targetType === 'SPECIFIC' && (
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-2">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${u.id}`}
                        checked={targetUserIds.includes(u.id)}
                        onCheckedChange={() => toggleUser(u.id)}
                      />
                      <Label
                        htmlFor={`user-${u.id}`}
                        className="font-normal cursor-pointer text-sm flex-1"
                      >
                        {u.name} ({u.email})
                      </Label>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">
                      No matching people
                    </p>
                  )}
                </div>
                {targetUserIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {targetUserIds.length} selected
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={
                (targetType === 'DEPARTMENT' && !targetDepartmentId) ||
                (targetType === 'SPECIFIC' && targetUserIds.length === 0)
              }
            >
              Next
            </Button>
          </div>
        </>
      ) : (
        <>
          <div>
            <Label htmlFor="notice-title">Title *</Label>
            <Input
              id="notice-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notice title"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="notice-body">Body *</Label>
            <Textarea
              id="notice-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Notice content..."
              rows={5}
              className="mt-2"
            />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || !title.trim() || !body.trim()}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Notice'}
            </Button>
          </div>
        </>
      )}
    </div>
  )

  const step1Title = 'Select Recipients'
  const step2Title = 'Create Notice'

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] rounded-t-2xl">
          <DrawerHeader>
            <DrawerTitle>{step === 1 ? step1Title : step2Title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">{content}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step === 1 ? step1Title : step2Title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}

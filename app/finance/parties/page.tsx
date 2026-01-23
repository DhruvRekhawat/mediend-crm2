'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import { Plus, Pencil, Search } from 'lucide-react'
import { toast } from 'sonner'

interface Party {
  id: string
  name: string
  partyType: 'BUYER' | 'SELLER' | 'VENDOR' | 'CLIENT' | 'SUPPLIER'
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  gstNumber: string | null
  panNumber: string | null
  address: string | null
  isActive: boolean
}

interface PartiesResponse {
  data: Party[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const PARTY_TYPES = ['BUYER', 'SELLER', 'VENDOR', 'CLIENT', 'SUPPLIER'] as const

export default function PartiesPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingParty, setEditingParty] = useState<Party | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    partyType: 'BUYER' as typeof PARTY_TYPES[number],
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    gstNumber: '',
    panNumber: '',
    address: '',
  })

  const queryClient = useQueryClient()

  const { data: partiesData, isLoading } = useQuery<PartiesResponse>({
    queryKey: ['parties', search, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (typeFilter !== 'all') params.set('partyType', typeFilter)
      params.set('isActive', 'true')
      return apiGet<PartiesResponse>(`/api/finance/parties?${params.toString()}`)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiPost('/api/finance/parties', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] })
      setIsDialogOpen(false)
      resetForm()
      toast.success('Party created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create party')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> & { isActive?: boolean } }) =>
      apiPatch(`/api/finance/parties/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parties'] })
      setIsDialogOpen(false)
      setEditingParty(null)
      resetForm()
      toast.success('Party updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update party')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      partyType: 'BUYER',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      gstNumber: '',
      panNumber: '',
      address: '',
    })
  }

  const handleEdit = (party: Party) => {
    setEditingParty(party)
    setFormData({
      name: party.name,
      partyType: party.partyType,
      contactName: party.contactName || '',
      contactEmail: party.contactEmail || '',
      contactPhone: party.contactPhone || '',
      gstNumber: party.gstNumber || '',
      panNumber: party.panNumber || '',
      address: party.address || '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingParty) {
      updateMutation.mutate({ id: editingParty.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleToggleActive = (party: Party) => {
    updateMutation.mutate({ id: party.id, data: { isActive: !party.isActive } })
  }

  const getPartyTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      BUYER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      SELLER: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      VENDOR: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      CLIENT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    }
    return <Badge className={colors[type] || ''}>{type}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Party Master</h1>
          <p className="text-muted-foreground mt-1">Manage parties for ledger transactions</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingParty(null)
              resetForm()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Party
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingParty ? 'Edit Party' : 'Add New Party'}</DialogTitle>
              <DialogDescription>
                {editingParty ? 'Update party details' : 'Create a new party for transactions'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Party Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partyType">Party Type *</Label>
                <Select
                  value={formData.partyType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, partyType: value as typeof PARTY_TYPES[number] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <Input
                    id="panNumber"
                    value={formData.panNumber}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingParty(null)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingParty ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter parties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, contact, GST..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Party Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PARTY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parties</CardTitle>
          <CardDescription>Total: {partiesData?.pagination.total || 0} parties</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>GST/PAN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partiesData?.data.map((party) => (
                  <TableRow key={party.id}>
                    <TableCell className="font-medium">{party.name}</TableCell>
                    <TableCell>{getPartyTypeBadge(party.partyType)}</TableCell>
                    <TableCell>
                      {party.contactName && <div>{party.contactName}</div>}
                      {party.contactPhone && (
                        <div className="text-xs text-muted-foreground">{party.contactPhone}</div>
                      )}
                      {party.contactEmail && (
                        <div className="text-xs text-muted-foreground">{party.contactEmail}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {party.gstNumber && <div className="text-xs">GST: {party.gstNumber}</div>}
                      {party.panNumber && <div className="text-xs">PAN: {party.panNumber}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={party.isActive ? 'default' : 'secondary'}>
                        {party.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(party)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(party)}
                        >
                          {party.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!partiesData?.data || partiesData.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No parties found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


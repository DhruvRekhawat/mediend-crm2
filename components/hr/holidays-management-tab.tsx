'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiDelete } from '@/lib/api-client'
import { useState } from 'react'
import { Plus, Trash2, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface HolidayItem {
  id: string
  date: string
  name: string
  type: string
}

export function HolidaysManagementTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<'Compulsory' | 'Optional'>('Compulsory')
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()

  const { data: holidays = [], isLoading } = useQuery<HolidayItem[]>({
    queryKey: ['holidays', currentYear],
    queryFn: () => apiGet<HolidayItem[]>(`/api/holidays?year=${currentYear}`),
  })

  const createMutation = useMutation({
    mutationFn: (data: { date: string; name: string; type: 'Compulsory' | 'Optional' }) =>
      apiPost<HolidayItem>('/api/holidays', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
      setIsDialogOpen(false)
      setDate('')
      setName('')
      setType('Compulsory')
      toast.success('Holiday added successfully')
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to add holiday'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/holidays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
      toast.success('Holiday removed successfully')
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to remove holiday'),
  })

  const handleAdd = () => {
    if (!date.trim() || !name.trim()) {
      toast.error('Please enter date and holiday name')
      return
    }
    createMutation.mutate({ date, name: name.trim(), type })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Holidays Management</h1>
          <p className="text-muted-foreground mt-1">Add or remove official holidays</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Holiday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Holiday</DialogTitle>
              <DialogDescription>Add a new official holiday. Changes will reflect in attendance heatmap and work log enforcement.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Holiday Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Republic Day"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Type</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={type === 'Compulsory' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setType('Compulsory')}
                  >
                    Compulsory
                  </Button>
                  <Button
                    type="button"
                    variant={type === 'Optional' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setType('Optional')}
                  >
                    Optional
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!date || !name.trim() || createMutation.isPending}>
                  {createMutation.isPending ? 'Adding…' : 'Add Holiday'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Official Holidays ({currentYear})</CardTitle>
          <CardDescription>Holidays are shown in the attendance heatmap and exempt from work log enforcement</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : holidays.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sl No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Holiday</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h, i) => (
                  <TableRow key={h.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(h.date), 'PPP')}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(h.date), 'EEEE')}</TableCell>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>
                      <Badge variant={h.type === 'Compulsory' ? 'default' : 'secondary'}>
                        {h.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(h.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No holidays configured for {currentYear}</p>
              <p className="text-sm mt-1">Add holidays using the button above or run the seed script</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

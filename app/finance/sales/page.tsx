'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Search, Plus, CalendarIcon, X, Eye, Pencil } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import Link from 'next/link'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { IndianRupee } from 'lucide-react'

interface SalesEntry {
  id: string
  serialNumber: string
  transactionDate: string
  description: string
  amount: number
  notes: string | null
  project: {
    id: string
    name: string
    description: string | null
  }
  createdBy: {
    id: string
    name: string
  }
}

interface SalesResponse {
  data: SalesEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface Project {
  id: string
  name: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function SalesPage() {
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()))
  const [showStartCalendar, setShowStartCalendar] = useState(false)
  const [showEndCalendar, setShowEndCalendar] = useState(false)

  // Fetch sales entries
  const { data: salesData, isLoading } = useQuery<SalesResponse>({
    queryKey: ['sales', search, projectFilter, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (projectFilter !== 'all') params.set('projectId', projectFilter)
      if (startDate) {
        const year = startDate.getFullYear()
        const month = String(startDate.getMonth() + 1).padStart(2, '0')
        const day = String(startDate.getDate()).padStart(2, '0')
        params.set('startDate', `${year}-${month}-${day}`)
      }
      if (endDate) {
        const year = endDate.getFullYear()
        const month = String(endDate.getMonth() + 1).padStart(2, '0')
        const day = String(endDate.getDate()).padStart(2, '0')
        params.set('endDate', `${year}-${month}-${day}`)
      }
      return apiGet<SalesResponse>(`/api/finance/sales?${params.toString()}`)
    },
  })

  // Fetch projects for filter
  const { data: projectsData } = useQuery<{ data: Project[] }>({
    queryKey: ['projects'],
    queryFn: () => apiGet<{ data: Project[] }>('/api/finance/projects?isActive=true&limit=100'),
  })

  // Calculate total booked sales
  const totalSales = salesData?.data.reduce((sum, entry) => sum + entry.amount, 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Entries</h1>
          <p className="text-muted-foreground mt-1">Booked sales/revenue (does not affect bank balances)</p>
        </div>
        <Link href="/finance/sales/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Sales Entry
          </Button>
        </Link>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">
                {startDate && endDate
                  ? `Total Booked Sales (${format(startDate, 'dd MMM yyyy')} - ${format(endDate, 'dd MMM yyyy')})`
                  : 'Total Booked Sales'}
              </p>
              <p className="text-3xl font-bold">{formatCurrency(totalSales)}</p>
            </div>
            <IndianRupee className="h-12 w-12 text-emerald-200" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by serial, description, or project..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projectsData?.data.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Dialog open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PP') : 'Start date'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date)
                      setShowStartCalendar(false)
                    }}
                    initialFocus
                  />
                </DialogContent>
              </Dialog>
              {startDate && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setStartDate(undefined)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PP') : 'End date'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date)
                      setShowEndCalendar(false)
                    }}
                    initialFocus
                  />
                </DialogContent>
              </Dialog>
              {endDate && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEndDate(undefined)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date()
                  setStartDate(startOfMonth(now))
                  setEndDate(endOfMonth(now))
                }}
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const lastMonth = subMonths(new Date(), 1)
                  setStartDate(startOfMonth(lastMonth))
                  setEndDate(endOfMonth(lastMonth))
                }}
              >
                Last Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Entries</CardTitle>
          <CardDescription>
            Total: {salesData?.pagination.total || 0} entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData?.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono">{entry.serialNumber}</TableCell>
                    <TableCell>{format(new Date(entry.transactionDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-medium">{entry.project.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-green-600">
                      {formatCurrency(entry.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/finance/sales/${entry.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/finance/sales/${entry.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!salesData?.data || salesData.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No sales entries found
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

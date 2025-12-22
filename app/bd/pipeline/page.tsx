'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useState, useMemo } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLeads, useLead, Lead } from '@/hooks/use-leads'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { KanbanBoard } from '@/components/kanban-board'
import {
  Table as TableIcon,
  LayoutGrid,
  Eye,
  Search,
  Filter,
  TrendingUp,
  FileText,
  Phone,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { format } from 'date-fns'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ALL_LEAD_STATUSES } from '@/components/kanban-board'
import { getStatusColor } from '@/lib/lead-status-colors'

export default function BDPipelinePage() {
  const { user } = useAuth()
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('pipeline')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { lead, updateLead, isUpdating } = useLead(selectedLeadId || '')

  const filters = useMemo(() => {
    const baseFilters: any = { bdId: user?.id }
    if (statusFilter !== 'all') {
      baseFilters.status = statusFilter
    }
    return baseFilters
  }, [user?.id, statusFilter])

  const { leads, isLoading, updateLead: updateLeadInList } = useLeads(filters)

  // Filter leads by search query
  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads
    const query = searchQuery.toLowerCase()
    return leads.filter(
      (lead) =>
        lead.patientName?.toLowerCase().includes(query) ||
        lead.leadRef?.toLowerCase().includes(query) ||
        lead.phoneNumber?.includes(query) ||
        lead.city?.toLowerCase().includes(query) ||
        lead.hospitalName?.toLowerCase().includes(query) ||
        lead.treatment?.toLowerCase().includes(query)
    )
  }, [leads, searchQuery])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = leads.length
    const byStatus: Record<string, number> = {}
    const byStage: Record<string, number> = {}

    leads.forEach((lead) => {
      const status = lead.status || 'Unknown'
      const stage = lead.pipelineStage || 'Unknown'
      byStatus[status] = (byStatus[status] || 0) + 1
      byStage[stage] = (byStage[stage] || 0) + 1
    })

    return { total, byStatus, byStage }
  }, [leads])

  // Get unique statuses for filter
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(leads.map((lead) => lead.status).filter((status): status is string => !!status))
    return Array.from(statuses).sort()
  }, [leads])

  const handleLeadClick = (lead: Lead) => {
    setSelectedLeadId(lead.id)
  }

  const handleUpdateLead = (data: Partial<Lead>) => {
    if (selectedLeadId) {
      updateLead(data)
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Pipeline</h1>
            <p className="text-muted-foreground mt-1">Manage and track your leads</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'table' ? 'pipeline' : 'table')}
            >
              {viewMode === 'table' ? (
                <>
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Pipeline View
                </>
              ) : (
                <>
                  <TableIcon className="h-4 w-4 mr-2" />
                  Table View
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStage['SALES'] || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Insurance</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStage['INSURANCE'] || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStage['COMPLETED'] || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads by name, ref, phone, city, hospital, or treatment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {uniqueStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading leads...</div>
        ) : viewMode === 'table' ? (
          <Card>
            <CardHeader>
              <CardTitle>Leads Table</CardTitle>
              <CardDescription>All your leads in a table view</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead Ref</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Treatment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map((lead) => {
                        const statusColor = getStatusColor(lead.status)
                        return (
                          <TableRow
                            key={lead.id}
                            className={`cursor-pointer hover:opacity-80 transition-opacity ${statusColor.bg} ${statusColor.border} border-l-4`}
                          >
                          <TableCell className="font-medium">{lead.leadRef}</TableCell>
                          <TableCell>{lead.patientName}</TableCell>
                          <TableCell>{lead.phoneNumber}</TableCell>
                          <TableCell>{lead.city}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{lead.hospitalName}</TableCell>
                          <TableCell>{lead.treatment}</TableCell>
                          <TableCell>
                            <Select
                              value={lead.status || 'New'}
                              onValueChange={(newStatus) => {
                                updateLeadInList({ id: lead.id, data: { status: newStatus } })
                              }}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="New" />
                              </SelectTrigger>
                              <SelectContent>
                                {ALL_LEAD_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                lead.pipelineStage === 'COMPLETED'
                                  ? 'default'
                                  : lead.pipelineStage === 'LOST'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {lead.pipelineStage}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLeadClick(lead)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          {searchQuery ? 'No leads found matching your search' : 'No leads found'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Pipeline View</CardTitle>
              <CardDescription>Drag and drop leads to change their status</CardDescription>
            </CardHeader>
            <CardContent>
              <KanbanBoard filters={filters} onLeadClick={handleLeadClick} />
            </CardContent>
          </Card>
        )}

        {/* Lead Details Sheet */}
        <Sheet open={!!selectedLeadId} onOpenChange={(open) => !open && setSelectedLeadId(null)}>
          <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Lead Details</SheetTitle>
              <SheetDescription>View and update complete lead information</SheetDescription>
            </SheetHeader>

            {lead ? (
              <div className="mt-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Lead Reference</Label>
                      <Input value={lead.leadRef || ''} readOnly />
                    </div>
                    <div>
                      <Label>Patient Name</Label>
                      <Input
                        value={lead.patientName || ''}
                        onChange={(e) => handleUpdateLead({ patientName: e.target.value })}
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Age</Label>
                      <Input
                        type="number"
                        value={lead.age || ''}
                        onChange={(e) => handleUpdateLead({ age: parseInt(e.target.value) || 0 })}
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Sex</Label>
                      <Input
                        value={(lead.sex as string | undefined) || ''}
                        onChange={(e) => handleUpdateLead({ sex: e.target.value })}
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input
                        value={lead.phoneNumber || ''}
                        onChange={(e) => handleUpdateLead({ phoneNumber: e.target.value })}
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Alternate Number</Label>
                      <Input
                        value={(lead.alternateNumber as string | undefined) || ''}
                        onChange={(e) => handleUpdateLead({ alternateNumber: e.target.value })}
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Attendant Name</Label>
                      <Input
                        value={(lead.attendantName as string | undefined) || ''}
                        onChange={(e) => handleUpdateLead({ attendantName: e.target.value })}
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={lead.status || 'New'}
                        onValueChange={(newStatus) => handleUpdateLead({ status: newStatus })}
                        disabled={isUpdating}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="New" />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_LEAD_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Location & Hospital */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Location & Hospital</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Circle</Label>
                      <Input value={(lead.circle as string | undefined) || ''} readOnly />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input
                        value={lead.city || ''}
                        onChange={(e) => handleUpdateLead({ city: e.target.value })}
                        disabled={isUpdating}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Hospital Name</Label>
                      <Input
                        value={lead.hospitalName || ''}
                        onChange={(e) => handleUpdateLead({ hospitalName: e.target.value })}
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                </div>

                {/* Treatment Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Treatment Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Input
                        value={(lead.category as string | undefined) || ''}
                        onChange={(e) => handleUpdateLead({ category: e.target.value })}
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Treatment</Label>
                      <Input
                        value={lead.treatment || ''}
                        onChange={(e) => handleUpdateLead({ treatment: e.target.value })}
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Anesthesia</Label>
                      <Input
                        value={(lead.anesthesia as string | undefined) || ''}
                        onChange={(e) => handleUpdateLead({ anesthesia: e.target.value })}
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Surgeon Name</Label>
                      <Input
                        value={(lead.surgeonName as string | undefined) || ''}
                        onChange={(e) => handleUpdateLead({ surgeonName: e.target.value })}
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Surgeon Type</Label>
                      <Input
                        value={(lead.surgeonType as string | undefined) || ''}
                        onChange={(e) => handleUpdateLead({ surgeonType: e.target.value })}
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Financial Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Bill Amount</Label>
                      <Input
                        type="number"
                        value={(lead.billAmount as number | undefined) || ''}
                        onChange={(e) => handleUpdateLead({ billAmount: parseFloat(e.target.value) || 0 })}
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Discount</Label>
                      <Input
                        type="number"
                        value={(lead.discount as number | undefined) || ''}
                        onChange={(e) => handleUpdateLead({ discount: parseFloat(e.target.value) || 0 })}
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Net Profit</Label>
                      <Input
                        type="number"
                        value={(lead.netProfit as number | undefined) || ''}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div>
                      <Label>Ticket Size</Label>
                      <Input
                        type="number"
                        value={(lead.ticketSize as number | undefined) || ''}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Important Dates</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Created Date</Label>
                      <Input
                        value={
                          lead.createdDate && typeof lead.createdDate === 'string'
                            ? format(new Date(lead.createdDate), 'PPpp')
                            : ''
                        }
                        readOnly
                      />
                    </div>
                    <div>
                      <Label>Last Updated</Label>
                      <Input
                        value={
                          lead.updatedDate && typeof lead.updatedDate === 'string'
                            ? format(new Date(lead.updatedDate), 'PPpp')
                            : ''
                        }
                        readOnly
                      />
                    </div>
                    <div>
                      <Label>Arrival Date</Label>
                      <Input
                        type="datetime-local"
                        value={
                          lead.arrivalDate && typeof lead.arrivalDate === 'string'
                            ? format(new Date(lead.arrivalDate), "yyyy-MM-dd'T'HH:mm")
                            : ''
                        }
                        onChange={(e) =>
                          handleUpdateLead({ arrivalDate: e.target.value ? new Date(e.target.value).toISOString() : null })
                        }
                        disabled={isUpdating}
                      />
                    </div>
                    <div>
                      <Label>Surgery Date</Label>
                      <Input
                        type="datetime-local"
                        value={
                          lead.surgeryDate && typeof lead.surgeryDate === 'string'
                            ? format(new Date(lead.surgeryDate), "yyyy-MM-dd'T'HH:mm")
                            : ''
                        }
                        onChange={(e) =>
                          handleUpdateLead({ surgeryDate: e.target.value ? new Date(e.target.value).toISOString() : null })
                        }
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <Label>Remarks</Label>
                  <Textarea
                    value={lead.remarks || ''}
                    onChange={(e) => handleUpdateLead({ remarks: e.target.value })}
                    rows={4}
                    disabled={isUpdating}
                    placeholder="Add notes or remarks about this lead..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      handleUpdateLead({ status: 'IPD Done', pipelineStage: 'INSURANCE' })
                      setSelectedLeadId(null)
                    }}
                    disabled={isUpdating}
                  >
                    Mark as IPD Done
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedLeadId(null)}>
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Loading lead details...</div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AuthenticatedLayout>
  )
}

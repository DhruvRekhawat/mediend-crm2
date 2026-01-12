'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
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
import {
  Search,
  Filter,
  TrendingUp,
  FileText,
  Phone,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Target,
} from 'lucide-react'
import { format } from 'date-fns'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ALL_LEAD_STATUSES } from '@/components/kanban-board'
import { getStatusColor } from '@/lib/lead-status-colors'
import { mapStatusCode } from '@/lib/mysql-code-mappings'
import { Progress } from '@/components/ui/progress'

interface Target {
  id: string
  targetType: 'BD' | 'TEAM'
  targetForId: string
  periodType: 'WEEK' | 'MONTH'
  periodStartDate: string
  periodEndDate: string
  metric: 'LEADS_CLOSED' | 'NET_PROFIT' | 'BILL_AMOUNT' | 'SURGERIES_DONE'
  targetValue: number
}

export default function BDPipelinePage() {
  const { user } = useAuth()
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
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

  // Filter leads by search query and sort by latest date first
  const filteredLeads = useMemo(() => {
    let result = leads
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = leads.filter(
        (lead) =>
          lead.patientName?.toLowerCase().includes(query) ||
          lead.leadRef?.toLowerCase().includes(query) ||
          lead.phoneNumber?.includes(query) ||
          lead.city?.toLowerCase().includes(query) ||
          lead.hospitalName?.toLowerCase().includes(query) ||
          lead.treatment?.toLowerCase().includes(query)
      )
    }
    
    // Sort by createdDate (latest first)
    return result.sort((a, b) => {
      const dateA = a.createdDate && typeof a.createdDate === 'string' 
        ? new Date(a.createdDate).getTime() 
        : a.createdDate && a.createdDate instanceof Date
        ? a.createdDate.getTime()
        : 0
      const dateB = b.createdDate && typeof b.createdDate === 'string'
        ? new Date(b.createdDate).getTime()
        : b.createdDate && b.createdDate instanceof Date
        ? b.createdDate.getTime()
        : 0
      return dateB - dateA // Descending order (latest first)
    })
  }, [leads, searchQuery])

  // Calculate status-based statistics
  const statusStats = useMemo(() => {
    // Debug: Log sample statuses to verify mapping
    if (leads.length > 0) {
      const sampleStatuses = leads.slice(0, 5).map(l => ({ original: l.status, mapped: mapStatusCode(l.status) }))
      console.log('Sample lead statuses:', sampleStatuses)
    }
    
    const normalizeStatus = (status: string | null | undefined): string => {
      if (!status) return 'New'
      
      // First, use the mapping function to convert codes to text
      const mappedStatus = mapStatusCode(status)
      
      // Then normalize text variations
      const normalized = mappedStatus.trim().toLowerCase()
      const statusMap: Record<string, string> = {
        'new lead': 'New',
        'new': 'New',
        'hot lead': 'Hot Lead',
        'hot': 'Hot Lead',
        'interested': 'Interested',
        'follow-up 1': 'Follow-up (1-3)',
        'follow-up 2': 'Follow-up (1-3)',
        'follow-up 3': 'Follow-up (1-3)',
        'follow-up': 'Follow-up (1-3)',
        'follow-up (1-3)': 'Follow-up (1-3)',
        'follow up (1-3)': 'Follow-up (1-3)',
        'call back (sd)': 'Call Back (SD)',
        'call back (t)': 'Call Back (T)',
        'call back next week': 'Call Back Next Week',
        'call back next month': 'Call Back Next Month',
        'ipd schedule': 'IPD Schedule',
        'ipd done': 'IPD Done',
        'closed': 'Closed',
        'call done': 'Call Done',
        'c/w done': 'C/W Done',
        'wa done': 'C/W Done',
        'scan done': 'C/W Done',
        'lost': 'Lost',
        'ipd lost': 'Lost',
        'dnp-1': 'DNP',
        'dnp-2': 'DNP',
        'dnp-3': 'DNP',
        'dnp-4': 'DNP',
        'dnp-5': 'DNP',
        'dnp': 'DNP',
        'dnp exhausted': 'DNP (1-5, Exhausted)',
        'dnp (1-5, exhausted)': 'DNP (1-5, Exhausted)',
        'junk': 'Junk',
        'invalid number': 'Invalid Number',
        'fund issues': 'Fund Issues',
        'not interested': 'Lost',
        'duplicate lead': 'Lost',
      }
      return statusMap[normalized] || mappedStatus
    }

    const stats = {
      new: 0,
      followUps: 0,
      ipdDone: 0,
      dnp: 0,
      lost: 0,
      completed: 0,
    }

    leads.forEach((lead) => {
      const status = normalizeStatus(lead.status)
      const statusLower = status.toLowerCase()
      
      // New & Hot
      if (['New', 'New Lead', 'Hot Lead', 'Interested', 'Nurture'].includes(status) || 
          statusLower.includes('new') || statusLower.includes('hot') || statusLower.includes('interested')) {
        stats.new++
      }
      // Follow-ups
      else if (['Follow-up (1-3)', 'Follow-up 1', 'Follow-up 2', 'Follow-up 3', 'Follow-up',
                 'Call Back (SD)', 'Call Back (T)', 'Call Back Next Week', 'Call Back Next Month',
                 'Out of Station', 'Out of station follow-up', 'IPD Schedule', 'OPD Schedule'].includes(status) ||
               statusLower.includes('follow') || statusLower.includes('call back') || statusLower.includes('schedule')) {
        stats.followUps++
      }
      // IPD Done
      else if (status === 'IPD Done' || statusLower.includes('ipd done')) {
        stats.ipdDone++
      }
      // DNP
      else if (['DNP', 'DNP-1', 'DNP-2', 'DNP-3', 'DNP-4', 'DNP-5', 'DNP Exhausted', 'DNP (1-5, Exhausted)'].includes(status) ||
               statusLower.includes('dnp')) {
        stats.dnp++
      }
      // Lost/Inactive
      else if (['Lost', 'IPD Lost', 'Junk', 'Invalid Number', 'Fund Issues', 'Not Interested', 
                 'Duplicate lead', 'Already Insured', 'SX Not Suggested', 'Language Barrier'].includes(status) ||
               statusLower.includes('lost') || statusLower.includes('junk') || statusLower.includes('invalid') ||
               statusLower.includes('duplicate') || statusLower.includes('not interested')) {
        stats.lost++
      }
      // Completed
      else if (['Closed', 'Call Done', 'C/W Done', 'WA Done', 'Scan Done', 'OPD Done', 
                 'Order Booked', 'Policy Booked', 'Policy Issued'].includes(status) ||
               statusLower.includes('closed') || statusLower.includes('done') || statusLower.includes('booked')) {
        stats.completed++
      }
    })

    // Debug: Log final stats
    if (leads.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('Status stats calculated:', stats, 'from', leads.length, 'leads')
      const sampleStatuses = leads.slice(0, 5).map(l => {
        const mapped = mapStatusCode(l.status)
        const normalized = normalizeStatus(l.status)
        return { original: l.status, mapped, normalized }
      })
      console.log('Sample lead statuses:', sampleStatuses)
    }

    return stats
  }, [leads])

  // Get unique statuses for filter
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(leads.map((lead) => lead.status).filter((status): status is string => !!status))
    return Array.from(statuses).sort()
  }, [leads])

  // Fetch targets for current BD user
  const { data: targets } = useQuery<Target[]>({
    queryKey: ['targets', 'BD', user?.id],
    queryFn: () => apiGet<Target[]>(`/api/targets?targetType=BD&targetForId=${user?.id}`),
    enabled: !!user?.id,
  })

  // Calculate target progress
  const targetProgress = useMemo(() => {
    if (!targets || targets.length === 0 || !leads.length) return null

    // Get the most recent active target (current period)
    const now = new Date()
    const activeTarget = targets
      .filter((t) => {
        const start = new Date(t.periodStartDate)
        const end = new Date(t.periodEndDate)
        return now >= start && now <= end
      })
      .sort((a, b) => new Date(b.periodStartDate).getTime() - new Date(a.periodStartDate).getTime())[0]

    if (!activeTarget) return null

    let actual = 0

    // Calculate actual value based on metric
    switch (activeTarget.metric) {
      case 'LEADS_CLOSED':
        // Count leads that are completed (IPD Done, Closed, Call Done, C/W Done)
        actual = leads.filter((lead) => {
          const status = mapStatusCode(lead.status)?.toLowerCase() || ''
          return ['ipd done', 'closed', 'call done', 'c/w done', 'wa done', 'scan done'].includes(status)
        }).length
        break
      case 'NET_PROFIT':
        actual = leads.reduce((sum, lead) => sum + (lead.netProfit || 0), 0)
        break
      case 'BILL_AMOUNT':
        actual = leads.reduce((sum, lead) => sum + ((lead as any).billAmount || 0), 0)
        break
      case 'SURGERIES_DONE':
        // Count leads with surgery date
        actual = leads.filter((lead) => (lead as any).surgeryDate != null).length
        break
    }

    const percentage = activeTarget.targetValue > 0 ? (actual / activeTarget.targetValue) * 100 : 0

    return {
      target: activeTarget,
      actual,
      targetValue: activeTarget.targetValue,
      percentage: Math.min(percentage, 100),
      metric: activeTarget.metric,
    }
  }, [targets, leads])

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
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">New Leads</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{statusStats.new}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Follow-ups</p>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{statusStats.followUps}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-950/30 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">IPD Done</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{statusStats.ipdDone}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-slate-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">DNP</p>
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{statusStats.dnp}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-950/30 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gray-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Lost/Inactive</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{statusStats.lost}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-950/30 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">{statusStats.completed}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-teal-100 dark:bg-teal-950/30 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Target Progress Card */}
        {targetProgress && (
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Target Progress</p>
                      <p className="text-lg font-semibold">
                        {targetProgress.metric.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {targetProgress.percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {targetProgress.actual.toLocaleString()} / {targetProgress.targetValue.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Progress value={targetProgress.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Period: {new Date(targetProgress.target.periodStartDate).toLocaleDateString()} - {new Date(targetProgress.target.periodEndDate).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
        ) : (
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
                      <TableHead>City</TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Treatment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length > 0 ? (
                      filteredLeads.map((lead) => {
                        const mappedStatus = mapStatusCode(lead.status)
                        const statusColor = getStatusColor(mappedStatus)
                        return (
                          <TableRow
                            key={lead.id}
                            className={`cursor-pointer hover:opacity-80 transition-opacity ${statusColor.bg} ${statusColor.border} border-l-4`}
                          >
                          <TableCell className="font-medium">{lead.leadRef}</TableCell>
                          <TableCell>{lead.patientName}</TableCell>
                          <TableCell>{lead.city}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{lead.hospitalName}</TableCell>
                          <TableCell>{lead.treatment}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${statusColor.bg} ${statusColor.border} ${statusColor.text} border`}
                            >
                              {mappedStatus || 'New'}
                            </Badge>
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
                        value={mapStatusCode(lead.status) || 'New'}
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

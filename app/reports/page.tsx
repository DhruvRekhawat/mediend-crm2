'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState, useEffect } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { apiGet } from '@/lib/api-client'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { Lead } from '@/hooks/use-leads'

interface TeamReport {
  teamName: string
  closedLeads: number
  netProfit: number
}

interface BDReport {
  bdName: string
  teamName?: string
  closedLeads: number
  netProfit: number
}

interface HospitalReport {
  hospital: string
  count: number
  profit: number
}

type ReportData = TeamReport | BDReport | HospitalReport

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'team' | 'bd' | 'hospital'>('team')
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  })
  useEffect(() => {

    // eslint-disable-next-line
    setDateRange({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    })
  }, [])
  const [circle, setCircle] = useState<string>('all')

  const handleExportPDF = async () => {
    try {
      const data = await fetchReportData()
      exportToPDF(data, reportType, dateRange)
      toast.success('PDF exported successfully')
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to export PDF')
      } else {
        toast.error('Failed to export PDF')
      }
    }
  }

  const handleExportExcel = async () => {
    try {
      const data = await fetchReportData()
      exportToExcel(data, reportType, dateRange)
      toast.success('Excel file exported successfully')
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to export Excel')
      } else {
        toast.error('Failed to export Excel')
      }
    }
  }

  const fetchReportData = async () => {
    const params = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ...(circle && circle !== 'all' ? { circle } : {}),
    })

    switch (reportType) {
      case 'team':
        return apiGet<TeamReport[]>(`/api/analytics/leaderboard?type=team&${params.toString()}`)
      case 'bd':
        return apiGet<BDReport[]>(`/api/analytics/leaderboard?type=bd&${params.toString()}`)
      case 'hospital':
        const leads = await apiGet<Lead[]>(`/api/leads?${params.toString()}&pipelineStage=COMPLETED`)
        return groupByHospital(leads)
      default:
        return []
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Reports & Exports</h1>
            <p className="text-muted-foreground mt-1">Generate and export performance reports</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
              <CardDescription>Select report type and filters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={(value: 'team' | 'bd' | 'hospital') => setReportType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Team Performance</SelectItem>
                    <SelectItem value="bd">BD Performance</SelectItem>
                    <SelectItem value="hospital">Hospital Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Circle (Optional)</Label>
                <Select value={circle} onValueChange={setCircle}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Circles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Circles</SelectItem>
                    <SelectItem value="North">North</SelectItem>
                    <SelectItem value="South">South</SelectItem>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                    <SelectItem value="Central">Central</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleExportPDF} className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </Button>
                <Button onClick={handleExportExcel} variant="outline" className="flex-1">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>Preview of the selected report data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Select filters and click export to generate your report. The preview will show here once data is loaded.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}

function exportToPDF(data: ReportData[], reportType: string, dateRange: { startDate: string; endDate: string }) {
  const doc = new jsPDF()
  const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Performance Report`
  const period = `${dateRange.startDate} to ${dateRange.endDate}`

  doc.setFontSize(18)
  doc.text(title, 14, 20)
  doc.setFontSize(12)
  doc.text(`Period: ${period}`, 14, 30)

  let tableData: (string | number)[][] = []
  let columns: string[] = []

  if (reportType === 'team') {
    columns = ['Rank', 'Team Name', 'Closed Leads', 'Net Profit']
    const teamData = data as TeamReport[]
    tableData = teamData.map((team, idx) => [
      idx + 1,
      team.teamName,
      team.closedLeads,
      `₹${team.netProfit.toLocaleString('en-IN')}`,
    ])
  } else if (reportType === 'bd') {
    columns = ['Rank', 'BD Name', 'Team', 'Closed Leads', 'Net Profit']
    const bdData = data as BDReport[]
    tableData = bdData.map((bd, idx) => [
      idx + 1,
      bd.bdName,
      bd.teamName || 'No Team',
      bd.closedLeads,
      `₹${bd.netProfit.toLocaleString('en-IN')}`,
    ])
  } else if (reportType === 'hospital') {
    columns = ['Rank', 'Hospital', 'Surgeries', 'Net Profit']
    const hospitalData = data as HospitalReport[]
    tableData = hospitalData.map((hosp, idx) => [
      idx + 1,
      hosp.hospital,
      hosp.count,
      `₹${hosp.profit.toLocaleString('en-IN')}`,
    ])
  }

  autoTable(doc, {
    head: [columns],
    body: tableData,
    startY: 35,
  })

  doc.save(`${reportType}-performance-${dateRange.startDate}-${dateRange.endDate}.pdf`)
}

function exportToExcel(data: ReportData[], reportType: string, dateRange: { startDate: string; endDate: string }) {
  let worksheetData: unknown[] = []

  if (reportType === 'team') {
    const teamData = data as TeamReport[]
    worksheetData = teamData.map((team, idx) => ({
      Rank: idx + 1,
      'Team Name': team.teamName,
      'Closed Leads': team.closedLeads,
      'Net Profit': team.netProfit,
    }))
  } else if (reportType === 'bd') {
    const bdData = data as BDReport[]
    worksheetData = bdData.map((bd, idx) => ({
      Rank: idx + 1,
      'BD Name': bd.bdName,
      Team: bd.teamName || 'No Team',
      'Closed Leads': bd.closedLeads,
      'Net Profit': bd.netProfit,
    }))
  } else if (reportType === 'hospital') {
    const hospitalData = data as HospitalReport[]
    worksheetData = hospitalData.map((hosp, idx) => ({
      Rank: idx + 1,
      Hospital: hosp.hospital,
      Surgeries: hosp.count,
      'Net Profit': hosp.profit,
    }))
  }

  const worksheet = XLSX.utils.json_to_sheet(worksheetData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')

  XLSX.writeFile(
    workbook,
    `${reportType}-performance-${dateRange.startDate}-${dateRange.endDate}.xlsx`
  )
}

function groupByHospital(leads: Lead[]): Array<HospitalReport> {
  const grouped: Record<string, { count: number; profit: number }> = {}

  leads.forEach((lead) => {
    const hospital = lead.hospitalName || 'Unknown'
    if (!grouped[hospital]) {
      grouped[hospital] = { count: 0, profit: 0 }
    }
    grouped[hospital].count++
    grouped[hospital].profit += lead.netProfit || 0
  })

  return Object.entries(grouped)
    .map(([hospital, stats]) => ({ hospital, ...stats }))
    .sort((a, b) => b.profit - a.profit)
}


'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { useState } from 'react'
import { FileText, Plus, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Employee {
  id: string
  employeeCode: string
  user: {
    name: string
    email: string
  }
}

interface EmployeeDocument {
  id: string
  employeeId: string
  documentType: 'OFFER_LETTER' | 'APPRAISAL_LETTER' | 'EXPERIENCE_LETTER' | 'RELIEVING_LETTER'
  generatedAt: string
  metadata: Record<string, unknown>
  employee: {
    employeeCode: string
    user: {
      name: string
      email: string
    }
  }
}

const DOCUMENT_TYPES = {
  OFFER_LETTER: 'Offer Letter',
  APPRAISAL_LETTER: 'Appraisal Letter',
  EXPERIENCE_LETTER: 'Experience Letter',
  RELIEVING_LETTER: 'Relieving Letter',
}

export default function HRDocumentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  const router = useRouter()

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => apiGet<Employee[]>('/api/employees'),
  })

  const { data: documents, isLoading } = useQuery<EmployeeDocument[]>({
    queryKey: ['hr-documents'],
    queryFn: () => apiGet<EmployeeDocument[]>('/api/hr/documents'),
  })

  const generateMutation = useMutation({
    mutationFn: async (data: {
      employeeId: string
      documentType: string
      metadata?: Record<string, unknown>
    }) => {
      const response = await apiPost<{ document: EmployeeDocument; htmlContent: string }>('/api/hr/documents', data)
      return response
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hr-documents'] })
      setIsDialogOpen(false)
      toast.success('Document generated successfully')
      // Navigate to view page to download/print
      router.push(`/hr/documents/${data.document.id}/view`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate document')
    },
  })

  const handleViewDocument = (docId: string) => {
    router.push(`/hr/documents/${docId}/view`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Generation</h1>
          <p className="text-muted-foreground mt-1">Generate and manage employee documents</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate Employee Document</DialogTitle>
              <DialogDescription>Select an employee and document type to generate</DialogDescription>
            </DialogHeader>
            <GenerateDocumentForm
              employees={employees || []}
              onSubmit={(data) => generateMutation.mutate(data)}
              isLoading={generateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Document Types Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {documents?.filter((d) => d.documentType === key).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Generated documents</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Documents</CardTitle>
          <CardDescription>All employee documents generated - click View & Download to preview and save as PDF</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Generated On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents?.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="font-medium">{doc.employee.user.name}</div>
                      <div className="text-sm text-muted-foreground">{doc.employee.employeeCode}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {DOCUMENT_TYPES[doc.documentType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(doc.generatedAt), 'PPp')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleViewDocument(doc.id)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View & Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!documents || documents.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No documents generated yet
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

function GenerateDocumentForm({
  employees,
  onSubmit,
  isLoading,
}: {
  employees: Employee[]
  onSubmit: (data: { employeeId: string; documentType: string; metadata?: Record<string, unknown> }) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    employeeId: '',
    documentType: '',
    designation: '',
    ctc: '',
    previousSalary: '',
    newSalary: '',
    incrementPercentage: '',
    lastWorkingDate: '',
    resignationDate: '',
    remarks: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const metadata: Record<string, unknown> = {}
    
    if (formData.designation) metadata.designation = formData.designation
    if (formData.ctc) metadata.ctc = parseFloat(formData.ctc)
    if (formData.previousSalary) metadata.previousSalary = parseFloat(formData.previousSalary)
    if (formData.newSalary) metadata.newSalary = parseFloat(formData.newSalary)
    if (formData.incrementPercentage) metadata.incrementPercentage = parseFloat(formData.incrementPercentage)
    if (formData.lastWorkingDate) metadata.lastWorkingDate = formData.lastWorkingDate
    if (formData.resignationDate) metadata.resignationDate = formData.resignationDate
    if (formData.remarks) metadata.remarks = formData.remarks
    
    onSubmit({
      employeeId: formData.employeeId,
      documentType: formData.documentType,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    })
  }

  const renderMetadataFields = () => {
    switch (formData.documentType) {
      case 'OFFER_LETTER':
        return (
          <>
            <div>
              <Label>Designation</Label>
              <Input
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g., Business Development Executive"
              />
            </div>
            <div>
              <Label>Annual CTC</Label>
              <Input
                type="number"
                value={formData.ctc}
                onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
                placeholder="Annual CTC amount"
              />
            </div>
          </>
        )
      case 'APPRAISAL_LETTER':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Previous Annual CTC</Label>
                <Input
                  type="number"
                  value={formData.previousSalary}
                  onChange={(e) => setFormData({ ...formData, previousSalary: e.target.value })}
                  placeholder="Previous annual CTC"
                />
              </div>
              <div>
                <Label>Increment Percentage</Label>
                <Input
                  type="number"
                  value={formData.incrementPercentage}
                  onChange={(e) => setFormData({ ...formData, incrementPercentage: e.target.value })}
                  placeholder="e.g., 10"
                />
              </div>
            </div>
            <div>
              <Label>New Annual CTC (auto-calculated if left empty)</Label>
              <Input
                type="number"
                value={formData.newSalary}
                onChange={(e) => setFormData({ ...formData, newSalary: e.target.value })}
                placeholder="New annual CTC"
              />
            </div>
            <div>
              <Label>Remarks (optional)</Label>
              <Input
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Any additional remarks"
              />
            </div>
          </>
        )
      case 'EXPERIENCE_LETTER':
        return (
          <>
            <div>
              <Label>Designation</Label>
              <Input
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Employee's designation"
              />
            </div>
            <div>
              <Label>Last Working Date</Label>
              <Input
                type="date"
                value={formData.lastWorkingDate}
                onChange={(e) => setFormData({ ...formData, lastWorkingDate: e.target.value })}
              />
            </div>
          </>
        )
      case 'RELIEVING_LETTER':
        return (
          <>
            <div>
              <Label>Designation</Label>
              <Input
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Employee's designation"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Resignation Date</Label>
                <Input
                  type="date"
                  value={formData.resignationDate}
                  onChange={(e) => setFormData({ ...formData, resignationDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Last Working Date</Label>
                <Input
                  type="date"
                  value={formData.lastWorkingDate}
                  onChange={(e) => setFormData({ ...formData, lastWorkingDate: e.target.value })}
                />
              </div>
            </div>
          </>
        )
      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Employee</Label>
        <Select
          value={formData.employeeId}
          onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.user.name} ({emp.employeeCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Document Type</Label>
        <Select
          value={formData.documentType}
          onValueChange={(value) => setFormData({ ...formData, documentType: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.documentType && (
        <div className="border-t pt-4 space-y-4">
          <h4 className="font-medium">Document Details</h4>
          {renderMetadataFields()}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading || !formData.employeeId || !formData.documentType}>
          {isLoading ? 'Generating...' : 'Generate Document'}
        </Button>
      </div>
    </form>
  )
}


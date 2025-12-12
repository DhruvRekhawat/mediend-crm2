'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { useState } from 'react'
import { Calendar, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface LeaveRequest {
  id: string
  employee: {
    id: string
    employeeCode: string
    user: {
      id: string
      name: string
      email: string
    }
    department: {
      id: string
      name: string
    } | null
  }
  leaveType: {
    id: string
    name: string
  }
  startDate: Date
  endDate: Date
  days: number
  reason: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedAt: Date | null
  remarks: string | null
}

interface LeaveData {
  data: LeaveRequest[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function HRLeavesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [remarks, setRemarks] = useState('')
  const queryClient = useQueryClient()

  const { data: leaveData, isLoading } = useQuery<LeaveData>({
    queryKey: ['leaves', statusFilter],
    queryFn: () => apiGet<LeaveData>(`/api/leaves?status=${statusFilter}`),
  })

  const approveMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: string; status: 'APPROVED' | 'REJECTED'; remarks?: string }) => {
      try {
        return await apiPatch(`/api/leaves/${id}/approve`, { status, remarks })
      } catch (error) {
        console.error('Approve mutation error:', error)
        throw new Error(error instanceof Error ? error.message : 'Failed to update leave request')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] })
      setIsDialogOpen(false)
      setSelectedRequest(null)
      setRemarks('')
      toast.success('Leave request updated successfully')
    },
    onError: (error: Error) => {
      console.error('Approve error:', error)
      toast.error(error.message || 'Failed to update leave request')
    },
  })

  const handleApprove = (request: LeaveRequest) => {
    setSelectedRequest(request)
    setIsDialogOpen(true)
  }

  const handleApproveSubmit = (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest) return
    approveMutation.mutate({
      id: selectedRequest.id,
      status,
      remarks: remarks || undefined,
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="default">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Management</h1>
        <p className="text-muted-foreground mt-1">Approve or reject leave requests</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Filter leave requests by status</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>
            Total: {leaveData?.pagination.total || 0} requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveData?.data.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.employee.user.name}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {request.employee.employeeCode}
                      </span>
                    </TableCell>
                    <TableCell>{request.employee.department?.name || 'N/A'}</TableCell>
                    <TableCell>{request.leaveType.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(request.startDate), 'PPP')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(request.endDate), 'PPP')}
                      </div>
                    </TableCell>
                    <TableCell>{request.days} days</TableCell>
                    <TableCell>{request.reason || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {request.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(request)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request)
                              setIsDialogOpen(true)
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {request.remarks && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {request.remarks}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!leaveData?.data || leaveData.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No leave requests found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) {
          setSelectedRequest(null)
          setRemarks('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.status === 'PENDING'
                ? 'Approve/Reject Leave Request'
                : 'Leave Request Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  {selectedRequest.employee.user.name} - {selectedRequest.leaveType.name} ({selectedRequest.days} days)
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Start Date:</span>
                  <p className="font-medium">{format(new Date(selectedRequest.startDate), 'PPP')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">End Date:</span>
                  <p className="font-medium">{format(new Date(selectedRequest.endDate), 'PPP')}</p>
                </div>
                {selectedRequest.reason && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Reason:</span>
                    <p className="font-medium">{selectedRequest.reason}</p>
                  </div>
                )}
              </div>
              <div>
                <Label>Remarks (Optional)</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks..."
                  rows={3}
                />
              </div>
              {selectedRequest.status === 'PENDING' && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleApproveSubmit('REJECTED')}
                    disabled={approveMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApproveSubmit('APPROVED')}
                    disabled={approveMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


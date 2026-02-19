import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { postCaseChatSystemMessage } from '@/lib/case-chat'
import { z } from 'zod'
import { CaseStage, IpdStatus } from '@prisma/client'

const ipdMarkSchema = z.object({
  status: z.enum(['ADMITTED_DONE', 'POSTPONED', 'CANCELLED', 'DISCHARGED']),
  reason: z.string().optional(),
  newSurgeryDate: z.string().optional(),
  dischargeDate: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (user.role !== 'BD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden: Only BD can mark IPD status', 403)
    }

    const { id: leadId } = await params
    const body = await request.json()
    const data = ipdMarkSchema.parse(body)

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { admissionRecord: true },
    })

    if (!lead) {
      return errorResponse('Lead not found', 404)
    }

    if (lead.caseStage !== CaseStage.INITIATED) {
      return errorResponse(`Cannot mark IPD status. Current stage: ${lead.caseStage}. Patient must be initiated first.`, 400)
    }

    if (!lead.admissionRecord) {
      return errorResponse('Admission record not found', 400)
    }

    // Validate conditional fields based on status
    if (data.status === 'POSTPONED') {
      if (!data.reason?.trim()) {
        return errorResponse('Reason is required for postponed status', 400)
      }
      if (!data.newSurgeryDate?.trim()) {
        return errorResponse('New surgery date is required for postponed status', 400)
      }
    }

    if (data.status === 'CANCELLED') {
      if (!data.reason?.trim()) {
        return errorResponse('Reason is required for cancelled status', 400)
      }
    }

    if (data.status === 'DISCHARGED') {
      if (!data.dischargeDate?.trim()) {
        return errorResponse('Discharge date is required for discharged status', 400)
      }
    }

    // Update admission record with IPD status
    const updateData: Record<string, any> = {
      ipdStatus: data.status,
      ipdStatusReason: data.reason?.trim() || undefined,
      ipdStatusUpdatedAt: new Date(),
      ipdStatusNotes: data.notes?.trim() || undefined,
    }

    if (data.status === 'POSTPONED' && data.newSurgeryDate) {
      updateData.newSurgeryDate = new Date(data.newSurgeryDate)
    }

    if (data.status === 'DISCHARGED' && data.dischargeDate) {
      updateData.ipdDischargeDate = new Date(data.dischargeDate)
    }

    const admission = await prisma.admissionRecord.update({
      where: { leadId },
      data: updateData,
    })

    // Only update case stage if status is DISCHARGED
    let leadUpdateData: Record<string, any> = {}
    let toStage = lead.caseStage

    if (data.status === 'DISCHARGED') {
      toStage = CaseStage.DISCHARGED
      leadUpdateData.caseStage = CaseStage.DISCHARGED
    }

    if (Object.keys(leadUpdateData).length > 0) {
      await prisma.lead.update({
        where: { id: leadId },
        data: leadUpdateData,
      })
    }

    // Create stage history entry (only if stage changed)
    if (toStage !== lead.caseStage) {
      await prisma.caseStageHistory.create({
        data: {
          leadId,
          fromStage: lead.caseStage,
          toStage,
          changedById: user.id,
          note: `IPD status: ${data.status}${data.reason ? ` - ${data.reason}` : ''}`,
        },
      })
    }

    // Post case chat message
    const statusMessages: Record<string, string> = {
      ADMITTED_DONE: 'Surgery confirmed done.',
      POSTPONED: `Surgery postponed - ${data.reason || 'No reason provided'}. New surgery date: ${data.newSurgeryDate}`,
      CANCELLED: `Case cancelled - ${data.reason || 'No reason provided'}`,
      DISCHARGED: `Patient discharged on ${data.dischargeDate}`,
    }

    await postCaseChatSystemMessage(leadId, `BD marked IPD status: ${statusMessages[data.status]}`)

    // Notify Insurance team
    const insuranceUsers = await prisma.user.findMany({
      where: {
        role: 'INSURANCE_HEAD',
      },
    })

    const titleMap: Record<string, string> = {
      ADMITTED_DONE: 'Surgery Confirmed',
      POSTPONED: 'Surgery Postponed',
      CANCELLED: 'Case Cancelled',
      DISCHARGED: 'Patient Discharged',
    }

    await prisma.notification.createMany({
      data: insuranceUsers.map((insuranceUser) => ({
        userId: insuranceUser.id,
        type: 'IPD_MARKED',
        title: titleMap[data.status],
        message: `IPD status updated for ${lead.patientName} (${lead.leadRef}): ${data.status}`,
        link: `/patient/${leadId}`,
        relatedId: admission.id,
      })),
    })

    return successResponse(admission, `IPD status marked as ${data.status} successfully`)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data: ' + error.errors.map(e => e.message).join(', '), 400)
    }
    console.error('Error marking IPD status:', error)
    return errorResponse('Failed to mark IPD status', 500)
  }
}

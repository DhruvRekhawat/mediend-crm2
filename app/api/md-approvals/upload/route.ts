import { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { hasFeaturePermission } from '@/lib/permissions'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { uploadFileToS3 } from '@/lib/s3-client'

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const canRequest = await hasFeaturePermission(user.id, 'md_approval_request')
    if (!canRequest) {
      return errorResponse('You do not have permission to upload attachments for MD approval', 403)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return errorResponse('No file provided', 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await uploadFileToS3(buffer, file.name, 'md-approvals')

    return successResponse(result, 'File uploaded successfully')
  } catch (error) {
    console.error('Error uploading file:', error)
    return errorResponse('Failed to upload file', 500)
  }
}

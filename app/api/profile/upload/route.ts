import { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { uploadFileToS3 } from '@/lib/s3-client'

/**
 * POST /api/profile/upload
 * Upload profile picture. Any authenticated user can upload.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = 'profile-pictures'

    if (!file) return errorResponse('No file provided', 400)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await uploadFileToS3(buffer, file.name, folder)

    return successResponse(result, 'File uploaded successfully')
  } catch (error) {
    console.error('[POST /api/profile/upload]', error)
    return errorResponse('Failed to upload file', 500)
  }
}

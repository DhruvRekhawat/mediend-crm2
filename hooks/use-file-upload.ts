import { useState } from 'react'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'

interface UploadFileResult {
  url: string
  key: string
}

interface UseFileUploadOptions {
  folder?: string
  onSuccess?: (result: UploadFileResult) => void
  onError?: (error: Error) => void
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const uploadFile = async (file: File): Promise<UploadFileResult | null> => {
    if (!file) {
      toast.error('No file selected')
      return null
    }

    setUploading(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (options.folder) {
        formData.append('folder', options.folder)
      }

      const result = await apiPost<UploadFileResult>('/api/kyp/upload', formData)

      setProgress(100)
      options.onSuccess?.(result)
      toast.success('File uploaded successfully')
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to upload file')
      options.onError?.(err)
      toast.error(err.message || 'Failed to upload file')
      return null
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const uploadMultipleFiles = async (
    files: File[]
  ): Promise<(UploadFileResult | null)[]> => {
    const results = await Promise.all(files.map((file) => uploadFile(file)))
    return results
  }

  return {
    uploadFile,
    uploadMultipleFiles,
    uploading,
    progress,
  }
}

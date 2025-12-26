'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, Download } from 'lucide-react'
import { format } from 'date-fns'

interface DocumentData {
  document: {
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
  htmlContent: string
}

const DOCUMENT_TITLES = {
  OFFER_LETTER: 'Offer Letter',
  APPRAISAL_LETTER: 'Appraisal Letter',
  EXPERIENCE_LETTER: 'Experience Letter',
  RELIEVING_LETTER: 'Relieving Letter',
}

export default function DocumentViewPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const { data, isLoading, error } = useQuery<DocumentData>({
    queryKey: ['document', documentId],
    queryFn: () => apiGet<DocumentData>(`/api/hr/documents/${documentId}`),
    enabled: !!documentId,
  })

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Trigger print dialog which can be used to save as PDF
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Document not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const documentTitle = DOCUMENT_TITLES[data.document.documentType]

  return (
    <>
      {/* Print controls - hidden when printing */}
      <div className="no-print p-4 bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{documentTitle}</h1>
              <p className="text-sm text-muted-foreground">
                {data.document.employee.user.name} ({data.document.employee.employeeCode})
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="min-h-screen bg-gray-50 p-8 print:p-0 print:bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Document Container */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none">
            <div 
              className="p-8 print:p-0"
              dangerouslySetInnerHTML={{ __html: data.htmlContent }} 
            />
          </div>
        </div>
      </div>

      {/* Footer - hidden when printing */}
      <div className="no-print p-4 border-t bg-muted/50">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>Generated on {format(new Date(data.document.generatedAt), 'PPP')} at {format(new Date(data.document.generatedAt), 'p')}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5cm;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:bg-white {
            background: white !important;
          }
        }
      `}</style>
    </>
  )
}


import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { postCaseChatSystemMessage } from '@/lib/case-chat'
import { uploadFileToS3 } from '@/lib/s3-client'
import { z } from 'zod'
import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'

const generatePDFSchema = z.object({
  recipients: z.array(z.string()).optional(),
})

function isImageUrl(url: string): boolean {
  const u = url.toLowerCase()
  return u.includes('.png') || u.includes('.jpg') || u.includes('.jpeg') || u.includes('.gif') || u.includes('.webp')
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mime: string } | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const base64 = buf.toString('base64')
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const mime = contentType.split(';')[0].trim()
    return { data: base64, mime }
  } catch {
    return null
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildPreAuthHtml(params: {
  logoDataUrl: string | null
  patientName: string
  leadRef: string
  insurance: string
  sumInsured: string
  hospital: string
  roomType: string
  diseaseDescription: string
  imageDataUrls: Array<{ data: string; mime: string }>
}): string {
  const {
    logoDataUrl,
    patientName,
    leadRef,
    insurance,
    sumInsured,
    hospital,
    roomType,
    diseaseDescription,
    imageDataUrls,
  } = params

  const rows = [
    ['Patient', escapeHtml(patientName)],
    ['Lead Ref', escapeHtml(leadRef)],
    ['Insurance', escapeHtml(insurance)],
    ['Sum Insured', escapeHtml(sumInsured)],
    ['Hospital', escapeHtml(hospital)],
    ['Room Type', escapeHtml(roomType)],
    ['Disease / Description', escapeHtml(diseaseDescription)],
  ]

  const imagePages = imageDataUrls
    .map(
      (img) =>
        `<div class="page-break"><img src="data:${img.mime};base64,${img.data}" alt="Document" class="doc-image" /></div>`
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; line-height: 1.4; color: #1a1a1a; margin: 0; padding: 24px; }
    .logo { height: 36px; width: auto; margin-bottom: 16px; }
    h1 { font-size: 16px; font-weight: 700; margin: 0 0 16px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
    th { font-weight: 600; width: 140px; color: #555; }
    .page-break { page-break-before: always; padding-top: 24px; }
    .doc-image { max-width: 100%; height: auto; display: block; }
    @media print { body { padding: 16px; } .page-break { page-break-before: always; } }
  </style>
</head>
<body>
  ${logoDataUrl ? `<img src="${logoDataUrl}" class="logo" alt="MediEND" />` : '<div style="font-size:18px;font-weight:700;margin-bottom:16px;">MediEND</div>'}
  <h1>Pre-Authorization Summary</h1>
  <table>
    ${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${value}</td></tr>`).join('')}
  </table>
  ${imagePages}
</body>
</html>`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (user.role !== 'INSURANCE_HEAD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden: Only Insurance can generate PDFs', 403)
    }

    const { id: leadId } = await params
    const body = await request.json().catch(() => ({}))
    const data = generatePDFSchema.parse(body)

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        kypSubmission: {
          include: {
            preAuthData: true,
          },
        },
      },
    })

    if (!lead || !lead.kypSubmission || !lead.kypSubmission.preAuthData) {
      return errorResponse('Pre-authorization not found', 404)
    }

    const kyp = lead.kypSubmission
    const preAuth = kyp.preAuthData!

    const latestPDF = await prisma.preAuthPDF.findFirst({
      where: { preAuthorizationId: preAuth.id },
      orderBy: { version: 'desc' },
    })
    const nextVersion = latestPDF ? latestPDF.version + 1 : 1

    // Logo as data URL
    let logoDataUrl: string | null = null
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo-mediend.png')
      if (fs.existsSync(logoPath)) {
        const logoBase64 = fs.readFileSync(logoPath).toString('base64')
        logoDataUrl = `data:image/png;base64,${logoBase64}`
      }
    } catch {
      // no logo
    }

    // Collect and fetch document images
    const docUrls: string[] = []
    if (kyp.insuranceCardFileUrl) docUrls.push(kyp.insuranceCardFileUrl)
    if (kyp.aadharFileUrl) docUrls.push(kyp.aadharFileUrl)
    if (kyp.panFileUrl) docUrls.push(kyp.panFileUrl)
    if (kyp.prescriptionFileUrl) docUrls.push(kyp.prescriptionFileUrl)
    const diseasePhotos = (kyp.diseasePhotos as Array<{ name?: string; url?: string }>) || []
    diseasePhotos.forEach((p) => { if (p?.url) docUrls.push(p.url) })
    const diseaseImages = (preAuth.diseaseImages as Array<{ name?: string; url?: string }>) || []
    diseaseImages.forEach((p) => { if (p?.url) docUrls.push(p.url) })

    const imageDataUrls: Array<{ data: string; mime: string }> = []
    for (const url of docUrls) {
      if (!url || !isImageUrl(url)) continue
      const img = await fetchImageAsBase64(url)
      if (img) imageDataUrls.push(img)
    }

    const diseaseText = (preAuth.diseaseDescription || kyp.disease || '—').slice(0, 500)
    const html = buildPreAuthHtml({
      logoDataUrl,
      patientName: lead.patientName || '—',
      leadRef: lead.leadRef || '—',
      insurance: preAuth.insurance || '—',
      sumInsured: preAuth.sumInsured || '—',
      hospital: preAuth.requestedHospitalName || '—',
      roomType: preAuth.requestedRoomType || '—',
      diseaseDescription: diseaseText + ((preAuth.diseaseDescription || kyp.disease || '').length > 500 ? '...' : ''),
      imageDataUrls,
    })

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = Buffer.from(await page.pdf({ format: 'A4', margin: { top: '16px', right: '16px', bottom: '16px', left: '16px' } }))
    await browser.close()
    browser = null

    const fileName = `preauth-${lead.leadRef}-v${nextVersion}.pdf`
    const { url: pdfUrl } = await uploadFileToS3(pdfBuffer, fileName, 'preauth-pdf')

    const pdfRecord = await prisma.preAuthPDF.create({
      data: {
        preAuthorizationId: preAuth.id,
        version: nextVersion,
        pdfUrl,
        recipients: data.recipients || [],
        sentAt: data.recipients && data.recipients.length > 0 ? new Date() : null,
        createdById: user.id,
      },
    })

    await postCaseChatSystemMessage(leadId, 'Pre-auth PDF generated.')

    return successResponse(pdfRecord, 'PDF generated successfully')
  } catch (error) {
    if (browser) {
      try {
        await browser.close()
      } catch {
        // ignore
      }
    }
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error generating PDF:', error)
    return errorResponse('Failed to generate PDF', 500)
  }
}

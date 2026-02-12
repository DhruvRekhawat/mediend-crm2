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
import { maskPhoneNumber } from '@/lib/phone-utils'

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
  lead: { patientName: string; leadRef: string; phoneNumber: string; city: string; treatment: string | null; category: string | null }
  kyp: { aadhar: string | null; pan: string | null; insuranceCard: string | null; location: string | null; area: string | null; disease: string | null; patientConsent: boolean; remark: string | null }
  preAuth: {
    insurance: string | null
    tpa: string | null
    sumInsured: string | null
    roomRent: string | null
    capping: string | null
    copay: string | null
    icu: string | null
    requestedHospitalName: string | null
    requestedRoomType: string | null
    diseaseDescription: string | null
  }
  imageDataUrls: Array<{ data: string; mime: string }>
}): string {
  const { logoDataUrl, lead, kyp, preAuth, imageDataUrls } = params
  const v = (s: string | null | undefined) => (s && String(s).trim()) || '—'
  const cityDisplay = v(kyp.location) !== '—' ? v(kyp.location) : v(lead.city)
  const diseaseDisplay = v(preAuth.diseaseDescription) !== '—' ? preAuth.diseaseDescription! : v(kyp.disease)

  const patientRows = [
    ['Patient Name', escapeHtml(lead.patientName)],
    ['Lead Ref', escapeHtml(lead.leadRef)],
    ['Phone', escapeHtml(lead.phoneNumber)],
    ['City', escapeHtml(cityDisplay)],
    ['Area', escapeHtml(kyp.area || '—')],
    ['Treatment', escapeHtml(lead.treatment || '—')],
    ['Category', escapeHtml(lead.category || '—')],
  ]

  const kypRows = [
    ['Aadhar', escapeHtml(v(kyp.aadhar))],
    ['PAN', escapeHtml(v(kyp.pan))],
    ['Insurance Card', escapeHtml(v(kyp.insuranceCard))],
    ['Disease / Treatment', escapeHtml(v(kyp.disease))],
    ['Patient Consent', kyp.patientConsent ? 'Yes' : 'No'],
    ['Remark', escapeHtml(v(kyp.remark))],
  ]

  const preAuthRows = [
    ['Insurance', escapeHtml(v(preAuth.insurance))],
    ['TPA', escapeHtml(v(preAuth.tpa))],
    ['Sum Insured', escapeHtml(v(preAuth.sumInsured))],
    ['Room Rent', escapeHtml(v(preAuth.roomRent))],
    ['Capping', escapeHtml(v(preAuth.capping))],
    ['Copay', escapeHtml(v(preAuth.copay))],
    ['ICU', escapeHtml(v(preAuth.icu))],
    ['Requested Hospital', escapeHtml(v(preAuth.requestedHospitalName))],
    ['Requested Room Type', escapeHtml(v(preAuth.requestedRoomType))],
    ['Disease Description', escapeHtml((diseaseDisplay || '').slice(0, 2000))],
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
    body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; line-height: 1.4; color: #1a1a1a; margin: 0; padding: 0; }
    .header-strip { background: #2563eb; padding: 16px 24px; margin: 0 0 24px 0; }
    .logo { height: 40px; width: auto; display: block; }
    .logo-fallback { font-size: 20px; font-weight: 700; color: #fff; }
    h1 { font-size: 18px; font-weight: 700; margin: 0 0 20px 0; color: #0f172a; padding: 0 24px; }
    h2 { font-size: 13px; font-weight: 600; margin: 16px 0 8px 0; color: #334155; }
    .section { margin-bottom: 20px; padding: 0 24px; }
    .content { padding: 0 24px 24px 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    th { font-weight: 600; width: 160px; color: #475569; }
    thead th { background: #f1f5f9; }
    .page-break { page-break-before: always; padding-top: 24px; }
    .doc-image { max-width: 100%; height: auto; display: block; }
    @media print { body { padding: 0; } .header-strip { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page-break { page-break-before: always; } }
  </style>
</head>
<body>
  <div class="header-strip">
    ${logoDataUrl ? `<img src="${logoDataUrl}" class="logo" alt="Mediend" />` : '<div class="logo-fallback">Mediend</div>'}
  </div>
  <div class="content">
  <h1>Patient & Pre-Authorization Summary</h1>

  <div class="section">
    <h2>Patient & Lead Details</h2>
    <table>
      ${patientRows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${value}</td></tr>`).join('')}
    </table>
  </div>

  <div class="section">
    <h2>KYP Details</h2>
    <table>
      ${kypRows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${value}</td></tr>`).join('')}
    </table>
  </div>

  <div class="section">
    <h2>Pre-Authorization Details</h2>
    <table>
      ${preAuthRows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${value}</td></tr>`).join('')}
    </table>
  </div>

  ${imageDataUrls.length > 0 ? '<h2 style="margin-top:20px;">Documents & Images</h2>' : ''}
  ${imagePages}
  </div>
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

    if (!['INSURANCE', 'INSURANCE_HEAD', 'ADMIN'].includes(user.role)) {
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

    // If a PDF was already generated, return its URL (open existing from bucket)
    if (latestPDF?.pdfUrl) {
      return successResponse(
        { pdfUrl: latestPDF.pdfUrl, version: latestPDF.version, existing: true },
        'Existing PDF'
      )
    }

    const nextVersion = (latestPDF?.version ?? 0) + 1

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

    // Mask phone number if user is not INSURANCE_HEAD or ADMIN
    const canViewPhone = user.role === 'INSURANCE_HEAD' || user.role === 'ADMIN'
    const phoneDisplay = canViewPhone ? (lead.phoneNumber || '—') : maskPhoneNumber(lead.phoneNumber)

    const html = buildPreAuthHtml({
      logoDataUrl,
      lead: {
        patientName: lead.patientName || '—',
        leadRef: lead.leadRef || '—',
        phoneNumber: phoneDisplay,
        city: lead.city || '—',
        treatment: lead.treatment ?? null,
        category: lead.category ?? null,
      },
      kyp: {
        aadhar: kyp.aadhar ?? null,
        pan: kyp.pan ?? null,
        insuranceCard: kyp.insuranceCard ?? null,
        location: kyp.location ?? null,
        area: kyp.area ?? null,
        disease: kyp.disease ?? null,
        patientConsent: kyp.patientConsent ?? false,
        remark: kyp.remark ?? null,
      },
      preAuth: {
        insurance: preAuth.insurance ?? null,
        tpa: preAuth.tpa ?? null,
        sumInsured: preAuth.sumInsured ?? null,
        roomRent: preAuth.roomRent ?? null,
        capping: preAuth.capping ?? null,
        copay: preAuth.copay ?? null,
        icu: preAuth.icu ?? null,
        requestedHospitalName: preAuth.requestedHospitalName ?? null,
        requestedRoomType: preAuth.requestedRoomType ?? null,
        diseaseDescription: preAuth.diseaseDescription ?? null,
      },
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

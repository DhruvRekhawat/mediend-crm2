import { format } from 'date-fns'

interface EmployeeData {
  name: string
  employeeCode: string
  email: string
  department?: string
  joinDate?: Date | null
  salary?: number | null
  designation?: string
}

interface CompanyData {
  name: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
}

const COMPANY_DATA: CompanyData = {
  name: 'Mediend Healthcare Pvt. Ltd.',
  address: '123 Business Park, Sector 18',
  city: 'Noida',
  state: 'Uttar Pradesh',
  pincode: '201301',
  phone: '+91 120 4567890',
  email: 'hr@mediend.in',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount)
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  
  if (num === 0) return 'Zero'
  if (num < 20) return ones[num]
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '')
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '')
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '')
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '')
}

export function generateOfferLetterHTML(employee: EmployeeData, metadata?: { designation?: string; ctc?: number }): string {
  const today = format(new Date(), 'do MMMM, yyyy')
  const designation = metadata?.designation || 'Associate'
  const ctc = metadata?.ctc || employee.salary || 0
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a365d; padding-bottom: 20px; }
    .header h1 { color: #1a365d; margin: 0; font-size: 28px; }
    .header p { margin: 5px 0; color: #666; }
    .date { text-align: right; margin-bottom: 20px; }
    .subject { font-weight: bold; text-align: center; margin: 20px 0; font-size: 16px; text-decoration: underline; }
    .salutation { margin: 20px 0; }
    .content p { text-align: justify; margin: 15px 0; }
    .terms { margin: 20px 0; }
    .terms li { margin: 10px 0; }
    .signature { margin-top: 50px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${COMPANY_DATA.name}</h1>
    <p>${COMPANY_DATA.address}, ${COMPANY_DATA.city}, ${COMPANY_DATA.state} - ${COMPANY_DATA.pincode}</p>
    <p>Phone: ${COMPANY_DATA.phone} | Email: ${COMPANY_DATA.email}</p>
  </div>
  
  <div class="date">
    <p>Date: ${today}</p>
    <p>Ref: MEDIEND/HR/OFFER/${employee.employeeCode}/${format(new Date(), 'yyyy')}</p>
  </div>
  
  <div class="salutation">
    <p><strong>To,</strong></p>
    <p>${employee.name}</p>
    <p>Email: ${employee.email}</p>
  </div>
  
  <div class="subject">
    OFFER OF EMPLOYMENT
  </div>
  
  <div class="content">
    <p>Dear ${employee.name},</p>
    
    <p>We are pleased to offer you the position of <strong>${designation}</strong> at ${COMPANY_DATA.name}. We were impressed with your background and believe you will be a valuable addition to our team.</p>
    
    <p>The terms of your employment are as follows:</p>
    
    <div class="terms">
      <ul>
        <li><strong>Position:</strong> ${designation}</li>
        <li><strong>Department:</strong> ${employee.department || 'To be assigned'}</li>
        <li><strong>Employee Code:</strong> ${employee.employeeCode}</li>
        <li><strong>Annual CTC:</strong> ${formatCurrency(ctc)} (${numberToWords(ctc)} Rupees Only)</li>
        <li><strong>Joining Date:</strong> ${employee.joinDate ? format(employee.joinDate, 'do MMMM, yyyy') : 'To be confirmed'}</li>
        <li><strong>Probation Period:</strong> 6 months from date of joining</li>
        <li><strong>Notice Period:</strong> 30 days (during probation) / 60 days (post probation)</li>
      </ul>
    </div>
    
    <p>This offer is contingent upon successful completion of background verification and submission of all required documents.</p>
    
    <p>Please sign and return a copy of this letter to indicate your acceptance of this offer within 7 days of receipt.</p>
    
    <p>We look forward to welcoming you to our team!</p>
  </div>
  
  <div class="signature">
    <p>Yours sincerely,</p>
    <br><br>
    <p><strong>HR Department</strong></p>
    <p>${COMPANY_DATA.name}</p>
  </div>
  
  <div style="margin-top: 60px; border-top: 1px dashed #999; padding-top: 20px;">
    <p><strong>Acceptance:</strong></p>
    <p>I, ${employee.name}, hereby accept the offer of employment as mentioned above.</p>
    <br><br>
    <p>Signature: _________________ &nbsp;&nbsp;&nbsp;&nbsp; Date: _________________</p>
  </div>
  
  <div class="footer">
    <p>This is a computer-generated document. For any queries, please contact HR at ${COMPANY_DATA.email}</p>
  </div>
</body>
</html>`
}

export function generateAppraisalLetterHTML(employee: EmployeeData, metadata?: { 
  previousSalary?: number
  newSalary?: number
  incrementPercentage?: number
  effectiveDate?: string
  remarks?: string
}): string {
  const today = format(new Date(), 'do MMMM, yyyy')
  const previousSalary = metadata?.previousSalary || employee.salary || 0
  const incrementPercentage = metadata?.incrementPercentage || 10
  const newSalary = metadata?.newSalary || Math.round(previousSalary * (1 + incrementPercentage / 100))
  const effectiveDate = metadata?.effectiveDate || format(new Date(), 'do MMMM, yyyy')
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a365d; padding-bottom: 20px; }
    .header h1 { color: #1a365d; margin: 0; font-size: 28px; }
    .header p { margin: 5px 0; color: #666; }
    .date { text-align: right; margin-bottom: 20px; }
    .subject { font-weight: bold; text-align: center; margin: 20px 0; font-size: 16px; text-decoration: underline; }
    .content p { text-align: justify; margin: 15px 0; }
    .highlight { background: #f0f9ff; padding: 15px; border-left: 4px solid #1a365d; margin: 20px 0; }
    .signature { margin-top: 50px; }
    .confidential { color: red; font-weight: bold; text-align: center; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="confidential">*** CONFIDENTIAL ***</div>
  
  <div class="header">
    <h1>${COMPANY_DATA.name}</h1>
    <p>${COMPANY_DATA.address}, ${COMPANY_DATA.city}, ${COMPANY_DATA.state} - ${COMPANY_DATA.pincode}</p>
  </div>
  
  <div class="date">
    <p>Date: ${today}</p>
    <p>Ref: MEDIEND/HR/APPRAISAL/${employee.employeeCode}/${format(new Date(), 'yyyy')}</p>
  </div>
  
  <div>
    <p><strong>${employee.name}</strong></p>
    <p>Employee Code: ${employee.employeeCode}</p>
    <p>Department: ${employee.department || 'N/A'}</p>
  </div>
  
  <div class="subject">
    ANNUAL APPRAISAL LETTER
  </div>
  
  <div class="content">
    <p>Dear ${employee.name},</p>
    
    <p>We take great pleasure in informing you about your annual performance appraisal. Based on your performance evaluation and contribution to the organization, the management has decided to revise your compensation.</p>
    
    <div class="highlight">
      <p><strong>Appraisal Details:</strong></p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0;">Previous Annual CTC:</td>
          <td style="padding: 8px 0; text-align: right;"><strong>${formatCurrency(previousSalary)}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">Increment Percentage:</td>
          <td style="padding: 8px 0; text-align: right;"><strong>${incrementPercentage}%</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">Revised Annual CTC:</td>
          <td style="padding: 8px 0; text-align: right;"><strong>${formatCurrency(newSalary)}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">Effective Date:</td>
          <td style="padding: 8px 0; text-align: right;"><strong>${effectiveDate}</strong></td>
        </tr>
      </table>
    </div>
    
    ${metadata?.remarks ? `<p><strong>Remarks:</strong> ${metadata.remarks}</p>` : ''}
    
    <p>We appreciate your dedication and hard work. We hope you will continue to contribute towards the growth of the organization with the same enthusiasm.</p>
    
    <p>Congratulations on your well-deserved appraisal!</p>
  </div>
  
  <div class="signature">
    <p>Best Regards,</p>
    <br><br>
    <p><strong>HR Department</strong></p>
    <p>${COMPANY_DATA.name}</p>
  </div>
</body>
</html>`
}

export function generateExperienceLetterHTML(employee: EmployeeData, metadata?: {
  designation?: string
  lastWorkingDate?: string
}): string {
  const today = format(new Date(), 'do MMMM, yyyy')
  const designation = metadata?.designation || 'Associate'
  const lastWorkingDate = metadata?.lastWorkingDate || today
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a365d; padding-bottom: 20px; }
    .header h1 { color: #1a365d; margin: 0; font-size: 28px; }
    .header p { margin: 5px 0; color: #666; }
    .date { text-align: right; margin-bottom: 20px; }
    .subject { font-weight: bold; text-align: center; margin: 30px 0; font-size: 18px; text-decoration: underline; }
    .content p { text-align: justify; margin: 15px 0; }
    .signature { margin-top: 50px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${COMPANY_DATA.name}</h1>
    <p>${COMPANY_DATA.address}, ${COMPANY_DATA.city}, ${COMPANY_DATA.state} - ${COMPANY_DATA.pincode}</p>
    <p>Phone: ${COMPANY_DATA.phone} | Email: ${COMPANY_DATA.email}</p>
  </div>
  
  <div class="date">
    <p>Date: ${today}</p>
    <p>Ref: MEDIEND/HR/EXP/${employee.employeeCode}/${format(new Date(), 'yyyy')}</p>
  </div>
  
  <div class="subject">
    EXPERIENCE CERTIFICATE
  </div>
  
  <div class="content">
    <p><strong>TO WHOMSOEVER IT MAY CONCERN</strong></p>
    
    <p>This is to certify that <strong>${employee.name}</strong> (Employee Code: ${employee.employeeCode}) was employed with ${COMPANY_DATA.name} as <strong>${designation}</strong> in the ${employee.department || 'Operations'} Department.</p>
    
    <p>The period of employment was from <strong>${employee.joinDate ? format(employee.joinDate, 'do MMMM, yyyy') : 'N/A'}</strong> to <strong>${lastWorkingDate}</strong>.</p>
    
    <p>During the tenure with us, we found ${employee.name} to be sincere, hardworking, and dedicated to the assigned responsibilities. The performance and conduct were satisfactory throughout the employment period.</p>
    
    <p>We wish ${employee.name} all the best for future endeavors.</p>
  </div>
  
  <div class="signature">
    <p>For ${COMPANY_DATA.name}</p>
    <br><br><br>
    <p><strong>Authorized Signatory</strong></p>
    <p>HR Department</p>
  </div>
</body>
</html>`
}

export function generateRelievingLetterHTML(employee: EmployeeData, metadata?: {
  designation?: string
  lastWorkingDate?: string
  resignationDate?: string
}): string {
  const today = format(new Date(), 'do MMMM, yyyy')
  const designation = metadata?.designation || 'Associate'
  const lastWorkingDate = metadata?.lastWorkingDate || today
  const resignationDate = metadata?.resignationDate || format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'do MMMM, yyyy')
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a365d; padding-bottom: 20px; }
    .header h1 { color: #1a365d; margin: 0; font-size: 28px; }
    .header p { margin: 5px 0; color: #666; }
    .date { text-align: right; margin-bottom: 20px; }
    .subject { font-weight: bold; text-align: center; margin: 30px 0; font-size: 18px; text-decoration: underline; }
    .content p { text-align: justify; margin: 15px 0; }
    .signature { margin-top: 50px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${COMPANY_DATA.name}</h1>
    <p>${COMPANY_DATA.address}, ${COMPANY_DATA.city}, ${COMPANY_DATA.state} - ${COMPANY_DATA.pincode}</p>
    <p>Phone: ${COMPANY_DATA.phone} | Email: ${COMPANY_DATA.email}</p>
  </div>
  
  <div class="date">
    <p>Date: ${today}</p>
    <p>Ref: MEDIEND/HR/REL/${employee.employeeCode}/${format(new Date(), 'yyyy')}</p>
  </div>
  
  <div class="subject">
    RELIEVING LETTER
  </div>
  
  <div class="content">
    <p><strong>${employee.name}</strong></p>
    <p>Employee Code: ${employee.employeeCode}</p>
    <br>
    
    <p>Dear ${employee.name},</p>
    
    <p>With reference to your resignation letter dated <strong>${resignationDate}</strong>, we hereby confirm that you have been relieved from your duties as <strong>${designation}</strong> at ${COMPANY_DATA.name} with effect from <strong>${lastWorkingDate}</strong>.</p>
    
    <p>During your tenure from <strong>${employee.joinDate ? format(employee.joinDate, 'do MMMM, yyyy') : 'N/A'}</strong> to <strong>${lastWorkingDate}</strong>, your services were found satisfactory.</p>
    
    <p>You have completed all handover formalities and cleared all company dues. There are no financial or material obligations pending from your side.</p>
    
    <p>We thank you for your contributions to the organization and wish you success in your future endeavors.</p>
  </div>
  
  <div class="signature">
    <p>For ${COMPANY_DATA.name}</p>
    <br><br><br>
    <p><strong>Authorized Signatory</strong></p>
    <p>HR Department</p>
  </div>
</body>
</html>`
}


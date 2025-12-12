import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, unauthorizedResponse } from '@/lib/api-utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      include: {
        user: true,
        department: true,
      },
    })

    if (!employee) {
      return errorResponse('Employee record not found', 404)
    }

    const payrollRecord = await prisma.payrollRecord.findUnique({
      where: { id: params.id },
      include: {
        components: true,
      },
    })

    if (!payrollRecord || payrollRecord.employeeId !== employee.id) {
      return errorResponse('Payroll record not found', 404)
    }

    // Generate PDF
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(20)
    doc.text('SALARY SLIP', 105, 20, { align: 'center' })
    
    doc.setFontSize(12)
    doc.text(`Month: ${getMonthName(payrollRecord.month)} ${payrollRecord.year}`, 105, 30, { align: 'center' })
    
    // Employee Details
    doc.setFontSize(10)
    let yPos = 45
    doc.text(`Employee Name: ${employee.user.name}`, 20, yPos)
    yPos += 7
    doc.text(`Employee Code: ${employee.employeeCode}`, 20, yPos)
    yPos += 7
    doc.text(`Department: ${employee.department?.name || 'N/A'}`, 20, yPos)
    yPos += 7
    doc.text(`Disbursed Date: ${new Date(payrollRecord.disbursedAt).toLocaleDateString()}`, 20, yPos)
    
    yPos += 15
    
    // Salary Breakdown
    const tableData: any[] = []
    
    // Basic Salary
    tableData.push(['Basic Salary', formatCurrency(payrollRecord.basicSalary)])
    
    // Allowances
    const allowances = payrollRecord.components.filter(c => c.componentType === 'ALLOWANCE')
    if (allowances.length > 0) {
      allowances.forEach(comp => {
        tableData.push([comp.name, formatCurrency(comp.amount)])
      })
    }
    
    // Gross Salary
    tableData.push(['Gross Salary', formatCurrency(payrollRecord.grossSalary)])
    
    // Deductions
    const deductions = payrollRecord.components.filter(c => c.componentType === 'DEDUCTION')
    if (deductions.length > 0) {
      deductions.forEach(comp => {
        tableData.push([comp.name, `-${formatCurrency(comp.amount)}`])
      })
    }
    
    // Net Salary
    tableData.push(['Net Salary', formatCurrency(payrollRecord.netSalary)])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Component', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 10 },
      columnStyles: {
        1: { halign: 'right' },
      },
    })
    
    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(8)
    doc.text('This is a system generated document.', 105, finalY, { align: 'center' })
    
    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="salary-slip-${payrollRecord.month}-${payrollRecord.year}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating salary slip:', error)
    return errorResponse('Failed to generate salary slip', 500)
  }
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return months[month - 1] || ''
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}


'use client'

import { jsPDF } from 'jspdf'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import { formatPEN } from '@/lib/utils'

interface VoucherProps {
  orderData: {
    id: string
    customerName: string
    items: any[]
    total: number
    date: string
  }
}

export function VoucherGenerator({ orderData }: VoucherProps) {
  const generatePDF = () => {
    const doc = new jsPDF()

    // Header
    doc.setFillColor(83, 74, 183) // Indigo Tech
    doc.rect(0, 0, 210, 40, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.text('TECHBUILDS PERU', 105, 25, { align: 'center' })

    // Order Info
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Voucher ID: ${orderData.id}`, 20, 50)
    doc.text(`Fecha: ${orderData.date}`, 20, 55)
    doc.text(`Cliente: ${orderData.customerName}`, 20, 60)

    // Table Header
    doc.line(20, 70, 190, 70)
    doc.setFontSize(12)
    doc.text('Producto', 20, 78)
    doc.text('Cant.', 150, 78)
    doc.text('Subtotal', 170, 78)
    doc.line(20, 82, 190, 82)

    // Items
    let y = 90
    orderData.items.forEach((item) => {
      doc.setFontSize(10)
      doc.text(item.name, 20, y)
      doc.text(item.quantity.toString(), 150, y)
      doc.text(formatPEN(item.price * item.quantity), 170, y)
      y += 10
    })

    // Total
    doc.line(20, y + 5, 190, y + 5)
    doc.setFontSize(14)
    doc.text('TOTAL:', 140, y + 15)
    doc.text(formatPEN(orderData.total), 170, y + 15)

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Gracias por confiar en TechBuilds. Este es un comprobante de reserva.', 105, 280, { align: 'center' })

    doc.save(`voucher-techbuilds-${orderData.id.slice(0, 8)}.pdf`)
  }

  return (
    <Button
      onClick={generatePDF}
      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20"
    >
      <FileText className="w-5 h-5" />
      Descargar Voucher PDF
    </Button>
  )
}

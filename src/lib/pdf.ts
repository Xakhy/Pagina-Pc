import jsPDF from 'jspdf'
import { CartItem } from './supabase'

interface VoucherData {
  orderId: string
  customerName: string
  customerEmail: string
  address: string
  items: CartItem[]
  total: number
  date: string
  /** Ej. Tarjeta | Transferencia | Contra entrega */
  paymentMethod?: string
  /** Ej. Yape, BCP, etc. */
  paymentDetail?: string
}

function penText(amount: number) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 'S/ 0'
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function generateVoucherPDF(data: VoucherData, download = true): string | void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 20

  // ── Background dark ──────────────────────────────────────────────
  doc.setFillColor(3, 7, 18)
  doc.rect(0, 0, W, 297, 'F')

  // ── Header gradient bar ───────────────────────────────────────────
  doc.setFillColor(109, 40, 217)
  doc.rect(0, 0, W, 45, 'F')

  // ── Logo / Title ─────────────────────────────────────────────────
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text('TecnoStore', margin, 22)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(196, 181, 253)
  doc.text('Tu PC, tu reglas', margin, 30)
  doc.text('tecnostore.com', margin, 37)

  // Order badge (right side)
  doc.setFillColor(30, 27, 75)
  doc.roundedRect(W - 72, 10, 52, 22, 4, 4, 'F')
  doc.setTextColor(167, 139, 250)
  doc.setFontSize(7)
  doc.text('ORDEN #', W - 68, 20)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(data.orderId, W - 68, 28)

  // ── Status chip ───────────────────────────────────────────────────
  doc.setFillColor(21, 128, 61)
  doc.roundedRect(margin, 52, 42, 10, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('CONFIRMADO', margin + 6, 59)

  doc.setTextColor(156, 163, 175)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(data.date, W - margin, 58, { align: 'right' })

  // ── Customer Info ─────────────────────────────────────────────────
  let y = 72

  // Card background
  doc.setFillColor(13, 13, 26)
  doc.roundedRect(margin, y, W - margin * 2, 36, 4, 4, 'F')

  doc.setTextColor(109, 40, 217)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('DATOS DEL CLIENTE', margin + 5, y + 8)

  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text(data.customerName, margin + 5, y + 17)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.setFontSize(8)
  doc.text(data.customerEmail, margin + 5, y + 24)
  doc.text(data.address, margin + 5, y + 31)

  // ── Products table ────────────────────────────────────────────────
  y += 46

  doc.setTextColor(109, 40, 217)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUCTOS', margin, y)

  y += 6

  // Table header
  doc.setFillColor(30, 27, 75)
  doc.rect(margin, y, W - margin * 2, 8, 'F')
  doc.setTextColor(167, 139, 250)
  doc.setFontSize(7)
  doc.text('PRODUCTO', margin + 3, y + 5.5)
  doc.text('CATEGORÍA', margin + 90, y + 5.5)
  doc.text('CANT.', margin + 120, y + 5.5)
  doc.text('PRECIO', margin + 140, y + 5.5)
  doc.text('SUBTOTAL', W - margin - 3, y + 5.5, { align: 'right' })

  y += 8

  data.items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(13, 13, 26)
    } else {
      doc.setFillColor(17, 17, 34)
    }
    doc.rect(margin, y, W - margin * 2, 9, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    const productName = item.name.length > 35 ? item.name.slice(0, 34) + '…' : item.name
    doc.text(productName, margin + 3, y + 6)

    doc.setTextColor(156, 163, 175)
    doc.text(item.category, margin + 90, y + 6)
    doc.text(item.quantity.toString(), margin + 124, y + 6)
    doc.text(penText(item.price), margin + 140, y + 6)

    doc.setTextColor(167, 139, 250)
    doc.setFont('helvetica', 'bold')
    doc.text(penText(item.price * item.quantity), W - margin - 3, y + 6, { align: 'right' })

    y += 9
  })

  // ── Total ─────────────────────────────────────────────────────────
  y += 6

  doc.setFillColor(109, 40, 217)
  doc.roundedRect(W - margin - 65, y, 65, 16, 3, 3, 'F')
  doc.setTextColor(196, 181, 253)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('TOTAL', W - margin - 55, y + 6)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(penText(data.total), W - margin - 5, y + 13, { align: 'right' })

  if (data.paymentMethod || data.paymentDetail) {
    y += 22
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(156, 163, 175)
    const pay = [data.paymentMethod, data.paymentDetail].filter(Boolean).join(' · ')
    doc.text(`Pago: ${pay}`, margin, y)
  }

  // ── Footer ────────────────────────────────────────────────────────
  y = 270
  doc.setFillColor(13, 13, 26)
  doc.rect(0, y, W, 27, 'F')
  doc.setTextColor(75, 85, 99)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Gracias por tu compra en TecnoStore — Este documento es tu comprobante de pago.', W / 2, y + 9, { align: 'center' })
  doc.text('tecnostore.com  |  soporte@tecnostore.com', W / 2, y + 16, { align: 'center' })

  if (download) {
    doc.save(`voucher-${data.orderId}.pdf`)
  } else {
    // Return base64 data URI string
    return doc.output('datauristring')
  }
}

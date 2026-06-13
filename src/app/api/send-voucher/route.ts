import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'
import nodemailer from 'nodemailer'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL
const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD

if (SENDGRID_API_KEY) sgMail.setApiKey(SENDGRID_API_KEY)

/** Valida que un string sea base64 puro (sin data URI prefix) */
function isValidBase64(str: string): boolean {
  return /^[A-Za-z0-9+/]+=*$/.test(str.replace(/\s/g, ''))
}

/** Construye el HTML del email del voucher */
function buildEmailHtml(name: string, orderId: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #1a1a2e;">
      <div style="background: #6d28d9; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">TecnoStore</h1>
        <p style="color: #ddd6fe; margin: 4px 0 0; font-size: 13px;">Tu PC, tu reglas</p>
      </div>
      <div style="background: #f8f8ff; padding: 28px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
        <h2 style="margin: 0 0 8px; color: #1a1a2e;">¡Pedido confirmado, ${name || 'Cliente'}!</h2>
        <p style="color: #6b7280; margin: 0 0 20px;">Adjuntamos tu voucher en PDF con el detalle de tu compra.</p>
        <div style="background: #ede9fe; border-radius: 8px; padding: 12px 16px; display: inline-block;">
          <span style="font-size: 11px; text-transform: uppercase; color: #7c3aed; font-weight: bold;">Número de orden</span><br>
          <span style="font-size: 18px; font-weight: bold; color: #5b21b6; font-family: monospace;">${orderId}</span>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0;">
          ¿Preguntas? Escríbenos a <a href="mailto:soporte@tecnostore.com" style="color: #6d28d9;">soporte@tecnostore.com</a>
        </p>
      </div>
    </div>
  `
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, pdfBase64, orderId, name } = body ?? {}

    if (!email || !pdfBase64 || !orderId) {
      return NextResponse.json({ error: 'Faltan campos requeridos: email, pdfBase64, orderId' }, { status: 400 })
    }

    // Separar prefix de data URI si lo hubiera (ej: "data:application/pdf;base64,...")
    const base64Content = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64

    if (!base64Content || !isValidBase64(base64Content)) {
      return NextResponse.json({ error: 'PDF no es base64 válido' }, { status: 400 })
    }

    // Estimación del tamaño real del PDF
    const estimatedBytes = (base64Content.replace(/=+$/, '').length * 3) / 4
    if (estimatedBytes > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'El PDF supera el límite de 8MB' }, { status: 413 })
    }

    const subject = `¡Tu pedido ${orderId} está confirmado! — TecnoStore`
    const html = buildEmailHtml(name, orderId)

    // ── Intento 1: SendGrid ──────────────────────────────────────────────────
    if (SENDGRID_API_KEY && SENDGRID_FROM_EMAIL) {
      try {
        await sgMail.send({
          to: email,
          from: SENDGRID_FROM_EMAIL,
          subject,
          html,
          attachments: [{
            content: base64Content,
            filename: `voucher-${orderId}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          }],
        })
        console.log('[send-voucher] SendGrid OK — orden:', orderId)
        return NextResponse.json({ success: true, provider: 'sendgrid' })
      } catch (sgErr: any) {
        console.warn('[send-voucher] SendGrid falló, intentando Gmail:', sgErr?.message)
      }
    }

    // ── Intento 2: Gmail (fallback) ──────────────────────────────────────────
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      })

      await transporter.sendMail({
        from: `"TecnoStore" <${GMAIL_USER}>`,
        to: email,
        subject,
        html,
        attachments: [{
          filename: `voucher-${orderId}.pdf`,
          content: Buffer.from(base64Content, 'base64'),
          contentType: 'application/pdf',
        }],
      })

      console.log('[send-voucher] Gmail OK — orden:', orderId)
      return NextResponse.json({ success: true, provider: 'gmail' })
    }

    return NextResponse.json(
      { error: 'No hay proveedor de correo configurado (SENDGRID o GMAIL)' },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('[send-voucher] Error interno:', error)
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
  }
}

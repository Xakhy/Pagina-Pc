import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'
import nodemailer from 'nodemailer'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL
const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD

if (SENDGRID_API_KEY) sgMail.setApiKey(SENDGRID_API_KEY)

function isBase64(str: string) {
  const s = str.replace(/\s/g, '')
  return /^[A-Za-z0-9+/=]+$/.test(s)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, pdfBase64, orderId, name } = body ?? {}

    if (!email || !pdfBase64 || !orderId) {
      return NextResponse.json({ error: 'Faltan: email, pdfBase64, orderId' }, { status: 400 })
    }

    const base64Content = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64
    if (!base64Content || !isBase64(base64Content)) {
      return NextResponse.json({ error: 'PDF no es base64 válido' }, { status: 400 })
    }

    const bytes = (base64Content.length * (3/4))
    if (bytes > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF > 8MB' }, { status: 413 })
    }

    // Intenta SendGrid primero
    if (SENDGRID_API_KEY && SENDGRID_FROM_EMAIL) {
      try {
        const msg: any = {
          to: email,
          from: SENDGRID_FROM_EMAIL,
          subject: `¡Tu pedido ${orderId} está confirmado! - TecnoStore`,
          html: `<h2>Pedido confirmado, ${name || 'Cliente'}!</h2><p>Adjuntamos tu voucher en PDF.</p><p>Número: <strong>${orderId}</strong></p>`,
          attachments: [{
            content: base64Content,
            filename: `voucher-${orderId}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment',
          }],
        }
        const resp = await sgMail.send(msg)
        console.log('SendGrid OK')
        return NextResponse.json({ success: true, provider: 'sendgrid' })
      } catch (sgErr: any) {
        console.warn('SendGrid falló, intentando Gmail:', sgErr.message)
        // Cae a Gmail si SendGrid falla
      }
    }

    // Fallback: Gmail
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      })

      await transporter.sendMail({
        from: `"Pagina PC" <${GMAIL_USER}>`,
        to: email,
        subject: `¡Tu pedido ${orderId} está confirmado! - TecnoStore`,
        html: `<h2>Pedido confirmado, ${name || 'Cliente'}!</h2><p>Adjuntamos tu voucher en PDF.</p><p>Número: <strong>${orderId}</strong></p>`,
        attachments: [{
          filename: `voucher-${orderId}.pdf`,
          content: Buffer.from(base64Content, 'base64'),
          contentType: 'application/pdf',
        }],
      })

      console.log('Gmail OK')
      return NextResponse.json({ success: true, provider: 'gmail' })
    }

    return NextResponse.json({ error: 'Sin proveedor de correo (SENDGRID o GMAIL)' }, { status: 500 })
  } catch (error: any) {
    console.error('send-voucher error:', error)
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
  }
}

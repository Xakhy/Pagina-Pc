import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const { email, pdfBase64, orderId, name } = await req.json()

    if (!email || !pdfBase64 || !orderId) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    // Configurar el transporte de nodemailer usando la cuenta de Gmail del usuario
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    // Limpiar el string de base64 si es necesario
    const base64Content = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64

    // Configurar y enviar el correo
    const mailOptions = {
      from: `"Pagina PC" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `¡Tu pedido ${orderId} está confirmado! - TecnoStore`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #050506; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #0d0d1a; border-radius: 12px; overflow: hidden; border: 1px solid #1e1b4b; }
          .header { background: linear-gradient(90deg, #6d28d9 0%, #4c1d95 100%); padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; color: #ffffff; letter-spacing: 1px; font-weight: 800; }
          .content { padding: 30px; }
          .content h2 { color: #a78bfa; margin-top: 0; }
          .content p { color: #d1d5db; line-height: 1.6; font-size: 16px; }
          .order-box { background-color: #17172e; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center; border: 1px solid #2e2e48; }
          .order-num { color: #a78bfa; font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 2px; margin: 10px 0; }
          .footer { background-color: #0a0a14; padding: 20px; text-align: center; border-top: 1px solid #1e1b4b; }
          .footer p { color: #6b7280; font-size: 13px; margin: 0; }
        </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>TECNOSTORE</h1>
            </div>
            <div class="content">
              <h2>¡Pedido Confirmado, ${name || 'Cliente'}!</h2>
              <p>Tu orden ha sido procesada con éxito y ya estamos trabajando en ella. Prepárate para llevar tu experiencia gaming al siguiente nivel.</p>
              
              <div class="order-box">
                <p style="margin:0; color: #9ca3af; font-size: 14px; text-transform: uppercase;">Número de Orden</p>
                <div class="order-num">${orderId}</div>
              </div>
              
              <p>Hemos adjuntado a este correo tu <strong>Voucher de Compra en PDF</strong> con todos los detalles de los componentes que elegiste y el total pagado.</p>
              <p>Si tienes alguna consulta, puedes responder directamente a este correo. ¡Gracias por confiar en nosotros!</p>
            </div>
            <div class="footer">
              <p>Este correo se generó automáticamente. Por favor, revisa el archivo adjunto.</p>
              <p style="margin-top: 8px;">&copy; ${new Date().getFullYear()} TecnoStore. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `voucher-${orderId}.pdf`,
          content: Buffer.from(base64Content, 'base64'),
          contentType: 'application/pdf',
        },
      ],
    }

    const info = await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (error: any) {
    console.error('Error al enviar voucher:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}

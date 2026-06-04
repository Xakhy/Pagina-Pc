'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/lib/store'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, FileText, CheckCircle2, Loader2, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { generateVoucherPDF } from '@/lib/pdf'
import { formatPEN, formatUSD, EXCHANGE_RATE, cn } from '@/lib/utils'
import {
  resolveProductImageUrl,
  categoryFallbackImage,
} from '@/lib/product-images'
import { createClient } from '@/lib/supabase/client'
import type { CartItem } from '@/lib/supabase'

type OrderStatus = 'idle' | 'processing' | 'success'

type PaymentMain = 'card' | 'transfer' | 'cash'

type OrderSnapshot = {
  items: CartItem[]
  total: number
  paymentMain: PaymentMain
  paymentSub: string
}

const MAIN_OPTIONS: { id: PaymentMain; label: string }[] = [
  { id: 'card', label: '💳 Tarjeta' },
  { id: 'transfer', label: '🏦 Transferencia' },
  { id: 'cash', label: '💵 Contra entrega' },
]

const TRANSFER_APPS = ['Yape', 'Plin', 'BIM', 'Ligo', 'Tunki', 'Interbank App']
const CARD_BANKS = ['BCP', 'BBVA', 'Interbank', 'Scotiabank', 'Banbif', 'Otros']

export default function CheckoutPage() {
  const { items, getTotalPrice, clearCart } = useCart()
  const total = getTotalPrice()
  const supabase = createClient()

  const [status, setStatus] = useState<OrderStatus>('idle')
  const [orderId, setOrderId] = useState('')
  const [orderSnapshot, setOrderSnapshot] = useState<OrderSnapshot | null>(null)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', address: '', phone: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userEmail = session?.user?.email
      if (userEmail) {
        setSessionEmail(userEmail)
        setForm(f => ({ ...f, email: userEmail }))
      }
    })
  }, [supabase.auth])

  const [paymentMain, setPaymentMain] = useState<PaymentMain>('transfer')
  const [paymentSub, setPaymentSub] = useState('Yape')

  const setMain = (id: PaymentMain) => {
    setPaymentMain(id)
    if (id === 'transfer') setPaymentSub('Yape')
    else if (id === 'card') setPaymentSub('BCP')
    else setPaymentSub('Efectivo al recibir')
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Nombre requerido'
    if (!form.email.includes('@')) errs.email = 'Email inválido'
    if (!form.address.trim()) errs.address = 'Dirección requerida'
    if (!paymentSub.trim()) errs.payment = 'Elige un método de pago'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setStatus('processing')
    await new Promise((r) => setTimeout(r, 1200))

    const newOrderId = `TS-${Date.now().toString().slice(-8)}`
    const snapshotItems: CartItem[] = items.map((i) => ({ ...i }))
    const snapshotTotal = getTotalPrice()

    setOrderSnapshot({
      items: snapshotItems,
      total: snapshotTotal,
      paymentMain,
      paymentSub,
    })
    setOrderId(newOrderId)
    setStatus('success')

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const orderPayload = {
      user_id: session?.user?.id ?? null,
      customer_name: form.name.trim(),
      customer_email: form.email.trim(),
      address: form.address.trim(),
      items: snapshotItems.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        category: i.category,
        image_url: i.image_url,
      })),
      total: snapshotTotal,
      status: 'pending',
    }

    const { error: orderErr } = await supabase.from('orders').insert(orderPayload)
    if (orderErr) {
      console.warn('No se pudo guardar la orden en Supabase:', orderErr.message)
    }

    clearCart()
  }

  const paymentLabel = () => {
    const mainHuman =
      paymentMain === 'card'
        ? 'Tarjeta'
        : paymentMain === 'transfer'
          ? 'Transferencia'
          : 'Contra entrega'
    return `${mainHuman}: ${paymentSub}`
  }

  const handleDownloadPDF = () => {
    if (!orderSnapshot) return
    const mainLabel =
      paymentMain === 'card'
        ? 'Tarjeta'
        : paymentMain === 'transfer'
          ? 'Transferencia'
          : 'Contra entrega'
    generateVoucherPDF({
      orderId,
      customerName: form.name,
      customerEmail: form.email,
      address: form.address,
      items: orderSnapshot.items,
      total: orderSnapshot.total,
      date: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      paymentMethod: mainLabel,
      paymentDetail: orderSnapshot.paymentSub,
    })
  }

  const handleSendEmail = async () => {
    if (!orderSnapshot) return
    
    setIsSendingEmail(true)
    const mainLabel =
      paymentMain === 'card'
        ? 'Tarjeta'
        : paymentMain === 'transfer'
          ? 'Transferencia'
          : 'Contra entrega'
          
    try {
      const pdfBase64 = generateVoucherPDF({
        orderId,
        customerName: form.name,
        customerEmail: form.email,
        address: form.address,
        items: orderSnapshot.items,
        total: orderSnapshot.total,
        date: new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        paymentMethod: mainLabel,
        paymentDetail: orderSnapshot.paymentSub,
      }, false) // false = return base64 instead of download

      const res = await fetch('/api/send-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          orderId,
          pdfBase64
        })
      })

      if (!res.ok) throw new Error('Error enviando el correo')
      
      setEmailSent(true)
      toast.success(`✅ Voucher enviado a ${form.email}`)
    } catch (error) {
      console.error(error)
      toast.error('Hubo un error al enviar el correo. Intenta de nuevo.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  if (items.length === 0 && status === 'idle') {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">🛒</div>
          <h2 className="text-2xl font-bold text-white">Tu carrito está vacío</h2>
          <p className="text-gray-500">Agrega productos antes de hacer checkout</p>
          <Link href="/productos" className="inline-flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 rounded-md transition-colors">
            <ArrowLeft className="mr-2 w-4 h-4" /> Ver Productos
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    const paid = orderSnapshot?.total ?? 0
    const paymentHuman =
      orderSnapshot?.paymentMain === 'card'
        ? 'Tarjeta'
        : orderSnapshot?.paymentMain === 'transfer'
          ? 'Transferencia'
          : 'Contra entrega'
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-24">
        <div className="max-w-lg w-full" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {/* Header success banner */}
          <div className="rounded-3xl overflow-hidden border border-white/10" style={{ background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(24px)' }}>
            {/* Top gradient bar */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #6d28d9, #10b981, #6d28d9)' }} />

            {/* Check icon + title */}
            <div className="px-8 pt-10 pb-6 text-center border-b border-white/5">
              <div className="relative inline-flex mb-6">
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(16,185,129,0.2)', animationDuration: '2s' }} />
                <div className="relative w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)', border: '1.5px solid rgba(16,185,129,0.4)' }}>
                  <CheckCircle2 className="w-9 h-9" style={{ color: '#34d399' }} />
                </div>
              </div>
              <h2 className="text-4xl font-black text-white mb-1 tracking-tight">¡Pedido Confirmado!</h2>
              <p className="text-gray-400 text-base">
                Gracias, <span className="text-white font-semibold">{form.name}</span> — ya estamos en ello
              </p>
            </div>

            {/* Order info grid */}
            <div className="px-8 py-6 space-y-4">
              {/* Order ID */}
              <div className="rounded-2xl px-5 py-4" style={{ background: 'rgba(109,40,217,0.1)', border: '1px solid rgba(109,40,217,0.25)' }}>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1">Número de orden</p>
                <p className="text-2xl font-black tracking-widest" style={{ color: '#a78bfa', fontFamily: 'monospace' }}>{orderId}</p>
              </div>

              {/* Total + Payment row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl px-4 py-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1">Total pagado</p>
                  <p className="text-xl font-black" style={{ color: '#34d399' }}>{formatPEN(paid)}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">≈ {formatUSD(paid / EXCHANGE_RATE)}</p>
                </div>
                <div className="rounded-2xl px-4 py-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1">Método de pago</p>
                  <p className="text-sm font-bold text-white">{orderSnapshot?.paymentSub}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">{paymentHuman}</p>
                </div>
              </div>

              {/* Email info */}
              <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: '#6b7280' }} />
                <p className="text-sm text-gray-400">
                  Confirmación a{' '}
                  <span className="text-gray-200 font-medium">{form.email}</span>
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-8 pb-8 space-y-3">
              <button
                type="button"
                id="download-voucher-btn"
                onClick={handleDownloadPDF}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)', boxShadow: '0 4px 24px rgba(109,40,217,0.3)' }}
              >
                <FileText className="h-4 w-4" />
                Descargar Voucher PDF
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSendingEmail || emailSent}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed"
                style={{
                  background: emailSent
                    ? 'rgba(16,185,129,0.15)'
                    : 'rgba(255,255,255,0.07)',
                  border: emailSent
                    ? '1px solid rgba(16,185,129,0.4)'
                    : '1px solid rgba(255,255,255,0.1)',
                  color: emailSent ? '#34d399' : '#ffffff',
                  opacity: isSendingEmail ? 0.7 : 1,
                }}
              >
                {isSendingEmail ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                ) : emailSent ? (
                  <><CheckCircle2 className="h-4 w-4" /> ¡Enviado a tu correo!</>
                ) : (
                  <><Mail className="h-4 w-4" /> Enviar voucher al correo</>
                )}
              </button>

              <Link
                href="/productos"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <ArrowLeft className="h-4 w-4" />
                Seguir comprando
              </Link>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-600 mt-5">
            Tu pedido quedó registrado y será procesado a la brevedad.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1
            className="text-5xl font-black text-white mb-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Checkout
          </h1>
          <p className="text-gray-400">Completa tu información para finalizar la compra</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="glass rounded-2xl p-6 space-y-5">
                <h2 className="font-bold text-white text-lg">Información de contacto</h2>

                {[
                  { id: 'name', label: 'Nombre completo', placeholder: 'Juan García', type: 'text' },
                  { id: 'email', label: 'Email', placeholder: 'juan@email.com', type: 'email' },
                  { id: 'phone', label: 'Teléfono', placeholder: '+51 999 000 000', type: 'tel' },
                  { id: 'address', label: 'Dirección de entrega', placeholder: 'Calle, número, ciudad', type: 'text' },
                ].filter(field => !(field.id === 'email' && sessionEmail)).map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <Label htmlFor={field.id} className="text-gray-300 text-sm">
                      {field.label}
                    </Label>
                    <Input
                      id={field.id}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={form[field.id as keyof typeof form]}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, [field.id]: e.target.value }))
                        setErrors((err) => ({ ...err, [field.id]: '' }))
                      }}
                      className={`bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500 h-11 ${errors[field.id] ? 'border-red-500/60' : ''
                        }`}
                    />
                    {errors[field.id] && <p className="text-xs text-red-400">{errors[field.id]}</p>}
                  </div>
                ))}
              </div>

              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="font-bold text-white text-lg">Pago</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {MAIN_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMain(m.id)}
                      className={cn(
                        'rounded-xl border px-3 py-3 text-center text-xs font-bold transition-all',
                        paymentMain === m.id
                          ? 'border-violet-500 bg-violet-600/30 text-white ring-2 ring-violet-500/40'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:border-violet-500/40 hover:text-white'
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {paymentMain === 'transfer' && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                      Apps / billeteras
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TRANSFER_APPS.map((app) => (
                        <button
                          key={app}
                          type="button"
                          onClick={() => setPaymentSub(app)}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-xs font-semibold transition-all',
                            paymentSub === app
                              ? 'border-emerald-500 bg-emerald-600/25 text-emerald-200 ring-1 ring-emerald-500/50'
                              : 'border-white/10 bg-zinc-900 text-gray-400 hover:border-white/20 hover:text-white'
                          )}
                        >
                          {app}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMain === 'card' && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                      Banco / emisor habitual
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CARD_BANKS.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setPaymentSub(b)}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-xs font-semibold transition-all',
                            paymentSub === b
                              ? 'border-indigo-500 bg-indigo-600/25 text-indigo-100 ring-1 ring-indigo-500/50'
                              : 'border-white/10 bg-zinc-900 text-gray-400 hover:border-white/20 hover:text-white'
                          )}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMain === 'cash' && (
                  <p className="text-sm text-gray-400">
                    Pagarás en efectivo al recibir el pedido. Confirma dirección y teléfono para coordinar entrega.
                  </p>
                )}

                {errors.payment && <p className="text-xs text-red-400">{errors.payment}</p>}

                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <p className="text-center text-xs text-gray-500">
                    🔒 Pago seguro — la pasarela definitiva se integrará después. Método elegido:{' '}
                    <span className="text-gray-300">{paymentLabel()}</span>
                  </p>
                </div>
              </div>

              <button
                id="place-order-btn"
                type="submit"
                disabled={status === 'processing'}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-4 text-base font-bold text-white transition hover:bg-violet-500 disabled:opacity-60"
              >
                {status === 'processing' ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Procesando pedido...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Confirmar Pedido — {formatPEN(total)}
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="glass rounded-2xl p-6 sticky top-24">
              <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-violet-400" />
                Resumen
              </h2>
              <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-hide">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
                      <img
                        src={resolveProductImageUrl(item.name, item.category, item.image_url)}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const el = e.currentTarget
                          el.onerror = null
                          el.src = categoryFallbackImage(item.category)
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-white">{item.name}</p>
                      <p className="text-xs text-gray-500">x{item.quantity}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-semibold text-violet-300">
                        {formatPEN(item.price * item.quantity)}
                      </p>
                      <p className="text-[10px] text-gray-600">
                        ≈ {formatUSD((item.price * item.quantity) / EXCHANGE_RATE)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="bg-white/10 my-4" />
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total</span>
                <div className="text-right">
                  <p className="text-2xl font-black text-white">{formatPEN(total)}</p>
                  <p className="text-xs text-gray-500">≈ {formatUSD(total / EXCHANGE_RATE)} referencial</p>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-gray-600">Envío a calcular según dirección</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

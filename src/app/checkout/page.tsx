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
  const [form, setForm] = useState({ name: '', email: '', address: '', phone: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setSessionEmail(session.user.email)
        setForm(f => ({ ...f, email: session.user.email }))
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
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="max-w-md w-full glass rounded-3xl p-10 text-center space-y-6 border border-green-500/20">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <div>
            <h2
              className="text-3xl font-black text-white mb-2"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              ¡Pedido Confirmado!
            </h2>
            <p className="text-gray-400">
              Gracias, <span className="text-white font-medium">{form.name}</span>
            </p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Número de orden</p>
            <p className="text-2xl font-black text-violet-400 tracking-wider">{orderId}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Total pagado</p>
            <p className="text-2xl font-black text-emerald-400 font-mono">{formatPEN(paid)}</p>
            <p className="text-xs text-gray-500 mt-1">
              ≈ {formatUSD(paid / EXCHANGE_RATE)} referencial
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Pago: {orderSnapshot?.paymentSub} (
              {orderSnapshot?.paymentMain === 'card'
                ? 'tarjeta'
                : orderSnapshot?.paymentMain === 'transfer'
                  ? 'transferencia'
                  : 'contra entrega'}
              )
            </p>
          </div>
          <p className="text-sm text-gray-500">
            Recibirás una confirmación en{' '}
            <span className="text-gray-300">{form.email}</span>
          </p>
          <button
            type="button"
            id="download-voucher-btn"
            onClick={handleDownloadPDF}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-500"
          >
            <FileText className="h-4 w-4" />
            Descargar Voucher PDF
          </button>
          <button
            type="button"
            onClick={() => {
              toast.success(`Voucher enviado a ${form.email}`)
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Enviar voucher al correo
          </button>
          <Link href="/productos" className="w-full inline-flex items-center justify-center border border-white/10 text-gray-400 hover:text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
            Seguir comprando
          </Link>
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

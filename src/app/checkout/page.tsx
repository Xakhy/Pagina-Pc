'use client'

import { useState } from 'react'
import { useCart } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Trash2, FileText, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { generateVoucherPDF } from '@/lib/pdf'
import { formatPEN, formatUSD } from '@/lib/utils'

type OrderStatus = 'idle' | 'processing' | 'success'

export default function CheckoutPage() {
  const { items, getTotalPrice, clearCart } = useCart()
  const total = getTotalPrice()

  const [status, setStatus] = useState<OrderStatus>('idle')
  const [orderId, setOrderId] = useState('')
  const [form, setForm] = useState({ name: '', email: '', address: '', phone: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Nombre requerido'
    if (!form.email.includes('@')) errs.email = 'Email inválido'
    if (!form.address.trim()) errs.address = 'Dirección requerida'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setStatus('processing')
    // Simulate order processing
    await new Promise((r) => setTimeout(r, 2000))

    const newOrderId = `TS-${Date.now().toString().slice(-8)}`
    setOrderId(newOrderId)
    setStatus('success')
    clearCart()
  }

  const handleDownloadPDF = () => {
    generateVoucherPDF({
      orderId,
      customerName: form.name,
      customerEmail: form.email,
      address: form.address,
      items,
      total,
      date: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }),
    })
  }

  if (items.length === 0 && status === 'idle') {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">🛒</div>
          <h2 className="text-2xl font-bold text-white">Tu carrito está vacío</h2>
          <p className="text-gray-500">Agrega productos antes de hacer checkout</p>
          <Button asChild className="bg-violet-600 hover:bg-violet-500">
            <Link href="/productos">
              <ArrowLeft className="mr-2 w-4 h-4" /> Ver Productos
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="max-w-md w-full glass rounded-3xl p-10 text-center space-y-6 border border-green-500/20">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              ¡Pedido Confirmado!
            </h2>
            <p className="text-gray-400">Gracias, <span className="text-white font-medium">{form.name}</span></p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Número de orden</p>
            <p className="text-2xl font-black text-violet-400 tracking-wider">{orderId}</p>
          </div>
          <p className="text-sm text-gray-500">
            Recibirás una confirmación en <span className="text-gray-300">{form.email}</span>
          </p>
          <Button
            id="download-voucher-btn"
            onClick={handleDownloadPDF}
            className="w-full bg-violet-600 hover:bg-violet-500 font-bold h-12"
          >
            <FileText className="mr-2 w-4 h-4" />
            Descargar Voucher PDF
          </Button>
          <Button asChild variant="outline" className="w-full border-white/10 text-gray-400 hover:text-white">
            <Link href="/productos">Seguir comprando</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-5xl font-black text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Checkout
          </h1>
          <p className="text-gray-400">Completa tu información para finalizar la compra</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="glass rounded-2xl p-6 space-y-5">
                <h2 className="font-bold text-white text-lg">Información de contacto</h2>

                {[
                  { id: 'name', label: 'Nombre completo', placeholder: 'Juan García', type: 'text' },
                  { id: 'email', label: 'Email', placeholder: 'juan@email.com', type: 'email' },
                  { id: 'phone', label: 'Teléfono', placeholder: '+1 555 0000', type: 'tel' },
                  { id: 'address', label: 'Dirección de entrega', placeholder: 'Calle, número, ciudad', type: 'text' },
                ].map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <Label htmlFor={field.id} className="text-gray-300 text-sm">{field.label}</Label>
                    <Input
                      id={field.id}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={form[field.id as keyof typeof form]}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, [field.id]: e.target.value }))
                        setErrors((err) => ({ ...err, [field.id]: '' }))
                      }}
                      className={`bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500 h-11 ${
                        errors[field.id] ? 'border-red-500/60' : ''
                      }`}
                    />
                    {errors[field.id] && (
                      <p className="text-xs text-red-400">{errors[field.id]}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Payment placeholder */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="font-bold text-white text-lg">Pago</h2>
                <div className="flex gap-3">
                  {['💳 Tarjeta', '🏦 Transferencia', '💵 Contra entrega'].map((method) => (
                    <div key={method} className="flex-1 p-3 rounded-xl glass border border-violet-500/30 text-center text-xs text-gray-400 cursor-pointer hover:text-white transition-colors">
                      {method}
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-white/3 border border-white/5">
                  <p className="text-xs text-gray-500 text-center">
                    🔒 Pago seguro — integración con pasarela de pagos próximamente
                  </p>
                </div>
              </div>

              <Button
                id="place-order-btn"
                type="submit"
                disabled={status === 'processing'}
                className="w-full h-14 bg-violet-600 hover:bg-violet-500 font-bold text-base glow-purple transition-all hover:scale-[1.02] disabled:opacity-60 disabled:scale-100"
              >
                {status === 'processing' ? (
                  <>
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                    Procesando pedido...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 w-5 h-5" />
                    Confirmar Pedido — {formatPEN(total)}
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <div className="glass rounded-2xl p-6 sticky top-24">
              <h2 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-violet-400" />
                Resumen
              </h2>
              <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-hide">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">x{item.quantity}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-violet-300">{formatPEN(item.price * item.quantity)}</p>
                      <p className="text-[10px] text-gray-600">{formatUSD(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="bg-white/10 my-4" />
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total</span>
                <div className="text-right">
                  <p className="text-2xl font-black text-white">{formatPEN(total)}</p>
                  <p className="text-xs text-gray-500">{formatUSD(total)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3 text-center">
                Envío a calcular según dirección
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

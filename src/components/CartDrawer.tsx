'use client'

import { useCart } from '@/lib/store'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Package } from 'lucide-react'
import Link from 'next/link'
import {
  resolveProductImageUrl,
  categoryFallbackImage,
} from '@/lib/product-images'
import { formatPEN, formatUSD } from '@/lib/utils'

export function CartDrawer() {
  const { items, isOpen, toggleCart, removeItem, updateQuantity, getTotalPrice } = useCart()
  const total = getTotalPrice()

  return (
    <Sheet open={isOpen} onOpenChange={toggleCart}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-[#0d0d1a] border-l border-white/10 flex flex-col"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-white text-xl font-bold">
            <ShoppingCart className="w-5 h-5 text-violet-400" />
            Tu Carrito
            {items.length > 0 && (
              <span className="ml-auto text-sm font-normal text-gray-400">
                {items.length} {items.length === 1 ? 'producto' : 'productos'}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-6 rounded-full bg-white/5">
              <Package className="w-12 h-12 text-gray-500" />
            </div>
            <div>
              <p className="text-gray-400 font-medium">Tu carrito está vacío</p>
              <p className="text-sm text-gray-600 mt-1">Agrega productos para comenzar</p>
            </div>
            {/* Fix: Link directo en vez de Button asChild */}
            <Link
              href="/productos"
              onClick={toggleCart}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-violet-500/50 text-violet-400 hover:bg-violet-500/10 text-sm font-medium transition-colors"
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <>
            {/* Items list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-xl border border-white/5"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                    <img
                      src={resolveProductImageUrl(item.name, item.category, item.image_url)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = categoryFallbackImage(item.category) }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.category}</p>
                    <p className="text-violet-400 font-bold text-sm mt-1">
                      {formatPEN(item.price * item.quantity)}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      {formatUSD(item.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => removeItem(item.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm w-6 text-center font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="pt-4 space-y-4">
              <Separator className="bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Subtotal</span>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{formatPEN(total)}</p>
                  <p className="text-xs text-gray-500">{formatUSD(total)}</p>
                </div>
              </div>
              {/* Fix: Link directo en vez de Button asChild */}
              <Link
                href="/checkout"
                onClick={toggleCart}
                className="w-full inline-flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white font-semibold h-12 text-base rounded-md transition-colors"
              >
                Ir al Checkout <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <p className="text-xs text-center text-gray-600">
                💡 Sin cuenta: el carrito se guarda mientras la pestaña esté abierta
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
'use client'

import { ShoppingCart, Star, Zap, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatPEN, formatUSD, EXCHANGE_RATE } from '@/lib/utils'
import {
  resolveProductImageUrl,
  categoryFallbackImage,
} from '@/lib/product-images'
import Link from 'next/link'
import { useCart } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Product = {
  id: string
  name: string
  price: number
  category: string
  description: string
  image_url?: string | null
  stock: number
  specs: Record<string, string>
}

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addItem } = useCart()

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const img = resolveProductImageUrl(
      product.name,
      product.category,
      product.image_url
    )
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: img,
      category: product.category,
    })
    toast.success(`${product.name} agregado`)
  }

  return (
    <Link
      href={`/productos/${product.id}`}
      className={cn(
        'group relative rounded-[2.5rem] bg-zinc-900 border border-white/5 card-hover overflow-hidden flex flex-col shadow-2xl shadow-black/50',
        className
      )}
    >
      {/* Image Container - Forced Square */}
      <div className="relative aspect-square overflow-hidden bg-[#0a0a0c] flex items-center justify-center p-8 border-b border-white/5">
        <img
          src={resolveProductImageUrl(
            product.name,
            product.category,
            product.image_url
          )}
          alt={product.name}
          className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            const el = e.currentTarget
            el.onerror = null
            el.src = categoryFallbackImage(product.category)
          }}
        />
        <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-4 left-4">
          <Badge
            className={cn(
              'text-[9px] font-black uppercase px-2.5 py-1 rounded-md border',
              product.stock > 5
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : product.stock > 0
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
            )}
          >
            Stock: {product.stock}
          </Badge>
        </div>
        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
          <div className="bg-indigo-600 text-white text-[9px] font-black py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-2xl shadow-indigo-600/40 uppercase tracking-widest">
            <Eye className="w-3.5 h-3.5" />
            Especificaciones
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-6 gap-4">
        <div>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">
            {product.category}
          </p>
          <h3 className="font-bold text-zinc-100 text-xs leading-tight line-clamp-2 group-hover:text-indigo-400 transition-colors uppercase font-tech h-8">
            {product.name}
          </h3>
        </div>

        {/* Price + CTA */}
        <div className="flex items-end justify-between mt-auto pt-4 border-t border-white/5">
          <div className="flex flex-col">
            <p className="text-xl font-bold text-emerald-400 leading-none tracking-tighter font-tech">
              {formatPEN(product.price)}
            </p>
            <p className="text-[9px] text-zinc-600 font-bold mt-1.5 uppercase tracking-tighter">
              US$ {(product.price / EXCHANGE_RATE).toFixed(2)}
            </p>
          </div>
          <Button
            id={`add-to-cart-${product.id}`}
            size="sm"
            onClick={handleAddToCart}
            className="bg-zinc-800 hover:bg-indigo-600 text-white font-black h-12 w-12 p-0 rounded-2xl transition-all active:scale-90 border border-white/5 shadow-xl"
          >
            <ShoppingCart className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </Link>
  )
}

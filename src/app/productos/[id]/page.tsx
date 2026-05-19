'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/lib/store'
import { toast } from 'sonner'
import { 
  ShoppingCart, ShieldCheck, Truck, 
  RotateCcw, Loader2, Info, Star
} from 'lucide-react'
import { formatPEN, EXCHANGE_RATE } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  resolveProductImageUrl,
  categoryFallbackImage,
} from '@/lib/product-images'

export default function ProductDetailPage() {
  const { id } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function fetchDetails() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error

        if (data) {
          const main = resolveProductImageUrl(
            data.name,
            data.category,
            data.image_url
          )
          setProduct({
            ...data,
            images: [main],
          })
          setActiveImg(main)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchDetails()
  }, [id, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (!product) return <div className="min-h-screen pt-24 text-center text-white">Producto no encontrado</div>

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          
          {/* Gallery */}
          <div className="space-y-4">
          <div className="aspect-square h-[500px] bg-zinc-900 rounded-[2.5rem] border border-white/5 p-8 flex items-center justify-center overflow-hidden">              <img
                src={activeImg}
                alt={product.name}
                className="w-full h-full object-contain object-center scale-90"                onError={(e) => {
                  const el = e.currentTarget
                  el.onerror = null
                  const fb = categoryFallbackImage(product.category)
                  el.src = fb
                  setActiveImg(fb)
                }}
              />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-4">
                {product.images.map((img: string) => (
                  <button
                    key={img}
                    onClick={() => setActiveImg(img)}
                    className={`aspect-square rounded-2xl bg-zinc-900 border transition-all p-2 flex items-center justify-center ${activeImg === img ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-white/5'}`}
                  >
                    <img
                      src={img}
                      alt="thumbnail"
                      className="w-full h-full object-contain object-center scale-90"                      onError={(e) => {
                        const el = e.currentTarget
                        el.onerror = null
                        el.src = categoryFallbackImage(product.category)
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-bold px-3 py-1 uppercase tracking-widest text-[10px]">
                  {product.category}
                </Badge>
                <div className="flex items-center gap-1 text-emerald-400">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Producto Verificado</span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter leading-tight font-tech">
                {product.name}
              </h1>
            </div>

            <div className="p-6 bg-zinc-900 border border-white/5 rounded-3xl">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Precio Online</p>
                  <p className="text-5xl font-black text-emerald-400 font-tech leading-none">
                    {formatPEN(product.price)}
                  </p>
                  <p className="text-xs text-zinc-600 font-bold mt-2 uppercase tracking-tighter">
                    Aprox. US$ {(product.price / EXCHANGE_RATE).toFixed(2)} Referencial
                  </p>
                </div>
                <div className={`${product.stock > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'} px-4 py-2 rounded-xl text-xs font-bold`}>
                  {product.stock > 0 ? `En stock · ${product.stock} uds.` : 'Sin Stock'}
                </div>
              </div>

              <Button
                disabled={product.stock <= 0}
                onClick={() => {
                  const img = resolveProductImageUrl(
                    product.name,
                    product.category,
                    product.image_url
                  )
                  addItem({ ...product, quantity: 1, image_url: img })
                  toast.success('Producto agregado al carrito')
                }}
                className="w-full h-16 bg-[#534AB7] hover:bg-[#4339a7] text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-500/20"
              >
                <ShoppingCart className="mr-2 w-6 h-6" /> AGREGAR AL CARRITO
              </Button>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: ShieldCheck, title: 'Garantía Real', desc: '12 meses' },
                { icon: Truck, title: 'Envío Express', desc: 'Todo el Perú' },
                { icon: RotateCcw, title: 'Devolución', desc: '7 días hábiles' }
              ].map((b) => (
                <div key={b.title} className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl text-center">
                  <b.icon className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                  <p className="text-[10px] font-black text-white uppercase mb-1">{b.title}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">{b.desc}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white uppercase tracking-tighter flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-400" /> Descripción del Producto
              </h3>
              <div className="text-sm text-zinc-500 leading-relaxed font-medium whitespace-pre-wrap">
                {product.description}
              </div>
            </div>
          </div>
        </div>

        {/* Specs Table */}
        {product.specs && Object.keys(product.specs).length > 0 && (
          <div className="mt-20">
            <h3 className="text-2xl font-bold text-white uppercase tracking-tighter mb-8 font-tech">Especificaciones Técnicas</h3>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-2">
              {Object.entries(product.specs).map(([key, value]: any) => (
                <div key={key} className="flex justify-between py-3 border-b border-white/5">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{key}</span>
                  <span className="text-xs font-bold text-zinc-300 uppercase">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

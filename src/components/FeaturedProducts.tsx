'use client'

import { useState, useEffect } from 'react'
import { ProductCard } from './ProductCard'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export function FeaturedProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_featured', true)
          .limit(16)

        if (error) throw error
        if (data) setProducts(data)
      } catch (error) {
        console.error('Error fetching featured products:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  return (
    <section className="py-20">
      <div className="flex items-baseline justify-between mb-12 border-b border-zinc-800 pb-4">
        <h2 className="text-3xl font-bold text-white uppercase tracking-tighter font-tech">
          Productos <span className="text-indigo-500">Destacados</span>
        </h2>
        <Link href="/productos" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-all uppercase tracking-widest">
          Ver catálogo <span className="ml-1">→</span>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="h-64 bg-zinc-900 animate-pulse rounded-2xl border border-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
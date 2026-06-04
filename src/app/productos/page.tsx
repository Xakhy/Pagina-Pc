'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { ProductCard } from '@/components/ProductCard'
import { CATEGORIES } from '@/lib/categories'
import { Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

function ProductosContent() {
  const searchParams = useSearchParams()
  const categoriaParam = searchParams.get('categoria') || 'Todas'

  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(categoriaParam)
  const supabase = createClient()

  // Custom scroll indicator
  const pillsRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [thumbLeft, setThumbLeft] = useState(0)
  const [thumbWidth, setThumbWidth] = useState(100)

  const updateScrollBar = () => {
    const el = pillsRef.current
    if (!el) return
    const ratio = el.scrollWidth > el.clientWidth
      ? el.clientWidth / el.scrollWidth
      : 1
    setThumbWidth(ratio * 100)
    setThumbLeft((el.scrollLeft / el.scrollWidth) * 100)
  }

  const handleTrackPointerDown = (e: React.PointerEvent) => {
    const track = trackRef.current
    const pills = pillsRef.current
    if (!track || !pills) return

    // Prevent default to avoid text selection right away
    e.preventDefault()

    // Setup dragging
    const startX = e.clientX
    const startScrollLeft = pills.scrollLeft 

    // Add a class to body to completely prevent text selection during drag
    document.body.style.userSelect = 'none'

    const onPointerMove = (e: PointerEvent) => {
      e.preventDefault()
      const deltaX = e.clientX - startX
      
      // Calculate how much to scroll based on mouse movement relative to track
      const rect = track.getBoundingClientRect()
      const deltaScroll = (deltaX / rect.width) * pills.scrollWidth
      
      // Update scroll without smooth behavior for immediate drag response
      pills.scrollLeft = startScrollLeft + deltaScroll
    }

    const onPointerUp = () => {
      document.body.style.userSelect = '' // restore text selection
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }

  useEffect(() => {
    updateScrollBar()
    const el = pillsRef.current
    if (!el) return
    el.addEventListener('scroll', updateScrollBar)
    window.addEventListener('resize', updateScrollBar)
    return () => {
      el.removeEventListener('scroll', updateScrollBar)
      window.removeEventListener('resize', updateScrollBar)
    }
  }, [])

  // Sync category when URL param changes (e.g. back/forward navigation)
  useEffect(() => {
    setActiveCategory(categoriaParam)
  }, [categoriaParam])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      let queryBuilder = supabase.from('products').select('*')
      if (activeCategory !== 'Todas') {
        queryBuilder = queryBuilder.eq('category', activeCategory)
      }
      const { data, error } = await queryBuilder
      if (error) throw error
      if (data) setProducts(data)
    } catch (error) {
      console.error('Error al cargar productos:', error)
    } finally {
      setLoading(false)
    }
  }, [activeCategory, supabase])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-zinc-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase font-tech">
              Catálogo <span className="text-indigo-500">Premium</span>
            </h1>
            <p className="text-zinc-500 mt-2 font-medium tracking-tight">Componentes de gama alta con stock garantizado</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Buscar componentes..."
              className="pl-12 bg-zinc-900/50 border-white/5 h-12 rounded-xl text-white focus:border-indigo-500/50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Category pills with custom scroll indicator */}
        <div className="mb-10">
          {/* Pills row — native scrollbar hidden */}
          <div
            ref={pillsRef}
            className="flex gap-2 overflow-x-auto pills-no-bar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`.pills-no-bar::-webkit-scrollbar { display: none; }`}</style>
            {['Todas', ...CATEGORIES.map(c => c.name)].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap border ${
                  activeCategory === cat
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/25'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:text-white hover:border-white/10 hover:bg-zinc-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Custom scroll indicator — now interactive */}
          <div 
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            className="mt-4 mb-2 relative h-1.5 w-full rounded-full bg-white/5 cursor-pointer hover:bg-white/10 transition-colors group"
          >
            <div
              className="absolute top-0 h-full rounded-full group-active:transition-none transition-all duration-75"
              style={{
                left: `${thumbLeft}%`,
                width: `${thumbWidth}%`,
                background: 'linear-gradient(90deg, #6d28d9, #818cf8)',
                boxShadow: '0 0 8px rgba(109,40,217,0.5)',
              }}
            />
          </div>
        </div>

        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-zinc-500 font-bold tracking-widest text-[10px] uppercase font-tech">Cargando hardware...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-700">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 gap-4 text-center animate-in fade-in">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-white uppercase tracking-tighter">No se encontraron productos</h3>
              <p className="text-zinc-500 text-sm max-w-xs font-medium">
                Asegúrate de haber ejecutado el seed en <br />
                <code className="text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded mt-2 inline-block font-mono">/api/seed</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProductosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-24 pb-20 px-4 bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    }>
      <ProductosContent />
    </Suspense>
  )
}
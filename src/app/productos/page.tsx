'use client'

import { useState, useEffect } from 'react'
import { ProductCard } from '@/components/ProductCard'
import { CATEGORIES } from '@/lib/products'
import { Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

export default function ProductosPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todas')

  const supabase = createClient()

  useEffect(() => {
    fetchProducts()
  }, [activeCategory])

  async function fetchProducts() {
    setLoading(true)
    try {
      let queryBuilder = supabase.from('products').select('*')
      
      if (activeCategory !== 'Todas') {
        queryBuilder = queryBuilder.eq('category', activeCategory)
      }

      const { data, error } = await queryBuilder

      if (error) {
        throw error
      }
      
      if (data) {
        setProducts(data)
      }
    } catch (error) {
      console.error('Error al cargar productos:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-zinc-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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

        {/* Categories Tabs */}
        <div className="flex gap-3 overflow-x-auto pb-8 scrollbar-hide">
          {['Todas', ...CATEGORIES.map(c => c.name)].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                activeCategory === cat 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
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
                Asegúrate de haber ejecutado el seed en <br/>
                <code className="text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded mt-2 inline-block font-mono">/api/seed</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

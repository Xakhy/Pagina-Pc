'use client'

import { useState, useEffect } from 'react'
import { ProductCard } from '@/components/ProductCard'
import { CATEGORIES } from '@/lib/products'
import { Loader2, Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function ProductosPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todas')

  useEffect(() => {
    fetchProducts()
  }, [activeCategory])

  async function fetchProducts() {
    setLoading(true)
    try {
      const searchTerm = activeCategory === 'Todas' ? 'hardware gamer' : activeCategory
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchTerm)}&limit=20`)
      const data = await response.json()
      
      if (data.results) {
        setProducts(data.results.map((item: any) => ({
          id: item.id,
          name: item.title,
          price: item.price,
          category: activeCategory === 'Todas' ? 'Hardware' : activeCategory,
          image_url: item.thumbnail.replace('-I.jpg', '-W.jpg'),
          stock: 10,
          specs: { Condición: item.condition === 'new' ? 'Nuevo' : 'Usado' }
        })))
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-bold text-white tracking-tighter uppercase font-tech">
              Catálogo <span className="text-indigo-500">Completo</span>
            </h1>
            <p className="text-zinc-500 mt-2 font-medium">Más de 500 productos sincronizados con MeLi Perú</p>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="Buscar componentes..." 
              className="pl-12 bg-zinc-900 border-white/5 h-12 rounded-xl text-white"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-8 scrollbar-hide">
          {['Todas', ...CATEGORIES.map(c => c.name)].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                activeCategory === cat 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-zinc-500 font-bold tracking-widest text-xs uppercase">Sincronizando stock real...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

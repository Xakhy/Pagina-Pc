import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'

export function CategoriesSection() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between mb-8 border-b border-zinc-800 pb-4">
          <h2 className="text-2xl font-bold text-white uppercase tracking-tighter font-tech">
            Categorías destacadas
          </h2>
          <Link href="/productos" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-all uppercase tracking-widest">
            Ver todas <span className="ml-1">→</span>
          </Link>
        </div>

        <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              href={`/productos?categoria=${encodeURIComponent(cat.name)}`}
              className="group flex flex-col items-center gap-4 min-w-[120px] cursor-pointer"
            >
              <div className="w-24 h-24 rounded-[2rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-500 group-hover:scale-105 shadow-2xl relative">
                <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125" />
              </div>
              <span className="text-[11px] font-bold text-zinc-500 group-hover:text-white transition-colors text-center uppercase tracking-tighter leading-tight max-w-[100px]">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
import { HeroSection } from '@/components/HeroSection'
import { FeaturedProducts } from '@/components/FeaturedProducts'
import { CategoriesSection } from '@/components/CategoriesSection'

export default function Home() {
  return (
    <div className="flex flex-col gap-0 overflow-hidden">
      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 w-full">
        <CategoriesSection />
        <FeaturedProducts />
      </div>

      <footer className="py-12 border-t border-white/5 bg-zinc-950 mt-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">© 2025 TechBuilds — Lima, Perú</span>
          <div className="flex gap-8">
            <a className="text-[10px] font-black text-zinc-500 hover:text-indigo-400 cursor-pointer uppercase tracking-widest">Términos</a>
            <a className="text-[10px] font-black text-zinc-500 hover:text-indigo-400 cursor-pointer uppercase tracking-widest">Envíos</a>
            <a className="text-[10px] font-black text-zinc-500 hover:text-indigo-400 cursor-pointer uppercase tracking-widest">WhatsApp</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

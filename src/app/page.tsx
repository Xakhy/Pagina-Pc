import { HeroSection } from '@/components/HeroSection'
import { FeaturedProducts } from '@/components/FeaturedProducts'
import { CategoriesSection } from '@/components/CategoriesSection'
import { FooterClient } from '@/components/FooterClient'

export default function Home() {
  return (
    <div className="flex flex-col gap-0 overflow-hidden">
      <HeroSection />

      <div className="max-w-7xl mx-auto px-4 w-full">
        <CategoriesSection />
        <FeaturedProducts />
      </div>

      <FooterClient />
    </div>
  )
}

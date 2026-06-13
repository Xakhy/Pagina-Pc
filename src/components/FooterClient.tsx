'use client'

import { useState } from 'react'
import { TermsModal, ShippingModal } from '@/components/HeroSection'

export function FooterClient() {
  const [termsOpen, setTermsOpen] = useState(false)
  const [shippingOpen, setShippingOpen] = useState(false)

  return (
    <>
      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
      <ShippingModal open={shippingOpen} onClose={() => setShippingOpen(false)} />

      <footer className="py-12 border-t border-white/5 bg-zinc-950 mt-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
            © 2025 TechBuilds — Lima, Perú
          </span>
          <div className="flex gap-8">
            <button
              id="footer-terms-btn"
              onClick={() => setTermsOpen(true)}
              className="text-[10px] font-black text-zinc-500 hover:text-indigo-400 cursor-pointer uppercase tracking-widest transition-colors"
            >
              Términos
            </button>
            <button
              id="footer-shipping-btn"
              onClick={() => setShippingOpen(true)}
              className="text-[10px] font-black text-zinc-500 hover:text-indigo-400 cursor-pointer uppercase tracking-widest transition-colors"
            >
              Envíos
            </button>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest select-none cursor-default">
              WhatsApp
            </span>
          </div>
        </div>
      </footer>
    </>
  )
}

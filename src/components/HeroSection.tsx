'use client'

import Link from 'next/link'
import { Cpu } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-grid pt-16">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#534AB7]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wider mb-6 animate-float">
              <Cpu className="w-3.5 h-3.5" />
              NUEVO: PC BUILDER CON IA
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-foreground dark:text-white mb-6 leading-[1.05] tracking-tight uppercase font-tech">
              Arma tu PC<br />
              <span className="text-[#7F77DD]">sin complicaciones</span>
            </h1>

            <p className="text-zinc-500 text-lg max-w-lg mb-10 leading-relaxed font-medium">
              Componentes de alta gama para gaming, diseño y trabajo.
              La IA te recomienda la build perfecta según tu presupuesto.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/pc-builder"
                className="inline-flex items-center justify-center bg-[#534AB7] hover:bg-[#4339a7] text-white font-bold h-14 px-8 text-sm shadow-xl shadow-indigo-500/10 rounded-xl transition-all active:scale-95"
              >
                Armar mi PC
              </Link>
              <Link
                href="/productos"
                className="inline-flex items-center justify-center border border-zinc-800 text-zinc-400 bg-white/5 hover:bg-white/10 hover:text-white h-14 px-8 text-sm rounded-xl transition-all active:scale-95"
              >
                Ver catálogo
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center bg-zinc-100 dark:bg-zinc-900/50 rounded-[3rem] border border-zinc-200 dark:border-white/5 relative overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors z-10 pointer-events-none" />

            {/* ========================================= */}
            {/* 🖼️ PON TU IMAGEN PERSONALIZADA AQUÍ 🖼️ */}
            {/* ========================================= */}
            <img
              src="https://w.wallhaven.cc/full/gw/wallhaven-gw9mp3.jpg"
              alt="Hardware Custom"
              className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105 relative z-20"
            />
            {/* ========================================= */}

            <div className="absolute top-10 right-10 w-24 h-24 bg-indigo-500/40 rounded-full blur-3xl z-0 pointer-events-none" />
            <div className="absolute bottom-10 left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl z-0 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-center justify-center">
          <div className="w-1 h-3 bg-indigo-400 rounded-full" />
        </div>
      </div>
    </section>
  )
}
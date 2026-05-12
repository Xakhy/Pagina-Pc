import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Cpu, ArrowRight, Sparkles, Clock, Zap } from 'lucide-react'

export function PCBuilderTeaser() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="relative rounded-[2.5rem] overflow-hidden bg-zinc-900 border border-white/5">
          {/* BG effects */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid md:grid-cols-2 gap-12 p-12 md:p-20 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Inteligencia Artificial
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-[0.85] tracking-tighter uppercase">
                TU SETUP IDEAL,
                <span className="text-blue-500 block mt-1">EN SEGUNDOS.</span>
              </h2>
              <p className="text-zinc-500 text-base leading-relaxed mb-10 max-w-sm font-medium">
                Sincronización directa con Mercado Libre Perú para obtener los mejores precios y stock real.
              </p>
              <Button
                asChild
                size="lg"
                className="bg-blue-600 hover:bg-blue-500 font-black h-16 px-10 text-lg shadow-2xl shadow-blue-900/40 rounded-2xl transition-all"
              >
                <Link href="/pc-builder">
                  EMPEZAR CONFIGURACIÓN
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>

            {/* Right — Feature cards */}
            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  icon: Zap,
                  title: 'Optimización de FPS',
                  desc: 'Priorizamos componentes clave según tu resolución.',
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10',
                },
                {
                  icon: Cpu,
                  title: 'Compatibilidad 100%',
                  desc: 'Sockets, VRMs y dimensiones verificadas.',
                  color: 'text-emerald-400',
                  bg: 'bg-emerald-500/10',
                },
                {
                  icon: Clock,
                  title: 'Precios de Mercado',
                  desc: 'Datos actualizados de Mercado Libre Perú.',
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10',
                },
              ].map((feat) => (
                <div key={feat.title} className="flex gap-5 p-5 rounded-3xl bg-zinc-950/50 border border-white/5">
                  <div className={`p-3 rounded-2xl ${feat.bg} flex-shrink-0 flex items-center justify-center`}>
                    <feat.icon className={`w-6 h-6 ${feat.color}`} />
                  </div>
                  <div>
                    <p className="font-black text-white text-xs mb-1 uppercase tracking-widest">{feat.title}</p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed font-bold uppercase">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

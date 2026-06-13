'use client'

import Link from 'next/link'
import { Cpu, Zap, Shield, X, ChevronRight, Star, Users, Package } from 'lucide-react'
import { useState } from 'react'

// ── Modal de Términos y Condiciones ─────────────────────────────────────────

export function TermsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Términos y Condiciones"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
        style={{ background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(24px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#534AB7,#6d28d9,#10b981)' }} />
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-none" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                TÉRMINOS Y CONDICIONES
              </h2>
              <p className="text-zinc-500 text-xs mt-0.5">TecnoStore — Lima, Perú</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[60vh] px-8 py-6 space-y-6 text-sm text-zinc-400 leading-relaxed">
          {[
            ['1. Uso del sitio', 'Al acceder a TecnoStore, aceptas utilizarlo únicamente para fines lícitos. Queda prohibido el uso de bots, scraping automatizado o actividades que perjudiquen la experiencia de otros usuarios.'],
            ['2. Precios y disponibilidad', 'Los precios están en soles peruanos (S/) e incluyen IGV. Nos reservamos el derecho de actualizar precios sin previo aviso. El stock se verifica en tiempo real y puede variar.'],
            ['3. PC Builder con IA', 'Las recomendaciones son orientativas y generadas por inteligencia artificial. TecnoStore no garantiza que la build sugerida sea óptima para todos los casos. El usuario verifica la compatibilidad antes de comprar.'],
            ['4. Pagos y pedidos', 'Los pedidos son registros preliminares sujetos a confirmación de pago y stock. Los métodos (Yape, Plin, tarjeta, contra entrega) se coordinan con el equipo de ventas. No almacenamos datos de tarjetas.'],
            ['5. Envíos y entregas', 'Los tiempos de entrega son estimados y pueden variar. TecnoStore no se responsabiliza por demoras de terceros o fuerza mayor. Los costos de envío se comunican al confirmar el pedido.'],
            ['6. Devoluciones', 'Aceptamos devoluciones dentro de los 7 días calendario, con el producto sin usar, en empaque original y con factura. Los gastos de envío de devolución son del comprador.'],
            ['7. Privacidad de datos', 'Los datos personales (nombre, email, dirección) se usan exclusivamente para procesar tu pedido. No compartimos información con terceros. Puedes solicitar eliminación de datos en badimo30899@gmail.com.'],
            ['8. Modificaciones', 'TecnoStore puede modificar estos términos en cualquier momento. El uso continuado implica la aceptación. Última actualización: junio 2025.'],
          ].map(([title, body]) => (
            <section key={title}>
              <h3 className="font-semibold mb-2 text-xs uppercase tracking-widest text-indigo-400">{title}</h3>
              <p>{body}</p>
            </section>
          ))}
        </div>
        <div className="px-8 py-5 border-t border-white/5 flex items-center justify-between">
          <p className="text-xs text-zinc-600">¿Preguntas? <span className="text-indigo-400">badimo30899@gmail.com</span></p>
          <button onClick={onClose} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95">Entendido</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de Envíos ────────────────────────────────────────────────────────

export function ShippingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Información de Envíos"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-xl max-h-[85vh] overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
        style={{ background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(24px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#534AB7,#10b981)' }} />
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-none" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                INFORMACIÓN DE ENVÍOS
              </h2>
              <p className="text-zinc-500 text-xs mt-0.5">TecnoStore — Lima, Perú</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[60vh] px-8 py-6 space-y-6 text-sm text-zinc-400 leading-relaxed">
          {[
            ['Lima Metropolitana', 'Entrega en 1–2 días hábiles desde S/ 10. Disponemos de mensajería express en moto para entregas el mismo día (pedidos antes de las 12pm).', 'text-emerald-400'],
            ['Provincias', 'Envíos a todo el Perú vía Olva Courier, Shalom o Cargo. Tiempo estimado: 2–5 días hábiles. Costo según destino, informado al confirmar el pedido.', 'text-emerald-400'],
            ['Recojo en tienda', 'Sin costo adicional en nuestra tienda en Lima. Coordina fecha y hora con nuestro equipo al confirmar tu orden.', 'text-emerald-400'],
            ['Seguimiento', 'Recibirás el número de guía por WhatsApp o email al despachar. Puedes rastrear directamente en el sitio del courier.', 'text-emerald-400'],
            ['Embalaje', 'Todos los productos van empacados con protección anti-estática y espuma de alta densidad para garantizar su llegada en perfectas condiciones.', 'text-emerald-400'],
          ].map(([title, body, color]) => (
            <section key={title}>
              <h3 className={`font-semibold mb-2 text-xs uppercase tracking-widest ${color}`}>{title}</h3>
              <p>{body}</p>
            </section>
          ))}
        </div>
        <div className="px-8 py-5 border-t border-white/5 flex items-center justify-between">
          <p className="text-xs text-zinc-600">¿Consultas? <span className="text-emerald-400">badimo30899@gmail.com</span></p>
          <button onClick={onClose} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95">Entendido</button>
        </div>
      </div>
    </div>
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────────

const STATS = [
  { icon: Package, label: 'Productos', value: '80+' },
  { icon: Users, label: 'Clientes', value: '2K+' },
  { icon: Star, label: 'Valoración', value: '4.9★' },
]

// ── HeroSection ──────────────────────────────────────────────────────────────

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-grid pt-16">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#534AB7]/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* ── Left column con fade-in y slide-up instantáneo en CSS ── */}
          <div className="text-left animate-css-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider mb-6">
              <Zap className="w-3.5 h-3.5 fill-indigo-400" />
              NUEVO: PC BUILDER CON IA
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-foreground dark:text-white mb-6 leading-[1.05] tracking-tight uppercase font-tech">
              Arma tu PC<br />
              <span className="text-[#7F77DD]">sin complicaciones</span>
            </h1>

            <p className="text-zinc-500 text-lg max-w-lg mb-8 leading-relaxed font-medium">
              Componentes de alta gama para gaming, diseño y trabajo.
              La IA te recomienda la build perfecta según tu presupuesto.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              {STATS.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.03] hover:border-indigo-500/35 hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-1 cursor-default"
                >
                  <Icon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div>
                    <p className="text-white text-sm font-bold leading-none">{value}</p>
                    <p className="text-zinc-500 text-[10px] font-medium">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                id="hero-pc-builder-btn"
                href="/pc-builder"
                className="group inline-flex items-center justify-center gap-2 bg-[#534AB7] hover:bg-[#4339a7] text-white font-bold h-14 px-8 text-sm shadow-xl shadow-indigo-500/20 rounded-xl transition-all active:scale-95"
              >
                <Cpu className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                Armar mi PC
                <ChevronRight className="w-4 h-4 -ml-1 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                id="hero-catalog-btn"
                href="/productos"
                className="inline-flex items-center justify-center border border-zinc-700 text-zinc-400 bg-white/5 hover:bg-white/10 hover:text-white hover:border-zinc-600 h-14 px-8 text-sm rounded-xl transition-all active:scale-95"
              >
                Ver catálogo
              </Link>
            </div>
          </div>

          {/* ── Right column — imagen flotante y resplandeciente instantánea ── */}
          <div className="hidden lg:block relative animate-css-fade-in">
            {/* Halo de luz difuminado de fondo */}
            <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-[#534AB7] rounded-[3rem] blur-3xl opacity-10" />

            <div className="relative rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl shadow-indigo-500/10 group animate-css-float">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 z-10 pointer-events-none" />
              <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors z-10 pointer-events-none" />
              <img
                src="https://w.wallhaven.cc/full/gw/wallhaven-gw9mp3.jpg"
                alt="Hardware gaming premium — TecnoStore"
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105 relative z-0"
              />
              <div className="absolute top-10 right-10 w-24 h-24 bg-indigo-500/30 rounded-full blur-3xl z-0 pointer-events-none" />
              <div className="absolute bottom-16 left-10 w-32 h-32 bg-emerald-500/15 rounded-full blur-3xl z-0 pointer-events-none" />
            </div>
          </div>

        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-center justify-center">
          <div className="w-1 h-3 bg-indigo-400 rounded-full" />
        </div>
      </div>
    </section>
  )
}
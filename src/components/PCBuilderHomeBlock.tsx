'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useCart } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Sparkles, Cpu, ShoppingCart, Loader2, Monitor, MousePointer2, Keyboard, Mic2, Square } from 'lucide-react'
import { formatPEN, cn } from '@/lib/utils'
import {
  resolveProductImageUrl,
  categoryFallbackImage,
} from '@/lib/product-images'

const USAGE_OPTIONS = ['Gaming', 'Diseño', 'Estudio']
const LEVEL_OPTIONS = ['Principiante', 'Intermedio']
const COOLING_OPTIONS = ['Aire', 'Líquida', 'La IA elige']
const CASE_OPTIONS = ['La IA elige', 'NZXT H5 Flow', 'Lian Li Lancool', 'Fractal North']
const PERIPHERAL_OPTIONS = [
  { name: 'Mouse', icon: MousePointer2 },
  { name: 'Teclado', icon: Keyboard },
  { name: 'Micrófono', icon: Mic2 },
  { name: 'Mousepad', icon: Square },
  { name: 'Auriculares', icon: Monitor },
  { name: 'Monitor', icon: Monitor },
]

export function PCBuilderHomeBlock() {
  const { addItem } = useCart()
  const [budget, setBudget] = useState(3500)
  const [usage, setUsage] = useState('Gaming')
  const [level, setLevel] = useState('Principiante')
  const [cooling, setCooling] = useState('Aire')
  const [pcase, setPcase] = useState('La IA elige')
  const [peripherals, setPeripherals] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [showBuild, setShowBuild] = useState(false)

  const togglePeripheral = (val: string) => {
    setPeripherals(prev => prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val])
  }

  const handleGenerate = async () => {
    setLoading(true)
    setResult(null)
    setShowBuild(false)
    try {
      const res = await fetch('/api/pc-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget, usage, level, cooling, peripherals, specificCase: pcase }),
      })
      const data = await res.json()
      setResult(data)
      setShowBuild(true)
      toast.success('¡Build generada con éxito!')
    } catch (err) {
      toast.error('Error al conectar con la IA')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAll = () => {
    if (!result) return
    result.build.forEach(({ product }: any) => {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image_url: resolveProductImageUrl(product.name, product.category, product.image_url),
        category: product.category,
      })
    })
    toast.success('¡Build completa agregada al carrito!')
  }

  return (
    <section id="builder" className="py-16">
      <div className="bg-[#0c0c0e] border border-indigo-500/30 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-500/5">
        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="flex items-center gap-3 mb-10">
            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none font-bold px-3 py-1 rounded-md text-[11px]">
              <Sparkles className="w-3 h-3 mr-2 fill-indigo-700" /> IA
            </Badge>
            <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              ¿No sabes qué PC armar? Nosotros te ayudamos
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mb-12">
            {/* Left: Inputs */}
            <div className="space-y-8">
              {/* Budget */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">Presupuesto Máximo (S/)</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Slider
                      min={1000}
                      max={20000}
                      step={100}
                      value={[budget]}
                      onValueChange={(val) => setBudget(Array.isArray(val) ? val[0] : val)}
                      className="py-4"
                    />
                  </div>
                  <Input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-28 bg-zinc-900 border-zinc-800 text-indigo-400 font-bold text-center"
                  />
                </div>
                <div className="text-sm font-bold text-indigo-400">S/ {budget.toLocaleString('es-PE')}</div>
              </div>

              {/* Usage */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">¿Para qué lo usas?</label>
                <div className="flex flex-wrap gap-2">
                  {USAGE_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => setUsage(opt)}
                      className={cn("px-5 py-2.5 rounded-xl text-xs font-bold transition-all border",
                        usage === opt ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      )}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Level */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">Nivel</label>
                <div className="flex flex-wrap gap-2">
                  {LEVEL_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => setLevel(opt)}
                      className={cn("px-5 py-2.5 rounded-xl text-xs font-bold transition-all border",
                        level === opt ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      )}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cooling */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">Refrigeración</label>
                <div className="flex flex-wrap gap-2">
                  {COOLING_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => setCooling(opt)}
                      className={cn("px-5 py-2.5 rounded-xl text-xs font-bold transition-all border",
                        cooling === opt ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      )}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Options */}
            <div className="space-y-8">
              {/* Case */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">Case (Opcional — deja vacío para que la IA elija)</label>
                <div className="flex flex-wrap gap-2">
                  {CASE_OPTIONS.map(opt => (
                    <button key={opt} onClick={() => setPcase(opt)}
                    className={cn("px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all border",                      pcase === opt ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white"                      )}>
                      {opt}
                    </button>
                  ))}
                    <button className="px-4 py-2 rounded-full text-[10px] font-bold uppercase border border-dashed border-zinc-800 text-zinc-600 hover:text-white transition-all">+ Ver más</button>                </div>
              </div>

              {/* Peripherals */}
              <div className="space-y-4">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">Periféricos adicionales</label>
                <div className="flex flex-wrap gap-2">
                  {PERIPHERAL_OPTIONS.map(opt => (
                    <button key={opt.name} onClick={() => togglePeripheral(opt.name)}
                    className={cn("px-5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all border flex items-center gap-2",
                     peripherals.includes(opt.name) ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white"                      )}>
                      <opt.icon className="w-3 h-3" />
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer / CTA */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-8 border-t border-zinc-800">
            <div>
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Estimado IA:</div>
              <div className="text-xl font-bold text-white leading-tight">
                {result ? `S/ ${result.total.toLocaleString('es-PE')}` : "S/ 0.00"} — {result?.build?.length || 0} componentes compatibles
              </div>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <Button variant="outline" onClick={() => setShowBuild(!showBuild)}
                className="flex-1 md:flex-none h-14 px-8 border-zinc-800 text-zinc-400 hover:text-white font-bold rounded-xl">
                Ver build
              </Button>
              <Button onClick={handleGenerate} disabled={loading}
                className="flex-1 md:flex-none h-14 px-10 bg-[#534AB7] hover:bg-[#4339a7] text-white font-bold rounded-xl shadow-xl shadow-indigo-500/20">
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Sparkles className="w-5 h-5 mr-2" /> GENERAR CON IA</>}
              </Button>
            </div>
          </div>

          {/* Build List Display */}
          {showBuild && result && (
            <div className="mt-12 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {result.build.map(({ product, reason }: any) => (
                  <div key={product.id} className="bg-zinc-950 p-5 rounded-2xl border border-white/5 flex flex-col gap-4 group hover:border-indigo-500/30 transition-all">
                    <div className="h-28 flex items-center justify-center p-3 bg-zinc-900 rounded-xl">
                      <img
                        src={resolveProductImageUrl(product.name, product.category, product.image_url)}
                        alt={product.name}
                        className="max-h-full object-contain group-hover:scale-110 transition-transform"
                        onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = categoryFallbackImage(product.category) }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">{product.category}</p>
                      <p className="text-xs font-bold text-white line-clamp-2 leading-tight mb-2 uppercase">{product.name}</p>
                      <p className="text-[10px] text-zinc-600 italic leading-tight">{reason}</p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-sm font-bold text-emerald-400">{formatPEN(product.price)}</span>
                      <button
                        onClick={() => addItem({ id: product.id, name: product.name, price: product.price, quantity: 1, category: product.category, image_url: resolveProductImageUrl(product.name, product.category, product.image_url) })}
                        className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center">
                <Button onClick={handleAddAll} className="h-14 px-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl">
                  AGREGAR TODO AL CARRITO
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

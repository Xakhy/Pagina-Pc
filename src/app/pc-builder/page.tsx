'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Sparkles, ShoppingCart, Loader2, Monitor, MousePointer2, Keyboard, Mic2, Square, Info, Zap } from 'lucide-react'
import { useCart } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  resolveProductImageUrl,
  categoryFallbackImage,
} from '@/lib/product-images'

const USAGE_OPTIONS = ['Gaming', 'Diseño', 'Estudio']
const LEVEL_OPTIONS = ['Principiante', 'Intermedio', 'Avanzado']
const COOLING_OPTIONS = ['Aire', 'Líquida', 'La IA elige']
const CASE_OPTIONS = ['La IA elige', 'NZXT H5 Flow', 'Lian Li Lancool', 'Fractal North']
const BUDGET_PRESETS = [1000, 2000, 4000, 8000, 12000, 16000, 20000, 24000]

const PERIPHERAL_OPTIONS = [
  { name: 'Mouse', icon: MousePointer2 },
  { name: 'Teclados', icon: Keyboard },
  { name: 'Micrófono', icon: Mic2 },
  { name: 'Mousepad', icon: Square },
  { name: 'Auriculares', icon: Monitor },
  { name: 'Monitor', icon: Monitor },
]

// Fixed locale to avoid SSR/client hydration mismatch
const formatNum = (n: number) => n.toLocaleString('es-PE')

export default function PCBuilderPage() {
  const router = useRouter()
  const { addItem } = useCart()
  const [budget, setBudget] = useState(3500)
  const [usage, setUsage] = useState('Gaming')
  const [level, setLevel] = useState('Principiante')
  const [cooling, setCooling] = useState('Aire')
  const [pcase, setPcase] = useState('La IA elige')
  const [peripherals, setPeripherals] = useState<string[]>([])

  // Advanced hardware preferences (07 to 11)
  const [cpuBrand, setCpuBrand] = useState('La IA elige')
  const [ramGen, setRamGen] = useState('La IA elige')
  const [graphicsType, setGraphicsType] = useState('Tarjeta Gráfica')
  const [gpuBrand, setGpuBrand] = useState('La IA elige')
  const [storageType, setStorageType] = useState('La IA elige')

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
        body: JSON.stringify({
          budget,
          usage,
          level,
          cooling,
          peripherals,
          specificCase: pcase,
          cpuBrand,
          ramGen,
          graphicsType,
          gpuBrand,
          storageType
        }),
      })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data.build)) {
        toast.error(
          typeof data.error === 'string'
            ? data.error
            : 'No se pudo generar la build. Revisa la API de IA o vuelve a intentar.'
        )
        setResult(null)
        setShowBuild(false)
        return
      }
      if (data.build.length === 0) {
        toast.warning(
          'La IA no encontró componentes en stock. Prueba otro presupuesto o sincroniza el catálogo.'
        )
        setShowBuild(false)
        return
      }
      setResult(data)
      setShowBuild(true)
      toast.success('¡Optimización de IA completada!')
    } catch {
      toast.error('Error al conectar con el servidor de IA')
      setResult(null)
      setShowBuild(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 bg-[#050506] relative overflow-hidden">
      {/* Background Tech Texture */}
      <div className="absolute inset-0 tech-grid opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-4 py-1.5 rounded-full mb-6 font-bold tracking-widest text-[10px]">
            <Zap className="w-3.5 h-3.5 mr-2 fill-indigo-400" /> HERRAMIENTA PROFESIONAL
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter uppercase mb-6 font-tech">
            IA <span className="text-indigo-500">PC BUILDER</span>
          </h1>
          <p className="text-zinc-500 max-w-xl mx-auto font-medium text-lg leading-relaxed">
            Nuestra Inteligencia Artificial analiza tus necesidades y el stock en tiempo real para recomendarte la configuración perfecta al mejor precio.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Main Configurator */}
          <div className="lg:col-span-8 space-y-6">
            <div className="glass-card border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden bg-zinc-900/40 backdrop-blur-xl">

              <div className="space-y-12">
                {/* Section 1: Budget */}
                <div className="space-y-4">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">Presupuesto máximo (S/)</label>

                  <div className="relative pt-2 pb-6">
                    <Slider
                      min={1500}
                      max={40000}
                      step={100}
                      value={[Math.min(40000, Math.max(1500, budget))]}
                      onValueChange={(vals: any) => setBudget(Array.isArray(vals) ? vals[0] : vals)}
                      className="cursor-pointer"
                    />
                    <div className="mt-4 text-xl font-bold text-indigo-500 font-tech" suppressHydrationWarning>
                      S/ {formatNum(budget)}
                      {budget === 40000 && <span className="text-xs font-sans text-zinc-500 ml-3 uppercase tracking-widest font-bold">Límite Estándar</span>}
                      {budget > 40000 && <span className="text-xs font-sans text-emerald-500 ml-3 uppercase tracking-widest font-bold">Presupuesto Personalizado</span>}
                    </div>
                  </div>

                  {/* Quick Presets (Small & Clean) */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {BUDGET_PRESETS.map(preset => (
                      <button
                        key={preset}
                        onClick={() => setBudget(preset)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[9px] font-black border transition-all uppercase tracking-tighter",
                          budget === preset ? "bg-indigo-500 border-indigo-400 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-600 hover:text-white"
                        )}
                      >
                        {preset}
                      </button>
                    ))}

                    {/* Minimal Manual Input */}
                    <div className="flex items-center gap-2 ml-auto relative">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">Manual:</span>
                      <Input
                        type="number"
                        min={1500}
                        max={100000}
                        value={budget || ''}
                        onChange={(e) => setBudget(Number(e.target.value) || 0)}
                        onBlur={() => {
                          if (budget < 1500) {
                            toast.warning('El presupuesto mínimo es de S/ 1,500 para armar una PC funcional.')
                            setBudget(1500)
                          } else if (budget > 100000) {
                            toast.warning('El presupuesto manual máximo es S/ 100,000.')
                            setBudget(100000)
                          }
                        }}
                        className="w-24 h-8 bg-zinc-950 border-zinc-800 text-indigo-400 font-bold text-xs rounded-lg pl-3"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Usage & Level */}
                <div className="grid md:grid-cols-2 gap-12 pt-10 border-t border-white/10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">02. Uso Principal</label>
                    <div className="grid grid-cols-3 gap-2">
                      {USAGE_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setUsage(opt)}
                          className={cn(
                            "py-3 rounded-xl text-xs font-bold transition-all border",
                            usage === opt ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">03. Nivel de Experiencia</label>
                    <div className="grid grid-cols-3 gap-2">
                      {LEVEL_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setLevel(opt)}
                          className={cn(
                            "py-3 rounded-xl text-[11px] font-bold transition-all border",
                            level === opt ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 3: Tech Specs */}
                <div className="grid md:grid-cols-2 gap-12 pt-10 border-t border-white/10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">04. Refrigeración</label>
                    <div className="flex flex-wrap gap-2">
                      {COOLING_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setCooling(opt)}
                          className={cn(
                            "px-6 py-3 rounded-xl text-xs font-bold transition-all border",
                            cooling === opt ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">05. Case (Opcional)</label>
                    <div className="flex flex-wrap gap-2">
                      {CASE_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setPcase(opt)}
                          className={cn(
                            "px-4 py-2.5 rounded-full text-[10px] font-black uppercase transition-all border",
                            pcase === opt ? "bg-indigo-500/10 border-indigo-500 text-indigo-400" : "bg-zinc-950 border-zinc-800 text-zinc-600 hover:text-white"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Peripherals */}
                <div className="space-y-4 pt-10 border-t border-white/10">
                  <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">06. Periféricos Adicionales</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {PERIPHERAL_OPTIONS.map(opt => (
                      <button
                        key={opt.name}
                        onClick={() => togglePeripheral(opt.name)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all",
                          peripherals.includes(opt.name) ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                        )}
                      >
                        <opt.icon className="w-6 h-6" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{opt.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 07 & 08: CPU Brand & RAM Gen */}
                <div className="grid md:grid-cols-2 gap-12 pt-10 border-t border-white/10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">07. Marca de Procesador</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['AMD', 'Intel', 'La IA elige'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => setCpuBrand(opt)}
                          className={cn(
                            "py-3 rounded-xl text-xs font-bold transition-all border",
                            cpuBrand === opt ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">08. Generación de RAM</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['DDR4', 'DDR5', 'La IA elige'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => setRamGen(opt)}
                          className={cn(
                            "py-3 rounded-xl text-xs font-bold transition-all border",
                            ramGen === opt ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 09 & 10: Graphics Specs */}
                <div className="grid md:grid-cols-2 gap-12 pt-10 border-t border-white/10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">09. Tipo de Gráficos</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Tarjeta Gráfica', 'Solo APU (Gráficos Integrados)'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => {
                            setGraphicsType(opt)
                            if (opt === 'Solo APU (Gráficos Integrados)') {
                              setGpuBrand('La IA elige')
                            }
                          }}
                          className={cn(
                            "py-3 px-2 rounded-xl text-xs font-bold transition-all border leading-tight",
                            graphicsType === opt ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white"
                          )}
                        >
                          {opt === 'Solo APU (Gráficos Integrados)' ? 'Solo APU' : opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">10. Marca de Tarjeta de Video</label>
                      {graphicsType === 'Solo APU (Gráficos Integrados)' && (
                        <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded">Deshabilitado por APU</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['NVIDIA GeForce RTX', 'AMD Radeon RX', 'La IA elige'].map(opt => {
                        const disabled = graphicsType === 'Solo APU (Gráficos Integrados)'
                        return (
                          <button
                            key={opt}
                            disabled={disabled}
                            onClick={() => !disabled && setGpuBrand(opt)}
                            className={cn(
                              "py-3 rounded-xl text-[10px] font-bold transition-all border leading-tight",
                              disabled ? "bg-zinc-950/20 border-zinc-900/40 text-zinc-700 cursor-not-allowed opacity-40" :
                                gpuBrand === opt ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white"
                            )}
                          >
                            {opt === 'NVIDIA GeForce RTX' ? 'NVIDIA' : opt === 'AMD Radeon RX' ? 'AMD RX' : 'IA Elige'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* 11: Storage Prefs */}
                <div className="grid md:grid-cols-2 gap-12 pt-10 border-t border-white/10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">11. Tipo de Almacenamiento</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['NVMe SSD', 'SATA SSD', 'La IA elige'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => setStorageType(opt)}
                          className={cn(
                            "py-3 rounded-xl text-xs font-bold transition-all border",
                            storageType === opt ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Summary Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0c0c0e]/80 backdrop-blur-2xl border border-indigo-500/30 rounded-[2.5rem] p-8 shadow-2xl sticky top-24">
              <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-500" /> Panel de Control IA
              </h4>

              <div className="space-y-6 mb-10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Presupuesto</span>
                  <span className="text-white font-bold font-tech" suppressHydrationWarning>S/ {new Intl.NumberFormat('es-PE').format(budget || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Configuración</span>
                  <span className="text-white font-bold">{usage} • {level}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Coste Total</span>
                  <span className={`font-bold font-tech ${result && result.total > budget ? 'text-red-400' : 'text-emerald-400'}`} suppressHydrationWarning>S/ {new Intl.NumberFormat('es-PE').format(result?.total || 0)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full h-16 bg-[#534AB7] hover:bg-[#4339a7] text-white font-black rounded-2xl shadow-2xl shadow-indigo-500/30 text-sm tracking-widest"
                >
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                  GENERAR BUILD CON IA
                </Button>
                {result && (
                  <Button
                    onClick={() => setShowBuild(!showBuild)}
                    variant="outline"
                    className="w-full h-14 border-zinc-800 text-zinc-400 font-bold rounded-2xl hover:text-white bg-zinc-950/50"
                  >
                    {showBuild ? 'Ocultar Detalle' : 'Ver Build Completa'}
                  </Button>
                )}
              </div>

              <div className="mt-8 p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                <p className="text-[10px] text-zinc-500 leading-relaxed italic">
                  * La IA optimiza la build seleccionando componentes compatibles con stock garantizado en Perú.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Build Detail Grid */}
        {showBuild && result && Array.isArray(result.build) && result.build.length > 0 && (
          <div className="mt-16 space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="flex items-center gap-5 border-b border-zinc-800 pb-8">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                <Monitor className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-white uppercase tracking-tighter font-tech">Build Recomendada por IA</h3>
                <p className="text-zinc-500 text-sm font-medium">{result.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {(result.build as any[]).map(({ product, reason }: any) => (
                <div key={product.id} className="group bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-[3rem] overflow-hidden hover:border-indigo-500/50 transition-all shadow-2xl">
                  <div className="aspect-square bg-zinc-950 flex items-center justify-center p-12 border-b border-white/5 relative">
                    <img
                      src={resolveProductImageUrl(
                        product.name,
                        product.category,
                        product.image_url
                      )}
                      alt={product.name}
                      className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        const el = e.currentTarget
                        el.onerror = null
                        el.src = categoryFallbackImage(product.category)
                      }}
                    />
                    <div className="absolute top-6 right-6">
                      <Badge className="bg-zinc-900/90 text-zinc-500 border-zinc-800 text-[8px] font-black px-2 py-1 uppercase">{product.category}</Badge>
                    </div>
                  </div>
                  <div className="p-7">
                    <h4 className="text-xs font-bold text-white line-clamp-2 h-10 mb-3 uppercase leading-tight font-tech group-hover:text-indigo-400 transition-colors">
                      {product.name}
                    </h4>
                    <p className="text-[10px] text-zinc-600 leading-relaxed mb-8 italic font-medium">{reason}</p>
                    <div className="flex items-center justify-between pt-5 border-t border-white/5">
                      <span className="text-xl font-bold text-emerald-400 font-tech" suppressHydrationWarning>S/ {new Intl.NumberFormat('es-PE').format(product.price || 0)}</span>
                      <button
                        onClick={() =>
                          addItem({
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            quantity: 1,
                            category: product.category,
                            image_url: resolveProductImageUrl(
                              product.name,
                              product.category,
                              product.image_url
                            ),
                          })
                        }
                        className="w-11 h-11 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-lg active:scale-90"
                      >
                        <ShoppingCart className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-8 pt-12">
              <Button
                onClick={() => {
                  if (!result || !result.build) return
                  result.build.forEach(({ product }: any) => {
                    addItem({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      quantity: 1,
                      category: product.category,
                      image_url: resolveProductImageUrl(
                        product.name,
                        product.category,
                        product.image_url
                      ),
                    })
                  })
                  toast.success('¡Configuración completa añadida al carrito!')
                  router.push('/checkout')
                }}
                className="h-16 px-20 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-2xl shadow-emerald-600/30 text-xl tracking-widest transition-all hover:scale-105 active:scale-95"
              >
                AGREGAR TODA LA CONFIGURACIÓN
              </Button>
              <div className="flex flex-wrap justify-center gap-4">
                {result.tips?.map((tip: string, i: number) => (
                  <Badge key={i} variant="outline" className="border-zinc-800 text-zinc-600 py-2 px-5 rounded-full text-[10px] uppercase font-bold bg-zinc-950/30">
                    {tip}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

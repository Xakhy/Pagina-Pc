import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Suggestion = {
    category: string
    store_product_id: string
    reason: string
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function detectPlatform(cpuName: string): 'amd' | 'intel' {
    const n = cpuName.toLowerCase()
    if (n.includes('ryzen') || n.includes('athlon') || (n.includes('amd') && !n.includes('radeon'))) return 'amd'
    return 'intel'
}

function detectAMDSocket(cpuName: string): 'am4' | 'am5' | null {
    const n = cpuName.toLowerCase()
    if (!n.includes('ryzen') && !n.includes('athlon') && !n.includes('amd')) return null
    if (n.includes('7500f') || n.includes('7600') || n.includes('7800x3d') || n.includes('7900x') || n.includes('7950x3d') || n.includes('8500g') || n.includes('8600g') || n.includes('8700g')) {
        return 'am5'
    }
    if (n.includes('5600g') || n.includes('5700g') || n.includes('4500') || n.includes('4600g')) {
        return 'am4'
    }
    return null
}

function getCpuPlatformMinCosts(cpuName: string): { minMB: number; minRAM: number } {
    const n = cpuName.toLowerCase()
    
    // AMD Socket Check
    if (n.includes('ryzen') || n.includes('athlon')) {
        if (n.includes('7500f') || n.includes('7600') || n.includes('7800x3d') || n.includes('7900x') || n.includes('7950x3d') || n.includes('8500g') || n.includes('8600g') || n.includes('8700g')) {
            return { minMB: 520, minRAM: 290 } // AM5 + DDR5 minimums
        }
        return { minMB: 290, minRAM: 115 } // AM4 + DDR4 minimums
    }
    
    // Intel Check
    if (n.includes('i3-12100f') || n.includes('i5-12600k')) {
        return { minMB: 390, minRAM: 115 } // LGA1700 DDR4 minimums
    }
    
    // Intel 13th/14th gen
    if (n.includes('i3-13100f') || n.includes('i5-13600k') || n.includes('i7-13700f') || n.includes('i7-13700k') || n.includes('i5-14400f') || n.includes('i9-14900k')) {
        return { minMB: 390, minRAM: 115 } // LGA1700 DDR4 minimums
    }
    
    return { minMB: 290, minRAM: 115 } // default fallback
}

/** Returns 0 when array is empty (safe for Math.min) */
function minPrice(products: any[]): number {
    if (!products.length) return 0
    return Math.min(...products.map(p => Number(p.price)))
}

/** Best product within maxPrice. highEnd=true → most expensive, false → cheapest */
function pickBest(options: any[], maxPrice: number, highEnd: boolean): any | undefined {
    const fit = options.filter(p => Number(p.price) > 0 && Number(p.price) <= maxPrice)
    if (!fit.length) return undefined
    return fit.reduce((a, b) => (highEnd ? b.price > a.price : b.price < a.price) ? b : a)
}

function getCategoryForPeripheral(per: string): string[] {
    const p = per.toLowerCase()
    if ((p.includes('mouse') || p.includes('ratón')) && !p.includes('pad')) return ['mouse gaming']
    if (p.includes('teclados') || p.includes('keyboard')) return ['teclados mecánicos']
    if (p.includes('monitor') || p.includes('pantalla')) return ['monitores']
    if (p.includes('auricular') || p.includes('headset') || p.includes('audifono') || p.includes('headphone')) return ['audio & headsets']
    if (p.includes('micrófono') || p.includes('microfono') || p.includes('mic')) return ['audio & headsets']
    if (p.includes('mousepad') || p.includes('pad')) return ['mouse gaming', 'accesorios']
    return []
}

function matchesPeripheralCategory(perName: string, productName: string): boolean {
    const p = perName.toLowerCase()
    const n = productName.toLowerCase()
    if ((p.includes('mouse') || p.includes('ratón')) && !p.includes('pad')) return !n.includes('pad')
    if (p.includes('teclados') || p.includes('keyboard')) return true
    if (p.includes('monitor') || p.includes('pantalla')) return true
    if (p.includes('auricular') || p.includes('audifono') || p.includes('headphone')) {
        return n.includes('cloud') || n.includes('g733') || n.includes('headset') ||
            n.includes('wireless') || n.includes('audifono') || n.includes('auricular') || n.includes('hyper')
    }
    if (p.includes('micrófono') || p.includes('microfono') || p.includes('mic')) {
        return n.includes('wave') || n.includes('mic') || n.includes('microfono') || n.includes('microphone')
    }
    if (p.includes('mousepad') || p.includes('pad')) return n.includes('pad') || n.includes('mousepad')
    return true
}

// ── Category filters ──────────────────────────────────────────────────────────

function isCPU(p: any, brand?: string): boolean {
    if (!p.category.toLowerCase().includes('procesadores')) return false
    if (!brand || brand === 'La IA elige') return true
    const n = p.name.toLowerCase()
    const isAMD = n.includes('ryzen') || n.includes('athlon')
    return brand === 'AMD' ? isAMD : !isAMD
}

function isGPU(p: any, brand?: string): boolean {
    if (!p.category.toLowerCase().includes('video')) return false
    if (!brand || brand === 'La IA elige') return true
    const n = p.name.toLowerCase()
    const isNV = n.includes('rtx') || n.includes('geforce')
    const isAMD = n.includes('rx') || n.includes('radeon')
    if (brand === 'NVIDIA GeForce RTX') return isNV
    if (brand === 'AMD Radeon RX') return isAMD
    return true
}

function isRAM(p: any, gen?: string): boolean {
    if (!p.category.toLowerCase().includes('memorias ram')) return false
    if (!gen || gen === 'La IA elige') return true
    const n = p.name.toLowerCase()
    if (gen === 'DDR4') return n.includes('ddr4')
    if (gen === 'DDR5') return n.includes('ddr5')
    return true
}

function isMB(p: any, cpuProd: any | null, ramProd: any | null, cpuBrand?: string, ramGen?: string): boolean {
    if (!p.category.toLowerCase().includes('placas madre')) return false
    const nl = p.name.toLowerCase()

    // Platform check
    const platform = cpuProd
        ? detectPlatform(cpuProd.name)
        : cpuBrand === 'Intel' ? 'intel' : cpuBrand === 'AMD' ? 'amd' : null

    const isAMDMb = nl.includes('b650') || nl.includes('x670') || nl.includes('b550') ||
        nl.includes('a520') || nl.includes('a620') || nl.includes('am5') || nl.includes('am4')
    const isIntelMb = nl.includes('h610') || nl.includes('b760') || nl.includes('z790') ||
        nl.includes('b660') || nl.includes('z690')

    if (platform === 'amd' && !isAMDMb) return false
    if (platform === 'intel' && !isIntelMb) return false

    // AM4 / AM5 Socket Check
    if (cpuProd) {
        const socket = detectAMDSocket(cpuProd.name)
        if (socket === 'am5') {
            const isAM5Mb = nl.includes('b650') || nl.includes('a620') || nl.includes('x670')
            if (!isAM5Mb) return false
        }
        if (socket === 'am4') {
            const isAM4Mb = nl.includes('a520') || nl.includes('b450') || nl.includes('b550') || nl.includes('am4')
            if (!isAM4Mb) return false
        }
    }

    // DDR compatibility — only reject if name EXPLICITLY states opposite generation
    const isDDR5 = ramProd
        ? ramProd.name.toLowerCase().includes('ddr5')
        : ramGen === 'DDR5'

    const mbOnlyDDR4 = nl.includes('ddr4') && !nl.includes('ddr5')
    const mbOnlyDDR5 = nl.includes('ddr5') && !nl.includes('ddr4')

    if (isDDR5 && mbOnlyDDR4) return false
    if (!isDDR5 && mbOnlyDDR5) return false

    return true
}

function isStorage(p: any, type?: string): boolean {
    if (!p.category.toLowerCase().includes('almacenamiento')) return false
    if (!type || type === 'La IA elige') return true
    const isNVMe = p.name.toLowerCase().includes('nvme') || p.name.toLowerCase().includes('m.2')
    if (type === 'NVMe SSD') return isNVMe
    if (type === 'SATA SSD') return !isNVMe
    return true
}

function isPSU(p: any): boolean {
    return p.category.toLowerCase().includes('fuentes de poder')
}

function isCase(p: any): boolean {
    return p.category.toLowerCase().includes('cases & chasis')
}

function isCooling(p: any, pref?: string): boolean {
    if (!p.category.toLowerCase().includes('refrigeración')) return false
    if (!pref || pref === 'La IA elige') return true
    const n = p.name.toLowerCase()
    const liquid = n.includes('liquid') || n.includes('líquida') || n.includes('water') || n.includes('aio')
    if (pref === 'Aire') return !liquid
    if (pref === 'Líquida') return liquid
    return true
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient()
        const body = await req.json()
        const {
            budget,
            usage = 'Gaming',
            level = 'Intermedio',
            cooling,
            peripherals = [],
            specificCase,
            cpuBrand,
            ramGen,
            graphicsType,
            gpuBrand,
            storageType,
        } = body

        const budgetNum = Number(budget)
        if (!budgetNum || budgetNum < 1500) {
            return NextResponse.json({ error: 'Presupuesto inválido. Mínimo S/ 1,500.' }, { status: 400 })
        }

        // Determine isAPU based on graphicsType
        let isAPU: boolean
        if (graphicsType === 'Solo APU (Gráficos Integrados)') {
            isAPU = true
        } else if (graphicsType === 'La IA elige') {
            // Auto-decide: APU if budget < 2000 or usage is 'Estudio'
            // Include GPU if budget > 2500 and usage is 'Gaming' or 'Diseño'
            // For 2000-2500 with Gaming, include GPU
            if (budgetNum < 2000 || usage === 'Estudio') {
                isAPU = true
            } else {
                isAPU = false
            }
        } else {
            isAPU = false
        }
        const preferHighEnd = budgetNum >= 2500

        // ── Load stock ──────────────────────────────────────────────────
        const { data: products = [], error: dbErr } = await supabase
            .from('products')
            .select('*')
            .gt('stock', 0)

        if (dbErr) throw new Error(dbErr.message)
        const stock = (products ?? []) as any[]

        // ── Pre-filter each category ────────────────────────────────────
        // We pre-filter without knowing final CPU/RAM; MB is re-filtered after those picks.
        const cpuOpts = stock.filter(p => isCPU(p, cpuBrand))
        const gpuOpts = isAPU ? [] : stock.filter(p => isGPU(p, gpuBrand))
        const ramOpts = stock.filter(p => isRAM(p, ramGen))
        const allMbOpts = stock.filter(p => p.category.toLowerCase().includes('placas madre'))
        const stOpts = stock.filter(p => isStorage(p, storageType))
        const psuOpts = stock.filter(p => isPSU(p))
        const caseOpts = stock.filter(p => isCase(p))
        const coolOpts = stock.filter(p => isCooling(p, cooling))

        // ── Minimum cost per category (worst-case reserve) ──────────────
        const minCPU = minPrice(cpuOpts)
        const minGPU = minPrice(gpuOpts)
        const minRAM = minPrice(ramOpts)
        const minMB = minPrice(allMbOpts)   // rough; refined after picks
        const minST = minPrice(stOpts)
        const minPSU = minPrice(psuOpts)
        const minCase = minPrice(caseOpts)
        const minCool = minPrice(coolOpts)

        // Check if a complete build is even possible
        const coreMin = minCPU + minRAM + minMB + minST + minPSU + minCase + (isAPU ? 0 : minGPU)
        if (coreMin === 0 || coreMin > budgetNum) {
            const needed = coreMin || 3500
            return NextResponse.json({
                error: `Presupuesto insuficiente para una PC completa con el catálogo actual. Mínimo requerido: S/ ${needed}. Considera agregar componentes de menor gama al catálogo.`
            }, { status: 400 })
        }

        // ── Peripheral min-cost reserves ────────────────────────────────
        const perMins: number[] = peripherals.map((per: string) => {
            const cats = getCategoryForPeripheral(per)
            const opts = stock
                .filter((p: any) => cats.some(c => p.category.toLowerCase().includes(c)))
                .filter((p: any) => matchesPeripheralCategory(per, p.name))
            return minPrice(opts)
        })
        const totalPerMin = perMins.reduce((a: number, b: number) => a + b, 0)

        // ── Call Gemini for smart suggestions ───────────────────────────
        const prompt = `Eres experto en ensamblaje de PCs para el mercado peruano. Selecciona componentes SOLO de la lista de productos disponibles.

REGLA MÁXIMA: La suma total de precios NO puede superar S/ ${budgetNum}. Verifica la suma antes de responder.

COMPONENTES OBLIGATORIOS: La build DEBE incluir SIEMPRE procesador, placa madre, RAM, almacenamiento, fuente de poder, gabinete y cooler. Nunca omitir ninguno.

DISTRIBUCIÓN DEL PRESUPUESTO: Ningún componente puede consumir más del 40% del presupuesto total salvo que sea la única opción viable.
- Gaming: 25-30% CPU, 35-40% GPU, 10-15% RAM, 8-10% placa, 5-8% almacenamiento, 5-7% fuente, 5-7% gabinete, 3-5% cooler
- Diseño: 30-35% CPU, 25-30% GPU, 15-20% RAM, 10-12% placa, 8-10% almacenamiento, 5-7% fuente, 5% gabinete, 3-5% cooler
- Estudio: 35-40% CPU, sin GPU dedicada, 20-25% RAM, 12-15% placa, 10-12% almacenamiento, 5-7% fuente, 5% gabinete, 3-5% cooler

COMPATIBILIDAD DE PLATAFORMA (reglas estrictas):
- Ryzen 7000 (7500F, 7600, 7800X3D, 7900X, 7950X3D) → socket AM5 → placas válidas: ASUS ROG Strix B650-A, MSI MAG B650 Tomahawk WiFi, ASUS TUF Gaming A620M-Plus WiFi, Gigabyte B650M K AM5. RAM DEBE ser DDR5
- Ryzen 8000G (8500G, 8600G, 8700G) → socket AM5 → mismas placas AM5. RAM DEBE ser DDR5. ${isAPU ? 'NO incluir GPU dedicada' : 'Incluir GPU dedicada'}
- Ryzen 5000/4000 (5600G, 5700G, 4500, 4600G) → socket AM4 → placas válidas: MSI A520M-A PRO, GIGABYTE B450M DS3H V2, MSI B550M PRO-VDH WiFi. RAM DEBE ser DDR4
- Intel 12th gen (i3-12100F, i5-12600K) → socket LGA1700 → placas DDR4 válidas: ASUS Prime H610M-E DDR4, Gigabyte B760M DS3H AX DDR4. RAM DEBE ser DDR4
- Intel 13th/14th gen (i3-13100F, i5-13600K, i7-13700F, i7-13700K, i5-14400F, i9-14900K) → socket LGA1700 → placas válidas: ASUS TUF Gaming B760-Plus WiFi (DDR5), MSI MAG B760 Tomahawk WiFi DDR5, Gigabyte B760M DS3H AX DDR4, ASRock B760 Pro RS DDR5, ASUS ROG Maximus Z790 Hero (DDR5). Verificar si la placa elegida es DDR4 o DDR5 y elegir RAM del mismo tipo
NUNCA: Ryzen 7000/8000 con placa AM4. NUNCA: Ryzen 5000/4000 con placa AM5. NUNCA: Intel con placa AMD. NUNCA: AMD con placa Intel.

COMPATIBILIDAD DE RAM SEGÚN PLACA:
- Placas DDR4 (ASUS Prime H610M-E DDR4, Gigabyte B760M DS3H AX DDR4, GIGABYTE B450M DS3H V2, MSI A520M-A PRO, MSI B550M PRO-VDH WiFi) → RAM válida: Corsair Vengeance LPX 16GB DDR4-3200 (S/210), Kingston FURY Beast 8GB DDR4-3200 (S/115)
- Placas DDR5 (MSI MAG B760 Tomahawk WiFi DDR5, ASRock B760 Pro RS DDR5, ASUS TUF Gaming B760-Plus WiFi, ASUS ROG Strix B650-A, MSI MAG B650 Tomahawk WiFi, Gigabyte B650M K AM5, ASUS TUF Gaming A620M-Plus WiFi, ASUS ROG Maximus Z790 Hero) → RAM válida: TeamGroup T-Force Delta RGB 32GB DDR5-6400 (S/640), G.Skill Ripjaws S5 32GB DDR5-5200 (S/490), Corsair Vengeance RGB 32GB DDR5-6000 (S/580), G.Skill Trident Z5 Neo 32GB DDR5-6000 (S/620), Kingston FURY Beast DDR5 16GB 5200MHz (S/290)

COMPATIBILIDAD DE COOLER (todos compatibles con AM4, AM5 y LGA1700):
- Si cooling es Aire → elegir entre: DeepCool AG400 ARGB (S/115), Cooler Master Hyper 212 Halo Black (S/165), Noctua NH-D15 (S/380)
- Si cooling es Líquida → elegir entre: Antec Symphony 240 ARGB (S/270), DeepCool LE520 240mm ARGB (S/310), Arctic Liquid Freezer III 360 (S/480), Corsair iCUE H150i RGB Elite 360mm (S/820), NZXT Kraken Elite 360 RGB (S/1180)

FUENTE DE PODER SEGÚN CONSUMO:
- Build APU sin GPU (~115W total) → Antryx Kirin 500W (S/175) o DeepCool PK550D 550W (S/220)
- Build con GPU entry (GTX 1650 S/640, RX 6600 S/980, Arc A380 S/490, ~250W) → EVGA 600W (S/210) o MSI MAG A650BN 650W (S/260)
- Build con GPU mid (RTX 4060 S/1420, RX 7700 XT S/2190, ~350W) → Cooler Master MWE Gold 750W (S/320) o Gigabyte UD750GM 750W (S/395)
- Build con GPU high (RTX 4070 S/2890, RTX 4070 Ti S/3450, RTX 4070 Ti Super S/3650, RX 7900 XTX S/4650, ~500W) → Corsair RM850e 850W (S/420) o ASUS ROG Thor 850W (S/940) o Corsair RM1000e 1000W (S/720)
- Build con GPU ultra (RTX 4080 Super S/4890, RTX 4070 Ti Super ASUS S/4150, ~600W) → Corsair RM1000e 1000W (S/720) o ASUS ROG Thor 850W (S/940)

EVITAR CUELLOS DE BOTELLA:
- GTX 1650 (S/640), Arc A380 (S/490), RX 6600 (S/980) → emparejar con i3-12100F (S/395), i3-13100F (S/440), Ryzen 5 4500 (S/360), Ryzen 5 4600G (S/390)
- RTX 4060 (S/1420), RX 7700 XT (S/2190) → emparejar con i5-13600K (S/1180), i5-14400F (S/940), Ryzen 5 7600 (S/920), Ryzen 5 7500F (S/760)
- RTX 4070 (S/2890), RTX 4070 Ti (S/3450) → emparejar con i7-13700F (S/1520), i7-13700K (S/1680), Ryzen 7 7800X3D (S/1650), Ryzen 7 8700G (S/1350)
- RTX 4070 Ti Super (S/3650-4150), RTX 4080 Super (S/4890), RX 7900 XTX (S/4650) → emparejar con i9-14900K (S/2250), Ryzen 9 7900X (S/1980), Ryzen 9 7950X3D (S/2850)
NUNCA: RTX 4070 o superior con i3 o Ryzen 5 4500/4600G/4500. NUNCA: GTX 1650 o Arc A380 con i9 o Ryzen 9.

PERIFÉRICOS: Solo incluir periféricos si el usuario los marcó. Si la lista está vacía, no incluir ninguno.
Precios exactos del catálogo proporcionado abajo.

PREFERENCIAS DEL USUARIO:
- CPU: ${cpuBrand || 'libre'}
- RAM: ${ramGen || 'libre'}
- GPU: ${isAPU ? 'NO INCLUIR' : (gpuBrand || 'libre')}
- Refrigeración: ${cooling || 'libre'}
- Case: ${specificCase !== 'La IA elige' ? specificCase : 'libre'}
- Almacenamiento: ${storageType || 'libre'}
- Periféricos requeridos: ${peripherals.length > 0 ? peripherals.join(', ') : 'ninguno'}
- Uso: ${usage} | Nivel: ${level}

PRODUCTOS DISPONIBLES (id · nombre · categoría · precio S/):
${JSON.stringify(stock.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price })))}

Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra:
{
  "suggestions": [
    { "category": "cpu", "store_product_id": "uuid-exacto", "reason": "razón técnica breve" },
    { "category": "gpu", "store_product_id": "uuid-exacto", "reason": "razón" },
    { "category": "ram", "store_product_id": "uuid-exacto", "reason": "razón" },
    { "category": "motherboard", "store_product_id": "uuid-exacto", "reason": "razón" },
    { "category": "storage", "store_product_id": "uuid-exacto", "reason": "razón" },
    { "category": "psu", "store_product_id": "uuid-exacto", "reason": "razón" },
    { "category": "case", "store_product_id": "uuid-exacto", "reason": "razón" },
    { "category": "cooling", "store_product_id": "uuid-exacto", "reason": "razón" }
  ],
  "summary": "Resumen de la build",
  "tips": ["tip 1", "tip 2"]
}`

        let aiSuggestions: any[] = []
        let aiSummary = ''
        let aiTips: string[] = []

        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
                    }),
                }
            )
            const json = await res.json()
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
            if (text) {
                const cleaned = text.match(/\{[\s\S]*\}/)?.[0] ?? '{}'
                const parsed = JSON.parse(cleaned)
                aiSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
                aiSummary = parsed.summary ?? ''
                aiTips = Array.isArray(parsed.tips) ? parsed.tips : []
            }
        } catch {
            // Proceed with fallback selection
        }

        // ── Reserve-based component selection ───────────────────────────
        //
        // ALGORITHM:
        //   For each component in order, compute:
        //     maxForThis = remaining - sum_of_min_costs_of_everything_still_to_buy
        //   Then pick the best (most expensive = highest quality) product within maxForThis.
        //
        // This guarantees:
        //   1. Total NEVER exceeds budget (budget constraint is structural, not iterative)
        //   2. Budget is fully utilized (we spend as much as possible at each step)
        //   3. No iterative retry loop needed

        const build: { category: string; product: any }[] = []
        let remaining = budgetNum

        // Helper: return AI-suggested product for a category if it passes validation
        const getAI = (category: string, maxAllowed: number, filter: (p: any) => boolean): any | undefined => {
            const sug = aiSuggestions.find(s => s.category === category)
            if (!sug) return undefined
            const p = stock.find((x: any) => x.id === sug.store_product_id)
            if (!p || Number(p.price) > maxAllowed || !filter(p)) return undefined
            return p
        }

        const add = (category: string, product: any) => {
            build.push({ category, product })
            remaining -= Number(product.price)
        }

        // ── 1. CPU ──────────────────────────────────────────────────────
        {
            const reserveWithoutMbRam = minGPU + minST + minPSU + minCase + minCool + totalPerMin
            
            // Filter cpuOpts to make sure we leave enough room for their specific socket's motherboard and RAM
            const validCpuOpts = cpuOpts.filter(cpu => {
                const costs = getCpuPlatformMinCosts(cpu.name)
                const totalReserve = reserveWithoutMbRam + costs.minMB + costs.minRAM
                return Number(cpu.price) <= (remaining - totalReserve)
            })

            const reserve = minGPU + minRAM + minMB + minST + minPSU + minCase + minCool + totalPerMin
            const max = Math.max(0, remaining - reserve)
            const filter = (p: any) => isCPU(p, cpuBrand)
            const product = getAI('cpu', max, filter)
                ?? pickBest(validCpuOpts, max, preferHighEnd)
                ?? pickBest(validCpuOpts, remaining - (reserve - minMB - minRAM), false)
            if (product) add('cpu', product)
        }

        const cpuProduct = build.find(b => b.category === 'cpu')?.product ?? null

        // ── 2. GPU ──────────────────────────────────────────────────────
        if (!isAPU && gpuOpts.length > 0) {
            const reserve = minRAM + minMB + minST + minPSU + minCase + minCool + totalPerMin
            const max = Math.max(0, remaining - reserve)
            const filter = (p: any) => isGPU(p, gpuBrand)
            const product = getAI('gpu', max, filter)
                ?? pickBest(gpuOpts, max, preferHighEnd)
                ?? pickBest(gpuOpts, remaining - (reserve - minRAM), false)
            if (product) add('gpu', product)
        }

        // ── 3. RAM ──────────────────────────────────────────────────────
        {
            const reserve = minMB + minST + minPSU + minCase + minCool + totalPerMin
            const max = Math.max(0, remaining - reserve)
            
            // Enforce appropriate RAM generation for AM5, AM4 and Intel CPUs based on budget constraints
            let actualRamGen = ramGen
            if (cpuProduct) {
                const socket = detectAMDSocket(cpuProduct.name)
                if (socket === 'am5') {
                    actualRamGen = 'DDR5'
                } else if (socket === 'am4') {
                    actualRamGen = 'DDR4'
                } else {
                    // Intel CPU
                    if (!ramGen || ramGen === 'La IA elige') {
                        // Check if we can afford DDR5 (needs at least S/ 940 for RAM + Motherboard)
                        const reserveWithoutMb = minST + minPSU + minCase + minCool + totalPerMin
                        const neededForDDR5 = 290 + 650 // min DDR5 RAM (290) + min DDR5 Intel MB (650)
                        if (remaining - reserveWithoutMb < neededForDDR5) {
                            actualRamGen = 'DDR4'
                        }
                    }
                }
            }

            const filteredRamOpts = ramOpts.filter(p => isRAM(p, actualRamGen))
            const filter = (p: any) => isRAM(p, actualRamGen)
            const product = getAI('ram', max, filter)
                ?? pickBest(filteredRamOpts, max, preferHighEnd)
                ?? pickBest(filteredRamOpts, remaining - (reserve - minMB), false)
            if (product) add('ram', product)
        }

        const ramProduct = build.find(b => b.category === 'ram')?.product ?? null

        // ── 4. Motherboard ──────────────────────────────────────────────
        {
            const mbOpts = allMbOpts.filter(p => isMB(p, cpuProduct, ramProduct, cpuBrand, ramGen))
            const reserve = minST + minPSU + minCase + minCool + totalPerMin
            const max = Math.max(0, remaining - reserve)
            const filter = (p: any) => isMB(p, cpuProduct, ramProduct, cpuBrand, ramGen)
            const product = getAI('motherboard', max, filter)
                ?? pickBest(mbOpts, max, preferHighEnd)
                ?? pickBest(mbOpts, remaining - (reserve - minST), false)
            if (product) add('motherboard', product)
        }

        // ── 5. Storage ──────────────────────────────────────────────────
        {
            const reserve = minPSU + minCase + minCool + totalPerMin
            const max = Math.max(0, remaining - reserve)
            const filter = (p: any) => isStorage(p, storageType)
            const product = getAI('storage', max, filter)
                ?? pickBest(stOpts, max, preferHighEnd)
                ?? pickBest(stOpts, remaining - (reserve - minPSU), false)
            if (product) add('storage', product)
        }

        // ── 6. PSU ──────────────────────────────────────────────────────
        {
            const reserve = minCase + minCool + totalPerMin
            const max = Math.max(0, remaining - reserve)
            const filter = isPSU
            const product = getAI('psu', max, filter)
                ?? pickBest(psuOpts, max, preferHighEnd)
                ?? pickBest(psuOpts, remaining - (reserve - minCase), false)
            if (product) add('psu', product)
        }

        // ── 7. Case ─────────────────────────────────────────────────────
        {
            const reserve = minCool + totalPerMin
            const max = Math.max(0, remaining - reserve)
            const filter = isCase

            let product: any = getAI('case', max, filter)
            if (!product && specificCase && specificCase !== 'La IA elige') {
                product = caseOpts.find(p =>
                    p.name.toLowerCase().includes(specificCase.toLowerCase()) &&
                    Number(p.price) <= max
                ) ?? null
            }
            product = product
                ?? pickBest(caseOpts, max, preferHighEnd)
                ?? pickBest(caseOpts, remaining - minCool, false)
            if (product) add('case', product)
        }

        // ── 8. Cooling ──────────────────────────────────────────────────
        {
            const max = Math.max(0, remaining - totalPerMin)
            if (max >= minCool && coolOpts.length > 0) {
                const filter = (p: any) => isCooling(p, cooling)
                const product = getAI('cooling', max, filter)
                    ?? pickBest(coolOpts, max, preferHighEnd)
                if (product) add('cooling', product)
            }
        }

        // ── 9. Peripherals ──────────────────────────────────────────────
        for (let i = 0; i < peripherals.length; i++) {
            const per = peripherals[i] as string
            if (remaining <= 0) break

            // Reserve minimum for peripherals that come after this one
            const futurePerReserve = perMins.slice(i + 1).reduce((a: number, b: number) => a + b, 0)
            const max = Math.max(0, remaining - futurePerReserve)

            const cats = getCategoryForPeripheral(per)
            const opts = stock
                .filter((p: any) => cats.some(c => p.category.toLowerCase().includes(c)))
                .filter((p: any) => matchesPeripheralCategory(per, p.name))

            // Try AI suggestion first
            const perSug = aiSuggestions.find(s => s.category.toLowerCase() === per.toLowerCase())
            let perProduct: any = null
            if (perSug) {
                const candidate = stock.find((p: any) => p.id === perSug.store_product_id)
                if (candidate && Number(candidate.price) <= max && matchesPeripheralCategory(per, candidate.name)) {
                    perProduct = candidate
                }
            }
            perProduct = perProduct ?? pickBest(opts, max, preferHighEnd) ?? pickBest(opts, remaining, false)

            if (perProduct && Number(perProduct.price) <= remaining) {
                add(perProduct.category, perProduct)
            }
        }

        // ── Final validation (safety net — should never fire) ───────────
        const total = build.reduce((sum, b) => sum + Number(b.product.price), 0)
        if (total > budgetNum) {
            // This should be mathematically impossible with the reserve approach,
            // but guard against floating-point edge cases
            return NextResponse.json({
                error: 'Error interno: el total calculado superó el presupuesto.',
                detail: `S/${total} > S/${budgetNum}`
            }, { status: 500 })
        }

        if (build.length === 0 || !build.some(b => b.category === 'cpu')) {
            return NextResponse.json({
                error: 'La IA no encontró componentes suficientes en stock. Prueba otro presupuesto o sincroniza el catálogo.'
            }, { status: 400 })
        }

        // ── Build reason messages ───────────────────────────────────────
        const defaultReasons: Record<string, string> = {
            cpu: `Procesador óptimo para ${usage} dentro del presupuesto.`,
            gpu: `Tarjeta gráfica equilibrada para ${usage}.`,
            ram: 'RAM seleccionada por velocidad y compatibilidad con la placa.',
            motherboard: 'Placa madre compatible con CPU y RAM seleccionados.',
            storage: 'Almacenamiento rápido y de alta capacidad.',
            psu: 'Fuente de poder estable con margen de seguridad.',
            case: 'Case con buena ventilación para los componentes.',
            cooling: 'Refrigeración adecuada para mantener temperaturas óptimas.',
        }

        const getReason = (category: string): string => {
            const aiMatch = aiSuggestions.find(s => s.category === category)
            return aiMatch?.reason ?? defaultReasons[category] ?? 'Periférico compatible con la build.'
        }

        const finalBuild = build.map(item => ({
            category: item.category,
            reason: getReason(item.category),
            product: item.product,
        }))

        return NextResponse.json({
            build: finalBuild,
            total,
            remainingBudget: budgetNum - total,
            summary: aiSummary || 'Build optimizada respetando presupuesto y compatibilidad',
            tips: aiTips.length > 0 ? aiTips : [
                'Verifica compatibilidad física (tamaño de case vs placa madre) antes de comprar.',
                `Con S/${budgetNum - total} restantes puedes agregar más almacenamiento o mejor refrigeración.`,
            ],
        })
    } catch (err) {
        return NextResponse.json(
            { error: 'PC Builder error', detail: err instanceof Error ? err.message : 'unknown' },
            { status: 500 }
        )
    }
}
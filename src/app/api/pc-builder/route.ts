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

        const isAPU = graphicsType === 'Solo APU (Gráficos Integrados)'
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

COMPATIBILIDAD OBLIGATORIA:
- CPU Intel → Placa Intel (B760/Z790/H610/B660/Z690)
- CPU AMD → Placa AMD (B650/X670/B550/A520/A620)
- RAM DDR5 → Placa compatible DDR5; RAM DDR4 → Placa compatible DDR4
- ${isAPU ? 'NO incluir GPU — build APU con gráficos integrados' : 'Incluir GPU dedicada'}

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

        let aiSuggestions: Suggestion[] = []
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
            const reserve = minGPU + minRAM + minMB + minST + minPSU + minCase + minCool + totalPerMin
            const max = Math.max(0, remaining - reserve)
            const filter = (p: any) => isCPU(p, cpuBrand)
            const product = getAI('cpu', max, filter)
                ?? pickBest(cpuOpts, max, preferHighEnd)
                ?? pickBest(cpuOpts, remaining - (reserve - minMB - minRAM), false)
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
            const filter = (p: any) => isRAM(p, ramGen)
            const product = getAI('ram', max, filter)
                ?? pickBest(ramOpts, max, preferHighEnd)
                ?? pickBest(ramOpts, remaining - (reserve - minMB), false)
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
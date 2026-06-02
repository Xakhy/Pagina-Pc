import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Platform & Socket Detection ───────────────────────────────────────────────

function detectPlatform(cpuName: string): 'amd' | 'intel' {
    const n = cpuName.toLowerCase()
    if (n.includes('ryzen') || n.includes('athlon')) return 'amd'
    return 'intel'
}

function detectAMDSocket(cpuName: string): 'am4' | 'am5' | null {
    const n = cpuName.toLowerCase()
    // AM5: Ryzen 7000 non-G + Ryzen 8000G
    if (
        n.includes('7500f') || n.includes('7600') || n.includes('7700') ||
        n.includes('7800') || n.includes('7900') || n.includes('7950') ||
        n.includes('8500g') || n.includes('8600g') || n.includes('8700g') || n.includes('8900g')
    ) return 'am5'
    // AM4: Ryzen 4000/5000
    if (
        n.includes('4500') || n.includes('4600g') ||
        n.includes('5600') || n.includes('5700') || n.includes('5800') ||
        n.includes('5900') || n.includes('5950')
    ) return 'am4'
    return null
}

function getMBDDRType(mbName: string): 'DDR4' | 'DDR5' | null {
    const n = mbName.toLowerCase()
    // Explicit in name
    if (n.includes('ddr4')) return 'DDR4'
    if (n.includes('ddr5')) return 'DDR5'
    // AM4 boards are always DDR4
    if (n.includes('a520') || n.includes('b450') || n.includes('b550')) return 'DDR4'
    // AM5 boards are always DDR5
    if (n.includes('b650') || n.includes('a620') || n.includes('x670')) return 'DDR5'
    return null
}

/** CPUs with real dedicated iGPU suitable for APU builds */
function isRealAPU(cpuName: string): boolean {
    const n = cpuName.toLowerCase()
    return (
        n.includes('8500g') || n.includes('8600g') || n.includes('8700g') || n.includes('8900g') ||
        n.includes('5600g') || n.includes('5700g') ||
        n.includes('4600g')
        // NOTE: 4500 has NO iGPU — excluded intentionally
    )
}

// ── Category Filters ──────────────────────────────────────────────────────────

function isCPU(p: any, brand?: string, apuOnly = false): boolean {
    if (!p.category.toLowerCase().includes('procesadores')) return false
    if (apuOnly && !isRealAPU(p.name)) return false
    if (!brand || brand === 'La IA elige') return true
    const n = p.name.toLowerCase()
    if (brand === 'AMD') return n.includes('ryzen') || n.includes('athlon')
    if (brand === 'Intel') return n.includes('intel') || n.includes('core i')
    return true
}

function isGPU(p: any, brand?: string): boolean {
    if (!p.category.toLowerCase().includes('video')) return false
    if (!brand || brand === 'La IA elige' || brand === 'IA Elige') return true
    const n = p.name.toLowerCase()
    if (brand === 'NVIDIA' || brand === 'NVIDIA GeForce RTX')
        return n.includes('rtx') || n.includes('gtx') || n.includes('geforce')
    if (brand === 'AMD RX' || brand === 'AMD Radeon RX')
        return n.includes('rx') || n.includes('radeon')
    return true
}

function isRAM(p: any, gen?: string | null): boolean {
    if (!p.category.toLowerCase().includes('memorias ram')) return false
    if (!gen || gen === 'La IA elige') return true
    return p.name.toLowerCase().includes(gen.toLowerCase())
}

function isMB(p: any, cpuProduct: any | null, ramProduct: any | null): boolean {
    if (!p.category.toLowerCase().includes('placas madre')) return false
    if (!cpuProduct) return true

    const nl = p.name.toLowerCase()
    const platform = detectPlatform(cpuProduct.name)
    const socket = detectAMDSocket(cpuProduct.name)

    // ── AMD platform check ──
    if (platform === 'amd') {
        const isAMDMb = nl.includes('b650') || nl.includes('a620') || nl.includes('x670') ||
            nl.includes('b550') || nl.includes('a520') || nl.includes('b450')
        if (!isAMDMb) return false

        if (socket === 'am5') {
            if (!nl.includes('b650') && !nl.includes('a620') && !nl.includes('x670')) return false
        }
        if (socket === 'am4') {
            if (!nl.includes('a520') && !nl.includes('b450') && !nl.includes('b550')) return false
        }
    }

    // ── Intel platform check ──
    if (platform === 'intel') {
        const isIntelMb = nl.includes('h610') || nl.includes('b760') || nl.includes('z790') ||
            nl.includes('b660') || nl.includes('z690')
        if (!isIntelMb) return false
    }

    // ── DDR compatibility ──
    if (ramProduct) {
        const ramIsDDR5 = ramProduct.name.toLowerCase().includes('ddr5')
        const mbDDR = getMBDDRType(p.name)
        if (mbDDR === 'DDR4' && ramIsDDR5) return false
        if (mbDDR === 'DDR5' && !ramIsDDR5) return false
    }

    return true
}

function isStorage(p: any, type?: string): boolean {
    if (!p.category.toLowerCase().includes('almacenamiento')) return false
    if (!type || type === 'La IA elige') return true
    const n = p.name.toLowerCase()
    const isNVMe = n.includes('nvme') || n.includes('m.2') || n.includes('pcie')
    if (type === 'NVMe SSD') return isNVMe
    if (type === 'SATA SSD') return !isNVMe && (n.includes('ssd') || (n.includes('sata') && n.includes('2.5')))
    return true
}

function isPSU(p: any): boolean {
    return p.category.toLowerCase().includes('fuentes de poder')
}

function isCase(p: any): boolean {
    const c = p.category.toLowerCase()
    return c.includes('cases') || c.includes('chasis')
}

function isCooling(p: any, pref?: string): boolean {
    const c = p.category.toLowerCase()
    if (!c.includes('refriger')) return false
    if (!pref || pref === 'La IA elige') return true
    const n = p.name.toLowerCase()
    const isLiquid = n.includes('liquid') || n.includes('water') || n.includes('aio') ||
        /\b(240|280|360)\b/.test(n)
    if (pref === 'Aire') return !isLiquid
    if (pref === 'Líquida') return isLiquid
    return true
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function minPrice(items: any[]): number {
    if (!items.length) return 0
    return Math.min(...items.map(p => Number(p.price)))
}

function pickBest(items: any[], maxPrice: number, highEnd: boolean): any | undefined {
    const fit = items.filter(p => Number(p.price) > 0 && Number(p.price) <= maxPrice)
    if (!fit.length) return undefined
    return fit.reduce((a, b) =>
        (highEnd ? Number(b.price) > Number(a.price) : Number(b.price) < Number(a.price)) ? b : a
    )
}

function getCategoryForPeripheral(per: string): string[] {
    const p = per.toLowerCase()
    if ((p.includes('mouse') || p.includes('ratón')) && !p.includes('pad')) return ['mouse gaming']
    if (p.includes('teclado') || p.includes('keyboard')) return ['teclados']
    if (p.includes('monitor') || p.includes('pantalla')) return ['monitores']
    if (p.includes('auricular') || p.includes('headset') || p.includes('audifono')) return ['audio & headsets']
    if (p.includes('micrófono') || p.includes('microfono') || p.includes('mic')) return ['audio & headsets']
    if (p.includes('mousepad') || p.includes('pad')) return ['mouse gaming', 'accesorios']
    return []
}

function matchesPeripheralCategory(perName: string, productName: string): boolean {
    const p = perName.toLowerCase()
    const n = productName.toLowerCase()
    if ((p.includes('mouse') || p.includes('ratón')) && !p.includes('pad')) return !n.includes('pad')
    if (p.includes('micrófono') || p.includes('microfono') || p.includes('mic'))
        return n.includes('wave') || n.includes('mic') || n.includes('microfono') || n.includes('elgato')
    if (p.includes('mousepad') || p.includes('pad'))
        return n.includes('pad') || n.includes('mousepad')
    return true
}

// ── Main Handler ──────────────────────────────────────────────────────────────

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

        // ── Strict APU / GPU decision ───────────────────────────────────
        //    Respeta la elección del usuario SIN auto-override.
        let isAPU: boolean
        if (graphicsType === 'Solo APU (Gráficos Integrados)' || graphicsType === 'Solo APU') {
            isAPU = true
        } else if (graphicsType === 'Tarjeta Gráfica') {
            isAPU = false
        } else {
            // 'La IA elige' — decide por presupuesto y uso
            isAPU = budgetNum < 2000 || usage === 'Estudio'
        }

        const preferHighEnd = budgetNum >= 2500

        // ── Load stock ──────────────────────────────────────────────────
        const { data: products = [], error: dbErr } = await supabase
            .from('products')
            .select('*')
            .gt('stock', 0)
        if (dbErr) throw new Error(dbErr.message)
        const stock = (products ?? []) as any[]

        // ── Pre-filter by category ──────────────────────────────────────
        const cpuOpts = stock.filter(p => isCPU(p, cpuBrand, isAPU))
        const gpuOpts = isAPU ? [] : stock.filter(p => isGPU(p, gpuBrand))
        const allRamOpts = stock.filter(p => isRAM(p))
        const allMbOpts = stock.filter(p => p.category.toLowerCase().includes('placas madre'))
        const stOpts = stock.filter(p => isStorage(p, storageType))
        const psuOpts = stock.filter(p => isPSU(p))
        const caseOpts = stock.filter(p => isCase(p))
        const coolOpts = stock.filter(p => isCooling(p, cooling))

        // ── Platform-specific price floors ──────────────────────────────
        const minGPU = isAPU ? 0 : minPrice(gpuOpts)
        const minST = minPrice(stOpts)
        const minPSU = minPrice(psuOpts)
        const minCase = minPrice(caseOpts)
        const minCool = minPrice(coolOpts)

        const minRAM_DDR4 = minPrice(allRamOpts.filter(p => p.name.toLowerCase().includes('ddr4')))
        const minRAM_DDR5 = minPrice(allRamOpts.filter(p => p.name.toLowerCase().includes('ddr5')))
        const minMB_AM4 = minPrice(allMbOpts.filter(p => {
            const n = p.name.toLowerCase()
            return n.includes('a520') || n.includes('b450') || n.includes('b550')
        }))
        const minMB_AM5 = minPrice(allMbOpts.filter(p => {
            const n = p.name.toLowerCase()
            return n.includes('b650') || n.includes('a620') || n.includes('x670')
        }))
        const minMB_Intel = minPrice(allMbOpts.filter(p => {
            const n = p.name.toLowerCase()
            return n.includes('h610') || n.includes('b760') || n.includes('z790') || n.includes('b660')
        }))

        // Worst-case platform reserve: pick the most expensive combination
        // so CPU selection never leaves us unable to afford MB+RAM
        const maxMbRamReserve = Math.max(
            (minMB_AM5 || 0) + (minRAM_DDR5 || 0),   // AM5 = S/560 + S/290 = S/850
            (minMB_AM4 || 0) + (minRAM_DDR4 || 0),   // AM4 = S/290 + S/115 = S/405
            (minMB_Intel || 0) + Math.min(minRAM_DDR4 || 9999, minRAM_DDR5 || 9999)
        )

        // ── Peripheral min reserves ─────────────────────────────────────
        const perMins: number[] = peripherals.map((per: string) => {
            const cats = getCategoryForPeripheral(per)
            const opts = stock
                .filter((p: any) => cats.some(c => p.category.toLowerCase().includes(c)))
                .filter((p: any) => matchesPeripheralCategory(per, p.name))
            return minPrice(opts)
        })
        const totalPerMin = perMins.reduce((a: number, b: number) => a + b, 0)

        // ── Feasibility check ───────────────────────────────────────────
        const minCPU = minPrice(cpuOpts)
        const coreMin = minCPU + minGPU + maxMbRamReserve + minST + minPSU + minCase + minCool
        if (!minCPU || coreMin > budgetNum) {
            return NextResponse.json({
                error: `Presupuesto insuficiente para una PC completa con las preferencias seleccionadas. Mínimo estimado: S/ ${coreMin || 2500}.`
            }, { status: 400 })
        }

        // ── Gemini AI suggestions ───────────────────────────────────────
        const productCatalog = stock.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: Number(p.price)
        }))

        const prompt = `Eres experto en ensamblaje de PCs para Perú (precios en soles S/).
Selecciona componentes SOLO de la lista de productos disponibles abajo.

RESTRICCIÓN ABSOLUTA: La suma de todos los precios NO puede superar S/ ${budgetNum}. Verifica la suma antes de responder.

PARÁMETROS DEL USUARIO (respeta ESTRICTAMENTE):
- Presupuesto total: S/ ${budgetNum}
- Uso: ${usage} | Nivel: ${level}
- Marca CPU: ${cpuBrand || 'libre'}
- Tipo de gráficos: ${isAPU
                ? 'SOLO APU — NO incluir GPU dedicada. CPU debe ser APU con gráficos integrados: 8500G, 8600G, 8700G, 5600G, 5700G, 4600G'
                : `GPU dedicada requerida${gpuBrand && gpuBrand !== 'La IA elige' ? ' — marca: ' + gpuBrand : ''}`}
- Generación RAM: ${ramGen && ramGen !== 'La IA elige' ? ramGen + ' (solo si es compatible con la plataforma elegida)' : 'según compatibilidad CPU/placa'}
- Refrigeración: ${cooling || 'libre'}
- Case: ${specificCase && specificCase !== 'La IA elige' ? specificCase : 'libre'}
- Almacenamiento: ${storageType || 'libre'}
- Periféricos requeridos: ${peripherals.length > 0 ? peripherals.join(', ') : 'ninguno'}

REGLAS DE COMPATIBILIDAD (OBLIGATORIAS, nunca violar):
1. Ryzen 7000 no-G (7500F, 7600, 7800X3D, 7900X, 7950X3D) → socket AM5 → placa B650/A620/X670 → RAM DDR5
2. Ryzen 8000G (8500G, 8600G, 8700G) → socket AM5 → placa B650/A620/X670 → RAM DDR5
3. Ryzen 5000/4000 con G (5600G, 5700G, 4600G) → socket AM4 → placa A520/B550/B450 → RAM DDR4
4. Intel 12/13/14 gen → socket LGA1700 → placa H610/B760/Z790 → RAM DDR4 o DDR5 según placa elegida
5. PROHIBIDO: AM5 CPU + placa AM4. AM4 CPU + placa AM5. AMD CPU + placa Intel. Intel CPU + placa AMD.
6. PROHIBIDO: DDR5 RAM + placa DDR4. DDR4 RAM + placa DDR5.
7. Placas DDR4: ASUS Prime H610M-E DDR4, Gigabyte B760M DS3H AX DDR4, GIGABYTE B450M DS3H V2, MSI A520M-A PRO, MSI B550M PRO-VDH WiFi
8. Placas DDR5: ASUS TUF Gaming B760-Plus WiFi, MSI MAG B760 Tomahawk WiFi DDR5, ASRock B760 Pro RS DDR5, ASUS TUF Gaming A620M-Plus WiFi, Gigabyte B650M K AM5, MSI MAG B650 Tomahawk WiFi, ASUS ROG Strix B650-A Gaming WiFi, ASUS ROG Maximus Z790 Hero

COMPONENTES OBLIGATORIOS (todos deben estar): cpu, ram, motherboard, storage, psu, case, cooling${!isAPU ? ', gpu' : ''}

PRODUCTOS DISPONIBLES:
${JSON.stringify(productCatalog)}

Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional:
{
  "suggestions": [
    { "category": "cpu", "store_product_id": "uuid-exacto", "reason": "razón técnica breve" },${!isAPU ? '\n    { "category": "gpu", "store_product_id": "uuid-exacto", "reason": "razón" },' : ''}
    { "category": "ram", "store_product_id": "uuid-exacto", "reason": "razón" },
    { "category": "motherboard", "store_product_id": "uuid-exacto", "reason": "razón" },
    { "category": "storage", "store_product_id": "uuid-exacto", "reason": "razón" },
    { "category": "psu", "store_product_id": "uuid-exacto", "reason": "razón" },
    { "category": "case", "store_product_id": "uuid-exacto", "reason": "razón" },
    { "category": "cooling", "store_product_id": "uuid-exacto", "reason": "razón" }
  ],
  "summary": "Resumen de la build en 1-2 oraciones",
  "tips": ["consejo 1", "consejo 2"]
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
            // Fall through to deterministic selection
        }

        // ── Deterministic build selection ───────────────────────────────
        //
        // ALGORITMO RESERVE-BASED:
        //   max_para_este = restante - suma_mínimos_de_todo_lo_que_falta
        //
        // Orden: CPU → GPU → RAM → MB → Storage → PSU → Case → Cooling → Periféricos
        //
        // GPU va antes de RAM/MB para asegurar que el componente más caro (GPU)
        // se elija con el mayor margen disponible. Luego RAM y MB se filtran con
        // compatibilidad exacta conocida del CPU ya elegido.

        const build: { category: string; product: any }[] = []
        let remaining = budgetNum

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
            const gpuR = isAPU ? 0 : minGPU
            const reserve = gpuR + maxMbRamReserve + minST + minPSU + minCase + minCool + totalPerMin
            const max = Math.max(0, remaining - reserve)
            const filter = (p: any) => isCPU(p, cpuBrand, isAPU)
            const product = getAI('cpu', max, filter)
                ?? pickBest(cpuOpts, max, preferHighEnd)
                ?? pickBest(cpuOpts, remaining - (gpuR + minST + minPSU + minCase + minCool + totalPerMin), false)
            if (product) add('cpu', product)
        }

        const cpuProduct = build.find(b => b.category === 'cpu')?.product ?? null
        const cpuSocket = cpuProduct ? detectAMDSocket(cpuProduct.name) : null

        // Determine effective DDR from CPU socket
        // AM5 → always DDR5, AM4 → always DDR4, Intel → user preference or null
        let effectiveDDR: 'DDR4' | 'DDR5' | null =
            cpuSocket === 'am5' ? 'DDR5' :
                cpuSocket === 'am4' ? 'DDR4' :
                    (ramGen && ramGen !== 'La IA elige') ? (ramGen as 'DDR4' | 'DDR5') :
                        null

        // ── 2. GPU ──────────────────────────────────────────────────────
        if (!isAPU && gpuOpts.length > 0) {
            const isIntelCPU =
                cpuProduct &&
                detectPlatform(cpuProduct.name) === 'intel'

            const mbMin = isIntelCPU
                ? (minMB_Intel || 0)
                : effectiveDDR === 'DDR5'
                    ? (minMB_AM5 || 0)
                    : effectiveDDR === 'DDR4'
                        ? (minMB_AM4 || 0)
                        : 0

            const ramMin = effectiveDDR === 'DDR5'
                ? (minRAM_DDR5 || 0)
                : effectiveDDR === 'DDR4'
                    ? (minRAM_DDR4 || 0)
                    : Math.min(minRAM_DDR4 || 9999, minRAM_DDR5 || 9999)

            const reserve =
                mbMin +
                ramMin +
                minST +
                minPSU +
                minCase +
                minCool +
                totalPerMin

            const max = Math.max(0, remaining - reserve)

            const filter = (p: any) => isGPU(p, gpuBrand)

            const product = getAI('gpu', max, filter)
                ?? pickBest(gpuOpts.filter(filter), max, preferHighEnd)
                ?? pickBest(
                    gpuOpts.filter(filter),
                    remaining - (
                        minST +
                        minPSU +
                        minCase +
                        minCool +
                        totalPerMin
                    ),
                    false
                )

            if (product) add('gpu', product)
        }
        // ── 3. RAM ──────────────────────────────────────────────────────
        {
            const isIntelCPU =
                cpuProduct &&
                detectPlatform(cpuProduct.name) === 'intel'

            const mbMin = isIntelCPU
                ? (minMB_Intel || 0)
                : effectiveDDR === 'DDR5'
                    ? (minMB_AM5 || 0)
                    : effectiveDDR === 'DDR4'
                        ? (minMB_AM4 || 0)
                        : Math.min(minMB_AM4 || 9999, minMB_AM5 || 9999)

            const reserve =
                mbMin +
                minST +
                minPSU +
                minCase +
                minCool +
                totalPerMin

            const max = Math.max(0, remaining - reserve)

            const ramOpts = allRamOpts.filter(p =>
                isRAM(p, effectiveDDR)
            )

            const filter = (p: any) =>
                isRAM(p, effectiveDDR)

            const product = getAI('ram', max, filter)
                ?? pickBest(ramOpts, max, preferHighEnd)
                ?? pickBest(
                    ramOpts,
                    remaining - (
                        minST +
                        minPSU +
                        minCase +
                        minCool +
                        totalPerMin
                    ),
                    false
                )

            if (product) add('ram', product)
        }

        const ramProduct =
            build.find(b => b.category === 'ram')?.product ?? null
        // ── 4. Motherboard ──────────────────────────────────────────────
        {
            const mbOpts = allMbOpts.filter(p => isMB(p, cpuProduct, ramProduct))
            const reserve = minST + minPSU + minCase + minCool + totalPerMin
            const max = Math.max(0, remaining - reserve)
            const filter = (p: any) => isMB(p, cpuProduct, ramProduct)
            const product = getAI('motherboard', max, filter)
                ?? pickBest(mbOpts, max, preferHighEnd)
                ?? pickBest(mbOpts, remaining - (minST + minPSU + minCase + minCool + totalPerMin), false)
            if (product) add('motherboard', product)
        }

        // ── 5. Storage ──────────────────────────────────────────────────
        {
            const reserve = minPSU + minCase + minCool + totalPerMin
            const max = Math.max(0, remaining - reserve)
            const filter = (p: any) => isStorage(p, storageType)
            const product = getAI('storage', max, filter)
                ?? pickBest(stOpts, max, preferHighEnd)
                ?? pickBest(stOpts, remaining - (minPSU + minCase + minCool + totalPerMin), false)
            if (product) add('storage', product)
        }

        // ── 6. PSU ──────────────────────────────────────────────────────
        {
            const reserve = minCase + minCool + totalPerMin
            const max = Math.max(0, remaining - reserve)
            const product = getAI('psu', max, isPSU)
                ?? pickBest(psuOpts, max, preferHighEnd)
                ?? pickBest(psuOpts, remaining - (minCase + minCool + totalPerMin), false)
            if (product) add('psu', product)
        }

        // ── 7. Case ─────────────────────────────────────────────────────
        {
            const reserve = minCool + totalPerMin
            const max = Math.max(0, remaining - reserve)
            let product: any = getAI('case', max, isCase)

            // Specific case matching (word-based to handle "Fractal North" → "Fractal Design North Walnut")
            if (!product && specificCase && specificCase !== 'La IA elige') {
                const words = specificCase.toLowerCase().split(' ')
                product = caseOpts.find(p =>
                    words.every((w: string) => p.name.toLowerCase().includes(w)) &&
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
            if (coolOpts.length > 0 && max > 0) {
                const filteredCool = coolOpts.filter(p => isCooling(p, cooling))
                const product = getAI('cooling', max, p => isCooling(p, cooling))
                    ?? pickBest(filteredCool, max, preferHighEnd)
                    ?? pickBest(filteredCool, max, false)
                    ?? pickBest(coolOpts, max, false) // último recurso: ignora preferencia de cooling
                if (product && Number(product.price) <= max) add('cooling', product)
            }
        }

        // ── 9. Peripherals ──────────────────────────────────────────────
        for (let i = 0; i < peripherals.length; i++) {
            const per = peripherals[i] as string
            if (remaining <= 0) break
            const futureReserve = perMins.slice(i + 1).reduce((a: number, b: number) => a + b, 0)
            const max = Math.max(0, remaining - futureReserve)
            const cats = getCategoryForPeripheral(per)
            const opts = stock
                .filter((p: any) => cats.some(c => p.category.toLowerCase().includes(c)))
                .filter((p: any) => matchesPeripheralCategory(per, p.name))
            const perSug = aiSuggestions.find(s => s.category.toLowerCase() === per.toLowerCase())
            let perProduct: any = null
            if (perSug) {
                const candidate = stock.find((p: any) => p.id === perSug.store_product_id)
                if (candidate && Number(candidate.price) <= max && matchesPeripheralCategory(per, candidate.name)) {
                    perProduct = candidate
                }
            }
            perProduct = perProduct
                ?? pickBest(opts, max, preferHighEnd)
                ?? pickBest(opts, remaining, false)
            if (perProduct && Number(perProduct.price) <= remaining) add(perProduct.category, perProduct)
        }

        // ── Final validation ────────────────────────────────────────────
        const total = build.reduce((sum, b) => sum + Number(b.product.price), 0)

        if (total > budgetNum) {
            return NextResponse.json({
                error: 'Error interno: el total calculado superó el presupuesto.',
                detail: `S/${total} > S/${budgetNum}`
            }, { status: 500 })
        }

        if (!build.some(b => b.category === 'cpu')) {
            return NextResponse.json({
                error: 'No se encontraron componentes suficientes. Ajusta el presupuesto o las preferencias.'
            }, { status: 400 })
        }

        // ── Build reason messages ───────────────────────────────────────
        const defaultReasons: Record<string, string> = {
            cpu: `Procesador óptimo para ${usage} dentro del presupuesto.`,
            gpu: `GPU equilibrada para ${usage} sin cuello de botella con el CPU.`,
            ram: 'RAM compatible con la plataforma (socket y generación DDR).',
            motherboard: 'Placa madre compatible con CPU y RAM seleccionados.',
            storage: 'Almacenamiento rápido y de buena capacidad.',
            psu: 'Fuente de poder estable con margen de seguridad adecuado.',
            case: 'Gabinete con buena ventilación para los componentes.',
            cooling: 'Refrigeración adecuada para mantener temperaturas óptimas.',
        }
        const getReason = (category: string): string => {
            const m = aiSuggestions.find(s => s.category === category)
            return m?.reason ?? defaultReasons[category] ?? 'Componente compatible con la build.'
        }

        return NextResponse.json({
            build: build.map(item => ({
                category: item.category,
                reason: getReason(item.category),
                product: item.product,
            })),
            total,
            remainingBudget: budgetNum - total,
            summary: aiSummary || `Build ${isAPU ? 'APU integrada' : 'con GPU dedicada'} optimizada para ${usage}`,
            tips: aiTips.length > 0 ? aiTips : [
                'Verifica el factor de forma (ATX/mATX) entre placa madre y gabinete antes de comprar.',
                `Tienes S/${budgetNum - total} de margen para upgrades futuros o más almacenamiento.`,
            ],
        })
    } catch (err) {
        return NextResponse.json(
            { error: 'PC Builder error', detail: err instanceof Error ? err.message : 'unknown' },
            { status: 500 }
        )
    }
}
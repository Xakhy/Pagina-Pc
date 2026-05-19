import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Suggestion = {
    category: string
    store_product_id: string
    reason: string
}

const REQUIRED = ['cpu', 'gpu', 'ram', 'motherboard', 'storage', 'psu', 'case']

const CATEGORY_MAP: Record<string, string[]> = {
    cpu: ['procesadores'],
    gpu: ['tarjetas de video'],
    ram: ['memorias ram'],
    motherboard: ['placas madre'],
    storage: ['almacenamiento'],
    psu: ['fuentes de poder'],
    case: ['cases & chasis'],
}

const normalize = (t: string) => t.toLowerCase()

// 🧠 detectar plataforma
function detectPlatform(cpuName: string) {
    const name = cpuName.toLowerCase()
    if (name.includes('ryzen') || name.includes('amd')) return 'amd'
    return 'intel'
}

// ⚖️ evitar bottleneck simple
function isBalanced(cpu: any, gpu: any) {
    const cpuHigh = cpu.price > 1500
    const gpuHigh = gpu.price > 2000

    if (gpuHigh && !cpuHigh) return false // GPU muy fuerte + CPU débil
    return true
}

// Peripheral helper mappings
function getCategoryForPeripheral(per: string): string[] {
    const p = per.toLowerCase()
    if (p.includes('mouse') && !p.includes('pad')) return ['mouse gaming']
    if (p.includes('teclado')) return ['teclados mecánicos']
    if (p.includes('monitor')) return ['monitores']
    if (p.includes('auriculares') || p.includes('headset') || p.includes('audifonos')) return ['audio & headsets']
    if (p.includes('micrófono') || p.includes('microfono') || p.includes('mic')) return ['audio & headsets']
    return []
}

function matchesPeripheralName(perName: string, productName: string): boolean {
    const p = perName.toLowerCase()
    const name = productName.toLowerCase()
    if (p.includes('mouse') && !p.includes('pad') && !name.includes('pad')) return true
    if (p.includes('teclado')) return true
    if (p.includes('monitor')) return true
    if (p.includes('auriculares') || p.includes('audifonos')) {
        return name.includes('cloud') || name.includes('g733') || name.includes('headset') || name.includes('wireless') || name.includes('audifono') || name.includes('auricular')
    }
    if (p.includes('micrófono') || p.includes('microfono')) {
        return name.includes('wave') || name.includes('mic') || name.includes('microfono') || name.includes('microphone')
    }
    if (p.includes('mousepad')) {
        return name.includes('pad') || name.includes('mousepad')
    }
    return true
}

// 🔥 fallback inteligente real
function fallbackBuild(products: any[], budget: number, preferences: any) {
    const safe = products ?? []
    let remaining = budget
    const build: any[] = []

    const {
        cooling = 'La IA elige',
        specificCase = 'La IA elige',
        cpuBrand = 'La IA elige',
        ramGen = 'La IA elige',
        graphicsType = 'Tarjeta Gráfica',
        gpuBrand = 'La IA elige',
        storageType = 'La IA elige',
        peripherals = [],
    } = preferences

    // 1. CPU
    let cpuOptions = safe.filter(p => p.category.toLowerCase().includes('procesadores'))
    if (cpuBrand === 'AMD') {
        cpuOptions = cpuOptions.filter(p => p.name.toLowerCase().includes('ryzen') || p.name.toLowerCase().includes('amd'))
    } else if (cpuBrand === 'Intel') {
        cpuOptions = cpuOptions.filter(p => !p.name.toLowerCase().includes('ryzen') && !p.name.toLowerCase().includes('amd'))
    }
    if (budget > 8000) {
        cpuOptions.sort((a, b) => b.price - a.price)
    } else {
        cpuOptions.sort((a, b) => a.price - b.price)
    }
    const cpuSelected = cpuOptions.find(p => p.price <= budget * 0.25) || cpuOptions[0]
    if (cpuSelected) {
        build.push({ category: 'cpu', reason: 'Procesador equilibrado seleccionado por compatibilidad.', product: cpuSelected })
        remaining -= cpuSelected.price
    }

    // 2. GPU (if dedicated)
    const isAPU = graphicsType === 'Solo APU (Gráficos Integrados)'
    if (!isAPU) {
        let gpuOptions = safe.filter(p => p.category.toLowerCase().includes('video'))
        if (gpuBrand === 'NVIDIA GeForce RTX') {
            gpuOptions = gpuOptions.filter(p => p.name.toLowerCase().includes('rtx') || p.name.toLowerCase().includes('geforce'))
        } else if (gpuBrand === 'AMD Radeon RX') {
            gpuOptions = gpuOptions.filter(p => p.name.toLowerCase().includes('rx') || p.name.toLowerCase().includes('radeon'))
        }
        if (budget > 8000) {
            gpuOptions.sort((a, b) => b.price - a.price)
        } else {
            gpuOptions.sort((a, b) => a.price - b.price)
        }
        const gpuSelected = gpuOptions.find(p => p.price <= remaining * 0.5) || gpuOptions[0]
        if (gpuSelected && gpuSelected.price <= remaining) {
            build.push({ category: 'gpu', reason: 'Tarjeta de video para optimizar la potencia de procesamiento gráfico.', product: gpuSelected })
            remaining -= gpuSelected.price
        }
    }

    // 3. RAM
    let ramOptions = safe.filter(p => p.category.toLowerCase().includes('memorias ram'))
    if (ramGen === 'DDR4') {
        ramOptions = ramOptions.filter(p => p.name.toLowerCase().includes('ddr4'))
    } else if (ramGen === 'DDR5') {
        ramOptions = ramOptions.filter(p => p.name.toLowerCase().includes('ddr5'))
    }
    if (budget > 8000) {
        ramOptions.sort((a, b) => b.price - a.price)
    } else {
        ramOptions.sort((a, b) => a.price - b.price)
    }
    const ramSelected = ramOptions.find(p => p.price <= remaining) || ramOptions[0]
    if (ramSelected) {
        build.push({ category: 'ram', reason: 'Memoria RAM seleccionada por compatibilidad y velocidad.', product: ramSelected })
        remaining -= ramSelected.price
    }

    // 4. Motherboard
    let mbOptions = safe.filter(p => p.category.toLowerCase().includes('placas madre'))
    const platform = cpuSelected ? detectPlatform(cpuSelected.name) : 'amd'
    if (platform === 'amd') {
        mbOptions = mbOptions.filter(p => p.name.toLowerCase().includes('b650') || p.name.toLowerCase().includes('x670') || p.name.toLowerCase().includes('b550') || p.name.toLowerCase().includes('a520') || p.name.toLowerCase().includes('a620') || p.name.toLowerCase().includes('am5') || p.name.toLowerCase().includes('am4'))
    } else {
        mbOptions = mbOptions.filter(p => p.name.toLowerCase().includes('h610') || p.name.toLowerCase().includes('b760') || p.name.toLowerCase().includes('z790') || p.name.toLowerCase().includes('b660') || p.name.toLowerCase().includes('z690'))
    }
    const isDDR5 = ramSelected ? ramSelected.name.toLowerCase().includes('ddr5') : (ramGen === 'DDR5')
    if (isDDR5) {
        mbOptions = mbOptions.filter(p => p.name.toLowerCase().includes('ddr5') || !p.name.toLowerCase().includes('ddr4'))
    } else {
        mbOptions = mbOptions.filter(p => p.name.toLowerCase().includes('ddr4'))
    }
    if (budget > 8000) {
        mbOptions.sort((a, b) => b.price - a.price)
    } else {
        mbOptions.sort((a, b) => a.price - b.price)
    }
    const mbSelected = mbOptions.find(p => p.price <= remaining) || mbOptions[0]
    if (mbSelected) {
        build.push({ category: 'motherboard', reason: 'Placa madre compatible seleccionada.', product: mbSelected })
        remaining -= mbSelected.price
    }

    // 5. Storage
    let stOptions = safe.filter(p => p.category.toLowerCase().includes('almacenamiento'))
    if (storageType === 'NVMe SSD') {
        stOptions = stOptions.filter(p => p.name.toLowerCase().includes('nvme') || p.name.toLowerCase().includes('m.2'))
    } else if (storageType === 'SATA SSD') {
        stOptions = stOptions.filter(p => !p.name.toLowerCase().includes('nvme') && !p.name.toLowerCase().includes('m.2'))
    }
    if (budget > 8000) {
        stOptions.sort((a, b) => b.price - a.price)
    } else {
        stOptions.sort((a, b) => a.price - b.price)
    }
    const stSelected = stOptions.find(p => p.price <= remaining) || stOptions[0]
    if (stSelected) {
        build.push({ category: 'storage', reason: 'Almacenamiento compatible.', product: stSelected })
        remaining -= stSelected.price
    }

    // 6. PSU
    let psuOptions = safe.filter(p => p.category.toLowerCase().includes('fuentes de poder'))
    if (budget > 8000) {
        psuOptions.sort((a, b) => b.price - a.price)
    } else {
        psuOptions.sort((a, b) => a.price - b.price)
    }
    const psuSelected = psuOptions.find(p => p.price <= remaining) || psuOptions[0]
    if (psuSelected) {
        build.push({ category: 'psu', reason: 'Fuente de poder estable seleccionada.', product: psuSelected })
        remaining -= psuSelected.price
    }

    // 7. Case
    let caseOptions = safe.filter(p => p.category.toLowerCase().includes('cases & chasis'))
    let caseSelected: any = null
    if (specificCase && specificCase !== 'La IA elige') {
        caseSelected = caseOptions.find(p => p.name.toLowerCase().includes(specificCase.toLowerCase()))
    }
    if (!caseSelected) {
        if (budget > 8000) {
            caseOptions.sort((a, b) => b.price - a.price)
        } else {
            caseOptions.sort((a, b) => a.price - b.price)
        }
        caseSelected = caseOptions.find(p => p.price <= remaining) || caseOptions[0]
    }
    if (caseSelected) {
        build.push({ category: 'case', reason: 'Case para ensamble óptimo.', product: caseSelected })
        remaining -= caseSelected.price
    }

    // 8. Cooling
    let coolOptions = safe.filter(p => p.category.toLowerCase().includes('refrigeración'))
    if (cooling === 'Aire') {
        coolOptions = coolOptions.filter(p => !p.name.toLowerCase().includes('liquid') && !p.name.toLowerCase().includes('líquida') && !p.name.toLowerCase().includes('water'))
    } else if (cooling === 'Líquida') {
        coolOptions = coolOptions.filter(p => p.name.toLowerCase().includes('liquid') || p.name.toLowerCase().includes('líquida') || p.name.toLowerCase().includes('water'))
    }
    if (budget > 8000) {
        coolOptions.sort((a, b) => b.price - a.price)
    } else {
        coolOptions.sort((a, b) => a.price - b.price)
    }
    const coolSelected = coolOptions.find(p => p.price <= remaining) || coolOptions[0]
    if (coolSelected) {
        build.push({ category: 'cooling', reason: 'Refrigeración compatible.', product: coolSelected })
        remaining -= coolSelected.price
    }

    // 9. Peripherals
    for (const per of peripherals) {
        const targetCats = getCategoryForPeripheral(per)
        let perOptions = safe.filter(p =>
            targetCats.some(c => p.category.toLowerCase().includes(c))
        )
        perOptions = perOptions.filter(p => matchesPeripheralName(per, p.name))
        if (budget > 8000) {
            perOptions.sort((a, b) => b.price - a.price)
        } else {
            perOptions.sort((a, b) => a.price - b.price)
        }
        const perSelected = perOptions.find(p => p.price <= remaining) || perOptions[0]
        if (perSelected) {
            build.push({ category: perSelected.category, reason: `Periférico ${per} compatible.`, product: perSelected })
            remaining -= perSelected.price
        }
    }

    return { build, remaining }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient()

        const body = await req.json()
        const {
            budget,
            usage,
            level,
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

        const { data: products = [], error } = await supabase
            .from('products')
            .select('*')
            .gt('stock', 0)

        if (error) throw new Error(error.message)

        const safe = products ?? []

        // 🧠 IA DECIDE ESTRATEGIA EXCELENTE
        const prompt = `
Eres un experto en hardware de computadoras y ensamblaje de PCs de alto rendimiento.
Tu tarea es recomendar la mejor configuración de componentes y periféricos compatible, optimizando el presupuesto del usuario y respetando estrictamente todas sus preferencias.

PRESUPUESTO MÁXIMO DEL USUARIO: S/ ${budgetNum} Soles
USO PRINCIPAL: ${usage}
NIVEL DE EXPERIENCIA: ${level}

PREFERENCIAS DEL USUARIO:
1. Marca de Procesador (cpuBrand): ${cpuBrand || 'La IA elige'}. Si es "AMD", debes elegir un procesador AMD. Si es "Intel", debes elegir un procesador Intel.
2. Generación de RAM (ramGen): ${ramGen || 'La IA elige'}. Si es "DDR4", debes elegir RAM DDR4 y una placa madre compatible con DDR4. Si es "DDR5", debes elegir RAM DDR5 y una placa madre compatible con DDR5.
3. Tipo de Gráficos (graphicsType): ${graphicsType || 'Tarjeta Gráfica'}. Si es "Solo APU (Gráficos Integrados)", NO debes incluir ninguna tarjeta de video dedicada ("gpu"). En su lugar, elige un procesador que tenga gráficos integrados y asigna el resto del presupuesto a mejorar otros componentes (CPU, RAM, almacenamiento). Si es "Tarjeta Gráfica", DEBES incluir una tarjeta de video dedicada compatible.
4. Marca de Tarjeta de Video (gpuBrand): ${gpuBrand || 'La IA elige'}. Si es "NVIDIA GeForce RTX", solo debes elegir GPUs NVIDIA RTX. Si es "AMD Radeon RX", solo debes elegir GPUs AMD RX. (Ignora esto si se seleccionó "Solo APU").
5. Refrigeración (cooling): ${cooling || 'La IA elige'}. Si es "Aire", prioriza disipadores por aire. Si es "Líquida", prioriza refrigeración líquida.
6. Case (specificCase): ${specificCase || 'La IA elige'}. Si no es "La IA elige", intenta elegir exactamente ese case si está disponible en la lista de productos.
7. Tipo de Almacenamiento (storageType): ${storageType || 'La IA elige'}. Si es "NVMe SSD", prioriza almacenamiento M.2 NVMe de alta velocidad.
8. Periféricos Adicionales Solicitados: ${peripherals.length > 0 ? peripherals.join(', ') : 'Ninguno'}. DEBES incluir obligatoriamente un producto compatible de la lista de productos para cada uno de los periféricos seleccionados por el usuario. El precio de estos periféricos DEBE sumarse y caber dentro del presupuesto máximo.

LISTA DE PRODUCTOS DISPONIBLES EN STOCK (con IDs, nombres, categorías y precios):
${JSON.stringify(safe.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price })))}

INSTRUCCIONES CLAVE DE OPTIMIZACIÓN:
- Distribuya el presupuesto de forma inteligente para evitar cuellos de botella (bottlenecks). Para presupuestos altos (ej. S/ 8,000+ o S/ 12,000+), elige componentes de gama alta (CPUs potentes, GPUs RTX 4070/4080 o similares, placas TUF/ROG, RAMs veloces, SSDs rápidos de alta capacidad) y no te conformes con los componentes más baratos. ¡Aprovecha al máximo el presupuesto del usuario sin sobrepasarlo!
- Asegúrate de que las categorías recomendadas correspondan a los productos en stock:
  - "cpu": Procesadores
  - "gpu": Tarjetas de Video (No incluir si se seleccionó "Solo APU")
  - "ram": Memorias RAM
  - "motherboard": Placas Madre
  - "storage": Almacenamiento
  - "psu": Fuentes de Poder
  - "case": Cases & Chasis
  - "cooling": Refrigeración
  - Si el usuario solicitó periféricos en la lista, incluye una sugerencia para cada uno usando su nombre exacto en minúsculas como categoría (ej. "mouse", "teclado", "micrófono", "auriculares", "monitor").

Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura (sin explicaciones, sin markdown, solo el objeto JSON):
{
  "suggestions": [
    {
      "category": "cpu",
      "store_product_id": "id_del_producto",
      "reason": "Razón técnica detallada de por qué este producto es ideal para este presupuesto, uso y preferencias."
    },
    {
      "category": "gpu",
      "store_product_id": "id_del_producto",
      "reason": "Razón técnica..."
    }
  ],
  "summary": "Resumen general de la build explicando la potencia del ensamble y cómo se adapta al presupuesto.",
  "tips": [
    "Consejo de optimización 1",
    "Consejo de optimización 2"
  ]
}
`

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2000,
                    },
                }),
            }
        )

        const json = await res.json()
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text) {
            const fb = fallbackBuild(safe, budgetNum, body)
            return NextResponse.json({
                build: fb.build,
                total: fb.build.reduce((a, b) => a + b.product.price, 0),
                remainingBudget: fb.remaining,
                summary: 'Fallback automático',
                tips: [],
            })
        }

        let result: { suggestions?: Suggestion[]; summary?: string; tips?: string[] } = {}
        try {
            result = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
        } catch {
            result = { suggestions: [] }
        }

        let remaining = budgetNum
        const build: any[] = []

        const suggestions = result.suggestions || []
        const filledCategories = new Set<string>()

        // 1. Procesador (CPU)
        const cpuS = suggestions.find(s => s.category === 'cpu')
        let cpuProduct = safe.find(p => p.id === cpuS?.store_product_id)
        if (cpuProduct) {
            const isAMD = cpuProduct.name.toLowerCase().includes('ryzen') || cpuProduct.name.toLowerCase().includes('amd')
            if (cpuBrand === 'AMD' && !isAMD) cpuProduct = undefined
            if (cpuBrand === 'Intel' && isAMD) cpuProduct = undefined
        }
        if (!cpuProduct) {
            let cpuOptions = safe.filter(p => p.category.toLowerCase().includes('procesadores'))
            if (cpuBrand === 'AMD') {
                cpuOptions = cpuOptions.filter(p => p.name.toLowerCase().includes('ryzen') || p.name.toLowerCase().includes('amd'))
            } else if (cpuBrand === 'Intel') {
                cpuOptions = cpuOptions.filter(p => !p.name.toLowerCase().includes('ryzen') && !p.name.toLowerCase().includes('amd'))
            }
            if (budgetNum > 8000) {
                cpuOptions.sort((a, b) => b.price - a.price)
            } else {
                cpuOptions.sort((a, b) => a.price - b.price)
            }
            cpuProduct = cpuOptions.find(p => p.price <= budgetNum * 0.25) || cpuOptions[0]
        }
        if (cpuProduct) {
            build.push({
                category: 'cpu',
                reason: cpuS?.reason || 'Procesador potente seleccionado de forma inteligente.',
                product: cpuProduct
            })
            remaining -= cpuProduct.price
            filledCategories.add('cpu')
        }

        // 2. Tarjeta Gráfica (GPU) (si no es APU)
        const isAPU = graphicsType === 'Solo APU (Gráficos Integrados)'
        if (!isAPU) {
            const gpuS = suggestions.find(s => s.category === 'gpu')
            let gpuProduct = safe.find(p => p.id === gpuS?.store_product_id)
            if (gpuProduct) {
                const isNVIDIA = gpuProduct.name.toLowerCase().includes('rtx') || gpuProduct.name.toLowerCase().includes('geforce')
                const isAMD = gpuProduct.name.toLowerCase().includes('rx') || gpuProduct.name.toLowerCase().includes('radeon')
                if (gpuBrand === 'NVIDIA GeForce RTX' && !isNVIDIA) gpuProduct = undefined
                if (gpuBrand === 'AMD Radeon RX' && !isAMD) gpuProduct = undefined
            }
            if (!gpuProduct) {
                let gpuOptions = safe.filter(p => p.category.toLowerCase().includes('video'))
                if (gpuBrand === 'NVIDIA GeForce RTX') {
                    gpuOptions = gpuOptions.filter(p => p.name.toLowerCase().includes('rtx') || p.name.toLowerCase().includes('geforce'))
                } else if (gpuBrand === 'AMD Radeon RX') {
                    gpuOptions = gpuOptions.filter(p => p.name.toLowerCase().includes('rx') || p.name.toLowerCase().includes('radeon'))
                }
                if (budgetNum > 8000) {
                    gpuOptions.sort((a, b) => b.price - a.price)
                } else {
                    gpuOptions.sort((a, b) => a.price - b.price)
                }
                gpuProduct = gpuOptions.find(p => p.price <= remaining * 0.5) || gpuOptions[0]
            }
            if (gpuProduct && gpuProduct.price <= remaining) {
                build.push({
                    category: 'gpu',
                    reason: gpuS?.reason || 'Tarjeta de video de alta gama recomendada.',
                    product: gpuProduct
                })
                remaining -= gpuProduct.price
                filledCategories.add('gpu')
            }
        }

        // 3. Memorias RAM
        const ramS = suggestions.find(s => s.category === 'ram')
        let ramProduct = safe.find(p => p.id === ramS?.store_product_id)
        if (ramProduct) {
            const isDDR4 = ramProduct.name.toLowerCase().includes('ddr4')
            const isDDR5 = ramProduct.name.toLowerCase().includes('ddr5')
            if (ramGen === 'DDR4' && !isDDR4) ramProduct = undefined
            if (ramGen === 'DDR5' && !isDDR5) ramProduct = undefined
        }
        if (!ramProduct) {
            let ramOptions = safe.filter(p => p.category.toLowerCase().includes('memorias ram'))
            if (ramGen === 'DDR4') {
                ramOptions = ramOptions.filter(p => p.name.toLowerCase().includes('ddr4'))
            } else if (ramGen === 'DDR5') {
                ramOptions = ramOptions.filter(p => p.name.toLowerCase().includes('ddr5'))
            }
            if (budgetNum > 8000) {
                ramOptions.sort((a, b) => b.price - a.price)
            } else {
                ramOptions.sort((a, b) => a.price - b.price)
            }
            ramProduct = ramOptions.find(p => p.price <= remaining) || ramOptions[0]
        }
        if (ramProduct) {
            build.push({
                category: 'ram',
                reason: ramS?.reason || 'Memoria RAM de alto rendimiento para multitarea fluida.',
                product: ramProduct
            })
            remaining -= ramProduct.price
            filledCategories.add('ram')
        }

        // 4. Placa Madre (Motherboard) (con compatibilidad de plataforma y memoria)
        const mbS = suggestions.find(s => s.category === 'motherboard')
        let mbProduct = safe.find(p => p.id === mbS?.store_product_id)
        if (mbProduct) {
            const platform = cpuProduct ? detectPlatform(cpuProduct.name) : 'amd'
            const nameLower = mbProduct.name.toLowerCase()
            const isAMDPlat = nameLower.includes('b650') || nameLower.includes('x670') || nameLower.includes('b550') || nameLower.includes('a520') || nameLower.includes('a620') || nameLower.includes('am5') || nameLower.includes('am4')
            const isIntelPlat = nameLower.includes('h610') || nameLower.includes('b760') || nameLower.includes('z790') || nameLower.includes('b660') || nameLower.includes('z690')
            if (platform === 'amd' && !isAMDPlat) mbProduct = undefined
            if (platform === 'intel' && !isIntelPlat) mbProduct = undefined
            
            if (mbProduct) {
                const isDDR5 = ramProduct ? ramProduct.name.toLowerCase().includes('ddr5') : (ramGen === 'DDR5')
                const isMbDDR4 = nameLower.includes('ddr4')
                const isMbDDR5 = nameLower.includes('ddr5') || !isMbDDR4
                if (isDDR5 && isMbDDR4) mbProduct = undefined
                if (!isDDR5 && isMbDDR5) mbProduct = undefined
            }
        }
        if (!mbProduct) {
            let mbOptions = safe.filter(p => p.category.toLowerCase().includes('placas madre'))
            const platform = cpuProduct ? detectPlatform(cpuProduct.name) : 'amd'
            if (platform === 'amd') {
                mbOptions = mbOptions.filter(p => p.name.toLowerCase().includes('b650') || p.name.toLowerCase().includes('x670') || p.name.toLowerCase().includes('b550') || p.name.toLowerCase().includes('a520') || p.name.toLowerCase().includes('a620') || p.name.toLowerCase().includes('am5') || p.name.toLowerCase().includes('am4'))
            } else {
                mbOptions = mbOptions.filter(p => p.name.toLowerCase().includes('h610') || p.name.toLowerCase().includes('b760') || p.name.toLowerCase().includes('z790') || p.name.toLowerCase().includes('b660') || p.name.toLowerCase().includes('z690'))
            }
            const isDDR5 = ramProduct ? ramProduct.name.toLowerCase().includes('ddr5') : (ramGen === 'DDR5')
            if (isDDR5) {
                mbOptions = mbOptions.filter(p => p.name.toLowerCase().includes('ddr5') || !p.name.toLowerCase().includes('ddr4'))
            } else {
                mbOptions = mbOptions.filter(p => p.name.toLowerCase().includes('ddr4'))
            }
            if (budgetNum > 8000) {
                mbOptions.sort((a, b) => b.price - a.price)
            } else {
                mbOptions.sort((a, b) => a.price - b.price)
            }
            mbProduct = mbOptions.find(p => p.price <= remaining) || mbOptions[0]
        }
        if (mbProduct) {
            build.push({
                category: 'motherboard',
                reason: mbS?.reason || 'Placa madre robusta y compatible con la plataforma elegida.',
                product: mbProduct
            })
            remaining -= mbProduct.price
            filledCategories.add('motherboard')
        }

        // 5. Almacenamiento (Storage)
        const storageS = suggestions.find(s => s.category === 'storage')
        let storageProduct = safe.find(p => p.id === storageS?.store_product_id)
        if (storageProduct) {
            const isNVMe = storageProduct.name.toLowerCase().includes('nvme') || storageProduct.name.toLowerCase().includes('m.2')
            if (storageType === 'NVMe SSD' && !isNVMe) storageProduct = undefined
            if (storageType === 'SATA SSD' && isNVMe) storageProduct = undefined
        }
        if (!storageProduct) {
            let stOptions = safe.filter(p => p.category.toLowerCase().includes('almacenamiento'))
            if (storageType === 'NVMe SSD') {
                stOptions = stOptions.filter(p => p.name.toLowerCase().includes('nvme') || p.name.toLowerCase().includes('m.2'))
            } else if (storageType === 'SATA SSD') {
                stOptions = stOptions.filter(p => !p.name.toLowerCase().includes('nvme') && !p.name.toLowerCase().includes('m.2'))
            }
            if (budgetNum > 8000) {
                stOptions.sort((a, b) => b.price - a.price)
            } else {
                stOptions.sort((a, b) => a.price - b.price)
            }
            storageProduct = stOptions.find(p => p.price <= remaining) || stOptions[0]
        }
        if (storageProduct) {
            build.push({
                category: 'storage',
                reason: storageS?.reason || 'Unidad de almacenamiento rápida y estable.',
                product: storageProduct
            })
            remaining -= storageProduct.price
            filledCategories.add('storage')
        }

        // 6. Fuente de Poder (PSU)
        const psuS = suggestions.find(s => s.category === 'psu')
        let psuProduct = safe.find(p => p.id === psuS?.store_product_id)
        if (!psuProduct) {
            let psuOptions = safe.filter(p => p.category.toLowerCase().includes('fuentes de poder'))
            if (budgetNum > 8000) {
                psuOptions.sort((a, b) => b.price - a.price)
            } else {
                psuOptions.sort((a, b) => a.price - b.price)
            }
            psuProduct = psuOptions.find(p => p.price <= remaining) || psuOptions[0]
        }
        if (psuProduct) {
            build.push({
                category: 'psu',
                reason: psuS?.reason || 'Fuente de poder de alta eficiencia con protección eléctrica completa.',
                product: psuProduct
            })
            remaining -= psuProduct.price
            filledCategories.add('psu')
        }

        // 7. Case & Chasis
        const caseS = suggestions.find(s => s.category === 'case')
        let caseProduct = safe.find(p => p.id === caseS?.store_product_id)
        if (!caseProduct) {
            let caseOptions = safe.filter(p => p.category.toLowerCase().includes('cases & chasis'))
            if (specificCase && specificCase !== 'La IA elige') {
                const specificMatch = caseOptions.find(p => p.name.toLowerCase().includes(specificCase.toLowerCase()))
                if (specificMatch) caseProduct = specificMatch
            }
            if (!caseProduct) {
                if (budgetNum > 8000) {
                    caseOptions.sort((a, b) => b.price - a.price)
                } else {
                    caseOptions.sort((a, b) => a.price - b.price)
                }
                caseProduct = caseOptions.find(p => p.price <= remaining) || caseOptions[0]
            }
        }
        if (caseProduct) {
            build.push({
                category: 'case',
                reason: caseS?.reason || 'Chasis espacioso con excelente ventilación y estética prémium.',
                product: caseProduct
            })
            remaining -= caseProduct.price
            filledCategories.add('case')
        }

        // 8. Refrigeración (Cooling)
        const coolingS = suggestions.find(s => s.category === 'cooling')
        let coolingProduct = safe.find(p => p.id === coolingS?.store_product_id)
        if (coolingProduct) {
            const isLiquid = coolingProduct.name.toLowerCase().includes('liquid') || coolingProduct.name.toLowerCase().includes('líquida') || coolingProduct.name.toLowerCase().includes('water')
            if (cooling === 'Aire' && isLiquid) coolingProduct = undefined
            if (cooling === 'Líquida' && !isLiquid) coolingProduct = undefined
        }
        if (!coolingProduct) {
            let coolOptions = safe.filter(p => p.category.toLowerCase().includes('refrigeración'))
            if (cooling === 'Aire') {
                coolOptions = coolOptions.filter(p => !p.name.toLowerCase().includes('liquid') && !p.name.toLowerCase().includes('líquida') && !p.name.toLowerCase().includes('water'))
            } else if (cooling === 'Líquida') {
                coolOptions = coolOptions.filter(p => p.name.toLowerCase().includes('liquid') || p.name.toLowerCase().includes('líquida') || p.name.toLowerCase().includes('water'))
            }
            if (budgetNum > 8000) {
                coolOptions.sort((a, b) => b.price - a.price)
            } else {
                coolOptions.sort((a, b) => a.price - b.price)
            }
            coolingProduct = coolOptions.find(p => p.price <= remaining) || coolOptions[0]
        }
        if (coolingProduct) {
            build.push({
                category: 'cooling',
                reason: coolingS?.reason || 'Solución de refrigeración idónea para mantener bajas temperaturas.',
                product: coolingProduct
            })
            remaining -= coolingProduct.price
            filledCategories.add('cooling')
        }

        // 9. Periféricos Adicionales
        for (const per of peripherals) {
            const perS = suggestions.find(s => s.category.toLowerCase() === per.toLowerCase())
            let perProduct = safe.find(p => p.id === perS?.store_product_id)

            if (!perProduct) {
                const targetCats = getCategoryForPeripheral(per)
                let perOptions = safe.filter(p =>
                    targetCats.some(c => p.category.toLowerCase().includes(c))
                )
                perOptions = perOptions.filter(p => matchesPeripheralName(per, p.name))
                if (budgetNum > 8000) {
                    perOptions.sort((a, b) => b.price - a.price)
                } else {
                    perOptions.sort((a, b) => a.price - b.price)
                }
                perProduct = perOptions.find(p => p.price <= remaining) || perOptions[0]
            }

            if (perProduct) {
                build.push({
                    category: perProduct.category,
                    reason: perS?.reason || `Periférico de alta calidad tipo ${per} compatible con tu configuración.`,
                    product: perProduct
                })
                remaining -= perProduct.price
                filledCategories.add(per.toLowerCase())
            }
        }

        const total = build.reduce((a, b) => a + b.product.price, 0)

        return NextResponse.json({
            build,
            total,
            remainingBudget: remaining,
            summary: result.summary || 'Build optimizada con control de compatibilidad de alta calidad',
            tips: result.tips || [],
        })
    } catch (err) {
        return NextResponse.json(
            {
                error: 'PC Builder error',
                detail: err instanceof Error ? err.message : 'unknown',
            },
            { status: 500 }
        )
    }
}
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

// 🔥 fallback inteligente real
function fallbackBuild(products: any[], budget: number) {
    const safe = products ?? []
    let remaining = budget
    const build: any[] = []

    // orden de prioridad real
    for (const part of REQUIRED) {
        const cats = CATEGORY_MAP[part]

        const options = safe
            .filter(p =>
                cats?.some(c =>
                    normalize(p.category).includes(c)
                )
            )
            .sort((a, b) => a.price - b.price)

        const selected =
            options.find(p => p.price <= remaining) || options[0]

        if (selected) {
            build.push({
                category: part,
                reason: 'Fallback inteligente',
                product: selected,
            })

            remaining -= selected.price
        }
    }

    return { build, remaining }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient()

        const {
            budget,
            usage,
            level,
            cooling,
            peripherals = [],
        } = await req.json()

        const budgetNum = Number(budget)

        const { data: products = [], error } = await supabase
            .from('products')
            .select('*')
            .gt('stock', 0)

        if (error) throw new Error(error.message)

        const safe = products ?? []

        // 🧠 IA SOLO DECIDE ESTRATEGIA
        const prompt = `
Eres experto en hardware.

Reglas:
- NO inventes productos
- SOLO usa IDs del JSON
- Debes ser coherente con presupuesto
- Debes evitar incompatibilidades

Usuario:
- ${budgetNum}
- ${usage}
- ${level}

Productos:
${JSON.stringify(safe)}

Devuelve JSON:
{
  "suggestions":[
    {
      "category":"cpu",
      "store_product_id":"id",
      "reason":""
    }
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
                        maxOutputTokens: 1200,
                    },
                }),
            }
        )

        const json = await res.json()

        const text =
            json?.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text) {
            const fb = fallbackBuild(safe, budgetNum)

            return NextResponse.json({
                build: fb.build,
                total: fb.build.reduce(
                    (a, b) => a + b.product.price,
                    0
                ),
                remainingBudget: fb.remaining,
                summary: 'Fallback automático',
                tips: [],
            })
        }

        let result: { suggestions?: Suggestion[] } = {}

        try {
            result = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
        } catch {
            result = { suggestions: [] }
        }

        let remaining = budgetNum
        const build: any[] = []

        let cpu: any = null
        let gpu: any = null

        // 🔥 1. CPU primero
        const cpuS = result.suggestions?.find(s => s.category === 'cpu')
        cpu = safe.find(p => p.id === cpuS?.store_product_id)

        if (!cpu) {
            cpu = safe
                .filter(p =>
                    p.category.toLowerCase().includes('procesadores')
                )
                .sort((a, b) => a.price - b.price)[0]
        }

        if (cpu) {
            build.push({ category: 'cpu', product: cpu })
            remaining -= cpu.price
        }

        // 🔥 2. GPU con control de presupuesto
        const gpuS = result.suggestions?.find(s => s.category === 'gpu')
        gpu = safe.find(p => p.id === gpuS?.store_product_id)

        if (!gpu) {
            gpu = safe
                .filter(p =>
                    p.category.toLowerCase().includes('video')
                )
                .sort((a, b) => a.price - b.price)[0]
        }

        if (gpu && gpu.price <= remaining) {
            if (cpu && !isBalanced(cpu, gpu)) {
                gpu = safe
                    .filter(p =>
                        p.category.toLowerCase().includes('video')
                    )
                    .sort((a, b) => a.price - b.price)[0]
            }

            build.push({ category: 'gpu', product: gpu })
            remaining -= gpu.price
        }

        // 🔥 3. resto normal
        for (const part of ['ram', 'motherboard', 'storage', 'psu', 'case']) {
            const cats = CATEGORY_MAP[part]

            const product = safe
                .filter(p =>
                    cats?.some(c =>
                        p.category.toLowerCase().includes(c)
                    )
                )
                .sort((a, b) => a.price - b.price)
                .find(p => p.price <= remaining)

            if (product) {
                build.push({ category: part, product })
                remaining -= product.price
            }
        }

        // 🔥 4. periféricos
        for (const per of peripherals) {
            const match = safe
                .filter(p =>
                    p.category.toLowerCase().includes(per)
                )
                .find(p => p.price <= remaining)

            if (match) {
                build.push({ category: per, product: match })
                remaining -= match.price
            }
        }

        const total = build.reduce(
            (a, b) => a + b.product.price,
            0
        )

        return NextResponse.json({
            build,
            total,
            remainingBudget: remaining,
            summary: 'Build optimizada con control de compatibilidad',
            tips: [],
        })
    } catch (err) {
        return NextResponse.json(
            {
                error: 'PC Builder error',
                detail:
                    err instanceof Error
                        ? err.message
                        : 'unknown',
            },
            { status: 500 }
        )
    }
}
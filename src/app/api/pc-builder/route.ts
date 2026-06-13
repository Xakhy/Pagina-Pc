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
    // AM5: Ryzen 7000 series + Ryzen 8000G series
    // Catálogo: 7500F, 7600, 7800X3D, 7900X, 7950X3D, 8500G, 8600G, 8700G
    if (
        n.includes('7500f') || n.includes('7600') || n.includes('7700') ||
        n.includes('7800') || n.includes('7900') || n.includes('7950') ||
        n.includes('8500g') || n.includes('8600g') || n.includes('8700g')
    ) return 'am5'
    // AM4: Ryzen 4000/5000 series
    // Catálogo: 4500, 4600G, 5600G, 5700G
    // NOTA: '5600' matchea tanto '5600G' como lo haría '5600X' (no en catálogo),
    // pero es seguro porque todos los Ryzen 5600 disponibles son AM4.
    if (
        n.includes('4500') || n.includes('4600g') ||
        n.includes('5600g') || n.includes('5700g')
    ) return 'am4'
    return null
}

function getMBDDRType(mbName: string): 'DDR4' | 'DDR5' | null {
    const n = mbName.toLowerCase()
    // Explícito en el nombre — mayor prioridad
    if (n.includes('ddr4')) return 'DDR4'
    if (n.includes('ddr5')) return 'DDR5'
    // Catálogo: placas AM4 son siempre DDR4
    if (n.includes('a520') || n.includes('b450') || n.includes('b550')) return 'DDR4'
    // Catálogo: placas AM5 son siempre DDR5
    if (n.includes('b650') || n.includes('a620') || n.includes('x670')) return 'DDR5'
    // Catálogo Intel: ASUS TUF Gaming B760-Plus WiFi (sin sufijo DDR → DDR5 por defecto para esa placa)
    // ASRock B760 Pro RS DDR5 → detectado por nombre
    // Gigabyte B760M DS3H AX DDR4 → detectado por nombre
    // MSI MAG B760 Tomahawk WiFi DDR5 → detectado por nombre
    // ASUS ROG Maximus Z790 Hero → Z790 es DDR5
    if (n.includes('z790')) return 'DDR5'
    // H610 → solo existe "ASUS Prime H610M-E DDR4" en catálogo → DDR4
    if (n.includes('h610')) return 'DDR4'
    return null
}

/**
 * CPUs con iGPU real (APU) según catálogo exacto:
 * - AMD Ryzen 5 4600G, AMD Ryzen 5 5600G, AMD Ryzen 5 8500G, AMD Ryzen 5 8600G
 * - AMD Ryzen 7 5700G, AMD Ryzen 7 8700G
 * EXCLUIDOS: AMD Ryzen 5 4500 (NO tiene iGPU)
 */
function isRealAPU(cpuName: string): boolean {
    const n = cpuName.toLowerCase()
    return (
        n.includes('8500g') || n.includes('8600g') || n.includes('8700g') ||
        n.includes('5600g') || n.includes('5700g') ||
        n.includes('4600g')
        // 4500 excluido intencionalmente (sin iGPU)
    )
}

// ── Category Filters ──────────────────────────────────────────────────────────

function isCPU(p: any, brand?: string, apuOnly = false, excludeAPU = false): boolean {
    if (!p.category.toLowerCase().includes('procesadores')) return false
    if (apuOnly && !isRealAPU(p.name)) return false
    if (excludeAPU && isRealAPU(p.name)) return false
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


function isStorage(p: any, type?: string): boolean {
    if (!p.category.toLowerCase().includes('almacenamiento')) return false
    if (!type || type === 'La IA elige') return true
    const n = p.name.toLowerCase()
    // Catálogo NVMe: Crucial P3, P3 Plus, T500, Kingston NV2, TeamGroup MP44L, WD Black SN850X
    const isNVMe = n.includes('nvme') || n.includes('m.2') || n.includes('pcie')
    if (type === 'NVMe SSD') return isNVMe
    // Catálogo SATA: Crucial BX500 (2.5), Kingston A400 (2.5), Seagate Barracuda (3.5 HDD)
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

/**
 * Filtra refrigeración según preferencia del usuario.
 * Catálogo líquida: Antarctic Liquid Freezer III 360, Antec Symphony 240 ARGB,
 *   Corsair iCUE H150i RGB Elite 360mm, DeepCool LE520 240mm ARGB, NZXT Kraken Elite 360 RGB Black
 * Catálogo aire: Cooler Master Hyper 212 Halo Black, DeepCool AG400 ARGB, Noctua NH-D15 chromax.black
 */
function isCooling(p: any, pref?: string): boolean {
    const c = p.category.toLowerCase()
    if (!c.includes('refriger')) return false
    if (!pref || pref === 'La IA elige') return true
    const n = p.name.toLowerCase()
    // Detectar líquida por términos reales en el catálogo
    const isLiquid =
        n.includes('liquid') ||   // Liquid Freezer
        n.includes('kraken') ||   // NZXT Kraken
        n.includes('h150i') ||    // Corsair iCUE H150i
        n.includes('le520') ||    // DeepCool LE520
        n.includes('symphony') || // Antec Symphony (AIO 240)
        /\b(240|280|360)\b/.test(n) // Dimensiones de radiador → AIO
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

/**
 * Mapea nombre de periférico a categorías de producto en Supabase.
 * NOTA: El catálogo actual no tiene periféricos (mouse, teclado, monitor, etc.)
 * Esta función queda correcta para cuando se agreguen al inventario.
 */
function getCategoryForPeripheral(per: string): string[] {
    const p = per.toLowerCase()
    if ((p.includes('mouse') || p.includes('ratón')) && !p.includes('pad')) return ['mouse gaming']
    if (p.includes('teclado') || p.includes('keyboard') || p.includes('teclados')) return ['teclados']
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

// ── Rule Helpers & Classifications ──────────────────────────────────────────────

function getCPUTier(name: string): 'low' | 'mid' | 'high' {
    const n = name.toLowerCase()
    if (n.includes('i7') || n.includes('i9') || n.includes('7900') || n.includes('7950') || n.includes('7800x3d')) return 'high'
    if (n.includes('i3') || n.includes('4500') || n.includes('12100') || n.includes('13100')) return 'low'
    return 'mid'
}

function getGPUTier(name: string): 'low' | 'mid' | 'high' {
    const n = name.toLowerCase()
    if (n.includes('4070 ti') || n.includes('4080') || n.includes('7900')) return 'high'
    if (n.includes('1650') || n.includes('a380') || n.includes('6600')) return 'low'
    return 'mid'
}

function getMBTier(name: string): 'low' | 'mid_high' {
    const n = name.toLowerCase()
    if (n.includes('a520') || n.includes('h610')) return 'low'
    return 'mid_high'
}

function getCPUTDP(name: string): number {
    const n = name.toLowerCase()
    if (n.includes('14900')) return 253
    if (n.includes('13700') || n.includes('14700')) return 125
    if (n.includes('12600') || n.includes('13600')) return 125
    if (n.includes('7900') || n.includes('7950')) return 170
    if (n.includes('7800x3d')) return 120
    if (n.includes('12100') || n.includes('13100')) return 60
    return 65
}

function getGPUTDP(name: string): number {
    const n = name.toLowerCase()
    if (n.includes('4080')) return 320
    if (n.includes('7900')) return 355
    if (n.includes('4070 ti')) return 285
    if (n.includes('4070')) return 200
    if (n.includes('7700')) return 245
    if (n.includes('4060')) return 115
    if (n.includes('6600')) return 130
    if (n.includes('1650') || n.includes('a380')) return 75
    return 150
}

interface ValidationResult {
    valid: boolean
    reasons: string[]
}

function validateBuild(build: { category: string; product: any }[]): ValidationResult {
    const reasons: string[] = []
    const cpu = build.find(b => b.category === 'cpu')?.product
    const gpu = build.find(b => b.category === 'gpu')?.product
    const ram = build.find(b => b.category === 'ram')?.product
    const mb = build.find(b => b.category === 'motherboard')?.product
    const psu = build.find(b => b.category === 'psu')?.product

    // ── REGLA 1: COMPATIBILIDAD ABSOLUTA ──
    if (cpu && mb) {
        const cpuPlatform = detectPlatform(cpu.name)
        const mbNameLower = mb.name.toLowerCase()

        const mbIsAMD = mbNameLower.includes('b650') || mbNameLower.includes('a620') || mbNameLower.includes('x670') ||
                        mbNameLower.includes('b550') || mbNameLower.includes('a520') || mbNameLower.includes('b450')
        const mbIsIntel = mbNameLower.includes('h610') || mbNameLower.includes('b760') || mbNameLower.includes('z790')

        if (cpuPlatform === 'amd' && mbIsIntel) {
            reasons.push('Incompatibilidad de plataforma: Procesador AMD con placa Intel.')
        }
        if (cpuPlatform === 'intel' && mbIsAMD) {
            reasons.push('Incompatibilidad de plataforma: Procesador Intel con placa AMD.')
        }

        const cpuSocket = detectAMDSocket(cpu.name)
        if (cpuSocket === 'am5') {
            const isAM5Mb = mbNameLower.includes('b650') || mbNameLower.includes('a620') || mbNameLower.includes('x670')
            if (!isAM5Mb) {
                reasons.push('Incompatibilidad de socket: Procesador AM5 (Ryzen 7000/8000G) requiere placa AM5 (B650/A620/X670).')
            }
        }
        if (cpuSocket === 'am4') {
            const isAM4Mb = mbNameLower.includes('a520') || mbNameLower.includes('b450') || mbNameLower.includes('b550')
            if (!isAM4Mb) {
                reasons.push('Incompatibilidad de socket: Procesador AM4 (Ryzen 4000/5000) requiere placa AM4 (A520/B450/B550).')
            }
        }
    }

    if (ram && mb) {
        const ramNameLower = ram.name.toLowerCase()
        const ramIsDDR5 = ramNameLower.includes('ddr5')
        const ramIsDDR4 = ramNameLower.includes('ddr4')
        const mbDDR = getMBDDRType(mb.name)

        if (mbDDR === 'DDR5' && ramIsDDR4) {
            reasons.push('Incompatibilidad de memoria: Placa DDR5 con memoria RAM DDR4.')
        }
        if (mbDDR === 'DDR4' && ramIsDDR5) {
            reasons.push('Incompatibilidad de memoria: Placa DDR4 con memoria RAM DDR5.')
        }
    }

    if (cpu && ram) {
        const cpuSocket = detectAMDSocket(cpu.name)
        const ramNameLower = ram.name.toLowerCase()
        const ramIsDDR5 = ramNameLower.includes('ddr5')
        const ramIsDDR4 = ramNameLower.includes('ddr4')

        if (cpuSocket === 'am5' && ramIsDDR4) {
            reasons.push('Incompatibilidad de memoria: Procesador AM5 requiere memoria RAM DDR5 obligatorio.')
        }
        if (cpuSocket === 'am4' && ramIsDDR5) {
            reasons.push('Incompatibilidad de memoria: Procesador AM4 requiere memoria RAM DDR4 obligatorio.')
        }
    }

    // ── REGLA 3: DETECCIÓN DE CUELLO DE BOTELLA ──
    if (cpu && gpu) {
        const cpuTier = getCPUTier(cpu.name)
        const gpuTier = getGPUTier(gpu.name)

        if (cpuTier === 'low' && gpuTier === 'high') {
            reasons.push(`Cuello de botella: Procesador de gama baja (${cpu.name}) con tarjeta gráfica de gama alta (${gpu.name}).`)
        }
        if (gpuTier === 'low' && cpuTier === 'high') {
            reasons.push(`Build desbalanceada: Tarjeta gráfica de gama baja (${gpu.name}) con procesador de alta gama (${cpu.name}).`)
        }
    }

    if (gpu && ram) {
        const ramNameLower = ram.name.toLowerCase()
        const is8GB = ramNameLower.includes('8gb') && !ramNameLower.includes('2x8gb') && !ramNameLower.includes('16gb') && !ramNameLower.includes('32gb')
        const gpuNameLower = gpu.name.toLowerCase()
        const gpuHas12GBOrMore = gpuNameLower.includes('12gb') || gpuNameLower.includes('16gb') || gpuNameLower.includes('24gb') || gpuNameLower.includes('4070') || gpuNameLower.includes('4080') || gpuNameLower.includes('7900') || gpuNameLower.includes('7700')

        if (is8GB && gpuHas12GBOrMore) {
            reasons.push('Memoria insuficiente: RAM de 8GB con tarjeta gráfica de 12GB o más. Se requiere mínimo 16GB.')
        }
    }

    if (cpu && mb) {
        const cpuTier = getCPUTier(cpu.name)
        const mbTier = getMBTier(mb.name)

        if (mbTier === 'low' && cpuTier === 'high') {
            reasons.push(`Placa madre insuficiente: Placa de gama muy baja (${mb.name}) con procesador de alta gama (${cpu.name}).`)
        }
    }

    if (cpu && psu) {
        const cpuTDP = getCPUTDP(cpu.name)
        const gpuTDP = gpu ? getGPUTDP(gpu.name) : 0
        const systemConsumption = cpuTDP + gpuTDP + 50

        const psuNameLower = psu.name.toLowerCase()
        const psuWattsMatch = psuNameLower.match(/(\d+)w/)
        const psuWatts = psuWattsMatch ? parseInt(psuWattsMatch[1]) : 500

        if (psuWatts < systemConsumption + 100) {
            reasons.push(`Fuente de poder insuficiente: Fuente de ${psuWatts}W no ofrece el margen de 100W sobre el consumo estimado (${systemConsumption}W).`)
        }
    }

    return {
        valid: reasons.length === 0,
        reasons
    }
}

function getTargetBudgets(budget: number, usage: string, isAPU: boolean): Record<string, { min: number, max: number }> {
    const targets: Record<string, { min: number, max: number }> = {}
    if (!isAPU && usage === 'Gaming') {
        targets.cpu = { min: budget * 0.18, max: budget * 0.27 }
        targets.gpu = { min: budget * 0.32, max: budget * 0.48 }
        targets.ram = { min: budget * 0.07, max: budget * 0.12 }
        targets.motherboard = { min: budget * 0.07, max: budget * 0.12 }
        targets.storage = { min: budget * 0.05, max: budget * 0.09 }
        targets.psu = { min: budget * 0.05, max: budget * 0.09 }
    } else if (isAPU) {
        targets.cpu = { min: budget * 0.28, max: budget * 0.42 }
        targets.ram = { min: budget * 0.10, max: budget * 0.17 }
        targets.motherboard = { min: budget * 0.10, max: budget * 0.17 }
        targets.storage = { min: budget * 0.07, max: budget * 0.11 }
        targets.psu = { min: budget * 0.07, max: budget * 0.11 }
        targets.gpu = { min: 0, max: 0 }
    } else {
        targets.cpu = { min: budget * 0.22, max: budget * 0.33 }
        targets.ram = { min: budget * 0.13, max: budget * 0.22 }
        targets.storage = { min: budget * 0.10, max: budget * 0.17 }
        targets.motherboard = { min: budget * 0.08, max: budget * 0.14 }
        targets.gpu = { min: 0, max: budget * 0.25 }
        targets.psu = { min: budget * 0.05, max: budget * 0.09 }
    }
    return targets
}

interface SolvedBuild {
    cpu: any
    gpu: any | null
    ram: any
    motherboard: any
    storage: any
    psu: any
    case: any
    cooling: any
    pcCost: number
}

function solveOptimalBuild(
    stock: any[],
    budget: number,
    usage: string,
    isAPU: boolean,
    cpuBrand: string,
    gpuBrand: string,
    ramGen: string,
    storageType: string,
    cooling: string,
    specificCase: string,
    peripherals: string[],
    totalPerMin: number
): SolvedBuild | null {
    const pcBudget = budget - totalPerMin

    // When a dedicated GPU is included, prefer non-APU CPUs.
    // Only fall back to APUs if no non-APU CPU exists in the catalog.
    let cpus: any[]
    if (isAPU) {
        cpus = stock.filter(p => isCPU(p, cpuBrand, true))
    } else {
        const nonApuCpus = stock.filter(p => isCPU(p, cpuBrand, false, true))
        cpus = nonApuCpus.length > 0 ? nonApuCpus : stock.filter(p => isCPU(p, cpuBrand, false, false))
    }
    const gpus = isAPU ? [{ id: 'none', name: 'APU', price: 0, category: 'Tarjetas de Video' }] : stock.filter(p => isGPU(p, gpuBrand))
    const rams = stock.filter(p => isRAM(p, ramGen))
    const mbs = stock.filter(p => p.category.toLowerCase().includes('placas madre'))
    const storages = stock.filter(p => isStorage(p, storageType))
    const psus = stock.filter(p => isPSU(p))
    const cases = stock.filter(p => isCase(p))
    const coolings = stock.filter(p => isCooling(p, cooling))

    let filteredCases = cases
    if (specificCase && specificCase !== 'La IA elige') {
        const words = specificCase.toLowerCase().split(' ')
        const match = cases.filter(p => words.every(w => p.name.toLowerCase().includes(w)))
        if (match.length > 0) filteredCases = match
    }

    const targets = getTargetBudgets(pcBudget, usage, isAPU)

    const getCandidates = (items: any[], targetMin: number, targetMax: number, limit = 5) => {
        return [...items]
            .map(item => {
                const p = Number(item.price)
                let dist = 0
                if (p < targetMin) dist = targetMin - p
                else if (p > targetMax) dist = p - targetMax
                return { item, dist }
            })
            .sort((a, b) => a.dist - b.dist)
            .slice(0, limit)
            .map(x => x.item)
    }

    const cpuCandidates = getCandidates(cpus, targets.cpu.min, targets.cpu.max, 5)
    const gpuCandidates = getCandidates(gpus, targets.gpu.min, targets.gpu.max, 5)

    let bestBuild: SolvedBuild | null = null
    let bestScore = -Infinity

    for (const cpu of cpuCandidates) {
        for (const gpu of gpuCandidates) {
            const cpuTier = getCPUTier(cpu.name)
            const gpuTier = gpu.id === 'none' ? 'low' : getGPUTier(gpu.name)
            if (cpuTier === 'low' && gpuTier === 'high') continue
            if (gpuTier === 'low' && cpuTier === 'high') continue

            const cpuSocket = detectAMDSocket(cpu.name)
            const cpuPlatform = detectPlatform(cpu.name)

            const mbOpts = mbs.filter(mb => {
                const nl = mb.name.toLowerCase()
                if (cpuPlatform === 'amd') {
                    const isAMDMb = nl.includes('b650') || nl.includes('a620') || nl.includes('x670') ||
                                    nl.includes('b550') || nl.includes('a520') || nl.includes('b450')
                    if (!isAMDMb) return false
                    if (cpuSocket === 'am5' && !nl.includes('b650') && !nl.includes('a620') && !nl.includes('x670')) return false
                    if (cpuSocket === 'am4' && !nl.includes('a520') && !nl.includes('b450') && !nl.includes('b550')) return false
                } else {
                    const isIntelMb = nl.includes('h610') || nl.includes('b760') || nl.includes('z790')
                    if (!isIntelMb) return false
                }
                if (getMBTier(mb.name) === 'low' && cpuTier === 'high') return false
                return true
            })
            const mbCandidates = getCandidates(mbOpts, targets.motherboard.min, targets.motherboard.max, 5)

            for (const mb of mbCandidates) {
                const mbDDR = getMBDDRType(mb.name)
                const ramOpts = rams.filter(ram => {
                    const ramNameLower = ram.name.toLowerCase()
                    const ramIsDDR5 = ramNameLower.includes('ddr5')
                    const ramIsDDR4 = ramNameLower.includes('ddr4')
                    
                    if (mbDDR === 'DDR5' && !ramIsDDR5) return false
                    if (mbDDR === 'DDR4' && !ramIsDDR4) return false
                    if (cpuSocket === 'am5' && !ramIsDDR5) return false
                    if (cpuSocket === 'am4' && !ramIsDDR4) return false

                    const is8GB = ramNameLower.includes('8gb') && !ramNameLower.includes('2x8gb') && !ramNameLower.includes('16gb') && !ramNameLower.includes('32gb')
                    const gpuNameLower = gpu.name.toLowerCase()
                    const gpuHas12GBOrMore = gpuNameLower.includes('12gb') || gpuNameLower.includes('16gb') || gpuNameLower.includes('24gb') || gpuNameLower.includes('4070') || gpuNameLower.includes('4080') || gpuNameLower.includes('7900') || gpuNameLower.includes('7700')
                    if (is8GB && gpuHas12GBOrMore) return false

                    return true
                })
                const ramCandidates = getCandidates(ramOpts, targets.ram.min, targets.ram.max, 5)

                for (const ram of ramCandidates) {
                    const storageCandidates = getCandidates(storages, targets.storage.min, targets.storage.max, 4)

                    for (const ssd of storageCandidates) {
                        const cpuTDP = getCPUTDP(cpu.name)
                        const gpuTDP = gpu.id === 'none' ? 0 : getGPUTDP(gpu.name)
                        const systemConsumption = cpuTDP + gpuTDP + 50

                        const psuOptsFiltered = psus.filter(psu => {
                            const psuNameLower = psu.name.toLowerCase()
                            const psuWattsMatch = psuNameLower.match(/(\d+)w/)
                            const psuWatts = psuWattsMatch ? parseInt(psuWattsMatch[1]) : 500
                            return psuWatts >= systemConsumption + 100
                        })
                        const psuCandidates = getCandidates(psuOptsFiltered, targets.psu.min, targets.psu.max, 4)

                        for (const psu of psuCandidates) {
                            const caseCandidates = getCandidates(filteredCases, 150, 350, 3)
                            for (const cs of caseCandidates) {
                                const coolingCandidates = getCandidates(coolings, 100, 250, 3)
                                for (const cool of coolingCandidates) {
                                    const pcCost = Number(cpu.price) + (gpu.id === 'none' ? 0 : Number(gpu.price)) +
                                                   Number(ram.price) + Number(mb.price) + Number(ssd.price) +
                                                   Number(psu.price) + Number(cs.price) + Number(cool.price)

                                    if (pcCost > pcBudget) continue

                                    let deviationScore = 0
                                    const checkDev = (price: number, min: number, max: number) => {
                                        if (price < min) return (min - price) / min
                                        if (price > max) return (price - max) / max
                                        return 0
                                    }

                                    deviationScore += checkDev(Number(cpu.price), targets.cpu.min, targets.cpu.max)
                                    if (gpu.id !== 'none') {
                                        deviationScore += checkDev(Number(gpu.price), targets.gpu.min, targets.gpu.max)
                                    }
                                    deviationScore += checkDev(Number(ram.price), targets.ram.min, targets.ram.max)
                                    deviationScore += checkDev(Number(mb.price), targets.motherboard.min, targets.motherboard.max)
                                    deviationScore += checkDev(Number(ssd.price), targets.storage.min, targets.storage.max)
                                    deviationScore += checkDev(Number(psu.price), targets.psu.min, targets.psu.max)

                                    const valueScore = pcCost / pcBudget
                                    const finalScore = -deviationScore * 5 + valueScore

                                    if (finalScore > bestScore) {
                                        bestScore = finalScore
                                        bestBuild = {
                                            cpu,
                                            gpu: gpu.id === 'none' ? null : gpu,
                                            ram,
                                            motherboard: mb,
                                            storage: ssd,
                                            psu,
                                            case: cs,
                                            cooling: cool,
                                            pcCost
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return bestBuild
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

        const preferHighEnd = budgetNum >= 2500

        // ── Cargar stock ─────────────────────────────────────────────────
        const { data: products = [], error: dbErr } = await supabase
            .from('products')
            .select('*')
            .gt('stock', 0)
        if (dbErr) throw new Error(dbErr.message)
        const stock = (products ?? []) as any[]

        // ── Pre-filtrar por categoría comunes ─────────────────────────────
        const allRamOpts = stock.filter(p => isRAM(p))
        const allMbOpts = stock.filter(p => p.category.toLowerCase().includes('placas madre'))
        const stOpts = stock.filter(p => isStorage(p, storageType))
        const psuOpts = stock.filter(p => isPSU(p))
        const caseOpts = stock.filter(p => isCase(p))
        const coolOpts = stock.filter(p => isCooling(p, cooling))

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
            return n.includes('h610') || n.includes('b760') || n.includes('z790')
        }))

        // Tomamos la combinacion MB+RAM MAS BARATA posible
        const mbRamCombos = [
            (minMB_AM4 > 0 && minRAM_DDR4 > 0) ? (minMB_AM4 + minRAM_DDR4) : 99999,
            (minMB_AM5 > 0 && minRAM_DDR5 > 0) ? (minMB_AM5 + minRAM_DDR5) : 99999,
            (minMB_Intel > 0) ? (minMB_Intel + Math.min(minRAM_DDR4 || 99999, minRAM_DDR5 || 99999)) : 99999,
        ]
        const minMbRamReserve = Math.min(...mbRamCombos)

        // ── Reservas minimas de perifericos ──────────────────────────────
        const perMins: number[] = peripherals.map((per: string) => {
            const cats = getCategoryForPeripheral(per)
            const opts = stock
                .filter((p: any) => cats.some(c => p.category.toLowerCase().includes(c)))
                .filter((p: any) => matchesPeripheralCategory(per, p.name))
            return minPrice(opts)
        })
        const totalPerMin = perMins.reduce((a: number, b: number) => a + b, 0)

        // ── Decisión APU / GPU ───────────────────────────────────────────
        let isAPU: boolean
        if (graphicsType === 'Solo APU (Gráficos Integrados)' || graphicsType === 'Solo APU') {
            isAPU = true
        } else if (graphicsType === 'Tarjeta Gráfica') {
            isAPU = false
        } else {
            // "La IA elige"
            // Calculamos el costo mínimo de una CPU no-APU y una tarjeta gráfica dedicada
            const cpusNonAPU = stock.filter(p => isCPU(p, cpuBrand, false, true))
            const minCPU_nonAPU = cpusNonAPU.length > 0 ? minPrice(cpusNonAPU) : 99999
            const gpuOptsForDecision = stock.filter(p => isGPU(p, gpuBrand))
            const minGPU_ded = gpuOptsForDecision.length > 0 ? minPrice(gpuOptsForDecision) : 99999
            
            const gpuCoreMin = minCPU_nonAPU + minGPU_ded + minMbRamReserve + minST + minPSU + minCase + minCool
            
            // Si el costo mínimo de una GPU dedicada + periféricos supera el presupuesto,
            // o si el presupuesto es bajo (< 2000) o es para Estudio, elegimos APU.
            if ((gpuCoreMin + totalPerMin) * 0.97 > budgetNum || budgetNum < 2000 || usage === 'Estudio') {
                isAPU = true
            } else {
                isAPU = false
            }
        }

        // ── Filtrar CPU y GPU según la decisión final de APU ─────────────
        let cpuOpts: any[]
        if (isAPU) {
            cpuOpts = stock.filter(p => isCPU(p, cpuBrand, true))
        } else {
            const nonApuCpus = stock.filter(p => isCPU(p, cpuBrand, false, true))
            cpuOpts = nonApuCpus.length > 0 ? nonApuCpus : stock.filter(p => isCPU(p, cpuBrand, false, false))
        }
        const gpuOpts = isAPU ? [] : stock.filter(p => isGPU(p, gpuBrand))
        const minGPU = isAPU ? 0 : minPrice(gpuOpts)

        // ── Verificacion de factibilidad ──────────────────────────────────
        const minCPU = minPrice(cpuOpts)
        const coreMin = minCPU + minGPU + minMbRamReserve + minST + minPSU + minCase + minCool
        
        // Incluimos los periféricos en la factibilidad early check
        if (!minCPU || (coreMin + totalPerMin) * 0.97 > budgetNum) {
            const displayMin = Math.ceil((coreMin + totalPerMin) / 50) * 50
            return NextResponse.json({
                error: `Presupuesto insuficiente para una PC completa con las preferencias seleccionadas. Minimo estimado: S/ ${displayMin}.`
            }, { status: 400 })
        }

        // ── Sugerencias de Gemini AI ──────────────────────────────────────
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

REGLAS DE COMPATIBILIDAD ABSOLUTA (Regla 1 - Obligatorio):
1. AM5: Ryzen 7000 no-G (7500F, 7600, 7800X3D, 7900X, 7950X3D) y Ryzen 8000G (8500G, 8600G, 8700G) requieren socket AM5 (placa B650/A620/X670) y RAM DDR5 obligatorio.
2. AM4: Ryzen 4000/5000G (5600G, 5700G, 4600G) y Ryzen 5 4500 requieren socket AM4 (placa A520/B450/B550) y RAM DDR4 obligatorio.
3. Intel: Core 12/13/14 gen requieren socket LGA1700 (placa H610/B760/Z790) y memoria DDR4 o DDR5 según la placa elegida.
4. Placas DDR4 usan RAM DDR4; Placas DDR5 usan RAM DDR5.
5. PROHIBIDO mezclar CPU AMD con placa Intel, CPU Intel con placa AMD, DDR5 con placa DDR4, DDR4 con placa DDR5, CPU AM5 con placa AM4, CPU AM4 con placa AM5.

REGLAS DE BALANCE DE PRESUPUESTO (Regla 2 - Proporciones):
Intenta aproximar los costos a estas proporciones según el uso:
- Gaming con GPU dedicada: CPU 20–25% · GPU 35–45% · RAM 8–10% · Placa 8–10% · Almacenamiento 6–8% · PSU 6–8% · Case+Cooling restante
- APU / sin GPU: CPU 30–40% · RAM 12–15% · Placa 12–15% · Almacenamiento 8–10% · PSU 8–10% · Case+Cooling restante
- Estudio/Trabajo: CPU 25–30% · RAM 15–20% · Almacenamiento 12–15% · Placa 10–12% · GPU opcional · PSU+Case+Cooling restante

REGLAS DE CUELLO DE BOTELLA (Regla 3 - Evitar/Prohibir):
- NO emparejar CPU de gama baja (i3, Ryzen 3, Ryzen 5 4500, i3-12100F, i3-13100F) con GPU de gama alta (RTX 4070 Ti o superior, RX 7900 o superior).
- NO emparejar GPU de gama baja (GTX 1650, Arc A380, RX 6600) con CPU de gama alta (i7, i9, Ryzen 9, Ryzen 7 7800X3D).
- NO usar RAM de 8GB si la GPU tiene 12GB o más (usar mínimo 16GB).
- La PSU debe tener un margen de al menos 100W sobre el consumo estimado (CPU TDP + GPU TDP + 50W).
- NO emparejar placa madre de gama muy baja (A520, H610) con CPU de alta gama (i7, i9, Ryzen 9, Ryzen 7 7800X3D).

COMPONENTES OBLIGATORIOS: cpu, ram, motherboard, storage, psu, case, cooling${!isAPU ? ', gpu' : ''}

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
            // Fall through to solver
        }

        // ── Validación de Selección de IA ─────────────────────────
        const build: { category: string; product: any }[] = []
        let aiValid = false

        if (aiSuggestions.length > 0) {
            const tempBuild: { category: string; product: any }[] = []
            
            const cpu = stock.find(p => p.id === aiSuggestions.find(s => s.category === 'cpu')?.store_product_id)
            const gpu = isAPU ? null : stock.find(p => p.id === aiSuggestions.find(s => s.category === 'gpu')?.store_product_id)
            const ram = stock.find(p => p.id === aiSuggestions.find(s => s.category === 'ram')?.store_product_id)
            const mb = stock.find(p => p.id === aiSuggestions.find(s => s.category === 'motherboard')?.store_product_id)
            const ssd = stock.find(p => p.id === aiSuggestions.find(s => s.category === 'storage')?.store_product_id)
            const psu = stock.find(p => p.id === aiSuggestions.find(s => s.category === 'psu')?.store_product_id)
            const cs = stock.find(p => p.id === aiSuggestions.find(s => s.category === 'case')?.store_product_id)
            const cool = stock.find(p => p.id === aiSuggestions.find(s => s.category === 'cooling')?.store_product_id)

            if (cpu && ram && mb && ssd && psu && cs && cool && (isAPU || gpu)) {
                tempBuild.push({ category: 'cpu', product: cpu })
                if (gpu) tempBuild.push({ category: 'gpu', product: gpu })
                tempBuild.push({ category: 'ram', product: ram })
                tempBuild.push({ category: 'motherboard', product: mb })
                tempBuild.push({ category: 'storage', product: ssd })
                tempBuild.push({ category: 'psu', product: psu })
                tempBuild.push({ category: 'case', product: cs })
                tempBuild.push({ category: 'cooling', product: cool })

                // Agregar sugerencias de periféricos si las hay
                peripherals.forEach((per: string) => {
                    const perSug = aiSuggestions.find(s => s.category.toLowerCase() === per.toLowerCase())
                    if (perSug) {
                        const p = stock.find(x => x.id === perSug.store_product_id)
                        if (p) tempBuild.push({ category: p.category, product: p })
                    }
                })

                const validation = validateBuild(tempBuild)
                const totalCost = tempBuild.reduce((sum, b) => sum + Number(b.product.price), 0)

                if (validation.valid && totalCost <= budgetNum) {
                    build.push(...tempBuild)
                    aiValid = true
                }
            }
        }

        // ── Fallback a Solucionador Determinista Restringido ────────
        let total = 0
        let remainingBudget = budgetNum

        if (!aiValid) {
            const fallback = solveOptimalBuild(
                stock,
                budgetNum,
                usage,
                isAPU,
                cpuBrand,
                gpuBrand,
                ramGen,
                storageType,
                cooling,
                specificCase,
                peripherals,
                totalPerMin
            )

            if (fallback) {
                build.push({ category: 'cpu', product: fallback.cpu })
                if (fallback.gpu) build.push({ category: 'gpu', product: fallback.gpu })
                build.push({ category: 'ram', product: fallback.ram })
                build.push({ category: 'motherboard', product: fallback.motherboard })
                build.push({ category: 'storage', product: fallback.storage })
                build.push({ category: 'psu', product: fallback.psu })
                build.push({ category: 'case', product: fallback.case })
                build.push({ category: 'cooling', product: fallback.cooling })

                // Agregar periféricos con el presupuesto restante
                let remaining = budgetNum - fallback.pcCost
                for (let i = 0; i < peripherals.length; i++) {
                    const per = peripherals[i] as string
                    if (remaining <= 0) break
                    const futureReserve = perMins.slice(i + 1).reduce((a: number, b: number) => a + b, 0)
                    const max = Math.max(0, remaining - futureReserve)
                    const cats = getCategoryForPeripheral(per)
                    const opts = stock
                        .filter((p: any) => cats.some(c => p.category.toLowerCase().includes(c)))
                        .filter((p: any) => matchesPeripheralCategory(per, p.name))
                    const perProduct = pickBest(opts, max, preferHighEnd) ?? pickBest(opts, remaining, false)
                    if (perProduct && Number(perProduct.price) <= remaining) {
                        build.push({ category: perProduct.category, product: perProduct })
                        remaining -= Number(perProduct.price)
                    }
                }
            }
        }

        total = build.reduce((sum, b) => sum + Number(b.product.price), 0)
        remainingBudget = budgetNum - total

        if (total > budgetNum) {
            return NextResponse.json({
                error: 'Error interno: el total calculado superó el presupuesto.',
                detail: `S/${total} > S/${budgetNum}`
            }, { status: 500 })
        }

        if (!build.some(b => b.category === 'cpu')) {
            return NextResponse.json({
                error: 'No se pudieron encontrar componentes compatibles dentro del presupuesto y stock actual.'
            }, { status: 400 })
        }

        // ── Razones de Componentes (solo las proporcionadas por la IA, sin fallbacks genéricos) ──
        const getAIReason = (category: string): string | undefined => {
            return aiSuggestions.find(s => s.category === category)?.reason
        }

        return NextResponse.json({
            build: build.map(item => ({
                category: item.category,
                ...(getAIReason(item.category) ? { reason: getAIReason(item.category) } : {}),
                product: item.product,
            })),
            total,
            remainingBudget,
            summary: aiSummary || `Build ${isAPU ? 'APU integrada' : 'con GPU dedicada'} optimizada para ${usage}`,
            tips: aiTips.length > 0 ? aiTips : [
                'Verifica el factor de forma (ATX/mATX) entre placa madre y gabinete antes de comprar.',
                `Tienes S/${remainingBudget} de margen para upgrades futuros o más almacenamiento.`,
            ],
        })
    } catch (err) {
        return NextResponse.json(
            { error: 'PC Builder error', detail: err instanceof Error ? err.message : 'unknown' },
            { status: 500 }
        )
    }
}
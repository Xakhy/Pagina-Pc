import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { budget, usage, level, cooling, peripherals, specificCase } = body

    const prompt = `Eres un experto en hardware PC para el mercado peruano. El usuario quiere armar una PC:
- Presupuesto máximo: S/ ${budget} Soles
- Uso: ${usage}
- Nivel: ${level}
- Refrigeración: ${cooling}
- Periféricos: ${peripherals.join(', ')}
- Case: ${specificCase}

Sugiere una lista de 8 componentes exactos. 
IMPORTANTE: Para cada uno, proporciona un "search_term" que incluya MARCA y MODELO EXACTO (ej: "Memoria RAM DDR5 G.Skill Trident Z5 RGB 32GB" en lugar de solo "RAM DDR5"). 
Esto es crítico para que la imagen coincida con la descripción.

Responde ÚNICAMENTE con un JSON:
{
  "suggestions": [
    { "category": "RAM", "search_term": "G.Skill Trident Z5 RGB DDR5 32GB", "reason": "Alta velocidad y latencia baja para gaming" },
    ...
  ],
  "summary": "...",
  "tips": ["..."]
}`

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('IA Error')

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON not found')
    const result = JSON.parse(jsonMatch[0])

    // Fetch real products from MeLi for each suggestion
    const enrichedBuild = await Promise.all(result.suggestions.map(async (s: any) => {
      try {
        // Buscamos con el término exacto para asegurar que la imagen sea la correcta
        const res = await fetch(`https://api.mercadolibre.com/sites/MPE/search?q=${encodeURIComponent(s.search_term)}&limit=5`)
        const data = await res.json()
        
        // Intentamos encontrar el mejor match (que contenga las palabras clave)
        const bestMatch = data.results.find((item: any) => 
          item.title.toLowerCase().includes(s.search_term.split(' ')[0].toLowerCase())
        ) || data.results[0]

        if (!bestMatch) return null
        
        return {
          reason: s.reason,
          product: {
            id: bestMatch.id,
            name: bestMatch.title,
            price: bestMatch.price,
            image_url: bestMatch.thumbnail.replace('-I.jpg', '-W.jpg'),
            category: s.category
          }
        }
      } catch { return null }
    }))

    const finalBuild = enrichedBuild.filter(Boolean)
    const total = finalBuild.reduce((acc, item: any) => acc + item.product.price, 0)

    return NextResponse.json({
      build: finalBuild,
      total: total,
      summary: result.summary,
      tips: result.tips || [],
    })
  } catch (error) {
    console.error('PC Builder error:', error)
    return NextResponse.json({ error: 'IA Build Error' }, { status: 500 })
  }
}

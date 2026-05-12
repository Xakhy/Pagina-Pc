import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || 'hardware gamer'
  const limit = searchParams.get('limit') || '12'

  try {
    // Usamos el endpoint de búsqueda de MeLi Perú (MPE)
    const url = `https://api.mercadolibre.com/sites/MPE/search?q=${encodeURIComponent(q)}&limit=${limit}`
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 } // Cache por 1 hora
    })
    
    if (!res.ok) {
      console.error(`MeLi API error: ${res.status}`)
      return NextResponse.json({ results: [] })
    }
    
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Proxy Fetch Error:', error)
    return NextResponse.json({ results: [], error: 'Internal Server Error' }, { status: 500 })
  }
}

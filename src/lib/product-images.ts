import { CATEGORIES } from './products'
import { useState, useEffect } from 'react'

const categoryImage: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.name, c.image])
)

const DEFAULT_IMAGE = 'https://http2.mlstatic.com/D_NQ_NP_2X_895636-MLA72174158927_102023-F.webp'

export function resolveProductImageUrl(
  name: string,
  category: string,
  imageUrl?: string | null
): string {
  const t = (imageUrl ?? '').trim()
  if (t.startsWith('http') && !t.includes('media-amazon.com')) return t
  return categoryImage[category] ?? DEFAULT_IMAGE
}

export function categoryFallbackImage(category: string): string {
  return categoryImage[category] ?? DEFAULT_IMAGE
}

export function useMLImage(
  productName: string,
  category: string,
  existingUrl?: string | null
): string {
  const fallback = resolveProductImageUrl(productName, category, existingUrl)
  const [src, setSrc] = useState<string>(fallback)

  useEffect(() => {
    const t = (existingUrl ?? '').trim()
    if (t.startsWith('http') && !t.includes('media-amazon.com')) return

    let cancelled = false
    fetch(`https://api.mercadolibre.com/sites/MPE/search?q=${encodeURIComponent(productName)}&limit=1`)
      .then(r => r.json())
      .then(data => {
        const thumb = data.results?.[0]?.thumbnail
        if (!cancelled && thumb) setSrc(thumb.replace(/I\.jpg$/i, 'O.jpg'))
      })
      .catch(() => { })
    return () => { cancelled = true }
  }, [productName, existingUrl, category])

  return src
}
import { CATEGORIES } from './categories'

const categoryImage: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.name, c.image])
)

const DEFAULT_IMAGE = 'https://tenor.com/es/view/soul-eater-maka-gif-19913392'

export function resolveProductImageUrl(
  name: string,
  category: string,
  imageUrl?: string | null
): string {
  const t = (imageUrl ?? '').trim()
  if (t.startsWith('http')) return t
  return categoryImage[category] ?? DEFAULT_IMAGE
}

export function categoryFallbackImage(category: string): string {
  return categoryImage[category] ?? DEFAULT_IMAGE
}
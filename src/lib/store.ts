import { create } from 'zustand'
import { CartItem } from './supabase'

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
}

const getStorage = () => {
  if (typeof window === 'undefined') return null
  // sessionStorage para usuarios sin login
  return sessionStorage
}

const loadCart = (): CartItem[] => {
  try {
    const storage = getStorage()
    if (!storage) return []
    const saved = storage.getItem('tecnostore-cart')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

const saveCart = (items: CartItem[]) => {
  try {
    const storage = getStorage()
    if (!storage) return
    storage.setItem('tecnostore-cart', JSON.stringify(items))
  } catch {}
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,

  addItem: (item) => {
    const { items } = get()
    const existing = items.find((i) => i.id === item.id)
    let newItems: CartItem[]

    if (existing) {
      newItems = items.map((i) =>
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      )
    } else {
      newItems = [...items, { ...item, quantity: 1 }]
    }

    saveCart(newItems)
    set({ items: newItems })
  },

  removeItem: (id) => {
    const newItems = get().items.filter((i) => i.id !== id)
    saveCart(newItems)
    set({ items: newItems })
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id)
      return
    }
    const newItems = get().items.map((i) =>
      i.id === id ? { ...i, quantity } : i
    )
    saveCart(newItems)
    set({ items: newItems })
  },

  clearCart: () => {
    saveCart([])
    set({ items: [] })
  },

  toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

  getTotalPrice: () =>
    get().items.reduce((acc, i) => acc + i.price * i.quantity, 0),

  getTotalItems: () =>
    get().items.reduce((acc, i) => acc + i.quantity, 0),
}))

// Hydrate cart from sessionStorage on client
if (typeof window !== 'undefined') {
  useCart.setState({ items: loadCart() })
}

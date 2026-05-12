import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          price: number
          category: string
          description: string
          image_url: string
          stock: number
          specs: Record<string, string>
          created_at: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          items: CartItem[]
          total: number
          status: string
          created_at: string
          customer_name: string
          customer_email: string
        }
      }
    }
  }
}

export type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
  image_url: string
  category: string
}

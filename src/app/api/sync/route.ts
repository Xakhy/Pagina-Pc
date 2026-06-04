import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Component — ignoring
            }
          },
        },
      }
    )

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category', { ascending: true })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: data?.length ?? 0,
      products: data ?? [],
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message ?? 'Error inesperado' },
      { status: 500 }
    )
  }
}

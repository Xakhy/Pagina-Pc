import { createClient } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Credenciales Supabase no configuradas' },
        { status: 500 }
      )
    }

    // Crear cliente con service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' }
    })

    // Log para debug
    console.log('[admin/orders GET] Buscando órdenes...')

    const { data, error, status } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('[admin/orders GET] Status:', status, 'Error:', error?.message, 'Data count:', data?.length)

    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    return NextResponse.json({ success: true, orders: data ?? [] })
  } catch (err: any) {
    console.error('[admin/orders GET] Error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, newStatus } = body

    if (!orderId || !newStatus) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: orderId o newStatus' },
        { status: 400 }
      )
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Las credenciales de Supabase no están configuradas en el servidor' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // 1. Obtener el estado actual de la orden
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('status, items')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada en la base de datos' },
        { status: 404 }
      )
    }

    // 2. Si se está confirmando y el estado actual es 'pending'
    if (newStatus === 'confirmed' && order.status === 'pending') {
      const items = Array.isArray(order.items) ? order.items : []
      for (const item of items) {
        if (!item.id) continue

        // Obtener el stock actual del producto
        const { data: product, error: prodError } = await supabaseAdmin
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single()

        if (prodError || !product) {
          console.warn(`Producto con ID ${item.id} no encontrado para descontar stock`)
          continue
        }

        // Calcular y actualizar nuevo stock
        const newStock = Math.max(0, (product.stock || 0) - (Number(item.quantity) || 1))
        const { error: updateProdError } = await supabaseAdmin
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.id)

        if (updateProdError) {
          console.error(`Error al actualizar stock del producto ${item.id}:`, updateProdError)
        }
      }
    }

    // 3. Actualizar el estado de la orden
    const { error: updateOrderError } = await supabaseAdmin
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (updateOrderError) {
      return NextResponse.json(
        { error: `Error al actualizar el estado de la orden: ${updateOrderError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Orden actualizada a "${newStatus}" exitosamente`,
      oldStatus: order.status,
      newStatus,
    })
  } catch (err: any) {
    console.error('Error en API /api/admin/orders:', err)
    return NextResponse.json(
      { error: `Error interno del servidor: ${err.message}` },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const orderId = url.searchParams.get('orderId')
    const clearAll = url.searchParams.get('clearAll') === 'true'

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Las credenciales de Supabase no están configuradas en el servidor' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    if (clearAll) {
      // Borrar todos los entregados o rechazados (historial)
      const { error } = await supabaseAdmin
        .from('orders')
        .delete()
        .in('status', ['delivered', 'rejected'])

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Historial vaciado correctamente',
      })
    }

    if (!orderId) {
      return NextResponse.json(
        { error: 'Falta el parámetro orderId' },
        { status: 400 }
      )
    }

    // Borrar una sola orden por ID
    const { error } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', orderId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Orden eliminada permanentemente',
    })
  } catch (err: any) {
    console.error('Error en DELETE /api/admin/orders:', err)
    return NextResponse.json(
      { error: `Error interno del servidor: ${err.message}` },
      { status: 500 }
    )
  }
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatPEN } from '@/lib/utils'
import { Loader2, Package, ArrowLeft } from 'lucide-react'

type OrderRow = {
  id: string
  created_at: string
  total: number
  status: string
  items: unknown
}

export default function OrdersClient() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        if (!cancelled) {
          setOrders([])
          setError('inicia')
          setLoading(false)
        }
        return
      }
      const { data, error: qErr } = await supabase
        .from('orders')
        .select('id, created_at, total, status, items')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (!cancelled) {
        if (qErr) setError(qErr.message)
        else setOrders((data as OrderRow[]) ?? [])
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [supabase])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Cargando tus compras…</p>
      </div>
    )
  }

  if (error === 'inicia') {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-zinc-900/60 p-10 text-center">
        <p className="text-white">Inicia sesión para ver tus pedidos.</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-500"
        >
          Ir a login
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-red-500/20 bg-red-950/20 p-8 text-center text-red-300">
        {error}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-zinc-900/40 p-12 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
        <p className="text-lg font-bold text-white">Aún no tienes compras registradas</p>
        <p className="mt-2 text-sm text-zinc-500">
          Los pedidos que confirmes en checkout (con sesión iniciada) aparecerán aquí.
        </p>
        <Link
          href="/productos"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Ir al catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {orders.map((o) => {
        const raw = o.items as unknown
        const items = Array.isArray(raw)
          ? raw
          : raw && typeof raw === 'object' && Array.isArray((raw as { lines?: unknown }).lines)
            ? (raw as { lines: any[] }).lines
            : []
        return (
          <article
            key={o.id}
            className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 shadow-xl"
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Pedido</p>
                <p className="break-all font-mono text-xs text-zinc-300">{o.id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">{new Date(o.created_at).toLocaleString('es-PE')}</p>
                <p className="text-xl font-black text-emerald-400">{formatPEN(Number(o.total))}</p>
                <span className="text-[10px] font-bold uppercase text-zinc-500">{o.status}</span>
              </div>
            </div>
            <ul className="space-y-2">
              {items.map((it: any, idx: number) => (
                <li key={idx} className="flex justify-between text-sm text-zinc-300">
                  <span className="pr-4">
                    {it.name}{' '}
                    <span className="text-zinc-600">×{it.quantity ?? 1}</span>
                  </span>
                  <span className="shrink-0 font-mono text-emerald-400/90">
                    {formatPEN(Number(it.price ?? 0) * Number(it.quantity ?? 1))}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        )
      })}
    </div>
  )
}

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const OrdersClient = dynamic(() => import('./OrdersClient'), { ssr: false })

export default function OrdenesPage() {
  return (
    <div className="min-h-screen bg-zinc-950 px-4 pb-20 pt-24">
      <div className="mx-auto mb-10 flex max-w-3xl items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Inicio
        </Link>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white font-tech">
          Mis <span className="text-indigo-500">compras</span>
        </h1>
      </div>
      <OrdersClient />
    </div>
  )
}

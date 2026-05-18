'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, User, Mail, Shield } from 'lucide-react'

export default function PerfilPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string>('user')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) {
        if (!cancelled) {
          setEmail(null)
          setLoading(false)
        }
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', session.user.id)
        .single()

      if (!cancelled) {
        setEmail(profile?.email ?? session.user.email ?? null)
        setRole(profile?.role ?? 'user')
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 pt-20">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!email) {
    return (
      <div className="mx-auto max-w-md px-4 pt-32 text-center">
        <p className="text-white">Debes iniciar sesión para ver tu perfil.</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-500"
        >
          Login
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 pb-20 pt-24">
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white font-tech">
          Mi <span className="text-indigo-500">perfil</span>
        </h1>
        <div className="space-y-4 rounded-3xl border border-white/10 bg-zinc-900/60 p-8">
          <div className="flex items-center gap-3 text-zinc-300">
            <User className="h-5 w-5 text-indigo-400" />
            <span className="text-sm font-medium">Cuenta activa</span>
          </div>
          <div className="flex items-center gap-3 text-zinc-300">
            <Mail className="h-5 w-5 text-indigo-400" />
            <span className="text-sm">{email}</span>
          </div>
          <div className="flex items-center gap-3 text-zinc-300">
            <Shield className="h-5 w-5 text-indigo-400" />
            <span className="text-sm">
              Rol: <strong className="text-white">{role}</strong>
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/ordenes"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 py-3 text-center text-sm font-bold text-white hover:border-indigo-500/50"
          >
            Ver mis compras
          </Link>
          {role === 'admin' && (
            <Link
              href="/admin"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-indigo-600 py-3 text-center text-sm font-bold text-white hover:bg-indigo-500"
            >
              Panel admin
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

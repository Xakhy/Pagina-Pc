'use client'

import Link from 'next/link'
import { ShoppingCart, Menu, X, User, Sun, Moon } from 'lucide-react'
import { useCart } from '@/lib/store'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Navbar() {
  const { getTotalItems, toggleCart } = useCart()
  const { theme, setTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [hasLocalSession, setHasLocalSession] = useState(false)
  const totalItems = getTotalItems()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    let hasSession = false
    try {
      hasSession = Object.keys(localStorage).some(key => key.startsWith('sb-') && key.endsWith('-auth-token'))
    } catch (e) {
      console.error(e)
    }
    setHasLocalSession(hasSession)

    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user || null)
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          setIsAdmin(profile?.role === 'admin')
        } else {
          setIsAdmin(false)
        }
      } catch (err) {
        console.error('Error fetching session:', err)
      } finally {
        setLoadingAuth(false)
      }
    }
    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        const fetchRole = async () => {
          try {
            const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
            setIsAdmin(data?.role === 'admin')
          } catch (err) {
            console.error('Error in onAuthStateChange:', err)
            setIsAdmin(false)
          } finally {
            setLoadingAuth(false)
          }
        }
        fetchRole()
      } else {
        setIsAdmin(false)
        setLoadingAuth(false)
      }
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/productos', label: 'Productos' },
    { href: '/pc-builder', label: '🦾 PC Builder IA' },
    { href: '/checkout', label: 'Checkout' },
  ]

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/5',
      scrolled ? 'bg-background/90 backdrop-blur-xl shadow-2xl' : 'bg-background/50'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-bold text-2xl tracking-widest text-[#7F77DD]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              TECH<span className="text-zinc-400 font-medium">BUILDS</span>
            </span>
          </Link>

          {/* Desktop Links - Centrados de forma absoluta */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className="text-xs font-medium text-zinc-400 hover:text-[#7F77DD] transition-all duration-200">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/5 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              aria-label="Cambiar tema">
              {mounted ? (
                theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-zinc-600" />
              ) : (
                <div className="h-4 w-4" />
              )}
            </button>

            {/* Cart */}
            <button id="cart-toggle-btn" onClick={toggleCart}
              className="relative px-4 py-2 rounded-xl bg-zinc-900 border border-white/5 hover:bg-white/5 transition-all group flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
              <span className="text-[11px] font-bold text-zinc-400">CARRITO</span>
              {mounted && totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#534AB7] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            {loadingAuth || !mounted ? (
              hasLocalSession || !mounted ? (
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/5 bg-zinc-900 text-zinc-500 animate-pulse">
                  <User className="h-4 w-4" />
                </div>
              ) : (
                <div className="h-10 w-10 sm:w-[160px] bg-transparent shrink-0" />
              )
            ) : user ? (
              <DropdownMenu>
                {/* Fix: DropdownMenuTrigger sin asChild — button directo */}
                <DropdownMenuTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-zinc-900 text-zinc-400 outline-none transition hover:bg-zinc-800 hover:text-white">
                  <User className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10 text-white">
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem className="text-xs text-gray-400 focus:bg-white/5 focus:text-white">
                    {user.email}
                  </DropdownMenuItem>
                  {/* Fix: Link dentro de DropdownMenuItem en vez de asChild */}
                  <DropdownMenuItem className="p-0 focus:bg-white/5">
                    <Link href="/perfil" className="w-full px-2 py-1.5 text-sm focus:text-white">Perfil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0 focus:bg-white/5">
                    <Link href="/ordenes" className="w-full px-2 py-1.5 text-sm focus:text-white">Mis compras</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem className="p-0 focus:bg-white/5">
                      <Link href="/admin" className="w-full px-2 py-1.5 text-sm focus:text-white">Panel admin</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:bg-red-500/10 focus:text-red-400 font-bold">
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login" className="hidden sm:flex px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-all">
                  Ingresar
                </Link>
                <Link href="/registro" className="hidden sm:flex px-4 py-2 bg-[#534AB7] hover:bg-[#4339a7] text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20">
                  Crear cuenta
                </Link>
              </>
            )}

            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400"
              onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <div className="md:hidden bg-zinc-900 border border-white/5 rounded-2xl mb-4 p-4 space-y-2">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-bold text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-xl transition-all">
                {link.label}
              </Link>
            ))}
            {user && (
              <>
                <Link href="/perfil" onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-bold text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-xl transition-all">
                  Perfil
                </Link>
                <Link href="/ordenes" onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-bold text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-xl transition-all">
                  Mis compras
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-bold text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all">
                    Panel admin
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

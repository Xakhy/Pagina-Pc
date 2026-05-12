'use client'

import Link from 'next/link'
import { ShoppingCart, Cpu, Menu, X, Search, User, Sun, Moon } from 'lucide-react'
import { useCart } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

export function Navbar() {
  const { getTotalItems, toggleCart } = useCart()
  const { theme, setTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const totalItems = getTotalItems()

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/productos', label: 'Productos' },
    { href: '/pc-builder', label: '🦾 PC Builder IA' },
    { href: '/checkout', label: 'Checkout' },
  ]

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/5',
        scrolled ? 'bg-background/90 backdrop-blur-xl shadow-2xl' : 'bg-background/50'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-bold text-2xl tracking-widest text-[#7F77DD]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              TECH<span className="text-zinc-500 dark:text-zinc-500 text-zinc-400 font-medium">BUILDS</span>
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium text-zinc-400 hover:text-[#7F77DD] transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-full w-10 h-10 hover:bg-zinc-800 dark:hover:bg-zinc-800"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-zinc-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
              </Button>
            )}
            {/* Cart */}
            <button
              id="cart-toggle-btn"
              onClick={toggleCart}
              className="relative px-4 py-2 rounded-xl bg-zinc-900 border border-white/5 hover:bg-white/5 transition-all group flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
              <span className="text-[11px] font-bold text-zinc-400">CARRITO</span>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#534AB7] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            <button className="hidden sm:flex px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-all">
               Ingresar
            </button>
            <button className="hidden sm:flex px-4 py-2 bg-[#534AB7] hover:bg-[#4339a7] text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20">
               Crear cuenta
            </button>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <div className="md:hidden bg-zinc-900 border border-white/5 rounded-2xl mb-4 p-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-bold text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-xl transition-all"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}

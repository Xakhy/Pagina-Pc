import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { CartDrawer } from '@/components/CartDrawer'
import { Toaster } from '@/components/ui/sonner'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ThemeProvider } from 'next-themes'

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-jakarta' 
})

export const metadata: Metadata = {
  title: 'TECNOSTORE | Hardware & PC Building',
  description: 'Componentes de hardware, periféricos y configurador de PC inteligente con precios actualizados de Mercado Libre Perú.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${jakarta.variable}`} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1.3.0/dist/font/sans.css" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-indigo-600/30 selection:text-indigo-400">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Navbar />
          <main className="relative z-10">{children}</main>
          <CartDrawer />
          <Toaster position="bottom-right" theme="system" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}

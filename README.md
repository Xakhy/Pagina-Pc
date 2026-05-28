# TechBuilds 🖥️
### Tienda online de componentes PC + PC Builder con IA
> Proyecto académico — Ingeniería de Software con IA · v0.5.0

---

## ¿Qué es?

Tienda online de componentes PC y tecnología dirigida a gamers principiantes en Perú, con un **PC Builder inteligente** integrado que usa la API de Google Gemini 2.0 Flash para armar builds completas y compatibles según el presupuesto, uso y nivel del usuario.

---

## Características

- 🛍️ **Catálogo de productos** — componentes PC con filtros por categoría y precio
- 🤖 **PC Builder con IA** — genera builds compatibles con Gemini 2.0 Flash según presupuesto, uso, nivel, marca CPU/GPU, generación de RAM y tipo de gráficos
- 🛒 **Carrito inteligente** — persiste sin login (sessionStorage) y con login (Supabase DB) usando Zustand
- 👤 **Sistema de cuentas** — registro, login, perfil y panel de órdenes con Supabase Auth
- 📄 **Voucher PDF** — se genera automáticamente al finalizar la compra con jsPDF
- 🔐 **Panel de administración** — gestión de productos y órdenes
- 🌙 **Modo oscuro/claro** — switcher en el navbar con next-themes
- 🔔 **Notificaciones** — toasts con Sonner

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14.2 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 3 + shadcn/ui |
| Base de datos | Supabase (PostgreSQL + Auth + SSR) |
| IA | Google Gemini 2.0 Flash API |
| PDF | jsPDF 4 |
| Estado global | Zustand 5 |
| Notificaciones | Sonner |
| Iconos | Lucide React |
| Temas | next-themes |

---

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Xakhy/Pagina-Pc.git
cd Pagina-Pc

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Correr en desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
GEMINI_API_KEY=tu_gemini_key
```

---

## Roadmap

| Semana | Estado | Objetivo |
|---|---|---|
| Semana 1 | ✅ | Setup + catálogo de productos |
| Semana 2 | ✅ | PC Builder IA + carrito + checkout + voucher PDF |
| Semana 3 | ✅ | Mejoras UI + modo oscuro/claro + perfil de usuario |
| Semana 4 | 🔄 | Panel admin completo + optimizaciones |
| Semana 5 | ⏳ | Polish final + deploy a producción |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/          # Login y registro
│   ├── admin/           # Panel de administración (productos + órdenes)
│   ├── api/
│   │   ├── admin/
│   │   │   └── orders/  # API de gestión de órdenes (admin)
│   │   └── pc-builder/  # API de generación de builds con Gemini
│   ├── auth/            # Callbacks de autenticación Supabase
│   ├── checkout/        # Flujo de compra
│   ├── ordenes/         # Historial de órdenes del usuario
│   ├── perfil/          # Perfil de usuario
│   ├── pc-builder/      # Página del PC Builder IA
│   └── productos/       # Catálogo + detalle de producto ([id])
├── components/
│   ├── ui/              # Componentes base de shadcn/ui
│   ├── Navbar.tsx
│   ├── CartDrawer.tsx
│   ├── HeroSection.tsx
│   ├── FeaturedProducts.tsx
│   ├── CategoriesSection.tsx
│   ├── PCBuilderHomeBlock.tsx
│   ├── PCBuilderTeaser.tsx
│   ├── ProductCard.tsx
│   └── VoucherGenerator.tsx
└── lib/
    ├── supabase/        # Cliente Supabase (client + server)
    ├── store.ts         # Zustand — carrito global
    ├── pdf.ts           # Generación de voucher PDF
    ├── categories.ts    # Categorías del catálogo
    ├── product-images.ts
    └── utils.ts
```

---

*Desarrollado por Xakhy · Lima, Perú · 2026*
# TechBuilds 🖥️
### Tienda online de componentes PC + PC Builder con IA
> Proyecto académico — Ingeniería de Software con IA · v0.2.0

---

## ¿Qué es?

Tienda online de componentes PC y tecnología dirigida a gamers principiantes en Perú, con un **PC Builder inteligente** integrado que usa la API de Google Gemini para armar builds completas y compatibles según el presupuesto, uso y nivel del usuario.

---

## Características

- 🛍️ **Catálogo completo** — componentes PC con filtros por categoría y precio
- 🤖 **PC Builder con IA** — genera builds compatibles según presupuesto, uso, nivel, marca de CPU/GPU, generación de RAM y tipo de gráficos
- 🛒 **Carrito inteligente** — persiste sin login (sessionStorage) y con login (Supabase DB)
- 👤 **Sistema de cuentas** — registro, login, perfil y panel de órdenes con Supabase Auth
- 📄 **Voucher PDF** — se genera automáticamente al finalizar la compra con jsPDF
- 🔐 **Panel de administración** — gestión de productos y órdenes
- 🌙 **Modo oscuro/claro** — switcher integrado en el navbar con next-themes
- 🎞️ **Animaciones** — transiciones fluidas con Framer Motion

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14.2 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 3 + shadcn/ui |
| Animaciones | Framer Motion 12 |
| Base de datos | Supabase (PostgreSQL + Auth) |
| IA | Google Gemini 2.0 Flash API |
| PDF | jsPDF 4 |
| Estado global | Zustand 5 |
| Notificaciones | Sonner |
| Iconos | Lucide React |

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
| Semana 3 | 🔄 | Precios en tiempo real + mejoras UI |
| Semana 4 | ⏳ | Panel admin completo + optimizaciones |
| Semana 5 | ⏳ | Polish final + deploy a producción |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/          # Login y registro
│   ├── admin/           # Panel de administración
│   ├── api/
│   │   ├── admin/       # Endpoints de admin (productos, órdenes)
│   │   └── pc-builder/  # Endpoint de generación de builds con IA
│   ├── auth/            # Callbacks de autenticación Supabase
│   ├── checkout/        # Flujo de compra
│   ├── ordenes/         # Historial de órdenes del usuario
│   ├── perfil/          # Perfil de usuario
│   ├── pc-builder/      # Página del PC Builder IA
│   └── productos/       # Catálogo y detalle de producto
├── components/
│   ├── ui/              # Componentes base (shadcn/ui)
│   ├── Navbar.tsx
│   ├── CartDrawer.tsx
│   ├── HeroSection.tsx
│   ├── FeaturedProducts.tsx
│   ├── CategoriesSection.tsx
│   ├── PCBuilderHomeBlock.tsx
│   ├── PCBuilderTeaser.tsx
│   ├── ProductCard.tsx
│   └── VoucherGenerator.tsx
└── lib/                 # Utilidades, store Zustand, cliente Supabase
```

---

*Desarrollado por Xakhy · Lima, Perú · 2025*
# TechBuilds 🖥️
### Tienda online de componentes PC + PC Builder con IA
> Proyecto académico — Ingeniería de Software con IA · v0.2.0

---

## ¿Qué es?

Tienda online de componentes PC y tecnología dirigida a gamers principiantes en Perú, con un **PC Builder inteligente** integrado que usa IA para armar builds completas según el presupuesto y necesidades del usuario.

---

## Características

- 🛍️ **Catálogo completo** — componentes PC con filtros por categoría y precio
- 🤖 **PC Builder con IA** — genera builds compatibles según presupuesto, uso y nivel
- 🛒 **Carrito inteligente** — persiste sin login (sessionStorage) y con login (DB)
- 👤 **Sistema de cuentas** — registro, login, perfil y panel de órdenes con Supabase Auth
- 📄 **Voucher PDF** — se genera automáticamente al finalizar la compra
- 🔐 **Panel de administración** — gestión de productos y órdenes

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Base de datos | Supabase (PostgreSQL + Auth) |
| IA | Google Gemini API |
| PDF | jsPDF |
| Estado | Zustand |

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
│   ├── api/             # Endpoints (pc-builder, sync-images, etc.)
│   ├── checkout/        # Flujo de compra
│   ├── ordenes/         # Historial de órdenes
│   ├── perfil/          # Perfil de usuario
│   └── productos/       # Catálogo y detalle de producto
├── components/          # Componentes reutilizables
└── lib/                 # Utilidades, store, supabase, etc.
```

---

*Desarrollado por Xakhy · Lima, Perú · 2025*
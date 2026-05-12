export const CATEGORIES = [
  { id: 'procesadores', name: 'Procesadores', image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?q=80&w=600&auto=format&fit=crop', color: 'from-emerald-600 to-teal-600' },
  { id: 'video', name: 'Tarjetas de Video', image: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=600&auto=format&fit=crop', color: 'from-blue-600 to-emerald-600' },
  { id: 'ram', name: 'Memorias RAM', image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?q=80&w=600&auto=format&fit=crop', color: 'from-teal-600 to-blue-600' },
  { id: 'storage', name: 'Almacenamiento', image: 'https://images.unsplash.com/photo-1597872200349-0160429d47a8?q=80&w=600&auto=format&fit=crop', color: 'from-emerald-500 to-emerald-700' },
  { id: 'monitores', name: 'Monitores', image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=600&auto=format&fit=crop', color: 'from-indigo-500 to-indigo-700' },
  { id: 'keyboards', name: 'Teclados Mecánicos', image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=600&auto=format&fit=crop', color: 'from-zinc-500 to-zinc-700' },
  { id: 'mice', name: 'Mouse Gaming', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=600&auto=format&fit=crop', color: 'from-blue-500 to-blue-700' },
  { id: 'cases', name: 'Cases & Chasis', image: 'https://images.unsplash.com/photo-1587202372589-241fdf865650?q=80&w=600&auto=format&fit=crop', color: 'from-emerald-500 to-emerald-700' },
  { id: 'audio', name: 'Audio & Headsets', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop', color: 'from-indigo-500 to-indigo-700' },
  { id: 'boards', name: 'Placas Madre', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop', color: 'from-teal-500 to-teal-700' },
]

export const PRODUCTS = [
  // PROCESSORS
  {
    id: 'cpu-1',
    name: 'Intel Core i9-14900K',
    price: 589,
    category: 'Procesadores',
    description: 'El procesador más potente de Intel para gaming y productividad extrema.',
    image_url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=400',
    stock: 12,
    specs: { Socket: 'LGA1700', Núcleos: '24', Frecuencia: '6.0 GHz' }
  },
  {
    id: 'cpu-2',
    name: 'AMD Ryzen 7 7800X3D',
    price: 399,
    category: 'Procesadores',
    description: 'El rey indiscutible del gaming con tecnología 3D V-Cache.',
    image_url: 'https://images.unsplash.com/photo-1555617766-c94804975da3?auto=format&fit=crop&q=80&w=400',
    stock: 8,
    specs: { Socket: 'AM5', Núcleos: '8', Frecuencia: '5.0 GHz' }
  },
  // GPU
  {
    id: 'gpu-1',
    name: 'ASUS ROG Strix RTX 4080 Super',
    price: 1149,
    category: 'Tarjetas de Video',
    description: 'Potencia gráfica definitiva con el mejor sistema de refrigeración del mercado.',
    image_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=400',
    stock: 4,
    specs: { Memoria: '16GB GDDR6X', Bus: '256-bit', TDP: '320W' }
  },
  {
    id: 'gpu-2',
    name: 'MSI Gaming X Slim RTX 4070 Ti',
    price: 799,
    category: 'Tarjetas de Video',
    description: 'Equilibrio perfecto entre tamaño, silencio y rendimiento en 1440p/4K.',
    image_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=400',
    stock: 15,
    specs: { Memoria: '12GB GDDR6X', Bus: '192-bit', TDP: '285W' }
  },
  // RAM
  {
    id: 'ram-1',
    name: 'Corsair Dominator Titanium 32GB',
    price: 189,
    category: 'Memorias RAM',
    description: 'Memoria DDR5 de alto rendimiento con iluminación RGB personalizable.',
    image_url: 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&q=80&w=400',
    stock: 20,
    specs: { Capacidad: '32GB (2x16)', Velocidad: '6000 MT/s', Latencia: 'CL30' }
  },
  // STORAGE
  {
    id: 'ssd-1',
    name: 'Samsung 990 Pro 2TB',
    price: 169,
    category: 'Almacenamiento',
    description: 'El SSD Gen4 más rápido para tiempos de carga inexistentes.',
    image_url: 'https://images.unsplash.com/photo-1628557118391-56cd73566b6c?auto=format&fit=crop&q=80&w=400',
    stock: 30,
    specs: { Capacidad: '2TB', Tipo: 'NVMe M.2 Gen4', Lectura: '7450 MB/s' }
  },
  // MOTHERBOARD
  {
    id: 'mobo-1',
    name: 'ASUS ROG Maximus Z790 Hero',
    price: 629,
    category: 'Placas Madre',
    description: 'La base definitiva para procesadores Intel de 14va generación.',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=400',
    stock: 6,
    specs: { Chipset: 'Z790', Formato: 'ATX', WiFi: 'WiFi 7' }
  },
  // CASES
  {
    id: 'case-1',
    name: 'NZXT H9 Elite Dual-Chamber',
    price: 239,
    category: 'Cases',
    description: 'Diseño de cámara dual con cristal templado para lucir tu hardware.',
    image_url: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&q=80&w=400',
    stock: 10,
    specs: { Tipo: 'Mid Tower', Cristal: 'Templado x3', Ventiladores: '4x RGB' }
  }
]

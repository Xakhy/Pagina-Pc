'use client'

import { useState, useEffect, Fragment, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus, Pencil, Trash2, Loader2, Save, RefreshCw,
  LayoutDashboard, Package, ClipboardList, X,
  Check, XCircle, Truck, CheckCircle2, ChevronDown, ChevronUp, Star,
  History
} from 'lucide-react'
import { toast } from 'sonner'
import { formatPEN } from '@/lib/utils'
import {
  resolveProductImageUrl,
  categoryFallbackImage,
} from '@/lib/product-images'

const CATEGORIES = [
  'Almacenamiento', 'Audio & Headsets', 'Cases & Chasis',
  'Fuentes de Poder', 'Memorias RAM', 'Monitores',
  'Mouse Gaming', 'Placas Madre', 'Procesadores',
  'Refrigeración', 'Tarjetas de Video', 'Teclados',
]

type OrderRow = {
  id: string
  user_id: string | null
  customer_name: string
  customer_email: string
  address: string
  items: any[]
  total: number
  status: string
  created_at: string
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'history'>('products')
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Product editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  // Add product modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '',
    category: '',
    price: 0,
    stock: 0,
    description: '',
    image_url: '',
    is_featured: false,
    specs: [] as { key: string; value: string }[],
  })
  const [addLoading, setAddLoading] = useState(false)

  // Order detail expansion
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)

  const supabase = createClient()

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').order('category', { ascending: true })
    if (error) { toast.error('Error al cargar productos') } else { setProducts(data || []) }
    setLoading(false)
  }, [supabase])

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true)
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (error) { toast.error('Error al cargar órdenes') } else { setOrders((data as OrderRow[]) || []) }
    setOrdersLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchOrders()
    fetchProducts()
  }, [fetchOrders, fetchProducts])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/seed')
      const data = await res.json()
      if (data.success) {
        toast.success(`Sincronización exitosa: ${data.count} productos cargados`)
        fetchProducts()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast.error(`Error de sincronización: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  // ── Product CRUD ──
  const handleEdit = (product: any) => {
    setEditingId(product.id)
    setEditForm({ ...product })
  }

  const handleSave = async () => {
    const specsObj = editForm.specs && typeof editForm.specs === 'object'
      ? editForm.specs
      : {}

    const { error } = await supabase
      .from('products')
      .update({
        name: editForm.name,
        price: editForm.price,
        stock: editForm.stock,
        category: editForm.category,
        description: editForm.description || null,
        image_url: editForm.image_url || null,
        specs: specsObj,
        is_featured: editForm.is_featured || false,
      })
      .eq('id', editingId)

    if (error) {
      toast.error('Error al actualizar')
    } else {
      toast.success('Producto actualizado')
      setEditingId(null)
      fetchProducts()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar')
    } else {
      toast.success('Producto eliminado')
      fetchProducts()
    }
  }

  const handleAddProduct = async () => {
    if (!addForm.name.trim() || !addForm.category || addForm.price <= 0) {
      toast.error('Completa nombre, categoría y precio')
      return
    }

    setAddLoading(true)

    const specsObj: Record<string, string> = {}
    addForm.specs.forEach((s) => {
      if (s.key.trim()) specsObj[s.key.trim()] = s.value.trim()
    })

    const { error } = await supabase.from('products').insert({
      name: addForm.name.trim(),
      category: addForm.category,
      price: addForm.price,
      stock: addForm.stock,
      description: addForm.description.trim() || null,
      image_url: addForm.image_url.trim() || null,
      specs: specsObj,
      is_featured: addForm.is_featured,
    })

    if (error) {
      toast.error('Error al crear producto: ' + error.message)
    } else {
      toast.success('Producto creado exitosamente')
      setShowAddModal(false)
      setAddForm({
        name: '', category: '', price: 0, stock: 0,
        description: '', image_url: '', is_featured: false, specs: [],
      })
      fetchProducts()
    }
    setAddLoading(false)
  }

  // ── Order Management ──
  const handleOrderAction = async (
    orderId: string,
    newStatus: string
  ) => {
    setUpdatingOrder(orderId)

    try {
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          newStatus,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar orden')
      }

      toast.success(`Orden actualizada a "${newStatus}"`)
      fetchOrders()
      if (newStatus === 'confirmed') fetchProducts()
    } catch (err: any) {
      toast.error('Error al actualizar orden: ' + err.message)
    } finally {
      setUpdatingOrder(null)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta orden permanentemente del historial?')) return

    try {
      const response = await fetch(`/api/admin/orders?orderId=${orderId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar la orden')
      }

      toast.success('Orden eliminada del historial')
      fetchOrders()
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message)
    }
  }

  const handleClearHistory = async () => {
    if (!confirm('¿Seguro que deseas vaciar todo el historial de órdenes finalizadas? Esta acción no se puede deshacer.')) return

    try {
      const response = await fetch('/api/admin/orders?clearAll=true', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al vaciar el historial')
      }

      toast.success('Historial vaciado correctamente')
      fetchOrders()
    } catch (err: any) {
      toast.error('Error al vaciar el historial: ' + err.message)
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: '⏳ Pendiente' },
      confirmed: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: '✅ Confirmada' },
      shipped: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', label: '📦 Enviada' },
      delivered: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: '✔️ Entregada' },
      rejected: { bg: 'bg-red-500/10', text: 'text-red-400', label: '❌ Rechazada' },
    }
    const s = map[status] || map.pending
    return (
      <Badge className={`${s.bg} ${s.text} border-none font-bold text-[10px] uppercase tracking-wider px-3 py-1`}>
        {s.label}
      </Badge>
    )
  }

  // Stats
  const totalProducts = products.length
  const outOfStock = products.filter((p) => p.stock === 0).length
  const inventoryValue = products.reduce((acc, p) => acc + p.price * p.stock, 0)
  const pendingOrders = orders.filter((o) => o.status === 'pending').length

  return (
    <div className="space-y-8 pb-20">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-zinc-900/50 p-8 rounded-3xl border border-white/5 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter font-tech">
              Control <span className="text-indigo-500">Panel</span>
            </h1>
            <p className="text-zinc-500 text-sm font-medium">
              Gestión de inventario y precios en tiempo real
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold h-12 px-6 rounded-xl border border-white/5"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sincronizar
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Añadir Producto
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">
            Total Productos
          </p>
          <p className="text-3xl font-bold text-white font-tech">{totalProducts}</p>
        </div>
        <div className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">
            Sin Stock
          </p>
          <p className="text-3xl font-bold text-red-400 font-tech">{outOfStock}</p>
        </div>
        <div className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">
            Valor Inventario
          </p>
          <p className="text-3xl font-bold text-emerald-400 font-tech">
            {formatPEN(inventoryValue)}
          </p>
        </div>
        <div className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">
            Órdenes Pendientes
          </p>
          <p className="text-3xl font-bold text-amber-400 font-tech">{pendingOrders}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-zinc-900/30 p-1.5 rounded-2xl border border-white/5 w-fit">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'products'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
            : 'text-zinc-500 hover:text-white'
            }`}
        >
          <Package className="w-4 h-4" />
          Productos
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all relative ${activeTab === 'orders'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
            : 'text-zinc-500 hover:text-white'
            }`}
        >
          <ClipboardList className="w-4 h-4" />
          Órdenes
          {pendingOrders > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {pendingOrders}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'history'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
            : 'text-zinc-500 hover:text-white'
            }`}
        >
          <History className="w-4 h-4" />
          Historial
        </button>
      </div>

      {/* ══════════════ PRODUCTS TAB ══════════════ */}
      {activeTab === 'products' && (
        <div className="bg-[#0a0a0c] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-zinc-500 font-bold tracking-widest text-xs uppercase font-tech">
                  Cargando base de datos...
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">
                    <th className="px-8 py-6">Hardware</th>
                    <th className="px-8 py-6">Categoría</th>
                    <th className="px-8 py-6">Precio</th>
                    <th className="px-8 py-6">Stock</th>
                    <th className="px-8 py-6 text-center">Destacado</th>
                    <th className="px-8 py-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/5 overflow-hidden flex-shrink-0">
                            <img
                              src={resolveProductImageUrl(p.name, p.category, p.image_url)}
                              alt=""
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const el = e.currentTarget
                                el.onerror = null
                                el.src = categoryFallbackImage(p.category)
                              }}
                            />
                          </div>
                          {editingId === p.id ? (
                            <Input
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                              className="bg-zinc-900 border-white/10 h-10"
                            />
                          ) : (
                            <span className="font-bold text-zinc-100 text-sm">
                              {p.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {editingId === p.id ? (
                          <Input
                            value={editForm.category}
                            onChange={(e) =>
                              setEditForm({ ...editForm, category: e.target.value })
                            }
                            className="bg-zinc-900 border-white/10 h-10"
                          />
                        ) : (
                          <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
                            {p.category}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        {editingId === p.id ? (
                          <Input
                            type="number"
                            value={editForm.price}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                price: Number(e.target.value),
                              })
                            }
                            className="bg-zinc-900 border-white/10 h-10 w-32"
                          />
                        ) : (
                          <span className="text-emerald-400 font-black font-tech text-base">
                            {formatPEN(p.price)}
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        {editingId === p.id ? (
                          <Input
                            type="number"
                            value={editForm.stock}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                stock: Number(e.target.value),
                              })
                            }
                            className="bg-zinc-900 border-white/10 h-10 w-24"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${p.stock > 5
                                ? 'bg-emerald-500'
                                : p.stock > 0
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                                }`}
                            />
                            <span className="text-zinc-300 font-bold text-xs">
                              {p.stock} unid.
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        {editingId === p.id ? (
                          <button
                            onClick={() =>
                              setEditForm({
                                ...editForm,
                                is_featured: !editForm.is_featured,
                              })
                            }
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${editForm.is_featured
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-zinc-800 text-zinc-600'
                              }`}
                          >
                            <Star
                              className={`w-4 h-4 ${editForm.is_featured ? 'fill-amber-400' : ''
                                }`}
                            />
                          </button>
                        ) : (
                          <Star
                            className={`w-4 h-4 mx-auto ${p.is_featured
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-zinc-700'
                              }`}
                          />
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingId === p.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSave}
                                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 h-10 w-10 p-0 rounded-xl"
                              >
                                <Save className="w-5 h-5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                                className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-400/10 h-10 w-10 p-0 rounded-xl"
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(p)}
                              className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 h-10 w-10 p-0 rounded-xl"
                            >
                              <Pencil className="w-5 h-5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(p.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-10 w-10 p-0 rounded-xl"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ ORDERS TAB ══════════════ */}
      {activeTab === 'orders' && (
        <div className="bg-[#0a0a0c] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            {ordersLoading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-zinc-500 font-bold tracking-widest text-xs uppercase font-tech">
                  Cargando órdenes...
                </p>
              </div>
            ) : orders.filter(o => o.status !== 'delivered' && o.status !== 'rejected').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <ClipboardList className="w-12 h-12 text-zinc-700" />
                <p className="text-zinc-500 font-bold text-sm">No hay órdenes pendientes u activas</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">
                    <th className="px-6 py-5">Cliente</th>
                    <th className="px-6 py-5">Email</th>
                    <th className="px-6 py-5">Items</th>
                    <th className="px-6 py-5">Total</th>
                    <th className="px-6 py-5">Estado</th>
                    <th className="px-6 py-5">Fecha</th>
                    <th className="px-6 py-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders
                    .filter(o => o.status !== 'delivered' && o.status !== 'rejected')
                    .map((order) => {
                      const items = Array.isArray(order.items) ? order.items : []
                      const isExpanded = expandedOrder === order.id
                      const isUpdating = updatingOrder === order.id

                      return (
                        <Fragment key={order.id}>
                          <tr className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-6 py-5 align-middle">
                              <p className="font-bold text-zinc-100 text-sm">{order.customer_name}</p>
                              <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                                {order.id.slice(0, 8)}...
                              </p>
                            </td>
                            <td className="px-6 py-5 align-middle">
                              <span className="text-zinc-400 text-xs">{order.customer_email}</span>
                            </td>
                            <td className="px-6 py-5 align-middle">
                              <button
                                onClick={() =>
                                  setExpandedOrder(isExpanded ? null : order.id)
                                }
                                className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                              >
                                {items.length} items
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-5 align-middle">
                              <span className="text-emerald-400 font-black font-tech text-base">
                                {formatPEN(Number(order.total))}
                              </span>
                            </td>
                            <td className="px-6 py-5 align-middle">
                              {getStatusBadge(order.status)}
                            </td>
                            <td className="px-6 py-5 align-middle">
                              <span className="text-zinc-500 text-[11px]">
                                {new Date(order.created_at).toLocaleDateString('es-PE', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </td>
                            <td className="px-6 py-5 align-middle text-right">
                              <div className="flex justify-end gap-2">
                                {isUpdating ? (
                                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                                ) : (
                                  <>
                                    {order.status === 'pending' && (
                                      <>
                                        <Button
                                          size="sm"
                                          onClick={() => handleOrderAction(order.id, 'confirmed')}
                                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-3 rounded-lg text-[10px] uppercase tracking-wider"
                                        >
                                          <Check className="w-3.5 h-3.5 mr-1" />
                                          Confirmar
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            handleOrderAction(order.id, 'rejected')
                                          }
                                          className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold h-9 px-3 rounded-lg text-[10px] uppercase tracking-wider"
                                        >
                                          <XCircle className="w-3.5 h-3.5 mr-1" />
                                          Rechazar
                                        </Button>
                                      </>
                                    )}
                                    {order.status === 'confirmed' && (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleOrderAction(order.id, 'shipped')
                                        }
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-9 px-3 rounded-lg text-[10px] uppercase tracking-wider"
                                      >
                                        <Truck className="w-3.5 h-3.5 mr-1" />
                                        Enviado
                                      </Button>
                                    )}
                                    {order.status === 'shipped' && (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleOrderAction(order.id, 'delivered')
                                        }
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-3 rounded-lg text-[10px] uppercase tracking-wider"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                        Entregado
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded details */}
                          {
                            isExpanded && (
                              <tr className="bg-white/[0.01]">
                                <td colSpan={7} className="px-6 pb-6">
                                  <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/5 space-y-3 mt-2">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div>
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                                          Dirección
                                        </p>
                                        <p className="text-sm text-zinc-300">{order.address}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                                          ID completo
                                        </p>
                                        <p className="text-xs text-zinc-400 font-mono break-all">
                                          {order.id}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="border-t border-white/5 pt-3">
                                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
                                        Productos
                                      </p>
                                      {items.map((it: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/5 overflow-hidden flex-shrink-0">
                                              <img
                                                src={resolveProductImageUrl(
                                                  it.name,
                                                  it.category,
                                                  it.image_url
                                                )}
                                                alt=""
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                  const el = e.currentTarget
                                                  el.onerror = null
                                                  el.src = categoryFallbackImage(it.category)
                                                }}
                                              />
                                            </div>
                                            <div>
                                              <p className="text-sm text-zinc-200 font-medium">
                                                {it.name}
                                              </p>
                                              <p className="text-[10px] text-zinc-500">
                                                ×{it.quantity || 1}
                                              </p>
                                            </div>
                                          </div>
                                          <span className="text-sm font-bold text-emerald-400 font-tech">
                                            {formatPEN(
                                              Number(it.price || 0) * Number(it.quantity || 1)
                                            )}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )
                          }
                        </Fragment>
                      )
                    })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )
      }

      {/* ══════════════ HISTORIAL TAB ══════════════ */}
      {
        activeTab === 'history' && (
          <div className="bg-[#0a0a0c] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-8 py-6 bg-zinc-900/10 border-b border-white/5 gap-4">
              <div>
                <h3 className="font-tech text-base font-black uppercase tracking-tight text-white">Historial de Órdenes</h3>
                <p className="text-xs text-zinc-500 font-medium">Pedidos que ya fueron completados (Entregados o Rechazados)</p>
              </div>
              {orders.filter(o => o.status === 'delivered' || o.status === 'rejected').length > 0 && (
                <Button
                  variant="ghost"
                  onClick={handleClearHistory}
                  className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold h-10 px-4 rounded-xl text-[10px] uppercase tracking-wider transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Borrar todo el historial
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              {ordersLoading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                  <p className="text-zinc-500 font-bold tracking-widest text-xs uppercase font-tech">
                    Cargando historial...
                  </p>
                </div>
              ) : orders.filter(o => o.status === 'delivered' || o.status === 'rejected').length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                  <History className="w-12 h-12 text-zinc-700" />
                  <p className="text-zinc-500 font-bold text-sm">El historial está vacío</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">
                      <th className="px-6 py-5">Cliente</th>
                      <th className="px-6 py-5">Email</th>
                      <th className="px-6 py-5">Items</th>
                      <th className="px-6 py-5">Total</th>
                      <th className="px-6 py-5">Estado</th>
                      <th className="px-6 py-5">Fecha</th>
                      <th className="px-6 py-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {orders
                      .filter(o => o.status === 'delivered' || o.status === 'rejected')
                      .map((order) => {
                        const items = Array.isArray(order.items) ? order.items : []
                        const isExpanded = expandedOrder === order.id

                        return (
                          <Fragment key={order.id}>
                            <tr className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-6 py-5 align-middle">
                                <p className="font-bold text-zinc-100 text-sm">{order.customer_name}</p>
                                <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                                  {order.id.slice(0, 8)}...
                                </p>
                              </td>
                              <td className="px-6 py-5 align-middle">
                                <span className="text-zinc-400 text-xs">{order.customer_email}</span>
                              </td>
                              <td className="px-6 py-5 align-middle">
                                <button
                                  onClick={() =>
                                    setExpandedOrder(isExpanded ? null : order.id)
                                  }
                                  className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                  {items.length} items
                                  {isExpanded ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </button>
                              </td>
                              <td className="px-6 py-5 align-middle">
                                <span className="text-emerald-400 font-black font-tech text-base">
                                  {formatPEN(Number(order.total))}
                                </span>
                              </td>
                              <td className="px-6 py-5 align-middle">
                                {getStatusBadge(order.status)}
                              </td>
                              <td className="px-6 py-5 align-middle">
                                <span className="text-zinc-500 text-[11px]">
                                  {new Date(order.created_at).toLocaleDateString('es-PE', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </td>
                              <td className="px-6 py-5 align-middle text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-9 w-9 p-0 rounded-lg transition-colors"
                                  title="Eliminar de por vida del historial"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>

                            {/* Expanded details */}
                            {isExpanded && (
                              <tr className="bg-white/[0.01]">
                                <td colSpan={7} className="px-6 pb-6">
                                  <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/5 space-y-3 mt-2">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div>
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                                          Dirección
                                        </p>
                                        <p className="text-sm text-zinc-300">{order.address}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                                          ID completo
                                        </p>
                                        <p className="text-xs text-zinc-400 font-mono break-all">
                                          {order.id}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="border-t border-white/5 pt-3">
                                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
                                        Productos
                                      </p>
                                      {items.map((it: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/5 overflow-hidden flex-shrink-0">
                                              <img
                                                src={resolveProductImageUrl(
                                                  it.name,
                                                  it.category,
                                                  it.image_url
                                                )}
                                                alt=""
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                  const el = e.currentTarget
                                                  el.onerror = null
                                                  el.src = categoryFallbackImage(it.category)
                                                }}
                                              />
                                            </div>
                                            <div>
                                              <p className="text-sm text-zinc-200 font-medium">
                                                {it.name}
                                              </p>
                                              <p className="text-[10px] text-zinc-500">
                                                ×{it.quantity || 1}
                                              </p>
                                            </div>
                                          </div>
                                          <span className="text-sm font-bold text-emerald-400 font-tech">
                                            {formatPEN(
                                              Number(it.price || 0) * Number(it.quantity || 1)
                                            )}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        )
      } {/* ══════════════ ADD PRODUCT MODAL ══════════════ */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tighter font-tech">
              Añadir <span className="text-indigo-500">Producto</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                Nombre del producto *
              </Label>

              <Input
                placeholder="Ej: NVIDIA GeForce RTX 4070"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    name: e.target.value,
                  })
                }
                className="bg-zinc-900 border-white/10 h-11 text-white"
              />
            </div>

            {/* Category + Price row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                  Categoría *
                </Label>

                <Select
                  value={addForm.category}
                  onValueChange={(val) => {
                    if (val) setAddForm({ ...addForm, category: val })
                  }}
                >
                  <SelectTrigger className="bg-zinc-900 border-white/10 h-11 text-white">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>

                  <SelectContent className="bg-zinc-900 border-white/10 z-[9999] pointer-events-auto">
                    {CATEGORIES.map((cat) => (
                      <SelectItem
                        key={cat}
                        value={cat}
                        className="text-white cursor-pointer"
                      >
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                  Precio (S/) *
                </Label>

                <Input
                  type="number"
                  placeholder="0"
                  value={addForm.price || ''}
                  onChange={(e) =>
                    setAddForm({ ...addForm, price: Number(e.target.value) })
                  }
                  className="bg-zinc-900 border-white/10 h-11 text-white"
                />
              </div>
            </div>

            {/* Stock + Featured */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                  Stock (unidades)
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={addForm.stock || ''}
                  onChange={(e) =>
                    setAddForm({ ...addForm, stock: Number(e.target.value) })
                  }
                  className="bg-zinc-900 border-white/10 h-11 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                  Producto Destacado
                </Label>
                <button
                  type="button"
                  onClick={() =>
                    setAddForm({ ...addForm, is_featured: !addForm.is_featured })
                  }
                  className={`w-full h-11 rounded-lg border flex items-center justify-center gap-2 text-xs font-bold transition-all ${addForm.is_featured
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-zinc-900 border-white/10 text-zinc-500'
                    }`}
                >
                  <Star
                    className={`w-4 h-4 ${addForm.is_featured ? 'fill-amber-400' : ''}`}
                  />
                  {addForm.is_featured ? 'Destacado ✓' : 'No destacado'}
                </button>
              </div>
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                URL de imagen (opcional)
              </Label>
              <Input
                placeholder="https://ejemplo.com/imagen.jpg"
                value={addForm.image_url}
                onChange={(e) =>
                  setAddForm({ ...addForm, image_url: e.target.value })
                }
                className="bg-zinc-900 border-white/10 h-11 text-white"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                Descripción (opcional)
              </Label>
              <textarea
                placeholder="Descripción detallada del producto..."
                value={addForm.description}
                onChange={(e) =>
                  setAddForm({ ...addForm, description: e.target.value })
                }
                rows={3}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>

            {/* Specs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                  Especificaciones (opcional)
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setAddForm({
                      ...addForm,
                      specs: [...addForm.specs, { key: '', value: '' }],
                    })
                  }
                  className="text-indigo-400 hover:text-indigo-300 text-xs h-8"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Agregar spec
                </Button>
              </div>
              {addForm.specs.map((spec, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    placeholder="Clave (ej: Núcleos)"
                    value={spec.key}
                    onChange={(e) => {
                      const updated = [...addForm.specs]
                      updated[idx].key = e.target.value
                      setAddForm({ ...addForm, specs: updated })
                    }}
                    className="bg-zinc-900 border-white/10 h-9 text-white text-xs flex-1"
                  />
                  <Input
                    placeholder="Valor (ej: 16)"
                    value={spec.value}
                    onChange={(e) => {
                      const updated = [...addForm.specs]
                      updated[idx].value = e.target.value
                      setAddForm({ ...addForm, specs: updated })
                    }}
                    className="bg-zinc-900 border-white/10 h-9 text-white text-xs flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const updated = addForm.specs.filter((_, i) => i !== idx)
                      setAddForm({ ...addForm, specs: updated })
                    }}
                    className="text-red-400 hover:text-red-300 h-9 w-9 p-0 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowAddModal(false)}
              className="text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddProduct}
              disabled={addLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 shadow-lg shadow-indigo-600/20"
            >
              {addLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Crear Producto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  )
}

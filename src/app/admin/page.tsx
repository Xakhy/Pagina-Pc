'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, Loader2, Save, RefreshCw, LayoutDashboard } from 'lucide-react'
import { toast } from 'sonner'
import { formatPEN } from '@/lib/utils'
import {
  resolveProductImageUrl,
  categoryFallbackImage,
} from '@/lib/product-images'

export default function AdminPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  
  const supabase = createClient()

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category', { ascending: true })
    
    if (error) {
      toast.error('Error al cargar productos')
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }

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

  const handleEdit = (product: any) => {
    setEditingId(product.id)
    setEditForm(product)
  }

  const handleSave = async () => {
    const { error } = await supabase
      .from('products')
      .update({
        name: editForm.name,
        price: editForm.price,
        stock: editForm.stock,
        category: editForm.category,
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
            <p className="text-zinc-500 text-sm font-medium">Gestión de inventario y precios en tiempo real</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={handleSync}
            disabled={syncing}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold h-12 px-6 rounded-xl border border-white/5"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sincronizar Catálogo
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-indigo-600/20">
            <Plus className="w-4 h-4 mr-2" />
            Añadir Producto
          </Button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Productos</p>
          <p className="text-3xl font-bold text-white font-tech">{products.length}</p>
        </div>
        <div className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Sin Stock</p>
          <p className="text-3xl font-bold text-red-400 font-tech">{products.filter(p => p.stock === 0).length}</p>
        </div>
        <div className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Valor Inventario</p>
          <p className="text-3xl font-bold text-emerald-400 font-tech">
            {formatPEN(products.reduce((acc, p) => acc + (p.price * p.stock), 0))}
          </p>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-[#0a0a0c] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-zinc-500 font-bold tracking-widest text-xs uppercase font-tech">Cargando base de datos...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">
                  <th className="px-8 py-6">Hardware</th>
                  <th className="px-8 py-6">Categoría</th>
                  <th className="px-8 py-6">Precio</th>
                  <th className="px-8 py-6">Stock</th>
                  <th className="px-8 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/5 overflow-hidden flex-shrink-0">
                          <img
                            src={resolveProductImageUrl(
                              p.name,
                              p.category,
                              p.image_url
                            )}
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
                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                            className="bg-zinc-900 border-white/10 h-10"
                          />
                        ) : (
                          <span className="font-bold text-zinc-100 text-sm">{p.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {editingId === p.id ? (
                        <Input 
                          value={editForm.category} 
                          onChange={e => setEditForm({...editForm, category: e.target.value})}
                          className="bg-zinc-900 border-white/10 h-10"
                        />
                      ) : (
                        <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{p.category}</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      {editingId === p.id ? (
                        <Input 
                          type="number"
                          value={editForm.price} 
                          onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
                          className="bg-zinc-900 border-white/10 h-10 w-32"
                        />
                      ) : (
                        <span className="text-emerald-400 font-black font-tech text-base">{formatPEN(p.price)}</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      {editingId === p.id ? (
                        <Input 
                          type="number"
                          value={editForm.stock} 
                          onChange={e => setEditForm({...editForm, stock: Number(e.target.value)})}
                          className="bg-zinc-900 border-white/10 h-10 w-24"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.stock > 5 ? 'bg-emerald-500' : p.stock > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                          <span className="text-zinc-300 font-bold text-xs">{p.stock} unid.</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {editingId === p.id ? (
                          <Button size="sm" variant="ghost" onClick={handleSave} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 h-10 w-10 p-0 rounded-xl">
                            <Save className="w-5 h-5" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(p)} className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 h-10 w-10 p-0 rounded-xl">
                            <Pencil className="w-5 h-5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-10 w-10 p-0 rounded-xl">
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
    </div>
  )
}

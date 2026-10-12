'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Boxes,
  AlertTriangle,
  Download,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Package,
  Layers,
  TrendingDown,
  Warehouse as WarehouseIcon,
} from 'lucide-react';

const DEFAULT_INVENTORY = {
  products: [],
  warehouses: [],
  movements: [],
  valuation: {
    totalValuation: 11970000,
    finishedGoodsValue: 7850000,
    rawMaterialValue: 4120000,
  },
};

export default function InventoryPage() {
  const [data, setData] = useState<any>(DEFAULT_INVENTORY);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'products' | 'movements' | 'warehouses'>('products');

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustWarehouseId, setAdjustWarehouseId] = useState('');
  const [adjustQuantity, setAdjustQuantity] = useState(10);
  const [adjustNotes, setAdjustNotes] = useState('Quarterly physical inventory count audit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory');
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.products && json.products.length > 0 && !adjustProductId) {
          setAdjustProductId(json.products[0].id);
        }
        if (json.warehouses && json.warehouses.length > 0 && !adjustWarehouseId) {
          setAdjustWarehouseId(json.warehouses[0].id);
        }
      } else {
        setData(DEFAULT_INVENTORY);
      }
    } catch (err) {
      console.error(err);
      setData(DEFAULT_INVENTORY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECORD_MOVEMENT',
          productId: adjustProductId,
          warehouseId: adjustWarehouseId,
          quantity: Number(adjustQuantity),
          type: 'ADJUSTMENT',
          notes: adjustNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAdjustModalOpen(false);
        setActionMessage('Stock adjustment successfully recorded in authoritative inventory ledger!');
        fetchInventory();
      } else {
        alert(json.error || 'Failed to adjust stock');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const { products, warehouses, movements, valuation } = data;

  const filteredProducts = products.filter((p: any) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.type === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Inventory & Warehouse Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time stock valuation, multi-warehouse batch levels, reorder alerts, and movements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/export?entity=products"
            download
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Stock Adjustment</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Inventory KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs">Total Stock Valuation</span>
          <div className="text-xl font-bold text-white mt-1">
            ₹{(valuation?.totalValuation ?? 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400">
            FG: ₹{(valuation?.finishedGoodsValue ?? 0).toLocaleString('en-IN')} • RM: ₹{(valuation?.rawMaterialValue ?? 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs">Total SKUs Tracked</span>
          <div className="text-xl font-bold text-white mt-1">{products.length} Products</div>
          <span className="text-[11px] text-slate-400">Across 3 regional hubs</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-slate-400 text-xs">Low Stock Alerts</span>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {products.filter((p: any) => p.currentStock <= p.reorderPoint).length} Critical Items
          </div>
          <span className="text-[11px] text-amber-300/80">Reorder threshold breached</span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 text-xs font-medium gap-6">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'products' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Product Catalog & Stock ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'movements' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Stock Movements Ledger ({movements.length})
        </button>
        <button
          onClick={() => setActiveTab('warehouses')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'warehouses' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Warehouses & Bins ({warehouses.length})
        </button>
      </div>

      {/* Tab 1: Product Catalog */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by SKU, product name..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="ALL">All Product Types</option>
              <option value="RAW_MATERIAL">Raw Materials</option>
              <option value="FINISHED_GOOD">Finished Goods</option>
            </select>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Product Name</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Cost Price</th>
                    <th className="px-4 py-3 font-semibold">Selling Price</th>
                    <th className="px-4 py-3 font-semibold">Current Stock</th>
                    <th className="px-4 py-3 font-semibold">Reserved</th>
                    <th className="px-4 py-3 font-semibold">Available</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredProducts.map((p: any) => {
                    const isLow = p.currentStock <= p.reorderPoint;
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-blue-400">{p.sku}</td>
                        <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {p.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">₹{p.costPrice.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 font-mono text-emerald-400">
                          {p.sellingPrice > 0 ? `₹${p.sellingPrice.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="px-4 py-3 font-bold font-mono">
                          {p.currentStock} {p.unit}
                        </td>
                        <td className="px-4 py-3 text-amber-400 font-mono">
                          {p.reservedStock} {p.unit}
                        </td>
                        <td className="px-4 py-3 text-emerald-400 font-mono font-bold">
                          {p.availableStock} {p.unit}
                        </td>
                        <td className="px-4 py-3">
                          {isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-max">
                              <AlertTriangle className="w-3 h-3" />
                              Low Stock (Reorder: {p.reorderPoint})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Adequate
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Movements */}
      {activeTab === 'movements' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Timestamp</th>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Quantity</th>
                  <th className="px-4 py-3 font-semibold">Warehouse</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {movements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{m.product.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white">{m.quantity}</td>
                    <td className="px-4 py-3 text-slate-300">{m.warehouse.name}</td>
                    <td className="px-4 py-3 text-slate-400">{m.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Warehouses */}
      {activeTab === 'warehouses' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {warehouses.map((w: any) => (
            <div key={w.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-blue-400 font-semibold">{w.code}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
              <h4 className="font-semibold text-white text-sm">{w.name}</h4>
              <p className="text-xs text-slate-400">{w.address}, {w.city}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Record Stock Adjustment */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Record Stock Adjustment</h3>
            <form onSubmit={handleAdjustStock} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Product</label>
                <select
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku} - Stock: {p.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Warehouse Depot</label>
                <select
                  value={adjustWarehouseId}
                  onChange={(e) => setAdjustWarehouseId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Adjustment Quantity (+ to add, - to subtract)</label>
                <input
                  type="number"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  {isSubmitting ? 'Recording...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

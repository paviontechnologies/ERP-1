'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Truck,
  Plus,
  CheckCircle2,
  Download,
  RefreshCw,
  PackageCheck,
  AlertTriangle,
  Building2,
  FileCheck,
} from 'lucide-react';

export default function ProcurementPage() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'vendors' | 'grns'>('orders');

  // Create PO Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [poQuantity, setPoQuantity] = useState(100);
  const [poUnitPrice, setPoUnitPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Goods Receipt Modal
  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [rawProducts, setRawProducts] = useState<any[]>([]);

  const fetchProcurement = async () => {
    setLoading(true);
    try {
      const [procRes, invRes] = await Promise.all([
        fetch('/api/procurement'),
        fetch('/api/inventory'),
      ]);
      const procJson = await procRes.json();
      const invJson = await invRes.json();

      if (procJson.success) {
        setData(procJson);
      } else {
        setData({ orders: [], vendors: [], goodsReceipts: [] });
      }
      if (invJson.success && invJson.warehouses) {
        setWarehouses(invJson.warehouses);
        if (invJson.warehouses.length > 0) setSelectedWarehouse(invJson.warehouses[0].id);

        const raw = (invJson.products || []).filter((p: any) => p.type === 'RAW_MATERIAL');
        setRawProducts(raw);
        if (raw.length > 0) {
          setSelectedProduct(raw[0].id);
          setPoUnitPrice(raw[0].costPrice);
        }
      }
    } catch (err) {
      console.error(err);
      setData({ orders: [], vendors: [], goodsReceipts: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurement();
  }, []);

  const handleProductSelect = (id: string) => {
    setSelectedProduct(id);
    const p = rawProducts.find((item) => item.id === id);
    if (p) setPoUnitPrice(p.costPrice);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || !selectedProduct) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_PO',
          vendorId: selectedVendor,
          items: [{ productId: selectedProduct, quantity: Number(poQuantity), unitPrice: Number(poUnitPrice) }],
          userId: currentUser.email,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsCreateModalOpen(false);
        setActionMessage(`Draft Purchase Order ${json.po.poNumber} created and routed for approval.`);
        fetchProcurement();
      } else {
        alert(json.error || 'Failed to create PO');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePO = async (poId: string) => {
    try {
      const res = await fetch('/api/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE_PO',
          poId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(`Purchase Order approved and issued to supplier.`);
        fetchProcurement();
      } else {
        alert(json.error || 'Failed to approve PO');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleProcessGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PROCESS_GRN',
          poId: selectedPO.id,
          warehouseId: selectedWarehouse,
          carrier: 'Apex Dedicated Logistics',
          trackingNumber: `TRK-${Date.now().toString().slice(-6)}`,
          items: selectedPO.items.map((i: any) => ({
            productId: i.productId,
            receivedQuantity: i.quantity - i.receivedQuantity,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsGrnModalOpen(false);
        setActionMessage(`Goods Receipt Note ${json.grn.grnNumber} generated! Inventory and Accounts Payable updated.`);
        fetchProcurement();
      } else {
        alert(json.error || 'Failed to process GRN');
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

  const { orders, vendors, goodsReceipts } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Procurement & Vendor Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Procure-to-Pay pipeline: Purchase Requisitions, Vendor POs, 3-Way Match & Goods Receipt Notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/export?entity=procurement"
            download
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export POs</span>
          </a>

          <button
            onClick={() => {
              if (vendors.length > 0) setSelectedVendor(vendors[0].id);
              setIsCreateModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Purchase Order</span>
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

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-medium gap-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'orders' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Purchase Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'vendors' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Approved Suppliers ({vendors.length})
        </button>
        <button
          onClick={() => setActiveTab('grns')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'grns' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Goods Receipt Notes / GRN ({goodsReceipts.length})
        </button>
      </div>

      {/* Tab 1: Purchase Orders */}
      {activeTab === 'orders' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">PO #</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Items</th>
                  <th className="px-4 py-3 font-semibold">Total Commitment</th>
                  <th className="px-4 py-3 font-semibold">Expected Delivery</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Workflow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {orders.map((po: any) => (
                  <tr key={po.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-blue-400">{po.poNumber}</td>
                    <td className="px-4 py-3 font-medium text-white">{po.vendor.name}</td>
                    <td className="px-4 py-3">
                      {po.items.map((i: any) => (
                        <div key={i.id} className="text-[11px] text-slate-300">
                          {i.quantity} {i.product.unit} • {i.product.name} (Recv: {i.receivedQuantity})
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      ₹{po.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {po.expectedDeliveryDate ? po.expectedDeliveryDate.split('T')[0] : 'Open'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          po.status === 'RECEIVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : po.status === 'ISSUED'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {po.status === 'DRAFT' && (
                        <button
                          onClick={() => handleApprovePO(po.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-medium transition-colors"
                        >
                          Approve & Issue
                        </button>
                      )}
                      {po.status === 'ISSUED' && (
                        <button
                          onClick={() => {
                            setSelectedPO(po);
                            setIsGrnModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1"
                        >
                          <PackageCheck className="w-3 h-3" />
                          <span>Receive Stock (GRN)</span>
                        </button>
                      )}
                      {po.status === 'RECEIVED' && (
                        <span className="text-emerald-400 text-[11px]">Goods Received</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Vendors */}
      {activeTab === 'vendors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.map((v: any) => (
            <div key={v.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white text-sm">{v.name}</h3>
                  <span className="text-slate-400 text-xs font-mono">{v.code}</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  ★ {v.rating} Rating
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">Contact Person</span>
                  <span className="font-medium text-white">{v.contactPerson}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Payment Terms</span>
                  <span className="font-medium text-white">{v.paymentTermsDays} Days</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: GRN */}
      {activeTab === 'grns' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">GRN #</th>
                  <th className="px-4 py-3 font-semibold">PO #</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Received Date</th>
                  <th className="px-4 py-3 font-semibold">Carrier / Tracking</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {goodsReceipts.map((g: any) => (
                  <tr key={g.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-blue-400">{g.grnNumber}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{g.purchaseOrder.poNumber}</td>
                    <td className="px-4 py-3 font-medium text-white">{g.purchaseOrder.vendor.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {new Date(g.receivedDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{g.carrier} ({g.trackingNumber})</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {g.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create PO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create Purchase Order</h3>
            <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Select Supplier</label>
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {vendors.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Terms: {v.paymentTermsDays} days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Product to Procure</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {rawProducts.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku} • In Stock: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Order Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={poQuantity}
                    onChange={(e) => setPoQuantity(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Negotiated Unit Price (₹)</label>
                  <input
                    type="number"
                    value={poUnitPrice}
                    onChange={(e) => setPoUnitPrice(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Procurement Value (incl 18% GST):</span>
                <span className="font-bold text-white text-sm">
                  ₹{Math.round(poQuantity * poUnitPrice * 1.18).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Submit Purchase Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Process Goods Receipt */}
      {isGrnModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Receive Stock (Goods Receipt Note)</h3>
            <p className="text-xs text-slate-400">
              Receiving shipment for PO <span className="font-mono text-white">{selectedPO.poNumber}</span> from{' '}
              <span className="text-white">{selectedPO.vendor.name}</span>.
            </p>

            <form onSubmit={handleProcessGRN} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Destination Warehouse</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-blue-200 text-xs">
                Receiving will automatically increment inventory levels, create stock movement logs, and post the payable liability to General Ledger.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGrnModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {isSubmitting ? 'Receiving...' : 'Confirm Goods Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

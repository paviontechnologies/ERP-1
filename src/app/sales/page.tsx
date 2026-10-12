'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  DollarSign,
  FileText,
  AlertCircle,
  Download,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Truck,
  ArrowRight,
} from 'lucide-react';

export default function SalesPage() {
  const { role, currentUser } = useAuth();
  const [data, setData] = useState<any>({ orders: [], customers: [], invoices: [], leads: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'invoices' | 'customers' | 'leads'>('orders');

  // New Order Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderUnitPrice, setOrderUnitPrice] = useState(0);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Available Products for order creation
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, invRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/inventory'),
      ]);
      const salesJson = await salesRes.json();
      const invJson = await invRes.json();

      if (salesJson.success) {
        setData(salesJson);
      } else {
        setData({ orders: [], customers: [], invoices: [], leads: [] });
      }
      if (invJson.success && invJson.products) {
        const finishedGoods = invJson.products.filter((p: any) => p.type === 'FINISHED_GOOD');
        setAvailableProducts(finishedGoods);
        if (finishedGoods.length > 0) {
          setSelectedProduct(finishedGoods[0].id);
          setOrderUnitPrice(finishedGoods[0].sellingPrice);
        }
      }
    } catch (err) {
      console.error(err);
      setData({ orders: [], customers: [], invoices: [], leads: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProductSelect = (prodId: string) => {
    setSelectedProduct(prodId);
    const prod = availableProducts.find((p) => p.id === prodId);
    if (prod) setOrderUnitPrice(prod.sellingPrice);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedProduct) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_ORDER',
          customerId: selectedCustomer,
          items: [{ productId: selectedProduct, quantity: Number(orderQuantity), unitPrice: Number(orderUnitPrice) }],
          notes: orderNotes,
          userId: currentUser.email,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsCreateModalOpen(false);
        setActionMessage(`Draft Sales Order ${json.order.orderNumber} created successfully!`);
        fetchData();
      } else {
        alert(json.error || 'Failed to create order');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    if (!confirm('Confirm this order? This will automatically reserve inventory, generate an invoice, and post to General Ledger.')) return;
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CONFIRM_ORDER',
          orderId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(`Order confirmed! Invoice ${json.result.invoice.invoiceNumber} created & inventory reserved.`);
        fetchData();
      } else {
        alert(json.error || 'Failed to confirm order');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECORD_PAYMENT',
          invoiceId: selectedInvoice.id,
          amount: Number(paymentAmount),
          paymentMethod: 'BANK_TRANSFER',
          referenceNumber: `NEFT-TRANS-${Date.now().toString().slice(-6)}`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsPaymentModalOpen(false);
        setActionMessage(`Payment ₹${paymentAmount.toLocaleString('en-IN')} recorded & AR updated.`);
        fetchData();
      } else {
        alert(json.error || 'Payment failed');
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

  const { orders, customers, invoices, leads } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sales & Customer Management (CRM)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Order-to-Cash pipeline: Quotations, Sales Orders, Credit Checks, Invoicing & Receivables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/export?entity=sales"
            download
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Orders</span>
          </a>

          <button
            onClick={() => {
              if (customers.length > 0) setSelectedCustomer(customers[0].id);
              setIsCreateModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Sales Order</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-medium gap-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'orders' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Sales Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'invoices' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Customer Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'customers' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Customers & Credit ({customers.length})
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'leads' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          CRM Leads Funnel ({leads.length})
        </button>
      </div>

      {/* Tab 1: Sales Orders */}
      {activeTab === 'orders' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order #</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Items</th>
                  <th className="px-4 py-3 font-semibold">Total Amount</th>
                  <th className="px-4 py-3 font-semibold">Order Status</th>
                  <th className="px-4 py-3 font-semibold">Payment Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {orders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-blue-400">{o.orderNumber}</td>
                    <td className="px-4 py-3 font-medium text-white">{o.customer.name}</td>
                    <td className="px-4 py-3">
                      {o.items.map((i: any) => (
                        <div key={i.id} className="text-[11px] text-slate-300">
                          {i.quantity}x {i.product.name}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      ₹{o.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          o.status === 'CONFIRMED'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : o.status === 'DELIVERED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : o.status === 'DRAFT'
                            ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          o.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : o.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {o.status === 'DRAFT' ? (
                        <button
                          onClick={() => handleConfirmOrder(o.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-medium transition-colors"
                        >
                          Confirm & Reserve
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Invoiced</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Invoices */}
      {activeTab === 'invoices' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Invoice #</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Due Date</th>
                  <th className="px-4 py-3 font-semibold">Total Amount</th>
                  <th className="px-4 py-3 font-semibold">Paid Amount</th>
                  <th className="px-4 py-3 font-semibold">Balance Due</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-blue-400">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium text-white">{inv.customer.name}</td>
                    <td className="px-4 py-3 font-mono">{inv.dueDate ? inv.dueDate.split('T')[0] : 'N/A'}</td>
                    <td className="px-4 py-3 font-semibold">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-emerald-400">₹{inv.paidAmount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 font-bold text-rose-400">₹{inv.balanceDue.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : inv.status === 'OVERDUE'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {inv.balanceDue > 0 ? (
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setPaymentAmount(inv.balanceDue);
                            setIsPaymentModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-medium transition-colors"
                        >
                          Record Payment
                        </button>
                      ) : (
                        <span className="text-emerald-400 text-[11px]">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Customers */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customers.map((c: any) => (
            <div key={c.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white text-sm">{c.name}</h3>
                  <span className="text-slate-400 text-xs font-mono">{c.code}</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                  {c.paymentTermsDays} Days Terms
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">Credit Limit</span>
                  <span className="font-semibold text-white">₹{c.creditLimit.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Current Outstanding</span>
                  <span className={`font-semibold ${c.outstandingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ₹{c.outstandingBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Leads */}
      {activeTab === 'leads' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leads.map((l: any) => (
            <div key={l.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {l.status}
                </span>
                <span className="text-xs font-bold text-emerald-400">₹{l.estimatedValue.toLocaleString('en-IN')}</span>
              </div>
              <h4 className="font-semibold text-white text-xs">{l.name}</h4>
              <p className="text-[11px] text-slate-400">Source: {l.source || 'Inbound Direct'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Sales Order */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Sales Order</h3>
            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Credit Avail: ₹{(c.creditLimit - c.outstandingBalance).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Product</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {availableProducts.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Available: {p.availableStock} {p.unit} • Price: ₹{p.sellingPrice.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    value={orderUnitPrice}
                    onChange={(e) => setOrderUnitPrice(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Order Notes</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Standard dispatch terms"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between items-center text-xs">
                <span className="text-slate-400">Projected Total (incl 18% GST):</span>
                <span className="font-bold text-white text-sm">
                  ₹{Math.round(orderQuantity * orderUnitPrice * 1.18).toLocaleString('en-IN')}
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
                  <span>Create Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Customer Payment */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Record Customer Payment</h3>
            <p className="text-xs text-slate-400">
              Invoice: <span className="text-white font-mono">{selectedInvoice.invoiceNumber}</span> • Customer:{' '}
              <span className="text-white">{selectedInvoice.customer.name}</span>
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  max={selectedInvoice.balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Remaining balance due: ₹{selectedInvoice.balanceDue.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {isSubmitting ? 'Recording...' : 'Post Payment to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

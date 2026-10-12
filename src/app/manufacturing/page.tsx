'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Factory,
  Plus,
  CheckCircle2,
  RefreshCw,
  Clock,
  Layers,
  Wrench,
  AlertTriangle,
  ArrowRight,
  PackageCheck,
} from 'lucide-react';

export default function ManufacturingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workOrders' | 'boms'>('workOrders');

  // Create Work Order Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState('');
  const [targetQuantity, setTargetQuantity] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchManufacturing = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/manufacturing');
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.boms.length > 0 && !selectedBOM) {
          setSelectedBOM(json.boms[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManufacturing();
  }, []);

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBOM) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/manufacturing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_WORK_ORDER',
          bomId: selectedBOM,
          targetQuantity: Number(targetQuantity),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsCreateModalOpen(false);
        setActionMessage(`Work Order ${json.workOrder.workOrderNumber} scheduled! Assembly routing initiated.`);
        fetchManufacturing();
      } else {
        alert(json.error || 'Failed to create work order');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteWorkOrder = async (wo: any) => {
    if (!confirm(`Complete production for ${wo.workOrderNumber}? This will consume raw materials and add ${wo.targetQuantity} units to Finished Goods.`)) return;
    try {
      const res = await fetch('/api/manufacturing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COMPLETE_WORK_ORDER',
          workOrderId: wo.id,
          producedQuantity: wo.targetQuantity,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(`Production completed! Consumed raw materials and added ${wo.targetQuantity} ${wo.finishedProduct.name} to Finished Goods.`);
        fetchManufacturing();
      } else {
        alert(json.error || 'Failed to complete work order');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const { workOrders, boms } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Manufacturing & Production (Plan-to-Produce)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Bill of Materials explosion, work order dispatch, real-time material consumption, and plant efficiency.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Launch Work Order</span>
        </button>
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
          onClick={() => setActiveTab('workOrders')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'workOrders' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Active Work Orders ({workOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('boms')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'boms' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Bill of Materials (BOM) Specs ({boms.length})
        </button>
      </div>

      {/* Tab 1: Work Orders */}
      {activeTab === 'workOrders' && (
        <div className="space-y-4">
          {workOrders.map((wo: any) => (
            <div key={wo.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Factory className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-semibold text-blue-400">{wo.workOrderNumber}</span>
                    <h3 className="font-semibold text-white text-sm">{wo.finishedProduct.name}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      wo.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {wo.status}
                  </span>

                  {wo.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleCompleteWorkOrder(wo)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Complete & Consume BOM</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Work Order Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Target Quantity</span>
                  <span className="font-bold text-white">{wo.targetQuantity} Units</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Produced Quantity</span>
                  <span className="font-bold text-emerald-400">{wo.producedQuantity} Units</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Estimated Manufacturing Cost</span>
                  <span className="font-bold text-white">₹{wo.totalCost.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">BOM Spec Used</span>
                  <span className="font-mono text-slate-300">{wo.bom.bomNumber} (v{wo.bom.version})</span>
                </div>
              </div>

              {/* Plant Floor Operations Routing */}
              <div>
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Shop Floor Assembly Routing
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  {wo.operations.map((op: any) => (
                    <div
                      key={op.id}
                      className={`p-2.5 rounded-xl border text-xs ${
                        op.status === 'COMPLETED'
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                          : op.status === 'RUNNING'
                          ? 'bg-blue-950/20 border-blue-500/30 text-blue-300 animate-pulse'
                          : 'bg-slate-800/40 border-slate-700/40 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span>STAGE {op.sequence}</span>
                        <span className="font-bold">{op.status}</span>
                      </div>
                      <span className="font-medium block leading-tight">{op.operationName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: BOM Catalog */}
      {activeTab === 'boms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boms.map((b: any) => (
            <div key={b.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-blue-400 font-semibold">{b.bomNumber}</span>
                  <h3 className="font-semibold text-white text-sm mt-0.5">{b.name}</h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                  Version {b.version}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-medium block mb-2">Required Raw Materials per Unit:</span>
                <div className="space-y-1.5 divide-y divide-slate-800/60">
                  {b.items.map((item: any) => (
                    <div key={item.id} className="pt-1.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-white font-medium">{item.rawMaterial.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 block">{item.rawMaterial.sku}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400 font-mono">
                          {item.quantityPerUnit} {item.rawMaterial.unit}
                        </span>
                        <span className="text-[10px] text-slate-400 block">@ ₹{item.unitCost} / unit</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Work Order */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Launch Production Work Order</h3>
            <form onSubmit={handleCreateWorkOrder} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Select Bill of Materials (BOM)</label>
                <select
                  value={selectedBOM}
                  onChange={(e) => setSelectedBOM(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {boms.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.bomNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Production Units</label>
                <input
                  type="number"
                  min="1"
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-blue-200 text-xs">
                Creating this work order will initiate 4-stage assembly routing on the factory floor and verify raw material stock in warehouse.
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
                  <span>Dispatch Work Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

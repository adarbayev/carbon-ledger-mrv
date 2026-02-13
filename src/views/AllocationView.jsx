import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CBAM_CN_CODES, getCnCodeInfo, getSectors, calcFuelEmissions, calcElecEmissions } from '../data/referenceData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronDown, ChevronRight, Package, AlertTriangle } from 'lucide-react';

export default function AllocationView() {
    const { state, dispatch } = useApp();
    const [expandedProducts, setExpandedProducts] = useState({});
    const [cnSearch, setCnSearch] = useState({});

    // --- Calculations ---
    const totalDirect = Math.round(state.activity.fuels.reduce((sum, f) => sum + calcFuelEmissions(f).total, 0));
    const totalIndirect = Math.round(state.activity.electricity.reduce((sum, e) => sum + calcElecEmissions(e), 0));

    const treatResidueAsWaste = state.allocationSettings.treatResidueAsWaste;
    const validProducts = state.products.filter(p => !treatResidueAsWaste || !p.isResidue);
    const totalMass = validProducts.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0);

    const toggleExpand = (productId) => {
        setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
    };

    // Filter CN codes based on search
    const getFilteredCnCodes = (productId) => {
        const search = (cnSearch[productId] || '').toLowerCase();
        if (!search) return CBAM_CN_CODES;
        return CBAM_CN_CODES.filter(c =>
            c.code.toLowerCase().includes(search) ||
            c.name.toLowerCase().includes(search) ||
            c.sector.toLowerCase().includes(search)
        );
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <h2 className="section-title text-slate-800">Allocation & Products</h2>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                {/* Left Col: Products */}
                <div className="space-y-4">
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Package size={20} className="text-blue-500" />
                                <h3 className="text-lg font-semibold text-slate-700">Production Output</h3>
                            </div>
                            <button className="btn ghost small" onClick={() => dispatch({ type: 'ADD_PRODUCT' })}>+ Add Product</button>
                        </div>

                        {state.products.length > 0 ? (
                            <div className="space-y-3">
                                {state.products.map(p => {
                                    const cnInfo = getCnCodeInfo(p.cnCode);
                                    const isComplex = cnInfo?.isComplex || false;
                                    const isExpanded = expandedProducts[p.id];
                                    const hasPrecursors = (p.precursors || []).length > 0;

                                    return (
                                        <div key={p.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                            {/* Product Row */}
                                            <div className="p-3 bg-white">
                                                <div className="grid grid-cols-[1fr_160px_140px_80px_40px] gap-3 items-start">
                                                    <input type="text" value={p.name} className="input-cell font-medium"
                                                        onChange={(e) => dispatch({ type: 'UPDATE_PRODUCT', payload: { id: p.id, field: 'name', value: e.target.value } })} />

                                                    {/* CN Code Selector */}
                                                    <div className="relative">
                                                        <select
                                                            value={p.cnCode}
                                                            className="input-cell text-xs w-full"
                                                            onChange={(e) => dispatch({ type: 'UPDATE_PRODUCT', payload: { id: p.id, field: 'cnCode', value: e.target.value } })}
                                                        >
                                                            <option value="">Select CN Code...</option>
                                                            {getSectors().map(sector => (
                                                                <optgroup key={sector} label={sector}>
                                                                    {CBAM_CN_CODES.filter(c => c.sector === sector).map(c => (
                                                                        <option key={c.code} value={c.code}>
                                                                            {c.code} — {c.name}
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Production Output — highlighted */}
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1 block">Output (t)</label>
                                                        <input type="number" value={p.quantity} className="input-highlight"
                                                            placeholder="0"
                                                            onChange={(e) => dispatch({ type: 'UPDATE_PRODUCT', payload: { id: p.id, field: 'quantity', value: e.target.value } })} />
                                                    </div>

                                                    <div className="flex items-center justify-center pt-5">
                                                        <label className="switch" style={{ transform: 'scale(0.8)' }}>
                                                            <input type="checkbox" checked={p.isResidue}
                                                                onChange={(e) => dispatch({ type: 'UPDATE_PRODUCT', payload: { id: p.id, field: 'isResidue', value: e.target.checked } })} />
                                                            <span className="slider round"></span>
                                                        </label>
                                                    </div>

                                                    <div className="pt-5">
                                                        <button className="btn ghost small danger-hover" onClick={() => dispatch({ type: 'DELETE_PRODUCT', payload: p.id })}>&times;</button>
                                                    </div>
                                                </div>

                                                {/* Badges row */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    {cnInfo && (
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase">
                                                            {cnInfo.sector}
                                                        </span>
                                                    )}
                                                    {cnInfo && (
                                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${isComplex ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                                                            {isComplex ? 'Complex Good' : 'Simple Good'}
                                                        </span>
                                                    )}
                                                    {p.isResidue && (
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">Residue</span>
                                                    )}
                                                    {isComplex && (
                                                        <button
                                                            onClick={() => toggleExpand(p.id)}
                                                            className="ml-auto flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                                                        >
                                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                            Precursors {hasPrecursors && `(${p.precursors.length})`}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Precursors (only for complex goods) */}
                                            {isComplex && isExpanded && (
                                                <div className="bg-slate-50 border-t border-slate-200 p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-semibold text-slate-500 uppercase">Precursor Inputs</span>
                                                        <button className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                                                            onClick={() => dispatch({ type: 'ADD_PRECURSOR', payload: { productId: p.id } })}>
                                                            + Add Precursor
                                                        </button>
                                                    </div>

                                                    {(p.precursors || []).length > 0 ? (
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="text-slate-400">
                                                                    <th className="text-left p-1 font-medium">Name</th>
                                                                    <th className="text-left p-1 font-medium" style={{ width: 140 }}>CN Code</th>
                                                                    <th className="text-right p-1 font-medium" style={{ width: 80 }}>Mass (t/t)</th>
                                                                    <th className="text-right p-1 font-medium" style={{ width: 100 }}>SEE (tCO₂/t)</th>
                                                                    <th className="text-center p-1 font-medium" style={{ width: 70 }}>Source</th>
                                                                    <th style={{ width: 30 }}></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {p.precursors.map(pc => (
                                                                    <tr key={pc.id}>
                                                                        <td className="p-1">
                                                                            <input type="text" value={pc.name} className="input-cell text-xs"
                                                                                placeholder="e.g. Hot Metal"
                                                                                onChange={(e) => dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'name', value: e.target.value } })} />
                                                                        </td>
                                                                        <td className="p-1">
                                                                            <select value={pc.cnCode} className="input-cell text-xs"
                                                                                onChange={(e) => dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'cnCode', value: e.target.value } })}>
                                                                                <option value="">—</option>
                                                                                {CBAM_CN_CODES.filter(c => !c.isComplex).map(c => (
                                                                                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </td>
                                                                        <td className="p-1">
                                                                            <input type="number" step="0.01" value={pc.mass} className="input-cell text-xs font-mono text-right"
                                                                                onChange={(e) => dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'mass', value: e.target.value } })} />
                                                                        </td>
                                                                        <td className="p-1">
                                                                            <input type="number" step="0.001" value={pc.see} className="input-cell text-xs font-mono text-right"
                                                                                onChange={(e) => dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'see', value: e.target.value } })} />
                                                                        </td>
                                                                        <td className="p-1 text-center">
                                                                            <select value={pc.sourceType} className="input-cell text-[10px]"
                                                                                onChange={(e) => dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'sourceType', value: e.target.value } })}>
                                                                                <option value="actual">Actual</option>
                                                                                <option value="default">Default</option>
                                                                            </select>
                                                                        </td>
                                                                        <td className="p-1 text-right">
                                                                            <button className="text-red-400 hover:text-red-600"
                                                                                onClick={() => dispatch({ type: 'DELETE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id } })}>
                                                                                &times;
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <div className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-200 rounded">
                                                            No precursors defined. For complex goods, add procured inputs with their embedded emissions.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : <div className="empty-state">No products defined.</div>}

                        {/* Allocation Settings */}
                        <div className="mt-6 pt-4 border-t border-slate-200">
                            <h4 className="text-sm font-semibold text-slate-600 mb-3">Allocation Settings</h4>
                            <div className="flex items-center justify-between">
                                <div>
                                    <strong className="text-sm">Treat Residue as waste?</strong>
                                    <p className="text-xs text-slate-400 mt-0.5">If ON, residues get 0% allocation.</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" checked={state.allocationSettings.treatResidueAsWaste}
                                        onChange={(e) => dispatch({ type: 'UPDATE_ALLOC_SETTINGS', payload: { field: 'treatResidueAsWaste', value: e.target.checked } })} />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Verification Table */}
                    <div className="card">
                        <h3 className="text-lg font-semibold text-slate-700 mb-4">Allocation Verification</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Share</th>
                                    <th>Alloc. Direct</th>
                                    <th>Alloc. Indirect</th>
                                    <th>Alloc. Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {state.products.map(p => {
                                    let ratio = 0;
                                    let isExcluded = treatResidueAsWaste && p.isResidue;
                                    if (!isExcluded && totalMass > 0) {
                                        ratio = (parseFloat(p.quantity) || 0) / totalMass;
                                    }
                                    const allocDirect = Math.round(totalDirect * ratio);
                                    const allocIndirect = Math.round(totalIndirect * ratio);
                                    const allocTotal = allocDirect + allocIndirect;
                                    const cnInfo = getCnCodeInfo(p.cnCode);

                                    return (
                                        <tr key={p.id} className={isExcluded ? 'row-muted' : ''}>
                                            <td>
                                                <div className="font-semibold">{p.name}</div>
                                                <div className="text-xs text-slate-400">
                                                    {cnInfo ? `${cnInfo.code} · ${cnInfo.sector}` : 'No CN Code'}
                                                </div>
                                                {isExcluded && <span className="badge neutral text-[10px] mt-1 inline-block">RESIDUE</span>}
                                            </td>
                                            <td className="font-mono">{(ratio * 100).toFixed(1)}%</td>
                                            <td className="font-mono">{allocDirect}</td>
                                            <td className="font-mono">{allocIndirect}</td>
                                            <td className="font-mono font-bold">{allocTotal}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Col: Overview */}
                <div className="card bg-slate-50 border-slate-200 h-fit">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">Allocation Overview</h3>

                    {/* Donut Chart */}
                    <div className="h-[200px] w-full mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={state.products.map(p => {
                                        const isExcluded = treatResidueAsWaste && p.isResidue;
                                        const ratio = (!isExcluded && totalMass > 0) ? ((parseFloat(p.quantity) || 0) / totalMass) : 0;
                                        return { name: p.name, value: ratio * 100 };
                                    })}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {state.products.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981'][index % 4]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val) => `${val.toFixed(1)}%`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Direct (Scope 1)</span>
                            <span className="font-semibold text-slate-700">{totalDirect} tCO₂</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Indirect (Scope 2)</span>
                            <span className="font-semibold text-slate-700">{totalIndirect} tCO₂</span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-slate-800 pt-3 border-t border-slate-200 mt-2">
                            <span>Total Emissions</span>
                            <span>{totalDirect + totalIndirect} tCO₂</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

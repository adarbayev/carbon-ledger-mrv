import React from 'react';
import { useApp } from '../context/AppContext';
import { calcFuelEmissions, calcElecEmissions, getCnCodeInfo } from '../data/referenceData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Calculator, TrendingUp, Info, ShieldCheck } from 'lucide-react';

export default function ResultsView() {
    const { state, dispatch } = useApp();

    // ─── Emission Calculations ───────────────────────────────
    const totalDirect = state.activity.fuels.reduce((sum, f) => sum + calcFuelEmissions(f), 0);
    const totalIndirect = state.activity.electricity.reduce((sum, e) => sum + calcElecEmissions(e), 0);
    const totalEmissions = totalDirect + totalIndirect;

    // Allocation
    const treatResidueAsWaste = state.allocationSettings.treatResidueAsWaste;
    const validProducts = state.products.filter(p => !treatResidueAsWaste || !p.isResidue);
    const totalMass = validProducts.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0);

    // Per-Product PCF (Specific Embedded Emissions)
    const productResults = state.products.map(p => {
        const isExcluded = treatResidueAsWaste && p.isResidue;
        const qty = parseFloat(p.quantity) || 0;
        const ratio = (!isExcluded && totalMass > 0) ? (qty / totalMass) : 0;
        const cnInfo = getCnCodeInfo(p.cnCode);
        const isComplex = cnInfo?.isComplex || false;

        // Own process emissions allocated to this product
        const ownDirect = totalDirect * ratio;
        const ownIndirect = totalIndirect * ratio;

        // Precursor embedded emissions (only for complex goods)
        let precursorEmissions = 0;
        if (isComplex && p.precursors?.length > 0) {
            precursorEmissions = p.precursors.reduce((sum, pc) => {
                return sum + (parseFloat(pc.mass) || 0) * (parseFloat(pc.see) || 0);
            }, 0);
        }

        const totalAllocated = ownDirect + ownIndirect + precursorEmissions;
        const see = qty > 0 ? totalAllocated / qty : 0; // tCO₂/t product

        return {
            ...p,
            isExcluded,
            ratio,
            ownDirect: Math.round(ownDirect),
            ownIndirect: Math.round(ownIndirect),
            precursorEmissions: Math.round(precursorEmissions),
            totalAllocated: Math.round(totalAllocated),
            see,
            cnInfo,
            isComplex,
        };
    });

    // ─── CBAM Cost Estimation ────────────────────────────────
    const cbam = state.cbamSettings;
    const mainProduct = productResults.find(p => !p.isExcluded);
    const seeFull = mainProduct?.see || 0;
    const exportQty = parseFloat(cbam.exportedQty) || 0;
    const priceRef = parseFloat(cbam.priceRef) || 0;
    const payableShare = (parseFloat(cbam.payableShare) || 100) / 100;
    const carbonPricePaid = parseFloat(cbam.carbonPricePaid) || 0;

    const grossObligation = seeFull * exportQty * priceRef * payableShare / 1000;
    const netObligation = Math.max(0, grossObligation - carbonPricePaid);

    // Chart data
    const chartData = productResults
        .filter(p => !p.isExcluded)
        .map(p => ({
            name: p.name.length > 15 ? p.name.slice(0, 15) + '…' : p.name,
            'Direct (Scope 1)': p.ownDirect,
            'Indirect (Scope 2)': p.ownIndirect,
            'Precursors': p.precursorEmissions,
        }));

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <TrendingUp size={16} />
                        <span className="text-xs font-semibold uppercase">Direct (Scope 1)</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-800">{Math.round(totalDirect).toLocaleString()}</div>
                    <div className="text-xs text-blue-500">tCO₂</div>
                </div>
                <div className="card bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
                    <div className="flex items-center gap-2 text-cyan-600 mb-1">
                        <TrendingUp size={16} />
                        <span className="text-xs font-semibold uppercase">Indirect (Scope 2)</span>
                    </div>
                    <div className="text-2xl font-bold text-cyan-800">{Math.round(totalIndirect).toLocaleString()}</div>
                    <div className="text-xs text-cyan-500">tCO₂</div>
                </div>
                <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <TrendingUp size={16} />
                        <span className="text-xs font-semibold uppercase">Total Emissions</span>
                    </div>
                    <div className="text-2xl font-bold text-indigo-800">{Math.round(totalEmissions).toLocaleString()}</div>
                    <div className="text-xs text-indigo-500">tCO₂</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
                {/* Product Results */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck size={20} className="text-blue-500" />
                        <h3 className="text-lg font-semibold text-slate-700">Product Carbon Footprint (SEE)</h3>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th className="text-right">Direct</th>
                                <th className="text-right">Indirect</th>
                                <th className="text-right">Precursors</th>
                                <th className="text-right">Total</th>
                                <th className="text-right">SEE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productResults.map(p => (
                                <tr key={p.id} className={p.isExcluded ? 'row-muted' : ''}>
                                    <td>
                                        <div className="font-semibold">{p.name}</div>
                                        <div className="text-xs text-slate-400">
                                            {p.cnInfo ? `${p.cnInfo.code} · ${p.cnInfo.sector}` : ''}
                                            {p.isComplex && ' · Complex'}
                                        </div>
                                    </td>
                                    <td className="text-right font-mono">{p.ownDirect.toLocaleString()}</td>
                                    <td className="text-right font-mono">{p.ownIndirect.toLocaleString()}</td>
                                    <td className="text-right font-mono">{p.precursorEmissions > 0 ? p.precursorEmissions.toLocaleString() : '—'}</td>
                                    <td className="text-right font-mono font-bold">{p.totalAllocated.toLocaleString()}</td>
                                    <td className="text-right font-mono font-bold text-blue-600">
                                        {p.isExcluded ? '—' : p.see.toFixed(3)}
                                        {!p.isExcluded && <span className="text-xs text-slate-400 ml-1">t/t</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Calculation transparency */}
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-start gap-2 text-xs text-slate-500">
                            <Info size={14} className="mt-0.5 shrink-0" />
                            <div>
                                <strong>For simple goods:</strong> SEE = (Scope 1 + Scope 2) × allocation_ratio ÷ product_mass<br />
                                <strong>For complex goods:</strong> SEE = own_SEE + Σ(precursor_mass × precursor_SEE) ÷ product_mass
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">Emissions Breakdown</h3>
                    {chartData.length > 0 ? (
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="Direct (Scope 1)" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="Indirect (Scope 2)" stackId="a" fill="#06b6d4" />
                                    <Bar dataKey="Precursors" stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <div className="empty-state">Define products to see the chart.</div>}
                </div>
            </div>

            {/* CBAM Estimator */}
            <div className="card">
                <div className="flex items-center gap-2 mb-4">
                    <Calculator size={20} className="text-indigo-500" />
                    <h3 className="text-lg font-semibold text-slate-700">CBAM Cost Estimator</h3>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Left: Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">EU ETS Price Reference (€/tCO₂)</label>
                            <input type="number" value={cbam.priceRef}
                                onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'priceRef', value: e.target.value } })} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Export Quantity (tonnes)</label>
                            <input type="number" value={cbam.exportedQty}
                                onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'exportedQty', value: e.target.value } })} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Payable Share (%)</label>
                            <input type="number" value={cbam.payableShare} min="0" max="100"
                                onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'payableShare', value: e.target.value } })} />
                        </div>
                        <div className="pt-3 border-t border-slate-200">
                            <label className="text-xs font-medium text-slate-500 mb-1 block">
                                Carbon Price Already Paid in Origin Country (€)
                            </label>
                            <input type="number" value={cbam.carbonPricePaid}
                                onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'carbonPricePaid', value: e.target.value } })} />
                            <p className="text-[10px] text-slate-400 mt-1">Deduction per CBAM Reg. Art. 9 — carbon tax or ETS price paid at origin.</p>
                        </div>
                    </div>

                    {/* Right: Results */}
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-slate-600 mb-3">Estimated Cost</h4>
                        <div className="stat-row">
                            <span className="text-slate-500">SEE (main product)</span>
                            <span className="font-mono">{seeFull.toFixed(3)} tCO₂/t</span>
                        </div>
                        <div className="stat-row">
                            <span className="text-slate-500">Export quantity</span>
                            <span className="font-mono">{exportQty.toLocaleString()} t</span>
                        </div>
                        <div className="stat-row">
                            <span className="text-slate-500">Embedded emissions</span>
                            <span className="font-mono">{Math.round(seeFull * exportQty).toLocaleString()} tCO₂</span>
                        </div>
                        <div className="stat-row">
                            <span className="text-slate-500">ETS price × payable</span>
                            <span className="font-mono">€{priceRef} × {(payableShare * 100).toFixed(0)}%</span>
                        </div>

                        <div className="h-px bg-slate-200 my-2"></div>

                        <div className="stat-row">
                            <span className="text-slate-500">Gross obligation</span>
                            <span className="font-mono">€{Math.round(grossObligation).toLocaleString()}</span>
                        </div>
                        {carbonPricePaid > 0 && (
                            <div className="stat-row">
                                <span className="text-green-600">Carbon price deduction</span>
                                <span className="font-mono text-green-600">−€{Math.round(carbonPricePaid).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="stat-row total text-lg">
                            <span>Net CBAM obligation</span>
                            <span className="text-indigo-700">€{Math.round(netObligation).toLocaleString()}</span>
                        </div>

                        <div className="text-[10px] text-slate-400 mt-2">
                            Estimate only. Actual CBAM certificates purchased at weekly ETS auction price.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

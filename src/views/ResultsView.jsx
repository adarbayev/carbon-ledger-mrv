import React from 'react';
import { useApp } from '../context/AppContext';
import { calcFuelEmissions, calcElecEmissions, getCnCodeInfo } from '../data/referenceData';
import { compareCertPriceScenarios, calculateCBAMProjection } from '../engine/cbamCalculator';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Calculator, TrendingUp, Info, ShieldCheck } from 'lucide-react';

export default function ResultsView() {
    const { state, dispatch } = useApp();

    // ─── Emission Calculations ───────────────────────────────
    const totalDirect = state.activity.fuels.reduce((sum, f) => sum + calcFuelEmissions(f).total, 0);
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
        const seeDirect = qty > 0 ? ownDirect / qty : 0;
        const seeIndirect = qty > 0 ? ownIndirect / qty : 0;

        return {
            ...p,
            isExcluded,
            ratio,
            ownDirect: Math.round(ownDirect),
            ownIndirect: Math.round(ownIndirect),
            precursorEmissions: Math.round(precursorEmissions),
            totalAllocated: Math.round(totalAllocated),
            see,
            seeDirect,
            seeIndirect,
            cnInfo,
            isComplex,
        };
    });


    // ─── CBAM Scenario Engine ────────────────────────────────
    const cbam = state.cbamSettings;
    const mainProduct = productResults.find(p => !p.isExcluded);

    const cbamConfig = {
        basis: cbam.basis,
        scope: cbam.scope,
        certPriceScenario: cbam.certPriceScenario,
        alPriceScenario: cbam.alPriceScenario,
        carbonCreditEligible: cbam.carbonCreditEligible,
        carbonCreditScenario: cbam.carbonCreditScenario,
        importedQty: parseFloat(cbam.importedQty) || 0,
        cnCode: cbam.cnCode,
        goodCategory: cbam.goodCategory,
        seeDirect: mainProduct?.seeDirect || 0,
        seeIndirect: mainProduct?.seeIndirect || 0,
    };

    // 3-scenario comparison (LOW/MID/HIGH cert prices)
    const scenarioResults = compareCertPriceScenarios(cbamConfig);

    // Chart data: grouped bars by year, one bar per scenario
    const scenarioChartData = scenarioResults[0].projection.rows.map((_, i) => {
        const row = { year: scenarioResults[0].projection.rows[i].year };
        scenarioResults.forEach(s => {
            row[s.label.includes('Low') ? 'Low' : s.label.includes('Mid') ? 'Mid' : 'High'] = s.projection.rows[i].netCost;
        });
        return row;
    });

    // Selected scenario for the detail table
    const selectedProjection = calculateCBAMProjection(cbamConfig);

    // Emissions breakdown chart data (for existing product chart)
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
                                <th className="text-right">SEE (t/t)</th>
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
                                    <td className="text-right font-mono">
                                        {p.isExcluded ? '—' : (
                                            <div>
                                                <div className="font-bold text-blue-600">{p.see.toFixed(3)}</div>
                                                <div className="text-[10px] text-slate-400">
                                                    D: {p.seeDirect.toFixed(3)} · I: {p.seeIndirect.toFixed(3)}
                                                </div>
                                            </div>
                                        )}
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


            {/* ─── CBAM Scenario Dashboard ─── */}
            <div className="card">
                <div className="flex items-center gap-2 mb-5">
                    <Calculator size={20} className="text-indigo-500" />
                    <h3 className="text-lg font-semibold text-slate-700">CBAM Scenario Dashboard</h3>
                    <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full ml-auto">2026–2034</span>
                </div>

                <div className="grid grid-cols-12 gap-6">
                    {/* Controls Panel (left) */}
                    <div className="col-span-4 space-y-3">
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Emission Basis</label>
                            <select value={cbam.basis} className="input-cell text-sm w-full"
                                onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'basis', value: e.target.value } })}>
                                <option value="ACTUAL">Actual (from MRV data)</option>
                                <option value="DEFAULT">Default (EU regulation values)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Scope</label>
                            <select value={cbam.scope} className="input-cell text-sm w-full"
                                onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'scope', value: e.target.value } })}>
                                <option value="DIRECT_ONLY">Direct Only (Scope 1)</option>
                                <option value="TOTAL">Total (Scope 1 + 2)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Certificate Price Scenario</label>
                            <select value={cbam.certPriceScenario} className="input-cell text-sm w-full"
                                onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'certPriceScenario', value: e.target.value } })}>
                                <option value="LOW">Low</option>
                                <option value="MID">Mid (base case)</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">KZ Carbon Credits</label>
                            <div className="flex gap-2">
                                <select value={cbam.carbonCreditEligible ? 'Y' : 'N'} className="input-cell text-sm flex-1"
                                    onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'carbonCreditEligible', value: e.target.value === 'Y' } })}>
                                    <option value="Y">Eligible</option>
                                    <option value="N">Not eligible</option>
                                </select>
                                <select value={cbam.carbonCreditScenario} className="input-cell text-sm flex-1"
                                    disabled={!cbam.carbonCreditEligible}
                                    onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'carbonCreditScenario', value: e.target.value } })}>
                                    <option value="NONE">None</option>
                                    <option value="LOW">Low</option>
                                    <option value="MID">Mid</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Al Price Scenario</label>
                            <select value={cbam.alPriceScenario} className="input-cell text-sm w-full"
                                onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'alPriceScenario', value: e.target.value } })}>
                                <option value="LOW">Low</option>
                                <option value="MID">Mid</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                        <div className="pt-3 mt-2 border-t-2 border-blue-200 bg-blue-50/30 rounded-lg p-3 -mx-1">
                            <label className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1 block">📦 Annual Import Volume (tonnes)</label>
                            <input type="number" value={cbam.importedQty} className="input-highlight w-full"
                                onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'importedQty', value: parseFloat(e.target.value) || 0 } })} />
                            <p className="text-[10px] text-slate-400 mt-1">Total quantity imported into the EU per year</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1 block">Good Category</label>
                            <select value={cbam.goodCategory} className="input-cell text-sm w-full"
                                onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'goodCategory', value: e.target.value } })}>
                                <option value="Aluminium">Aluminium</option>
                                <option value="Cement">Cement</option>
                                <option value="Fertilisers">Fertilisers</option>
                                <option value="Iron &amp; Steel">Iron &amp; Steel</option>
                                <option value="Hydrogen">Hydrogen</option>
                            </select>
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                                Auto-set from product CN code
                            </div>
                        </div>
                    </div>

                    {/* Right: Chart + Summary */}
                    <div className="col-span-8 space-y-4">
                        {/* Scenario Summary Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            {scenarioResults.map(s => (
                                <div key={s.name}
                                    className={`rounded-lg p-3 border-2 ${s.name === 'mid' ? 'border-amber-300 bg-amber-50' :
                                        s.name === 'low' ? 'border-green-300 bg-green-50' :
                                            'border-red-300 bg-red-50'
                                        }`}>
                                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: s.color }}>{s.label}</div>
                                    <div className="text-xl font-bold mt-1" style={{ color: s.color }}>
                                        €{(s.projection.totals.totalNetCost / 1e6).toFixed(1)}M
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1">
                                        9-year total · KZ ETS: −€{(s.projection.totals.totalKzEtsDeduction / 1e6).toFixed(1)}M
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Scenario Comparison Chart */}
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scenarioChartData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 10 }}
                                        tickFormatter={(v) => v >= 1e6 ? `€${(v / 1e6).toFixed(0)}M` : `€${(v / 1e3).toFixed(0)}K`} />
                                    <Tooltip
                                        formatter={(value) => [`€${Math.round(value).toLocaleString()}`, undefined]}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="Low" fill="#22c55e" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="Mid" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="High" fill="#ef4444" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Projection Table */}
                <div className="mt-6">
                    <h4 className="text-sm font-semibold text-slate-600 mb-3">
                        Projection Detail — {cbam.certPriceScenario} Scenario
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="text-xs">
                            <thead>
                                <tr>
                                    <th>Year</th>
                                    <th className="text-right">Import (t)</th>
                                    <th className="text-right">Markup</th>
                                    <th className="text-right">Intensity</th>
                                    <th className="text-right">Embedded CO₂</th>
                                    <th className="text-right">Payable %</th>
                                    <th className="text-right">Payable tCO₂</th>
                                    <th className="text-right">Cert €/t</th>
                                    <th className="text-right">Gross €</th>
                                    <th className="text-right">KZ ETS €</th>
                                    <th className="text-right font-bold">Net Cost €</th>
                                    <th className="text-right">€/t Al</th>
                                    <th className="text-right">Al $/t</th>
                                    <th className="text-right">% Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedProjection.rows.map(r => (
                                    <tr key={r.year}>
                                        <td className="font-semibold">{r.year}</td>
                                        <td className="text-right font-mono">{r.importQty.toLocaleString()}</td>
                                        <td className="text-right font-mono">{(r.markup * 100).toFixed(0)}%</td>
                                        <td className="text-right font-mono">{r.intensity.toFixed(3)}</td>
                                        <td className="text-right font-mono">{r.embeddedCO2.toLocaleString()}</td>
                                        <td className="text-right font-mono">{(r.payableShare * 100).toFixed(1)}%</td>
                                        <td className="text-right font-mono">{r.payableEmissions.toLocaleString()}</td>
                                        <td className="text-right font-mono">€{r.certPrice}</td>
                                        <td className="text-right font-mono">€{r.grossCost.toLocaleString()}</td>
                                        <td className="text-right font-mono text-green-600">−€{r.kzEtsDeduction.toLocaleString()}</td>
                                        <td className="text-right font-mono font-bold text-indigo-700">€{r.netCost.toLocaleString()}</td>
                                        <td className="text-right font-mono">€{r.costPerTonne.toFixed(2)}</td>
                                        <td className="text-right font-mono">${r.alPrice.toLocaleString()}</td>
                                        <td className="text-right font-mono">{r.costPctOfPrice.toFixed(2)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-slate-300 font-bold">
                                    <td>Total</td>
                                    <td colSpan={7}></td>
                                    <td className="text-right font-mono">€{selectedProjection.totals.totalGrossCost.toLocaleString()}</td>
                                    <td className="text-right font-mono text-green-600">−€{selectedProjection.totals.totalKzEtsDeduction.toLocaleString()}</td>
                                    <td className="text-right font-mono text-indigo-700">€{selectedProjection.totals.totalNetCost.toLocaleString()}</td>
                                    <td colSpan={3}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-2">
                        Source: EU Reg. 2025/2621 (default values), CBAM Reg. 2023/956 (phase-in). Estimate only — actual certificates at weekly ETS auction price.
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getCnCodeInfo } from '../data/referenceData';
import { calculateCBAMProjection } from '../engine/cbamCalculator';
import { calculateTotalEmissions, calculatePCF } from '../engine/emissionEngine';
import { fmtInt, fmtNum, fmtCurrency } from '../utils/formatUtils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie } from 'recharts';
import { Calculator, TrendingUp, Info, ShieldCheck } from 'lucide-react';
import LineagePanel from '../components/LineagePanel';

import { useLanguage } from '../context/LanguageContext';

export default function ResultsView() {
    const { state, dispatch } = useApp();
    const { t } = useLanguage();
    const [selectedBlock, setSelectedBlock] = useState(null);

    // ─── Emission Calculations (Multi-Gas Engine) ─────────────
    const emissionResult = calculateTotalEmissions({
        fuels: state.activity.fuels,
        electricity: state.activity.electricity,
        processEvents: state.processEvents || [],
        emissionBlocks: state.emissionBlocks || [],
    });
    const totalDirect = emissionResult.summary.directCO2e;
    const totalIndirect = emissionResult.summary.indirectCO2e;
    const totalEmissions = emissionResult.summary.totalCO2e;

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


    // ─── CBAM: Actual vs Default Comparison ─────────────────────
    const cbam = state.cbamSettings;
    const mainProduct = productResults.find(p => !p.isExcluded);

    // Dynamically fallback to mainProduct's cnInfo if available
    const activeCnCode = mainProduct?.cnInfo?.code || cbam.cnCode;
    const activeCategory = mainProduct?.cnInfo?.sector || cbam.goodCategory;

    const baseConfig = {
        scope: cbam.scope,
        certPriceScenario: cbam.certPriceScenario,
        alPriceScenario: cbam.alPriceScenario,
        carbonCreditEligible: cbam.carbonCreditEligible,
        carbonCreditScenario: cbam.carbonCreditScenario,
        importedQty: parseFloat(cbam.importedQty) || 0,
        cnCode: activeCnCode,
        goodCategory: activeCategory,
        seeDirect: mainProduct?.seeDirect || 0,
        seeIndirect: mainProduct?.seeIndirect || 0,
    };

    // Two projections: Actual (your MRV data) vs Default (EU regulation values)
    const actualProjection = calculateCBAMProjection({ ...baseConfig, basis: 'ACTUAL' });
    const defaultProjection = calculateCBAMProjection({ ...baseConfig, basis: 'DEFAULT' });

    const savings = defaultProjection.totals.totalNetCost - actualProjection.totals.totalNetCost;
    const savingsPct = defaultProjection.totals.totalNetCost > 0
        ? ((savings / defaultProjection.totals.totalNetCost) * 100).toFixed(1)
        : 0;

    // Chart data: Actual vs Default grouped bars by year
    const comparisonChartData = actualProjection.rows.map((row, i) => ({
        year: row.year,
        [t('ui.results.cbam.summary.actual')]: row.netCost,
        [t('ui.results.cbam.summary.default')]: defaultProjection.rows[i].netCost,
    }));

    // Emissions breakdown chart data (for existing product chart)
    const chartData = productResults
        .filter(p => !p.isExcluded)
        .map(p => ({
            name: p.name.length > 15 ? p.name.slice(0, 15) + '\u2026' : p.name,
            [t('ui.results.pcf.direct')]: p.ownDirect,
            [t('ui.results.pcf.indirect')]: p.ownIndirect,
            [t('ui.results.pcf.precursors')]: p.precursorEmissions,
        }));

    return (
        <>
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <TrendingUp size={16} />
                            <span className="text-xs font-semibold uppercase">{t('ui.results.cards.direct')}</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-800">{fmtInt(totalDirect)}</div>
                        <div className="text-xs text-blue-500">tCO₂</div>
                    </div>
                    <div className="card bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
                        <div className="flex items-center gap-2 text-cyan-600 mb-1">
                            <TrendingUp size={16} />
                            <span className="text-xs font-semibold uppercase">{t('ui.results.cards.indirect')}</span>
                        </div>
                        <div className="text-2xl font-bold text-cyan-800">{fmtInt(totalIndirect)}</div>
                        <div className="text-xs text-cyan-500">tCO₂</div>
                    </div>
                    <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                        <div className="flex items-center gap-2 text-indigo-600 mb-1">
                            <TrendingUp size={16} />
                            <span className="text-xs font-semibold uppercase">{t('ui.results.cards.total')}</span>
                        </div>
                        <div className="text-2xl font-bold text-indigo-800">{fmtInt(totalEmissions)}</div>
                        <div className="text-xs text-indigo-500">tCO₂</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
                    {/* Product Results */}
                    <div className="card">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck size={20} className="text-blue-500" />
                            <h3 className="text-lg font-semibold text-slate-700">{t('ui.results.pcf.title')}</h3>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>{t('ui.results.pcf.product')}</th>
                                    <th className="text-right">{t('ui.results.pcf.direct')}</th>
                                    <th className="text-right">{t('ui.results.pcf.indirect')}</th>
                                    <th className="text-right">{t('ui.results.pcf.precursors')}</th>
                                    <th className="text-right">{t('ui.results.pcf.total')}</th>
                                    <th className="text-right">{t('ui.results.pcf.see')}</th>
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
                                        <td className="text-right font-mono">{fmtInt(p.ownDirect)}</td>
                                        <td className="text-right font-mono">{fmtInt(p.ownIndirect)}</td>
                                        <td className="text-right font-mono">{p.precursorEmissions > 0 ? fmtInt(p.precursorEmissions) : '—'}</td>
                                        <td className="text-right font-mono font-bold">{fmtInt(p.totalAllocated)}</td>
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
                                    <strong>{t('ui.results.calcNote.simple')}</strong> {t('ui.results.calcNote.simpleFormula')}<br />
                                    <strong>{t('ui.results.calcNote.complex')}</strong> {t('ui.results.calcNote.complexFormula')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="card">
                        <h3 className="text-lg font-semibold text-slate-700 mb-4">{t('ui.results.chart.title')}</h3>
                        {chartData.length > 0 ? (
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                                        <XAxis type="number" tick={{ fontSize: 11 }} />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Bar dataKey={t('ui.results.pcf.direct')} stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey={t('ui.results.pcf.indirect')} stackId="a" fill="#06b6d4" />
                                        <Bar dataKey={t('ui.results.pcf.precursors')} stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <div className="empty-state">{t('ui.results.chart.empty')}</div>}
                    </div>
                </div>


                {/* ─── Multi-Gas Breakdown (Donut Chart) ─── */}
                {(() => {
                    const combTotals = emissionResult.combustion.totals;
                    const blockEntries = emissionResult.emissionBlocks.entries;
                    const gasMap = { CO2: 0, CH4: 0, N2O: 0 };

                    gasMap.CO2 += combTotals.co2 || 0;
                    gasMap.CH4 += combTotals.ch4 || 0;
                    gasMap.N2O += combTotals.n2o || 0;

                    blockEntries.forEach(b => {
                        const g = (b.gas || 'CO2').toUpperCase().replace(/[\u2082\u2084\u2086]/g, c => ({ '\u2082': '2', '\u2084': '4', '\u2086': '6' }[c] || c));
                        if (gasMap[g] !== undefined) gasMap[g] += b.co2e;
                        else gasMap[g] = b.co2e;
                    });

                    gasMap.CO2 += emissionResult.electricity.totals.co2e || 0;

                    const gasEntries = Object.entries(gasMap).filter(([, v]) => v > 0);
                    const totalGas = gasEntries.reduce((s, [, v]) => s + v, 0);
                    if (totalGas === 0 || gasEntries.length === 0) return null;

                    const GAS_COLORS = {
                        CO2: '#3b82f6', CH4: '#f59e0b', N2O: '#f43f5e',
                        CF4: '#a855f7', C2F6: '#8b5cf6',
                    };
                    const DEFAULT_CLR = '#94a3b8';

                    const donutData = gasEntries.map(([gas, val]) => ({
                        name: gas,
                        value: parseFloat(val.toFixed(2)),
                        pct: ((val / totalGas) * 100).toFixed(1),
                        fill: GAS_COLORS[gas] || DEFAULT_CLR,
                    }));

                    return (
                        <div className="card">
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">{t('ui.results.multiGas.title')}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                                {/* Donut */}
                                <div className="h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={donutData}
                                                cx="50%" cy="50%"
                                                innerRadius={55} outerRadius={85}
                                                paddingAngle={3}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {donutData.map((d, i) => (
                                                    <Cell key={i} fill={d.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(v, name) => [`${fmtInt(v)} tCO₂e`, name]}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Legend */}
                                <div className="space-y-2">
                                    {donutData.map(d => (
                                        <div key={d.name} className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
                                            <div className="flex-1">
                                                <div className="text-sm font-bold text-slate-700">{d.name}</div>
                                                <div className="text-[11px] text-slate-500">
                                                    {fmtInt(d.value)} tCO₂e &middot; {d.pct}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-2 mt-2 border-t border-slate-200">
                                        <div className="text-xs text-slate-500">{t('ui.results.multiGas.total')}</div>
                                        <div className="text-lg font-bold text-slate-800">{fmtNum(totalGas, 1)} tCO₂e</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}



                {/* ─── CBAM: Actual vs Default Comparison ─── */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-5">
                        <Calculator size={20} className="text-indigo-500" />
                        <h3 className="text-lg font-semibold text-slate-700">{t('ui.results.cbam.title')}</h3>
                        <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">2026–2034</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{activeCategory}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{cbam.scope === 'DIRECT_ONLY' ? 'Direct' : 'Direct + Indirect'}</span>
                    </div>

                    {/* Savings Banner */}
                    {savings > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-5 flex items-center gap-3">
                            <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                            <div>
                                <span className="text-sm font-semibold text-emerald-700">
                                    {t('ui.results.cbam.summary.saves')} €{(savings / 1e6).toFixed(1)}M ({savingsPct}%)
                                </span>
                                <span className="text-xs text-emerald-600 ml-2">
                                    {t('ui.results.cbam.summary.over')}
                                </span>
                            </div>
                        </div>
                    )}
                    {savings <= 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex items-center gap-3">
                            <Info size={20} className="text-amber-600 shrink-0" />
                            <div>
                                <span className="text-sm font-semibold text-amber-700">
                                    {t('ui.results.cbam.summary.exceeds')}
                                </span>
                                <span className="text-xs text-amber-600 ml-2">
                                    — {t('ui.results.cbam.summary.lower')} €{(Math.abs(savings) / 1e6).toFixed(1)}M
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-12 gap-6">
                        {/* Controls (left, simplified) */}
                        <div className="col-span-3 space-y-3">
                            <div className="pt-2 border-t-2 border-blue-200 bg-blue-50/30 rounded-lg p-3">
                                <label className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1 block">📦 {t('ui.results.cbam.controls.import')}</label>
                                <input type="number" value={cbam.importedQty} className="input-highlight w-full"
                                    onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'importedQty', value: parseFloat(e.target.value) || 0 } })} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">{t('ui.results.cbam.controls.priceScenario')}</label>
                                <select value={cbam.certPriceScenario} className="input-cell text-sm w-full"
                                    onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'certPriceScenario', value: e.target.value } })}>
                                    <option value="LOW">Low</option>
                                    <option value="MID">Mid (base case)</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">{t('ui.results.cbam.controls.kzCredit')}</label>
                                <div className="flex gap-2">
                                    <select value={cbam.carbonCreditEligible ? 'Y' : 'N'} className="input-cell text-sm flex-1"
                                        onChange={(e) => dispatch({ type: 'UPDATE_CBAM', payload: { field: 'carbonCreditEligible', value: e.target.value === 'Y' } })}>
                                        <option value="Y">{t('ui.results.cbam.controls.eligible')}</option>
                                        <option value="N">{t('ui.results.cbam.controls.notEligible')}</option>
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

                            {/* Auto-detected info */}
                            <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-[11px] text-slate-500">
                                <div className="font-semibold text-slate-600 text-xs mb-1.5">{t('ui.results.cbam.controls.autoDetected')}</div>
                                <div className="flex justify-between"><span>{t('ui.results.cbam.controls.sector')}</span><span className="font-medium text-slate-700">{activeCategory}</span></div>
                                <div className="flex justify-between"><span>{t('ui.results.cbam.controls.scope')}</span><span className="font-medium text-slate-700">{cbam.scope === 'DIRECT_ONLY' ? 'Direct only' : 'Direct + Indirect'}</span></div>
                                <div className="flex justify-between"><span>{t('ui.results.cbam.controls.seeActual')}</span><span className="font-mono text-slate-700">{(mainProduct?.seeDirect + mainProduct?.seeIndirect || 0).toFixed(3)}</span></div>
                            </div>
                        </div>

                        {/* Right: Summary + Chart */}
                        <div className="col-span-9 space-y-4">
                            {/* Two-card comparison */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-lg p-4 border-2 border-blue-300 bg-blue-50">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">✓ {t('ui.results.cbam.summary.actual')}</div>
                                    <div className="text-2xl font-bold text-blue-700">
                                        €{(actualProjection.totals.totalNetCost / 1e6).toFixed(1)}M
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1 mb-2">
                                        {t('ui.results.cbam.summary.netCost')} · {t('ui.results.cbam.summary.kzDeduction')}: −€{(actualProjection.totals.totalKzEtsDeduction / 1e6).toFixed(1)}M
                                    </div>
                                    <div className="text-[10px] text-blue-800 mt-1 font-mono bg-blue-100/50 p-2 rounded">

                                        <div className="flex justify-between"><span>{t('ui.results.pcf.direct')}:</span><span>{(mainProduct?.seeDirect || 0).toFixed(3)}</span></div>
                                        <div className="flex justify-between"><span>{t('ui.results.pcf.indirect')}:</span><span>{(mainProduct?.seeIndirect || 0).toFixed(3)}</span></div>
                                        <div className="pt-1 mt-1 border-t border-blue-200 font-bold flex justify-between">
                                            <span>
                                                {actualProjection.metadata.effectiveScope === 'DIRECT_ONLY' ? 'Applicable (Direct Only):' : 'Total Applicable SEE:'}
                                            </span>
                                            <span>
                                                {actualProjection.metadata.effectiveScope === 'DIRECT_ONLY'
                                                    ? (mainProduct?.seeDirect || 0).toFixed(3)
                                                    : ((mainProduct?.seeDirect || 0) + (mainProduct?.seeIndirect || 0)).toFixed(3)
                                                } tCO₂/t
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-lg p-4 border-2 border-slate-300 bg-slate-50">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{t('ui.results.cbam.summary.default')}</div>
                                    <div className="text-2xl font-bold text-slate-600">
                                        €{(defaultProjection.totals.totalNetCost / 1e6).toFixed(1)}M
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1 mb-2">
                                        {t('ui.results.cbam.summary.netCost')} · {t('ui.results.cbam.summary.kzDeduction')}: −€{(defaultProjection.totals.totalKzEtsDeduction / 1e6).toFixed(1)}M
                                    </div>
                                    <div className="text-[10px] text-slate-600 mt-1 font-mono bg-slate-100 p-2 rounded">
                                        <div className="flex justify-between">
                                            <span>{t('ui.results.cbam.summary.baseDefault')}:</span>
                                            <span className="font-semibold">
                                                {(() => {
                                                    const de = defaultProjection.metadata.defaultEntry;
                                                    if (!de) return 'N/A';
                                                    const direct = de.d ?? de.direct ?? 0;
                                                    const total = de.t ?? de.total ?? direct;
                                                    const val = defaultProjection.metadata.effectiveScope === 'DIRECT_ONLY' ? direct : total;
                                                    return val ? val.toFixed(3) : 'N/A';
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>{t('ui.results.cbam.summary.markup')} (2026):</span>
                                            <span className="text-red-500">+{((defaultProjection.rows[0]?.markup || 0) * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="pt-1 mt-1 border-t border-slate-200 font-bold flex justify-between">
                                            <span>{t('ui.results.cbam.summary.intensity')}:</span>
                                            <span>{(defaultProjection.rows[0]?.intensity || 0).toFixed(3)} tCO₂/t</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Comparison Chart */}
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonChartData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                                        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 10 }}
                                            tickFormatter={(v) => v >= 1e6 ? `€${(v / 1e6).toFixed(0)}M` : `€${(v / 1e3).toFixed(0)}K`} />
                                        <Tooltip
                                            formatter={(value) => [`€${fmtInt(value)}`, undefined]}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 }} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Bar dataKey={t('ui.results.cbam.summary.actual')} fill="#3b82f6" radius={[3, 3, 0, 0]} />
                                        <Bar dataKey={t('ui.results.cbam.summary.default')} fill="#94a3b8" radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Projection Table — Actual basis */}
                    <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-600 mb-3">
                            {t('ui.results.cbam.table.title', { scenario: cbam.certPriceScenario })}
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="text-xs">
                                <thead>
                                    <tr>
                                        <th>{t('ui.results.cbam.table.year')}</th>
                                        <th className="text-right">{t('ui.results.cbam.table.import')}</th>
                                        <th className="text-right">{t('ui.results.cbam.table.markup')}</th>
                                        <th className="text-right">{t('ui.results.cbam.table.intensity')}</th>
                                        <th className="text-right">{t('ui.results.cbam.table.embedded')}</th>
                                        <th className="text-right">{t('ui.results.cbam.table.payablePct')}</th>
                                        <th className="text-right">{t('ui.results.cbam.table.payableT')}</th>
                                        <th className="text-right">{t('ui.results.cbam.table.cert')}</th>
                                        <th className="text-right">{t('ui.results.cbam.table.gross')}</th>
                                        <th className="text-right">{t('ui.results.cbam.table.kz')}</th>
                                        <th className="text-right font-bold">{t('ui.results.cbam.table.net')}</th>
                                        <th className="text-right">{t('ui.results.cbam.table.perTonne')}</th>
                                        <th className="text-right">{t('ui.results.cbam.table.pctPrice')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {actualProjection.rows.map(r => (
                                        <tr key={r.year}>
                                            <td className="font-semibold">{r.year}</td>
                                            <td className="text-right font-mono">{fmtInt(r.importQty)}</td>
                                            <td className="text-right font-mono">{(r.markup * 100).toFixed(0)}%</td>
                                            <td className="text-right font-mono">{r.intensity.toFixed(3)}</td>
                                            <td className="text-right font-mono">{fmtInt(r.embeddedCO2)}</td>
                                            <td className="text-right font-mono">{(r.payableShare * 100).toFixed(1)}%</td>
                                            <td className="text-right font-mono">{fmtInt(r.payableEmissions)}</td>
                                            <td className="text-right font-mono">€{r.certPrice}</td>
                                            <td className="text-right font-mono">€{fmtInt(r.grossCost)}</td>
                                            <td className="text-right font-mono text-green-600">−€{fmtInt(r.kzEtsDeduction)}</td>
                                            <td className="text-right font-mono font-bold text-indigo-700">€{fmtInt(r.netCost)}</td>
                                            <td className="text-right font-mono">€{r.costPerTonne.toFixed(2)}</td>
                                            <td className="text-right font-mono">${fmtInt(r.alPrice)}</td>
                                            <td className="text-right font-mono">{r.costPctOfPrice.toFixed(2)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-300 font-bold">
                                        <td>{t('ui.results.cbam.table.total')}</td>
                                        <td colSpan={7}></td>
                                        <td className="text-right font-mono">€{fmtInt(actualProjection.totals.totalGrossCost)}</td>
                                        <td className="text-right font-mono text-green-600">−€{fmtInt(actualProjection.totals.totalKzEtsDeduction)}</td>
                                        <td className="text-right font-mono text-indigo-700">€{fmtInt(actualProjection.totals.totalNetCost)}</td>
                                        <td colSpan={3}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2">
                            {t('ui.results.cbam.source')}
                        </div>
                    </div>
                </div>
            </div >
            {selectedBlock && (
                <LineagePanel block={selectedBlock} onClose={() => setSelectedBlock(null)} />
            )}
        </>
    );
}

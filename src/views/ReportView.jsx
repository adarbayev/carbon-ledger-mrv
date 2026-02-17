import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateTotalEmissions, calculatePCF, GWP_AR6, calcCombustionEmissions, calcElectricityEmissions } from '../engine/emissionEngine';
import { Printer, FileText } from 'lucide-react';

export default function ReportView() {
    const { state } = useApp();

    const emissions = useMemo(() => calculateTotalEmissions({
        fuels: state.activity.fuels,
        electricity: state.activity.electricity,
        processEvents: state.processEvents || [],
        emissionBlocks: state.emissionBlocks || [],
    }), [state.activity, state.processEvents, state.emissionBlocks]);

    const pcf = useMemo(() => calculatePCF(
        emissions, state.products, state.allocationSettings
    ), [emissions, state.products, state.allocationSettings]);

    const directTotal = emissions.summary.directCO2e;
    const indirectTotal = emissions.electricity.totals.co2e;
    const grandTotal = directTotal + indirectTotal;
    const fmt = (n) => Math.round(n).toLocaleString();

    return (
        <div className="space-y-4">
            {/* Print Button (hidden when printing) */}
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">MRV Evidence Report</h2>
                    <p className="text-sm text-slate-500">Printable report for auditors and compliance officers</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-md"
                >
                    <Printer size={16} />
                    Print / Save as PDF
                </button>
            </div>

            {/* ─── Report Content (print-friendly) ──────── */}
            <div id="report-content" className="bg-white rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:rounded-none">

                {/* Cover Section */}
                <div className="p-8 border-b border-slate-200 print:break-after-avoid">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">CL</div>
                        <span className="text-lg font-bold text-slate-800">Carbon Ledger — MRV Report</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-xs text-slate-400 block">Installation</span><strong className="text-slate-800">{state.meta.installationName}</strong></div>
                        <div><span className="text-xs text-slate-400 block">Country</span><strong className="text-slate-800">{state.meta.country}</strong></div>
                        <div><span className="text-xs text-slate-400 block">Reporting Period</span><strong className="text-slate-800">{state.meta.periodStart} → {state.meta.periodEnd}</strong></div>
                        <div><span className="text-xs text-slate-400 block">Status</span>
                            <strong className="text-slate-800">{state.meta.workflowStatus || 'DRAFT'}</strong>
                        </div>
                        <div><span className="text-xs text-slate-400 block">GWP Set</span><strong className="text-slate-800">{GWP_AR6.name}</strong></div>
                        <div><span className="text-xs text-slate-400 block">Generated</span><strong className="text-slate-800">{new Date().toLocaleDateString()}</strong></div>
                    </div>
                </div>

                {/* Executive Summary */}
                <div className="p-8 border-b border-slate-200">
                    <h3 className="text-base font-bold text-slate-800 mb-4">1. Executive Summary</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-blue-700">{fmt(directTotal)}</div>
                            <div className="text-xs text-blue-500">Direct Emissions (tCO₂e)</div>
                        </div>
                        <div className="bg-cyan-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-cyan-700">{fmt(indirectTotal)}</div>
                            <div className="text-xs text-cyan-500">Indirect Emissions (tCO₂e)</div>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-indigo-700">{fmt(grandTotal)}</div>
                            <div className="text-xs text-indigo-500">Total Emissions (tCO₂e)</div>
                        </div>
                    </div>
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 text-slate-500">Combustion CO₂</td>
                                <td className="py-2 text-right font-medium">{fmt(emissions.combustion.totals.co2)} tCO₂</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 text-slate-500">Combustion CH₄ (CO₂e)</td>
                                <td className="py-2 text-right font-medium">{fmt(emissions.combustion.totals.ch4 * GWP_AR6.CH4)} tCO₂e</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 text-slate-500">Combustion N₂O (CO₂e)</td>
                                <td className="py-2 text-right font-medium">{fmt(emissions.combustion.totals.n2o * GWP_AR6.N2O)} tCO₂e</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 text-slate-500">Process Direct CO₂e</td>
                                <td className="py-2 text-right font-medium">{fmt(emissions.summary.directCO2e - emissions.summary.combustionCO2e)} tCO₂e</td>
                            </tr>
                            <tr>
                                <td className="py-2 text-slate-500">Electricity (Scope 2)</td>
                                <td className="py-2 text-right font-medium">{fmt(indirectTotal)} tCO₂e</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Processes */}
                <div className="p-8 border-b border-slate-200 print:break-before-auto">
                    <h3 className="text-base font-bold text-slate-800 mb-4">2. Processes</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                                <th className="py-2">ID</th>
                                <th className="py-2">Name</th>
                                <th className="py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.processes.map(p => (
                                <tr key={p.id} className="border-b border-slate-100">
                                    <td className="py-2 font-mono text-xs">{p.id}</td>
                                    <td className="py-2 text-slate-800">{p.name || p.id}</td>
                                    <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${p.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.active !== false ? 'Active' : 'Inactive'}</span></td>
                                </tr>
                            ))}
                            {state.processes.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-slate-400">No processes defined</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Activity Data — Fuels */}
                <div className="p-8 border-b border-slate-200 print:break-before-auto">
                    <h3 className="text-base font-bold text-slate-800 mb-4">3. Fuel Combustion Activity Data</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                                <th className="py-2">Period</th>
                                <th className="py-2">Fuel Type</th>
                                <th className="py-2 text-right">Quantity</th>
                                <th className="py-2">Unit</th>
                                <th className="py-2">Source</th>
                                <th className="py-2 text-right">CO₂e (t)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.activity.fuels.map((f, i) => {
                                const result = calcCombustionEmissions(f);
                                return (
                                    <tr key={f.id || i} className="border-b border-slate-100">
                                        <td className="py-1.5">{f.period}</td>
                                        <td className="py-1.5">{f.fuelTypeId}</td>
                                        <td className="py-1.5 text-right">{f.quantity.toLocaleString()}</td>
                                        <td className="py-1.5">{f.unit}</td>
                                        <td className="py-1.5 text-slate-500">{f.source || 'manual'}</td>
                                        <td className="py-1.5 text-right font-medium">{fmt(result.co2e)}</td>
                                    </tr>
                                );
                            })}
                            {state.activity.fuels.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-slate-400">No fuel entries</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Activity Data — Electricity */}
                <div className="p-8 border-b border-slate-200">
                    <h3 className="text-base font-bold text-slate-800 mb-4">4. Electricity Activity Data</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                                <th className="py-2">Period</th>
                                <th className="py-2 text-right">MWh</th>
                                <th className="py-2 text-right">EF (tCO₂/MWh)</th>
                                <th className="py-2">Source</th>
                                <th className="py-2 text-right">CO₂e (t)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.activity.electricity.map((e, i) => {
                                const result = calcElectricityEmissions(e);
                                return (
                                    <tr key={e.id || i} className="border-b border-slate-100">
                                        <td className="py-1.5">{e.period}</td>
                                        <td className="py-1.5 text-right">{(e.mwh || 0).toLocaleString()}</td>
                                        <td className="py-1.5 text-right">{e.ef}</td>
                                        <td className="py-1.5 text-slate-500">{e.source || 'manual'}</td>
                                        <td className="py-1.5 text-right font-medium">{fmt(result.co2e)}</td>
                                    </tr>
                                );
                            })}
                            {state.activity.electricity.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-slate-400">No electricity entries</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Process Emission Blocks */}
                {(state.emissionBlocks || []).length > 0 && (
                    <div className="p-8 border-b border-slate-200 print:break-before-auto">
                        <h3 className="text-base font-bold text-slate-800 mb-4">5. Process Emission Blocks</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                                    <th className="py-2">Name</th>
                                    <th className="py-2">Output Gas</th>
                                    <th className="py-2">Formula</th>
                                </tr>
                            </thead>
                            <tbody>
                                {state.emissionBlocks.map((b, i) => (
                                    <tr key={b.id || i} className="border-b border-slate-100">
                                        <td className="py-1.5 font-medium">{b.name}</td>
                                        <td className="py-1.5">{b.outputGas}</td>
                                        <td className="py-1.5 font-mono text-xs">{b.formulaDisplay || b.formula}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Product Carbon Footprint */}
                <div className="p-8 border-b border-slate-200 print:break-before-auto">
                    <h3 className="text-base font-bold text-slate-800 mb-4">
                        {(state.emissionBlocks || []).length > 0 ? '6' : '5'}. Product Carbon Footprint (PCF)
                    </h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                                <th className="py-2">Product</th>
                                <th className="py-2">CN Code</th>
                                <th className="py-2 text-right">Output (t)</th>
                                <th className="py-2 text-right">Direct SEE</th>
                                <th className="py-2 text-right">Indirect SEE</th>
                                <th className="py-2 text-right">Total SEE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pcf.map((p, i) => (
                                <tr key={i} className={`border-b border-slate-100 ${p.isResidue ? 'text-slate-400' : ''}`}>
                                    <td className="py-1.5 font-medium">{p.productName || p.name} {p.isResidue && '(residue)'}</td>
                                    <td className="py-1.5">{p.cnCode || '—'}</td>
                                    <td className="py-1.5 text-right">{(p.quantity || 0).toLocaleString()}</td>
                                    <td className="py-1.5 text-right">{(p.pcfDirect ?? 0).toFixed(4)}</td>
                                    <td className="py-1.5 text-right">{(p.pcfIndirect ?? 0).toFixed(4)}</td>
                                    <td className="py-1.5 text-right font-semibold">{(p.pcf ?? 0).toFixed(4)}</td>
                                </tr>
                            ))}
                            {pcf.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-slate-400">No products defined</td></tr>}
                        </tbody>
                    </table>
                    <div className="mt-3 text-xs text-slate-400">
                        SEE = Specific Embedded Emissions (tCO₂e / t product). Allocation method: {state.allocationSettings?.method || 'mass'}.
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 text-center text-xs text-slate-400">
                    <p>This report was generated by Carbon Ledger MRV on {new Date().toLocaleString()}.</p>
                    <p className="mt-1">GWP values: {GWP_AR6.name} | Methodology: IPCC 2006 + EU CBAM Regulation 2025/2547</p>
                </div>
            </div>
        </div>
    );
}

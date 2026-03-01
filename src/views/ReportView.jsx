import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { calculateTotalEmissions, calculatePCF, GWP_AR6, calcCombustionEmissions, calcElectricityEmissions } from '../engine/emissionEngine';
import { fmtInt, fmtNum, fmtPct } from '../utils/formatUtils';
import { Printer, FileText } from 'lucide-react';

export default function ReportView() {
    const { state } = useApp();
    const { t } = useLanguage();

    const emissions = useMemo(() => calculateTotalEmissions({
        fuels: state.activity.fuels,
        electricity: state.activity.electricity,
        processEvents: state.processEvents || [],
        emissionBlocks: state.emissionBlocks || [],
        boundaries: state.boundaries || [],
    }), [state.activity, state.processEvents, state.emissionBlocks, state.boundaries]);

    const pcf = useMemo(() => calculatePCF(
        emissions, state.products, state.allocationSettings
    ), [emissions, state.products, state.allocationSettings]);

    const directTotal = emissions.summary.directCO2e;
    const indirectTotal = emissions.electricity.totals.co2e;
    const grandTotal = directTotal + indirectTotal;

    return (
        <div className="space-y-4">
            {/* Print Button (hidden when printing) */}
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{t('ui.report.title')}</h2>
                    <p className="text-sm text-slate-500">{t('ui.report.subtitle')}</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="btn-primary"
                >
                    <Printer size={16} />
                    {t('ui.report.print')}
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
                        <div><span className="text-xs text-slate-400 block">{t('ui.report.cover.installation')}</span><strong className="text-slate-800">{state.meta.installationName}</strong></div>
                        <div><span className="text-xs text-slate-400 block">{t('ui.report.cover.country')}</span><strong className="text-slate-800">{state.meta.country}</strong></div>
                        <div><span className="text-xs text-slate-400 block">{t('ui.report.cover.period')}</span><strong className="text-slate-800">{state.meta.periodStart} → {state.meta.periodEnd}</strong></div>
                        <div><span className="text-xs text-slate-400 block">{t('ui.report.cover.status')}</span>
                            <strong className="text-slate-800">{state.meta.workflowStatus || 'DRAFT'}</strong>
                        </div>
                        <div><span className="text-xs text-slate-400 block">{t('ui.report.cover.gwp')}</span><strong className="text-slate-800">{GWP_AR6.name}</strong></div>
                        <div><span className="text-xs text-slate-400 block">{t('ui.report.cover.generated')}</span><strong className="text-slate-800">{new Date().toLocaleDateString()}</strong></div>
                    </div>
                </div>

                {/* Executive Summary */}
                <div className="p-8 border-b border-slate-200">
                    <h3 className="text-base font-bold text-slate-800 mb-4">{t('ui.report.execSummary.title')}</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-blue-700">{fmtInt(directTotal)}</div>
                            <div className="text-xs text-blue-500">{t('ui.report.execSummary.direct')} (tCO₂e)</div>
                        </div>
                        <div className="bg-cyan-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-cyan-700">{fmtInt(indirectTotal)}</div>
                            <div className="text-xs text-cyan-500">{t('ui.report.execSummary.indirect')} (tCO₂e)</div>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-indigo-700">{fmtInt(grandTotal)}</div>
                            <div className="text-xs text-indigo-500">{t('ui.report.execSummary.total')} (tCO₂e)</div>
                        </div>
                    </div>
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 text-slate-500">{t('ui.report.execSummary.combustionCo2')}</td>
                                <td className="py-2 text-right font-medium">{fmtNum(emissions.combustion.totals.co2, 1)} tCO₂</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 text-slate-500">{t('ui.report.execSummary.combustionCh4')}</td>
                                <td className="py-2 text-right font-medium">{fmtNum(emissions.combustion.totals.ch4 * GWP_AR6.CH4, 2)} tCO₂e</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 text-slate-500">{t('ui.report.execSummary.combustionN2o')}</td>
                                <td className="py-2 text-right font-medium">{fmtNum(emissions.combustion.totals.n2o * GWP_AR6.N2O, 2)} tCO₂e</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 text-slate-500">{t('ui.report.execSummary.processDirect')}</td>
                                <td className="py-2 text-right font-medium">{fmtNum(emissions.summary.directCO2e - emissions.summary.combustionCO2e, 1)} tCO₂e</td>
                            </tr>
                            <tr>
                                <td className="py-2 text-slate-500">{t('ui.report.execSummary.electricity')}</td>
                                <td className="py-2 text-right font-medium">{fmtInt(indirectTotal)} tCO₂e</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Processes */}
                <div className="p-8 border-b border-slate-200 print:break-before-auto">
                    <h3 className="text-base font-bold text-slate-800 mb-4">{t('ui.report.processes.title')}</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                                <th className="py-2">{t('ui.report.processes.id')}</th>
                                <th className="py-2">{t('ui.report.processes.name')}</th>
                                <th className="py-2">{t('ui.report.processes.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.processes.map(p => (
                                <tr key={p.id} className="border-b border-slate-100">
                                    <td className="py-2 font-mono text-xs">{p.id}</td>
                                    <td className="py-2 text-slate-800">{p.name || p.id}</td>
                                    <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${p.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.active !== false ? t('ui.report.processes.active') : t('ui.report.processes.inactive')}</span></td>
                                </tr>
                            ))}
                            {state.processes.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-slate-400">{t('ui.report.processes.empty')}</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Activity Data — Fuels */}
                <div className="p-8 border-b border-slate-200 print:break-before-auto">
                    <h3 className="text-base font-bold text-slate-800 mb-4">{t('ui.report.fuel.title')}</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                                <th className="py-2">{t('ui.report.fuel.period')}</th>
                                <th className="py-2">{t('ui.report.fuel.type')}</th>
                                <th className="py-2 text-right">{t('ui.report.fuel.qty')}</th>
                                <th className="py-2">{t('ui.report.fuel.unit')}</th>
                                <th className="py-2">{t('ui.report.fuel.source')}</th>
                                <th className="py-2 text-right">{t('ui.report.fuel.co2e')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.activity.fuels.map((f, i) => {
                                const result = calcCombustionEmissions(f);
                                return (
                                    <tr key={f.id || i} className="border-b border-slate-100">
                                        <td className="py-1.5">{f.period}</td>
                                        <td className="py-1.5">{f.fuelTypeId}</td>
                                        <td className="py-1.5 text-right">{fmtInt(f.quantity)}</td>
                                        <td className="py-1.5">{f.unit}</td>
                                        <td className="py-1.5 text-slate-500">{f.source || 'manual'}</td>
                                        <td className="py-1.5 text-right font-medium">{fmtNum(result.co2e, 1)}</td>
                                    </tr>
                                );
                            })}
                            {state.activity.fuels.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-slate-400">{t('ui.report.fuel.empty')}</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Activity Data — Electricity */}
                <div className="p-8 border-b border-slate-200">
                    <h3 className="text-base font-bold text-slate-800 mb-4">{t('ui.report.electricity.title')}</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                                <th className="py-2">{t('ui.report.electricity.period')}</th>
                                <th className="py-2 text-right">{t('ui.report.electricity.mwh')}</th>
                                <th className="py-2 text-right">{t('ui.report.electricity.ef')}</th>
                                <th className="py-2">{t('ui.report.electricity.source')}</th>
                                <th className="py-2 text-right">{t('ui.report.electricity.co2e')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.activity.electricity.map((e, i) => {
                                const result = calcElectricityEmissions(e);
                                return (
                                    <tr key={e.id || i} className="border-b border-slate-100">
                                        <td className="py-1.5">{e.period}</td>
                                        <td className="py-1.5 text-right">{fmtInt(e.mwh || 0)}</td>
                                        <td className="py-1.5 text-right">{e.ef}</td>
                                        <td className="py-1.5 text-slate-500">{e.source || 'manual'}</td>
                                        <td className="py-1.5 text-right font-medium">{fmtNum(result.co2e, 1)}</td>
                                    </tr>
                                );
                            })}
                            {state.activity.electricity.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-slate-400">{t('ui.report.electricity.empty')}</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Process Emission Blocks */}
                {(state.emissionBlocks || []).length > 0 && (
                    <div className="p-8 border-b border-slate-200 print:break-before-auto">
                        <h3 className="text-base font-bold text-slate-800 mb-4">{t('ui.report.blocks.title')}</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                                    <th className="py-2">{t('ui.report.blocks.name')}</th>
                                    <th className="py-2">{t('ui.report.blocks.gas')}</th>
                                    <th className="py-2">{t('ui.report.blocks.formula')}</th>
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
                        {(state.emissionBlocks || []).length > 0 ? '6' : '5'}. {t('ui.report.pcf.title')}
                    </h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                                <th className="py-2">{t('ui.report.pcf.product')}</th>
                                <th className="py-2">{t('ui.report.pcf.cnCode')}</th>
                                <th className="py-2 text-right">{t('ui.report.pcf.output')}</th>
                                <th className="py-2 text-right">{t('ui.report.pcf.directSee')}</th>
                                <th className="py-2 text-right">{t('ui.report.pcf.indirectSee')}</th>
                                <th className="py-2 text-right">{t('ui.report.pcf.totalSee')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pcf.map((p, i) => (
                                <tr key={i} className={`border-b border-slate-100 ${p.isResidue ? 'text-slate-400' : ''}`}>
                                    <td className="py-1.5 font-medium">{p.productName || p.name} {p.isResidue && '(residue)'}</td>
                                    <td className="py-1.5">{p.cnCode || '—'}</td>
                                    <td className="py-1.5 text-right">{fmtInt(p.quantity || 0)}</td>
                                    <td className="py-1.5 text-right">{fmtNum(p.pcfDirect ?? 0, 4)}</td>
                                    <td className="py-1.5 text-right">{fmtNum(p.pcfIndirect ?? 0, 4)}</td>
                                    <td className="py-1.5 text-right font-semibold">{fmtNum(p.pcf ?? 0, 4)}</td>
                                </tr>
                            ))}
                            {pcf.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-slate-400">{t('ui.report.pcf.empty')}</td></tr>}
                        </tbody>
                    </table>
                    <div className="mt-3 text-xs text-slate-400">
                        {t('ui.report.pcf.note')} {state.allocationSettings?.method || 'mass'}.
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 text-center text-xs text-slate-400">
                    <p>{t('ui.report.footer.generated')} {new Date().toLocaleString()}.</p>
                    <p className="mt-1">{t('ui.report.footer.methodology', { gwp: GWP_AR6.name })}</p>
                </div>
            </div>
        </div>
    );
}

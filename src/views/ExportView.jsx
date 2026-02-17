import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { buildCBAMTemplate, downloadAsJSON, downloadAsCSV } from '../engine/cbamExporter';
import { Download, FileJson, FileSpreadsheet, Eye, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

export default function ExportView() {
    const { state } = useApp();
    const [previewOpen, setPreviewOpen] = useState(false);

    const template = useMemo(() => buildCBAMTemplate(state), [state]);
    const t = template.communicationTemplate;
    const isLocked = state.meta.workflowStatus === 'APPROVED' || state.meta.workflowStatus === 'SUBMITTED';
    const hasGoods = t.goods.length > 0;
    const hasEmissions = t.emissionsSummary.grandTotal > 0;

    const readinessChecks = [
        { label: 'Emissions calculated', pass: hasEmissions },
        { label: 'Products defined', pass: hasGoods },
        { label: 'Period defined', pass: !!t.reportingPeriod.start && !!t.reportingPeriod.end },
        { label: 'Installation named', pass: t.installation.name && t.installation.name !== 'New Installation' },
        { label: 'Approved or Submitted', pass: isLocked, warn: true },
    ];

    const criticalPassed = readinessChecks.filter(c => !c.warn).every(c => c.pass);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">CBAM Communication Export</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Generate structured data for EU CBAM declarations
                    </p>
                </div>
            </div>

            {/* Readiness Checks */}
            <div className="card">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Export Readiness</h3>
                <div className="grid grid-cols-5 gap-3">
                    {readinessChecks.map((c, i) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                            ${c.pass ? 'bg-emerald-50 text-emerald-700' : c.warn ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                            {c.pass ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                            <span>{c.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Export Actions */}
            <div className="grid grid-cols-2 gap-4">
                <div className="card hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => downloadAsJSON(state)}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <FileJson size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">Export as JSON</h3>
                            <p className="text-xs text-slate-500">Machine-readable structured data</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                        Full CBAM communication template in JSON format. Suitable for automated processing
                        and integration with EU CBAM registry systems.
                    </p>
                    <button className="flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
                        <Download size={14} />
                        Download JSON
                    </button>
                </div>

                <div className="card hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => downloadAsCSV(state)}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <FileSpreadsheet size={20} className="text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">Export as CSV</h3>
                            <p className="text-xs text-slate-500">Spreadsheet-compatible format</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                        Tabular export suitable for Excel, Google Sheets, or email-based operator communication workflows.
                    </p>
                    <button className="flex items-center gap-2 text-sm font-medium text-emerald-600 group-hover:text-emerald-700 transition-colors">
                        <Download size={14} />
                        Download CSV
                    </button>
                </div>
            </div>

            {/* Summary Preview */}
            <div className="card">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Export Summary</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Installation</span>
                        <strong className="text-slate-800">{t.installation.name}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Country</span>
                        <strong className="text-slate-800">{t.installation.country}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Period</span>
                        <strong className="text-slate-800">{t.reportingPeriod.start} → {t.reportingPeriod.end}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Status</span>
                        <strong className="text-slate-800">{t.verification.status}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">GWP Set</span>
                        <strong className="text-slate-800">{t.methodology.gwpSetName}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Allocation</span>
                        <strong className="text-slate-800 capitalize">{t.methodology.allocationMethod}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Total Emissions</span>
                        <strong className="text-slate-800">{t.emissionsSummary.grandTotal.toLocaleString()} tCO₂e</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Products</span>
                        <strong className="text-slate-800">{t.goods.length} good(s)</strong>
                    </div>
                </div>

                {/* Goods Table */}
                {t.goods.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Goods / Products</h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                                    <th className="py-2">Product</th>
                                    <th className="py-2">CN Code</th>
                                    <th className="py-2 text-right">Qty (t)</th>
                                    <th className="py-2 text-right">Direct SEE</th>
                                    <th className="py-2 text-right">Indirect SEE</th>
                                    <th className="py-2 text-right">Total SEE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {t.goods.map((g, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="py-2 font-medium text-slate-800">{g.productName}</td>
                                        <td className="py-2 text-slate-500">{g.cnCode || '—'}</td>
                                        <td className="py-2 text-right">{g.productionQuantity.value.toLocaleString()}</td>
                                        <td className="py-2 text-right">{g.embeddedEmissions.direct.specific}</td>
                                        <td className="py-2 text-right">{g.embeddedEmissions.indirect.specific}</td>
                                        <td className="py-2 text-right font-semibold">{g.embeddedEmissions.total.specific}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Raw JSON Preview */}
            <div className="card">
                <button
                    onClick={() => setPreviewOpen(!previewOpen)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 w-full"
                >
                    {previewOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Eye size={14} />
                    Raw JSON Preview
                </button>
                {previewOpen && (
                    <pre className="mt-3 bg-slate-900 text-slate-50 p-4 rounded-lg text-xs overflow-auto max-h-96 font-mono">
                        {JSON.stringify(template, null, 2)}
                    </pre>
                )}
            </div>
        </div>
    );
}

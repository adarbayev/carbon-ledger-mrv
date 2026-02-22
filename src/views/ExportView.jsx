import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { buildCBAMTemplate, downloadAsJSON, downloadAsCSV } from '../engine/cbamExporter';
import { fmtInt, fmtNum } from '../utils/formatUtils';
import { Download, FileJson, FileSpreadsheet, Eye, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

export default function ExportView() {
    const { state } = useApp();
    const { t } = useLanguage();
    const [previewOpen, setPreviewOpen] = useState(false);

    const template = useMemo(() => buildCBAMTemplate(state), [state]);
    const commTemplate = template.communicationTemplate;
    const isLocked = state.meta.workflowStatus === 'APPROVED' || state.meta.workflowStatus === 'SUBMITTED';
    const hasGoods = commTemplate.goods.length > 0;
    const hasEmissions = commTemplate.emissionsSummary.grandTotal > 0;

    const readinessChecks = [
        { label: t('ui.export.readiness.emissions'), pass: hasEmissions },
        { label: t('ui.export.readiness.products'), pass: hasGoods },
        { label: t('ui.export.readiness.period'), pass: !!commTemplate.reportingPeriod.start && !!commTemplate.reportingPeriod.end },
        { label: t('ui.export.readiness.installation'), pass: commTemplate.installation.name && commTemplate.installation.name !== 'New Installation' },
        { label: t('ui.export.readiness.approved'), pass: isLocked, warn: true },
    ];

    const criticalPassed = readinessChecks.filter(c => !c.warn).every(c => c.pass);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{t('ui.export.title')}</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {t('ui.export.subtitle')}
                    </p>
                </div>
            </div>

            {/* Readiness Checks */}
            <div className="card">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('ui.export.readiness.title')}</h3>
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
                            <h3 className="font-semibold text-slate-800">{t('ui.export.json.title')}</h3>
                            <p className="text-xs text-slate-500">{t('ui.export.json.subtitle')}</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                        {t('ui.export.json.desc')}
                    </p>
                    <button className="flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
                        <Download size={14} />
                        {t('ui.export.json.action')}
                    </button>
                </div>

                <div className="card hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => downloadAsCSV(state)}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <FileSpreadsheet size={20} className="text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800">{t('ui.export.csv.title')}</h3>
                            <p className="text-xs text-slate-500">{t('ui.export.csv.subtitle')}</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                        {t('ui.export.csv.desc')}
                    </p>
                    <button className="flex items-center gap-2 text-sm font-medium text-emerald-600 group-hover:text-emerald-700 transition-colors">
                        <Download size={14} />
                        {t('ui.export.csv.action')}
                    </button>
                </div>
            </div>

            {/* Summary Preview */}
            <div className="card">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('ui.export.summary.title')}</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">{t('ui.export.summary.installation')}</span>
                        <strong className="text-slate-800">{commTemplate.installation.name}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">{t('ui.export.summary.country')}</span>
                        <strong className="text-slate-800">{commTemplate.installation.country}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">{t('ui.export.summary.period')}</span>
                        <strong className="text-slate-800">{commTemplate.reportingPeriod.start} → {commTemplate.reportingPeriod.end}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">{t('ui.export.summary.status')}</span>
                        <strong className="text-slate-800">{commTemplate.verification.status}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">{t('ui.export.summary.gwpSet')}</span>
                        <strong className="text-slate-800">{commTemplate.methodology.gwpSetName}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">{t('ui.export.summary.allocation')}</span>
                        <strong className="text-slate-800 capitalize">{commTemplate.methodology.allocationMethod}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">{t('ui.export.summary.total_emissions')}</span>
                        <strong className="text-slate-800">{fmtInt(commTemplate.emissionsSummary.grandTotal)} tCO₂e</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">{t('ui.export.summary.products')}</span>
                        <strong className="text-slate-800">{commTemplate.goods.length} {t('ui.export.summary.goods_suffix')}</strong>
                    </div>
                </div>

                {/* Goods Table */}
                {commTemplate.goods.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('ui.export.goods.title')}</h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                                    <th className="py-2">{t('ui.export.goods.product')}</th>
                                    <th className="py-2">{t('ui.export.goods.cn_code')}</th>
                                    <th className="py-2 text-right">{t('ui.export.goods.qty')}</th>
                                    <th className="py-2 text-right">{t('ui.export.goods.direct_see')}</th>
                                    <th className="py-2 text-right">{t('ui.export.goods.indirect_see')}</th>
                                    <th className="py-2 text-right">{t('ui.export.goods.total_see')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {commTemplate.goods.map((g, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="py-2 font-medium text-slate-800">{g.productName}</td>
                                        <td className="py-2 text-slate-500">{g.cnCode || '—'}</td>
                                        <td className="py-2 text-right">{fmtInt(g.productionQuantity.value)}</td>
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
                    {t('ui.export.preview.title')}
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

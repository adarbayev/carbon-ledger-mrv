import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { calculateTotalEmissions, calculatePCF, calcCombustionEmissions, calcElectricityEmissions } from '../engine/emissionEngine';
import { calculateCBAMProjection } from '../engine/cbamCalculator';
import { calculateDataCompleteness } from '../engine/qaEngine';
import { fmtInt, fmtNum, fmtPct, fmtSEE, fmtMillions } from '../utils/formatUtils';
import {
    BarChart3, TrendingUp, ShieldCheck, Zap, Flame, Factory,
    ArrowRight, AlertTriangle, CheckCircle2, Activity
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts';

const SCOPE_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6'];
const GAS_COLORS = { CO2: '#3b82f6', CH4: '#f59e0b', N2O: '#ef4444', CF4: '#8b5cf6', C2F6: '#ec4899' };

export default function DashboardView() {
    const { state, dispatch } = useApp();
    const { t } = useLanguage();

    // ─── Compute emissions ────────────────────────────────────
    const emissionResult = useMemo(() => calculateTotalEmissions({
        fuels: state.activity.fuels,
        electricity: state.activity.electricity,
        processEvents: state.processEvents || [],
        emissionBlocks: state.emissionBlocks || [],
    }), [state.activity.fuels, state.activity.electricity, state.processEvents, state.emissionBlocks]);

    const directEmissions = emissionResult.summary.directCO2e;
    const indirectEmissions = emissionResult.electricity.totals.co2e;
    const totalEmissions = directEmissions + indirectEmissions;

    // ─── PCF ──────────────────────────────────────────────────
    const pcfResults = useMemo(() => calculatePCF(
        emissionResult, state.products, state.allocationSettings
    ), [emissionResult, state.products, state.allocationSettings]);

    const mainProduct = pcfResults.find(p => !(p.isResidue || p.isExcluded));

    // ─── Completeness ─────────────────────────────────────────
    const completeness = useMemo(() => {
        return calculateDataCompleteness(state);
    }, [state.activity, state.emissionBlocks]);

    // ─── QA checks (simplified inline) ────────────────────────
    const qaStats = useMemo(() => {
        let passed = 0, total = 0;
        // Check: has fuels
        total++; if (state.activity.fuels.length > 0) passed++;
        // Check: has electricity
        total++; if (state.activity.electricity.length > 0) passed++;
        // Check: has products
        total++; if (state.products.length > 0) passed++;
        // Check: has processes
        total++; if (state.processes.length > 0) passed++;
        // Check: emissions > 0
        total++; if (totalEmissions > 0) passed++;
        // Check: completeness >= 80%
        total++; if (completeness.pct >= 80) passed++;
        return { passed, total };
    }, [state.activity.fuels, state.activity.electricity, state.products, state.processes, totalEmissions, completeness]);

    // ─── CBAM exposure ────────────────────────────────────────
    const cbamExposure = useMemo(() => {
        const cbam = state.cbamSettings;
        const importedQty = parseFloat(cbam.importedQty) || 0;
        if (!mainProduct || totalEmissions === 0 || importedQty === 0) return null;
        try {
            const proj = calculateCBAMProjection({
                scope: cbam.scope,
                certPriceScenario: cbam.certPriceScenario,
                alPriceScenario: cbam.alPriceScenario,
                carbonCreditEligible: cbam.carbonCreditEligible,
                carbonCreditScenario: cbam.carbonCreditScenario,
                importedQty,
                cnCode: cbam.cnCode,
                goodCategory: cbam.goodCategory || state.meta.goodCategory,
                seeDirect: mainProduct.pcfDirect || 0,
                seeIndirect: mainProduct.pcfIndirect || 0,
                basis: 'ACTUAL',
            });
            return proj.rows?.[0] || null; // 2026 row
        } catch { return null; }
    }, [state.cbamSettings, mainProduct, totalEmissions, state.meta.goodCategory]);

    // ─── Monthly trend data ───────────────────────────────────
    const monthlyTrend = useMemo(() => {
        const byMonth = {};
        state.activity.fuels.forEach(f => {
            const m = f.period || 'Unknown';
            if (!byMonth[m]) byMonth[m] = { month: m, direct: 0, indirect: 0 };
            byMonth[m].direct += calcCombustionEmissions(f).co2e;
        });
        state.activity.electricity.forEach(e => {
            const m = e.period || 'Unknown';
            if (!byMonth[m]) byMonth[m] = { month: m, direct: 0, indirect: 0 };
            byMonth[m].indirect += calcElectricityEmissions(e).co2e;
        });
        return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
    }, [state.activity.fuels, state.activity.electricity]);

    // ─── Scope breakdown pie ──────────────────────────────────
    const scopeData = [
        { name: t('ui.dashboard.charts.scope1'), value: Math.round(emissionResult.combustion.totals.co2e) },
        { name: t('ui.dashboard.charts.process1'), value: Math.round(emissionResult.summary.directCO2e - emissionResult.summary.combustionCO2e) },
        { name: t('ui.dashboard.charts.scope2'), value: Math.round(indirectEmissions) },
    ].filter(d => d.value > 0);

    // ─── Helpers ──────────────────────────────────────────────
    const pctColor = (pct) => pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600';
    const pctBg = (pct) => pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="space-y-6">
            {/* ─── KPI Cards ────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
                {/* Total Emissions */}
                <div className="card bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => dispatch({ type: 'SET_TAB', payload: 'results' })}>
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <TrendingUp size={18} />
                        <span className="text-xs font-semibold uppercase tracking-wide">{t('ui.dashboard.cards.total')}</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-800">{fmtInt(totalEmissions)}</div>
                    <div className="text-xs text-blue-500 mt-1">tCO₂e (Total Site)</div>
                    <div className="mt-3 flex gap-4 text-xs text-slate-500">
                        <span>{t('ui.results.cards.direct')}: <strong className="text-slate-700">{fmtInt(directEmissions)}</strong></span>
                        <span>{t('ui.results.cards.indirect')}: <strong className="text-slate-700">{fmtInt(indirectEmissions)}</strong></span>
                    </div>
                </div>

                {/* Completeness */}
                <div className="card cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => dispatch({ type: 'SET_TAB', payload: 'activity' })}>
                    <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <Activity size={18} />
                        <span className="text-xs font-semibold uppercase tracking-wide">{t('ui.dashboard.cards.completeness')}</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-700">{completeness.pct}%</div>
                    <div className="text-[11px] text-blue-400 mt-1">
                        {completeness.filled}/{completeness.total} data fields filled
                    </div>
                    <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${pctBg(completeness.pct)}`}
                            style={{ width: `${completeness.pct}%` }} />
                    </div>
                </div>

                {/* QA Status */}
                <div className="card cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => dispatch({ type: 'SET_TAB', payload: 'qa' })}>
                    <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <ShieldCheck size={18} />
                        <span className="text-xs font-semibold uppercase tracking-wide">{t('ui.dashboard.cards.qa')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {qaStats.passed === qaStats.total ? (
                            <CheckCircle2 size={28} className="text-emerald-500" />
                        ) : (
                            <AlertTriangle size={28} className="text-amber-500" />
                        )}
                        <div className="text-3xl font-bold text-slate-800">{qaStats.passed}/{qaStats.total}</div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{t('ui.dashboard.cards.checksPassed')}</div>
                </div>
            </div>

            {/* ─── Second Row: PCF + CBAM + Data Sources ──── */}
            <div className="grid grid-cols-3 gap-4">
                {/* PCF */}
                <div className="card">
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                        <Factory size={18} />
                        <span className="text-xs font-semibold uppercase tracking-wide">{t('ui.dashboard.pcf.title')}</span>
                    </div>
                    {mainProduct ? (
                        <>
                            <div className="text-2xl font-bold text-indigo-800">{fmtSEE(mainProduct.pcf)}</div>
                            <div className="text-xs text-indigo-400">tCO₂e / {t('ui.results.pcf.product').toLowerCase()}</div>
                            <div className="mt-2 text-xs text-slate-500">
                                {mainProduct.productName || mainProduct.name} — {fmtInt(mainProduct.quantity || 0)} {t('ui.dashboard.pcf.produced')}
                            </div>
                        </>
                    ) : (
                        <div className="text-sm text-slate-400">{t('ui.dashboard.pcf.empty')}</div>
                    )}
                </div>

                {/* CBAM Exposure */}
                <div className="card">
                    <div className="flex items-center gap-2 text-orange-600 mb-2">
                        <BarChart3 size={18} />
                        <span className="text-xs font-semibold uppercase tracking-wide">{t('ui.dashboard.cbam.title')}</span>
                    </div>
                    {cbamExposure ? (
                        <>
                            <div className="text-2xl font-bold text-orange-800">
                                €{fmtMillions(cbamExposure.netCost / 1e6)}M
                            </div>
                            <div className="text-xs text-orange-400">
                                {fmtInt(cbamExposure.payableEmissions)} {t('ui.dashboard.cbam.payable')} €{cbamExposure.certPrice}/t
                            </div>
                        </>
                    ) : (
                        <div className="text-sm text-slate-400">{t('ui.dashboard.cbam.configure')}</div>
                    )}
                </div>

                {/* Data Sources */}
                <div className="card">
                    <div className="flex items-center gap-2 text-cyan-600 mb-2">
                        <Zap size={18} />
                        <span className="text-xs font-semibold uppercase tracking-wide">{t('ui.dashboard.data.title')}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500 flex items-center gap-1"><Flame size={12} /> {t('ui.dashboard.data.fuel')}</span>
                            <strong className="text-slate-800">{state.activity.fuels.length}</strong>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 flex items-center gap-1"><Zap size={12} /> {t('ui.dashboard.data.electricity')}</span>
                            <strong className="text-slate-800">{state.activity.electricity.length}</strong>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 flex items-center gap-1"><Factory size={12} /> {t('ui.dashboard.data.blocks')}</span>
                            <strong className="text-slate-800">{(state.emissionBlocks || []).length}</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Charts Row ─────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem' }}>
                {/* Scope Breakdown Donut */}
                <div className="card">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('ui.dashboard.charts.scopeTitle')}</h3>
                    {scopeData.length > 0 ? (
                        <div style={{ height: 220 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={scopeData} cx="50%" cy="50%"
                                        innerRadius={55} outerRadius={85}
                                        paddingAngle={3} dataKey="value">
                                        {scopeData.map((_, i) => (
                                            <Cell key={i} fill={SCOPE_COLORS[i % SCOPE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => `${fmtInt(v)} tCO₂e`}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-400 py-10 text-center">{t('ui.dashboard.charts.noData')}</div>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 justify-center">
                        {scopeData.map((d, i) => (
                            <span key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: SCOPE_COLORS[i % SCOPE_COLORS.length] }} />
                                {d.name}: <strong>{fmtInt(d.value)}</strong>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className="card">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('ui.dashboard.charts.trendTitle')}</h3>
                    {monthlyTrend.length > 0 ? (
                        <div style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyTrend} margin={{ left: 10, right: 10, bottom: 0 }}>
                                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        formatter={(v) => `${fmtInt(v)} tCO₂e`}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="direct" stackId="a" fill="#3b82f6" name={t('ui.results.cards.direct')} radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="indirect" stackId="a" fill="#06b6d4" name={t('ui.results.cards.indirect')} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-400 py-10 text-center">{t('ui.dashboard.charts.addActivity')}</div>
                    )}
                </div>
            </div>

            {/* ─── Quick Navigation ───────────────────────── */}
            <div className="card bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('ui.dashboard.actions.title')}</h3>
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { tab: 'activity', label: t('ui.dashboard.actions.activity'), icon: Flame, color: 'text-orange-500' },
                        { tab: 'results', label: t('ui.dashboard.actions.results'), icon: BarChart3, color: 'text-blue-500' },
                        { tab: 'qa', label: t('ui.dashboard.actions.qa'), icon: ShieldCheck, color: 'text-emerald-500' },
                        { tab: 'audit', label: t('ui.dashboard.actions.audit'), icon: Activity, color: 'text-violet-500' },
                    ].map(a => (
                        <button key={a.tab}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:border-blue-300 hover:shadow-sm transition-all group"
                            onClick={() => dispatch({ type: 'SET_TAB', payload: a.tab })}>
                            <a.icon size={16} className={a.color} />
                            <span>{a.label}</span>
                            <ArrowRight size={14} className="ml-auto text-slate-300 group-hover:text-blue-400 transition-colors" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

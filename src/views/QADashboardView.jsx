import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { validateFormula } from '../engine/formulaEvaluator';
import { ShieldCheck, AlertTriangle, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

// ──────────────────────────────────────────────────────────────
//  QA Checks — each returns an array of { severity, entity, entityId, message }
// ──────────────────────────────────────────────────────────────

function runChecks(state) {
    const issues = [];
    const blocks = state.emissionBlocks || [];
    const fuels = state.activity?.fuels || [];
    const elec = state.activity?.electricity || [];
    const processes = state.processes || [];
    const processIds = new Set(processes.map(p => p.id));

    // 1. Empty formula
    blocks.forEach(b => {
        if (!b.formula || !b.formula.trim()) {
            issues.push({
                severity: 'error', entity: 'Emission Block', entityId: b.id, tab: 'activity',
                message: `"${b.name}" has no formula defined`
            });
        }
    });

    // 2. Missing / zero parameter values
    blocks.forEach(b => {
        (b.parameters || []).forEach(p => {
            if (p.value === 0 || p.value === null || p.value === undefined || isNaN(p.value)) {
                issues.push({
                    severity: 'warning', entity: 'Emission Block', entityId: b.id, tab: 'activity',
                    message: `"${b.name}" → param "${p.key}" is ${p.value === 0 ? 'zero' : 'empty'}`
                });
            }
        });
    });

    // 3. Formula validation errors
    blocks.forEach(b => {
        if (b.formula && b.formula.trim()) {
            const keys = (b.parameters || []).map(p => p.key);
            const v = validateFormula(b.formula, keys);
            if (!v.valid) {
                issues.push({
                    severity: 'error', entity: 'Emission Block', entityId: b.id, tab: 'activity',
                    message: `"${b.name}" formula error: ${v.error}`
                });
            }
        }
    });

    // 4. Zero-quantity fuel entries
    fuels.forEach(f => {
        if (!f.quantity || f.quantity === 0) {
            issues.push({
                severity: 'warning', entity: 'Fuel Entry', entityId: f.id, tab: 'activity',
                message: `"${f.fuelName || f.id}" has zero quantity`
            });
        }
    });

    // 5. Negative values in fuels
    fuels.forEach(f => {
        if (f.quantity < 0) {
            issues.push({
                severity: 'error', entity: 'Fuel Entry', entityId: f.id, tab: 'activity',
                message: `"${f.fuelName || f.id}" has negative quantity: ${f.quantity}`
            });
        }
        if (f.ncv && f.ncv < 0) {
            issues.push({
                severity: 'error', entity: 'Fuel Entry', entityId: f.id, tab: 'activity',
                message: `"${f.fuelName || f.id}" has negative NCV: ${f.ncv}`
            });
        }
    });

    // 6. Zero-quantity electricity entries
    elec.forEach(e => {
        if (!e.mwh || e.mwh === 0) {
            issues.push({
                severity: 'warning', entity: 'Electricity', entityId: e.id, tab: 'activity',
                message: `"${e.id}" has zero consumption`
            });
        }
    });

    // 7. Orphan blocks (not linked to a process)
    blocks.forEach(b => {
        if (b.processId && !processIds.has(b.processId)) {
            issues.push({
                severity: 'warning', entity: 'Emission Block', entityId: b.id, tab: 'activity',
                message: `"${b.name}" linked to non-existent process "${b.processId}"`
            });
        }
    });

    return issues;
}

// ──────────────────────────────────────────────────────────────
//  Component
// ──────────────────────────────────────────────────────────────

const SEVERITY_STYLES = {
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertCircle, label: 'Error', dot: 'bg-red-500' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangle, label: 'Warning', dot: 'bg-amber-500' },
};

export default function QADashboardView() {
    const { state, dispatch } = useApp();

    const issues = useMemo(() => runChecks(state), [state]);

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const totalChecked = (state.emissionBlocks || []).length
        + (state.activity?.fuels || []).length
        + (state.activity?.electricity || []).length;
    const passedCount = Math.max(0, totalChecked - errorCount - warningCount);

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <ShieldCheck size={20} className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">QA Dashboard</h2>
                    <p className="text-xs text-slate-500">Automated data quality checks</p>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertCircle size={16} className="text-red-500" />
                        <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Errors</span>
                    </div>
                    <div className="text-3xl font-bold text-red-700">{errorCount}</div>
                    <div className="text-[11px] text-red-400 mt-0.5">Must fix before reporting</div>
                </div>
                <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={16} className="text-amber-500" />
                        <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Warnings</span>
                    </div>
                    <div className="text-3xl font-bold text-amber-700">{warningCount}</div>
                    <div className="text-[11px] text-amber-400 mt-0.5">Review recommended</div>
                </div>
                <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={16} className="text-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Passed</span>
                    </div>
                    <div className="text-3xl font-bold text-emerald-700">{passedCount}</div>
                    <div className="text-[11px] text-emerald-400 mt-0.5">Data points OK</div>
                </div>
            </div>

            {/* Issues list */}
            {issues.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-emerald-200">
                    <CheckCircle size={40} className="mx-auto text-emerald-400 mb-3" />
                    <p className="text-sm font-medium text-emerald-700">All checks passed</p>
                    <p className="text-xs text-slate-400 mt-1">No data quality issues detected</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            {issues.length} issue{issues.length !== 1 ? 's' : ''} found
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {issues.map((issue, i) => {
                            const style = SEVERITY_STYLES[issue.severity];
                            const Icon = style.icon;
                            return (
                                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${style.bg} hover:brightness-[0.98] transition-all`}>
                                    <div className={`w-2 h-2 rounded-full ${style.dot} flex-shrink-0`} />
                                    <Icon size={14} className={`${style.text} flex-shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text} mr-2`}>
                                            {style.label}
                                        </span>
                                        <span className="text-xs text-slate-600">{issue.message}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{issue.entity}</span>
                                    <button
                                        className="text-[10px] px-2 py-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center gap-1 flex-shrink-0"
                                        onClick={() => dispatch({ type: 'SET_TAB', payload: issue.tab })}
                                    >
                                        Go to <ArrowRight size={9} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

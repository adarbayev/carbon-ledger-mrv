import React from 'react';
import { X, ArrowRight, Beaker, Sigma } from 'lucide-react';

/**
 * Lineage Panel — shows the full calculation trace for a single emission block.
 * Props:
 *   block  — block result from calculateTotalEmissions().emissionBlocks.entries[]
 *   onClose — callback to close the panel
 */
export default function LineagePanel({ block, onClose }) {
    if (!block || !block.lineage) return null;

    const { lineage } = block;
    const variables = lineage.variables || {};
    const varKeys = Object.keys(variables);

    // Build substituted formula string
    let substituted = lineage.formula || '';
    varKeys.forEach(k => {
        substituted = substituted.replace(new RegExp(`\\b${k}\\b`, 'g'), `[${variables[k]}]`);
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Calculation Lineage</h3>
                        <p className="text-xs text-slate-500">{block.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                        <X size={16} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Step 1: Formula */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">1</div>
                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Formula</span>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 font-mono text-sm text-slate-700 border border-slate-200 break-all">
                            {lineage.formula || '—'}
                        </div>
                        {lineage.source && (
                            <div className="mt-1 text-[10px] text-slate-400">Source: {lineage.source}</div>
                        )}
                    </div>

                    {/* Step 2: Variables */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">2</div>
                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Parameters</span>
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                            {varKeys.map(k => (
                                <div key={k} className="flex items-center justify-between px-3 py-2">
                                    <span className="text-xs font-mono text-blue-600">{k}</span>
                                    <span className="text-sm font-mono font-bold text-slate-800">{variables[k]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step 3: Substitution */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold">3</div>
                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Substituted</span>
                        </div>
                        <div className="bg-violet-50 rounded-lg p-3 font-mono text-sm text-violet-800 border border-violet-200 break-all">
                            {substituted}
                        </div>
                    </div>

                    {/* Step 4: Raw result */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">4</div>
                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Result</span>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-emerald-600 font-medium">Raw output</span>
                                <span className="text-lg font-bold font-mono text-emerald-800">
                                    {(lineage.rawResult || 0).toFixed(4)} <span className="text-xs font-normal">t {block.gas}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Step 5: GWP conversion */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-bold">5</div>
                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">GWP Conversion</span>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                            <div className="flex items-center gap-2 text-sm font-mono">
                                <span className="text-amber-700">{(lineage.rawResult || 0).toFixed(4)}</span>
                                <span className="text-slate-400">×</span>
                                <span className="px-2 py-0.5 bg-amber-200 rounded text-amber-800 font-bold">
                                    GWP = {lineage.gwpFactor}
                                </span>
                                <span className="text-slate-400">=</span>
                                <span className="text-amber-900 font-bold text-lg">{(lineage.co2e || 0).toFixed(4)}</span>
                                <span className="text-xs text-amber-600">tCO₂e</span>
                            </div>
                            {lineage.gwpFactor === 1 && (
                                <div className="text-[10px] text-amber-500 mt-1">Gas is CO₂ — GWP = 1 (no conversion)</div>
                            )}
                        </div>
                    </div>

                    {/* Final result */}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200">
                        <div className="text-center">
                            <div className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-1">Final Emission</div>
                            <div className="text-3xl font-bold text-indigo-800 font-mono">{(block.co2e || 0).toFixed(2)}</div>
                            <div className="text-xs text-indigo-500">tCO₂e</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

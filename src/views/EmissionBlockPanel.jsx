import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { calcEmissionBlock, GWP_AR6 } from '../engine/emissionEngine';
import { validateFormula, extractVariables } from '../engine/formulaEvaluator';
import { PROCESS_TEMPLATES, getTemplatesByCategory } from '../data/processTemplates';
import { FlaskConical, Plus, Trash2, ChevronDown, ChevronRight, Info, Beaker, Pencil, Check, X, AlertTriangle } from 'lucide-react';

// ─── Gas color mapping ───────────────────────────────────────
const GAS_COLORS = {
    CO2: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
    CH4: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-800' },
    N2O: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
    CF4: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800' },
    C2F6: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', badge: 'bg-fuchsia-100 text-fuchsia-800' },
};
const defaultGasColor = { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-800' };

export default function EmissionBlockPanel() {
    const { state, dispatch } = useApp();
    const emissionBlocks = state.emissionBlocks || [];
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [expandedBlocks, setExpandedBlocks] = useState(new Set());
    const [editingBlocks, setEditingBlocks] = useState(new Set());

    // Compute results for all blocks
    const blockResults = useMemo(() => {
        const results = {};
        emissionBlocks.forEach(block => {
            results[block.id] = calcEmissionBlock(block, GWP_AR6);
        });
        return results;
    }, [emissionBlocks]);

    // Totals
    const totalCO2e = useMemo(() =>
        Object.values(blockResults).reduce((sum, r) => sum + (r.co2e || 0), 0),
        [blockResults]
    );

    // Group blocks by period
    const blocksByPeriod = useMemo(() => {
        const groups = {};
        emissionBlocks.forEach(block => {
            const key = block.period || 'no-period';
            if (!groups[key]) groups[key] = [];
            groups[key].push(block);
        });
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [emissionBlocks]);

    // Template categories
    const templateCategories = useMemo(() => getTemplatesByCategory(), []);

    const toggleExpand = (id) => {
        setExpandedBlocks(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Add a new block from template
    const addBlockFromTemplate = (template) => {
        const period = state.meta.periodStart || '2025-01';
        const processId = state.processes[0]?.id || 'P01';
        const id = `eb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

        dispatch({
            type: 'ADD_EMISSION_BLOCK',
            payload: {
                id,
                period,
                processId,
                templateId: template.id,
                name: template.name,
                outputGas: template.outputGas,
                formula: template.formula,
                formulaDisplay: template.formulaDisplay,
                parameters: template.parameters.map(p => ({ ...p })),
                source: template.source || '',
                notes: '',
            }
        });
        setShowTemplateSelector(false);
    };

    // Delete block
    const deleteBlock = (id) => dispatch({ type: 'DELETE_EMISSION_BLOCK', payload: id });

    // Update a block parameter value
    const updateParam = (blockId, paramKey, value) => {
        dispatch({
            type: 'UPDATE_BLOCK_PARAM',
            payload: { blockId, paramKey, value }
        });
    };

    // Toggle edit mode for a block
    const toggleEdit = (id) => {
        setEditingBlocks(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Update block formula text
    const updateFormula = (blockId, formula) => {
        dispatch({
            type: 'UPDATE_EMISSION_BLOCK',
            payload: { id: blockId, data: { formula, formulaDisplay: formula } }
        });
    };

    // Update block name
    const updateBlockName = (blockId, name) => {
        dispatch({
            type: 'UPDATE_EMISSION_BLOCK',
            payload: { id: blockId, data: { name } }
        });
    };

    // Update output gas
    const updateOutputGas = (blockId, outputGas) => {
        dispatch({
            type: 'UPDATE_EMISSION_BLOCK',
            payload: { id: blockId, data: { outputGas } }
        });
    };

    // Add a parameter to a block
    const addParameter = (blockId) => {
        const block = emissionBlocks.find(b => b.id === blockId);
        if (!block) return;
        const idx = block.parameters.length + 1;
        const newKey = `var${idx}`;
        const newParams = [...block.parameters, { key: newKey, label: `Variable ${idx}`, unit: '', defaultValue: 0, value: 0 }];
        dispatch({
            type: 'UPDATE_EMISSION_BLOCK',
            payload: { id: blockId, data: { parameters: newParams } }
        });
    };

    // Remove a parameter from a block
    const removeParameter = (blockId, paramKey) => {
        const block = emissionBlocks.find(b => b.id === blockId);
        if (!block) return;
        const newParams = block.parameters.filter(p => p.key !== paramKey);
        dispatch({
            type: 'UPDATE_EMISSION_BLOCK',
            payload: { id: blockId, data: { parameters: newParams } }
        });
    };

    // Update a parameter's metadata (key, label, unit) — not value
    const updateParamMeta = (blockId, oldKey, field, newValue) => {
        const block = emissionBlocks.find(b => b.id === blockId);
        if (!block) return;
        const newParams = block.parameters.map(p => {
            if (p.key !== oldKey) return p;
            if (field === 'key') return { ...p, key: newValue };
            return { ...p, [field]: newValue };
        });
        dispatch({
            type: 'UPDATE_EMISSION_BLOCK',
            payload: { id: blockId, data: { parameters: newParams } }
        });
    };

    return (
        <div className="card">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FlaskConical size={20} className="text-purple-500" />
                    <h3 className="text-lg font-semibold text-slate-700">Process Emissions — Formula Builder (Scope 1)</h3>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-slate-500">
                        Total: <strong className="text-purple-700">{totalCO2e.toFixed(1)} tCO₂e</strong>
                        <span className="text-xs ml-1 text-slate-400">({emissionBlocks.length} blocks)</span>
                    </span>
                    <button
                        className="btn ghost small"
                        onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                    >
                        <Plus size={14} className="inline mr-1" />
                        Add Block
                    </button>
                </div>
            </div>

            {/* Template Selector Dropdown */}
            {showTemplateSelector && (
                <div className="mb-4 border border-purple-200 rounded-lg p-4 bg-purple-50/50">
                    <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-3">
                        Select a Template
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(templateCategories).map(([category, templates]) => (
                            <div key={category}>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-1">
                                    {category}
                                </div>
                                {templates.map(t => (
                                    <button
                                        key={t.id}
                                        className="w-full text-left px-3 py-2 rounded hover:bg-purple-100 transition-colors text-sm flex items-center justify-between group"
                                        onClick={() => addBlockFromTemplate(t)}
                                    >
                                        <div>
                                            <span className="font-medium text-slate-700">{t.name}</span>
                                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${(GAS_COLORS[t.outputGas] || defaultGasColor).badge}`}>
                                                {t.outputGas}
                                            </span>
                                        </div>
                                        <Plus size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-purple-200">
                        <button
                            className="text-xs text-purple-600 hover:text-purple-800"
                            onClick={() => addBlockFromTemplate({
                                id: 'custom',
                                name: 'Custom Formula',
                                outputGas: 'CO2',
                                formula: '',
                                formulaDisplay: '',
                                parameters: [],
                                source: 'User-defined',
                            })}
                        >
                            <Beaker size={12} className="inline mr-1" />
                            Create blank custom block
                        </button>
                    </div>
                </div>
            )}

            {/* Blocks grouped by period */}
            {blocksByPeriod.length > 0 ? (
                <div className="space-y-4">
                    {blocksByPeriod.map(([period, blocks]) => (
                        <div key={period}>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">
                                    {period}
                                </span>
                                <span className="font-mono text-slate-400">
                                    {blocks.reduce((s, b) => s + (blockResults[b.id]?.co2e || 0), 0).toFixed(1)} tCO₂e
                                </span>
                            </div>
                            <div className="space-y-2">
                                {blocks.map(block => {
                                    const result = blockResults[block.id] || { tonnes: 0, co2e: 0, gas: 'CO2', error: null };
                                    const gasColor = GAS_COLORS[block.outputGas] || defaultGasColor;
                                    const isExpanded = expandedBlocks.has(block.id);

                                    return (
                                        <div
                                            key={block.id}
                                            className={`border ${gasColor.border} rounded-lg overflow-hidden transition-all`}
                                        >
                                            {/* Block header — always visible */}
                                            <div
                                                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${gasColor.bg}`}
                                                onClick={() => toggleExpand(block.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {isExpanded
                                                        ? <ChevronDown size={14} className="text-slate-400" />
                                                        : <ChevronRight size={14} className="text-slate-400" />}
                                                    <span className="font-medium text-sm text-slate-700">{block.name}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${gasColor.badge}`}>
                                                        {block.outputGas}
                                                    </span>
                                                    {block.templateId && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                                            {block.templateId}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {result.error ? (
                                                        <span className="text-xs text-red-500 font-mono">Error: {result.error}</span>
                                                    ) : (
                                                        <span className={`font-mono font-semibold text-sm ${gasColor.text}`}>
                                                            {result.tonnes.toFixed(2)} t {block.outputGas}
                                                            <span className="text-slate-400 font-normal mx-1">→</span>
                                                            {result.co2e.toFixed(1)} tCO₂e
                                                        </span>
                                                    )}
                                                    <button
                                                        className="btn ghost small danger-hover p-1"
                                                        onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                                        title="Remove block"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded details */}
                                            {isExpanded && (() => {
                                                const isEditing = editingBlocks.has(block.id);
                                                const paramKeys = block.parameters.map(p => p.key);
                                                const validation = block.formula ? validateFormula(block.formula, paramKeys) : { valid: true, error: null, unknownVars: [] };
                                                const formulaVars = extractVariables(block.formula);
                                                const missingVars = formulaVars.filter(v => !paramKeys.includes(v));

                                                return (
                                                    <div className="px-4 py-3 border-t border-slate-100 bg-white">
                                                        {/* Edit mode toggle */}
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Formula</div>
                                                            <button
                                                                className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${isEditing ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                                    }`}
                                                                onClick={() => toggleEdit(block.id)}
                                                            >
                                                                {isEditing ? <><Check size={12} /> Done</> : <><Pencil size={12} /> Edit</>}
                                                            </button>
                                                        </div>

                                                        {isEditing ? (
                                                            /* ═══ EDIT MODE ═══ */
                                                            <div className="space-y-3">
                                                                {/* Block name */}
                                                                <div>
                                                                    <label className="text-[10px] text-slate-500 font-medium block mb-1">Block Name</label>
                                                                    <input
                                                                        type="text"
                                                                        value={block.name}
                                                                        className="input-cell text-sm w-full"
                                                                        placeholder="e.g. Calcination CO₂"
                                                                        onChange={(e) => updateBlockName(block.id, e.target.value)}
                                                                    />
                                                                </div>

                                                                {/* Formula + Output Gas row */}
                                                                <div className="flex gap-3">
                                                                    <div className="flex-1">
                                                                        <label className="text-[10px] text-slate-500 font-medium block mb-1">Formula Expression</label>
                                                                        <input
                                                                            type="text"
                                                                            value={block.formula}
                                                                            className={`input-cell font-mono text-sm w-full ${block.formula && !validation.valid ? 'border-red-300 bg-red-50' : ''
                                                                                }`}
                                                                            placeholder="e.g. mass * ef / 1000 * 44 / 12"
                                                                            onChange={(e) => updateFormula(block.id, e.target.value)}
                                                                        />
                                                                        {block.formula && !validation.valid && !missingVars.length && (
                                                                            <div className="flex items-center gap-1 mt-1 text-[11px] text-red-500">
                                                                                <AlertTriangle size={11} />
                                                                                {validation.error}
                                                                            </div>
                                                                        )}
                                                                        {block.formula && validation.valid && (
                                                                            <div className="mt-1 text-[11px] text-emerald-600">✓ Formula valid</div>
                                                                        )}
                                                                        {/* Variable hints */}
                                                                        {block.formula && (
                                                                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                                                                <span className="text-[10px] text-slate-400">Variables:</span>
                                                                                {formulaVars.length === 0 ? (
                                                                                    <span className="text-[10px] text-slate-300 italic">none detected</span>
                                                                                ) : formulaVars.map(v => (
                                                                                    <span key={v} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${paramKeys.includes(v)
                                                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                                        }`}>
                                                                                        {v}{!paramKeys.includes(v) && ' ⚠'}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        {/* Auto-create missing parameters */}
                                                                        {missingVars.length > 0 && (
                                                                            <button
                                                                                className="mt-1.5 text-[11px] flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                                                                                onClick={() => {
                                                                                    const block_ = emissionBlocks.find(b => b.id === block.id);
                                                                                    if (!block_) return;
                                                                                    const newParams = [
                                                                                        ...block_.parameters,
                                                                                        ...missingVars.map(v => ({
                                                                                            key: v,
                                                                                            label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                                                                                            unit: '',
                                                                                            defaultValue: 0,
                                                                                            value: 0
                                                                                        }))
                                                                                    ];
                                                                                    dispatch({
                                                                                        type: 'UPDATE_EMISSION_BLOCK',
                                                                                        payload: { id: block.id, data: { parameters: newParams } }
                                                                                    });
                                                                                }}
                                                                            >
                                                                                <Plus size={11} />
                                                                                Create {missingVars.length === 1 ? `"${missingVars[0]}"` : `${missingVars.length} missing variables`}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <div className="w-28">
                                                                        <label className="text-[10px] text-slate-500 font-medium block mb-1">Output Gas</label>
                                                                        <select
                                                                            value={block.outputGas}
                                                                            className="input-cell text-sm w-full"
                                                                            onChange={(e) => updateOutputGas(block.id, e.target.value)}
                                                                        >
                                                                            <option value="CO2">CO₂</option>
                                                                            <option value="CH4">CH₄</option>
                                                                            <option value="N2O">N₂O</option>
                                                                            <option value="CF4">CF₄</option>
                                                                            <option value="C2F6">C₂F₆</option>
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                {/* Parameters editor */}
                                                                <div>
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Parameters</label>
                                                                        <button
                                                                            className="text-[11px] flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                                                            onClick={() => addParameter(block.id)}
                                                                        >
                                                                            <Plus size={12} /> Add Variable
                                                                        </button>
                                                                    </div>
                                                                    {block.parameters.length === 0 ? (
                                                                        <div className="text-xs text-slate-400 italic py-2">
                                                                            No parameters defined. Add variables used in your formula.
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1.5">
                                                                            {block.parameters.map(param => (
                                                                                <div key={param.key} className="flex items-center gap-2 bg-slate-50 rounded p-2">
                                                                                    <input
                                                                                        type="text"
                                                                                        value={param.key}
                                                                                        className="input-cell font-mono text-xs w-24"
                                                                                        placeholder="key"
                                                                                        title="Variable name (used in formula)"
                                                                                        onChange={(e) => updateParamMeta(block.id, param.key, 'key', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                                                                    />
                                                                                    <input
                                                                                        type="text"
                                                                                        value={param.label}
                                                                                        className="input-cell text-xs flex-1"
                                                                                        placeholder="Label"
                                                                                        onChange={(e) => updateParamMeta(block.id, param.key, 'label', e.target.value)}
                                                                                    />
                                                                                    <input
                                                                                        type="text"
                                                                                        value={param.unit}
                                                                                        className="input-cell text-xs w-20"
                                                                                        placeholder="unit"
                                                                                        onChange={(e) => updateParamMeta(block.id, param.key, 'unit', e.target.value)}
                                                                                    />
                                                                                    <input
                                                                                        type="number"
                                                                                        step="any"
                                                                                        value={param.value ?? 0}
                                                                                        className="input-cell font-mono text-xs w-24"
                                                                                        placeholder="value"
                                                                                        onChange={(e) => updateParam(block.id, param.key, e.target.value)}
                                                                                    />
                                                                                    <button
                                                                                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                                                        onClick={() => removeParameter(block.id, param.key)}
                                                                                        title="Remove parameter"
                                                                                    >
                                                                                        <X size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            /* ═══ VIEW MODE ═══ */
                                                            <>
                                                                {/* Formula display */}
                                                                <div className="mb-3">
                                                                    <code className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded block">
                                                                        {block.formulaDisplay || block.formula || '(empty — click Edit to define)'}
                                                                    </code>
                                                                    {block.formula && !validation.valid && (
                                                                        <div className="flex items-center gap-1 mt-1 text-[11px] text-red-500">
                                                                            <AlertTriangle size={11} /> {validation.error}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Parameters grid */}
                                                                {block.parameters.length > 0 && (
                                                                    <div className="mb-3">
                                                                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Parameters</div>
                                                                        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${Math.min(block.parameters.length, 5)}, 1fr)` }}>
                                                                            {block.parameters.map(param => (
                                                                                <div key={param.key} className={`${gasColor.bg} rounded p-2`}>
                                                                                    <label className="text-[10px] text-slate-500 font-medium block mb-1 truncate" title={param.label}>
                                                                                        {param.label}
                                                                                    </label>
                                                                                    <input
                                                                                        type="number"
                                                                                        step="any"
                                                                                        value={param.value ?? 0}
                                                                                        className="input-cell font-mono text-sm w-full"
                                                                                        onChange={(e) => updateParam(block.id, param.key, e.target.value)}
                                                                                    />
                                                                                    <span className="text-[9px] text-slate-400 mt-0.5 block">{param.unit}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* Process + period selectors */}
                                                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-medium">Period:</span>
                                                                <input
                                                                    type="month"
                                                                    value={block.period}
                                                                    className="input-cell text-xs"
                                                                    onChange={(e) => dispatch({
                                                                        type: 'UPDATE_EMISSION_BLOCK',
                                                                        payload: { id: block.id, data: { period: e.target.value } }
                                                                    })}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-medium">Process:</span>
                                                                <select
                                                                    value={block.processId || ''}
                                                                    className="input-cell text-xs"
                                                                    onChange={(e) => dispatch({
                                                                        type: 'UPDATE_EMISSION_BLOCK',
                                                                        payload: { id: block.id, data: { processId: e.target.value } }
                                                                    })}
                                                                >
                                                                    {state.processes.filter(p => p.active).map(p => (
                                                                        <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            {block.source && (
                                                                <span className="text-slate-400 ml-auto">Source: {block.source}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    No emission blocks defined. Click "Add Block" to select a template or create a custom formula.
                    <br />
                    <span className="text-xs">Supports all CBAM sectors: Aluminium, Cement, Iron & Steel, Fertilisers, Hydrogen.</span>
                </div>
            )}

            <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>
                    Each block evaluates its formula with the given parameters. Results are converted to CO₂e using AR6 GWP factors.
                    {' '}Formulas are evaluated safely without eval().
                </span>
            </div>
        </div>
    );
}

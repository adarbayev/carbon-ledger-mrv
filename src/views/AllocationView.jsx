import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { CBAM_CN_CODES, getCnCodeInfo, getSectors } from '../data/referenceData';
import { calculateTotalEmissions } from '../engine/emissionEngine';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronDown, ChevronRight, Package, Plus, Trash2 } from 'lucide-react';
import { fmtInt, fmtPct } from '../utils/formatUtils';

export default function AllocationView() {
    const { state, dispatch } = useApp();
    const { t } = useLanguage();
    const [expandedProducts, setExpandedProducts] = useState({});
    const [cnSearch, setCnSearch] = useState({});

    // --- Calculations (Multi-Gas) ---
    const emissionResult = calculateTotalEmissions({
        fuels: state.activity.fuels,
        electricity: state.activity.electricity,
        processEvents: state.processEvents || [],
        emissionBlocks: state.emissionBlocks || [],
    });
    const totalDirect = Math.round(emissionResult.summary.directCO2e);
    const totalIndirect = Math.round(emissionResult.summary.indirectCO2e);

    const treatResidueAsWaste = state.allocationSettings.treatResidueAsWaste;
    const validProducts = state.products.filter(p => !treatResidueAsWaste || !p.isResidue);
    const totalMass = validProducts.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0);

    const toggleExpand = (productId) => {
        setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
    };

    // Filter CN codes based on search
    const getFilteredCnCodes = (productId) => {
        const search = (cnSearch[productId] || '').toLowerCase();
        if (!search) return CBAM_CN_CODES;
        return CBAM_CN_CODES.filter(c =>
            c.code.toLowerCase().includes(search) ||
            c.name.toLowerCase().includes(search) ||
            c.sector.toLowerCase().includes(search)
        );
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <h2 className="section-title text-slate-800">{t('ui.allocation.title')}</h2>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                {/* Left Col: Products */}
                <div className="space-y-4">
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Package size={20} className="text-blue-500" />
                                <h3 className="text-lg font-semibold text-slate-700">{t('ui.allocation.productionOutput')}</h3>
                            </div>

                            <button className="btn-primary btn-sm" onClick={() => dispatch({
                                type: 'ADD_PRODUCT',
                                payload: {
                                    id: `pr_${Date.now()}`,
                                    name: 'New Product',
                                    quantity: 0,
                                    isResidue: false,
                                    cnCode: '',
                                    precursors: []
                                }
                            })}><Plus size={14} /> {t('ui.allocation.addProduct')}</button>

                        </div>

                        {state.products.length > 0 ? (
                            <div className="space-y-3">
                                {/* Column Headers */}
                                <div className="grid grid-cols-[1fr_160px_120px_60px_40px] gap-3 px-3">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{t('ui.allocation.table.product')}</span>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{t('ui.allocation.table.cnCode')}</span>
                                    <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">{t('ui.allocation.table.output')}</span>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide text-center">{t('ui.allocation.table.residue')}</span>
                                    <span></span>
                                </div>
                                {state.products.map(p => {
                                    const cnInfo = getCnCodeInfo(p.cnCode);
                                    const isComplex = cnInfo?.isComplex || false;
                                    const isExpanded = expandedProducts[p.id];
                                    const hasPrecursors = (p.precursors || []).length > 0;

                                    return (
                                        <div key={p.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                            {/* Product Row */}
                                            <div className="p-3 bg-white">
                                                <div className="grid grid-cols-[1fr_160px_120px_60px_40px] gap-3 items-center">
                                                    <input type="text" value={p.name} className="input-cell font-medium"
                                                        onChange={(e) => dispatch({ type: 'UPDATE_PRODUCT', payload: { id: p.id, field: 'name', value: e.target.value } })} />

                                                    {/* CN Code Selector (Flexible) */}
                                                    <div className="relative">
                                                        <input
                                                            list="cn-codes-list"
                                                            value={p.cnCode}
                                                            className="input-cell text-xs w-full"
                                                            placeholder={t('ui.allocation.placeholder.searchCn')}
                                                            onChange={(e) => dispatch({ type: 'UPDATE_PRODUCT', payload: { id: p.id, field: 'cnCode', value: e.target.value } })}
                                                        />
                                                    </div>

                                                    {/* Production Output — highlighted */}
                                                    <input type="number" value={p.quantity} className="input-highlight"
                                                        placeholder="0"
                                                        onChange={(e) => dispatch({ type: 'UPDATE_PRODUCT', payload: { id: p.id, field: 'quantity', value: e.target.value } })} />

                                                    <div className="flex items-center justify-center">
                                                        <label className="switch" style={{ transform: 'scale(0.8)' }}>
                                                            <input type="checkbox" checked={p.isResidue}
                                                                onChange={(e) => dispatch({ type: 'UPDATE_PRODUCT', payload: { id: p.id, field: 'isResidue', value: e.target.checked } })} />
                                                            <span className="slider round"></span>
                                                        </label>
                                                    </div>

                                                    <button className="btn-icon-danger" onClick={() => dispatch({ type: 'DELETE_PRODUCT', payload: p.id })}><Trash2 size={14} /></button>
                                                </div>

                                                {/* Badges row */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    {cnInfo ? (
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase">
                                                            {cnInfo.sector}
                                                        </span>
                                                    ) : p.cnCode && (
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 uppercase">
                                                            {t('ui.allocation.precursors.custom')}
                                                        </span>
                                                    )}
                                                    {/* ... remaining badges ... */}
                                                    {cnInfo && (
                                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${isComplex ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                                                            {isComplex ? t('ui.allocation.precursors.complex') : t('ui.allocation.precursors.simple')}
                                                        </span>
                                                    )}
                                                    {p.isResidue && (
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">{t('ui.allocation.table.residue')}</span>
                                                    )}
                                                    {(isComplex || !cnInfo) && (
                                                        <button
                                                            onClick={() => toggleExpand(p.id)}
                                                            className="ml-auto flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                                                        >
                                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                            Precursors {hasPrecursors && `(${p.precursors.length})`}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Precursors (for complex goods OR custom goods) */}
                                            {(isComplex || (isExpanded && !cnInfo)) && isExpanded && (
                                                <div className="bg-slate-50 border-t border-slate-200 p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-semibold text-slate-500 uppercase">{t('ui.allocation.precursors.title')}</span>
                                                        <button className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                                                            onClick={() => dispatch({ type: 'ADD_PRECURSOR', payload: { productId: p.id } })}>
                                                            + {t('ui.allocation.precursors.add')}
                                                        </button>
                                                    </div>

                                                    {(p.precursors || []).length > 0 ? (
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="text-slate-400">
                                                                    <th className="text-left p-1 font-medium">{t('ui.allocation.precursors.name')}</th>
                                                                    <th className="text-left p-1 font-medium" style={{ width: 140 }}>{t('ui.allocation.table.cnCode')}</th>
                                                                    <th className="text-right p-1 font-medium" style={{ width: 80 }}>{t('ui.allocation.precursors.mass')}</th>
                                                                    <th className="text-right p-1 font-medium" style={{ width: 100 }}>{t('ui.allocation.precursors.see')}</th>
                                                                    <th className="text-center p-1 font-medium" style={{ width: 70 }}>{t('ui.allocation.precursors.source')}</th>
                                                                    <th style={{ width: 30 }}></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {p.precursors.map(pc => (
                                                                    <React.Fragment key={pc.id}>
                                                                        <tr>
                                                                            <td className="p-1">
                                                                                <input type="text" value={pc.name} className="input-cell text-xs"
                                                                                    placeholder={t('ui.allocation.placeholder.precursorName')}
                                                                                    onChange={(e) => dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'name', value: e.target.value } })} />
                                                                            </td>
                                                                            <td className="p-1">
                                                                                <input
                                                                                    list="cn-codes-list"
                                                                                    value={pc.cnCode}
                                                                                    className="input-cell text-xs w-full"
                                                                                    placeholder={t('ui.allocation.placeholder.searchCn')}
                                                                                    onChange={(e) => dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'cnCode', value: e.target.value } })}
                                                                                />
                                                                            </td>
                                                                            <td className="p-1">
                                                                                <input type="number" step="0.01" value={pc.mass} className="input-cell text-xs font-mono text-right"
                                                                                    onChange={(e) => dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'mass', value: e.target.value } })} />
                                                                            </td>
                                                                            <td className="p-1">
                                                                                <input type="number" step="0.001" value={pc.see} className="input-cell text-xs font-mono text-right"
                                                                                    onChange={(e) => dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'see', value: e.target.value } })}
                                                                                    disabled={pc.sourceType === 'linked'} />
                                                                            </td>
                                                                            <td className="p-1 text-center">
                                                                                <select value={pc.sourceType} className="input-cell text-[10px]"
                                                                                    onChange={(e) => dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'sourceType', value: e.target.value } })}>
                                                                                    <option value="actual">{t('ui.precursors.sourceActual') || 'Actual'}</option>
                                                                                    <option value="linked">{t('ui.precursors.sourceLinked') || 'Linked'}</option>
                                                                                    <option value="default">{t('ui.precursors.sourceDefault') || 'Default'}</option>
                                                                                </select>
                                                                            </td>
                                                                            <td className="p-1 text-right">
                                                                                <button className="text-red-400 hover:text-red-600"
                                                                                    onClick={() => dispatch({ type: 'DELETE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id } })}>
                                                                                    &times;
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                        {pc.sourceType === 'linked' && (
                                                                            <tr>
                                                                                <td colSpan="6" className="p-2 bg-blue-50/50 border-b border-blue-100">
                                                                                    <div className="flex items-center gap-2 text-xs">
                                                                                        <span className="text-blue-600 font-medium whitespace-nowrap px-1">↳ Link Product:</span>
                                                                                        <select
                                                                                            value={`${pc.sourceInstallationId || ''}::${pc.sourceProductId || ''}`}
                                                                                            className="input-cell w-full max-w-md bg-white border-blue-200"
                                                                                            onChange={(e) => {
                                                                                                const [instId, prodId] = e.target.value.split('::');
                                                                                                dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'sourceInstallationId', value: instId } });
                                                                                                dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'sourceProductId', value: prodId } });

                                                                                                // Auto-fill CN Code and Name based on selection
                                                                                                const linkedProd = (state.crossSiteProducts || []).find(x => x.id === prodId);
                                                                                                if (linkedProd) {
                                                                                                    dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'name', value: linkedProd.name } });
                                                                                                    dispatch({ type: 'UPDATE_PRECURSOR', payload: { productId: p.id, precursorId: pc.id, field: 'cnCode', value: linkedProd.cnCode } });
                                                                                                }
                                                                                            }}
                                                                                        >
                                                                                            <option value="::">{t('ui.precursors.selectProduct') || 'Select cross-site product...'}</option>
                                                                                            {(state.crossSiteProducts || []).map(cp => (
                                                                                                <option key={`${cp.installationId}::${cp.id}`} value={`${cp.installationId}::${cp.id}`}>
                                                                                                    [{cp.installationName}] {cp.name} ({cp.cnCode || 'No CN'}) {cp.isResidue ? '(Residue)' : ''}
                                                                                                </option>
                                                                                            ))}
                                                                                        </select>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </React.Fragment>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <div className="text-xs text-slate-400 text-center py-3 border border-dashed border-slate-200 rounded">
                                                            {t('ui.allocation.precursors.empty')}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : <div className="empty-state">{t('ui.allocation.empty')}</div>}

                        {/* Allocation Settings */}
                        <div className="mt-6 pt-4 border-t border-slate-200">
                            <h4 className="text-sm font-semibold text-slate-600 mb-3">{t('ui.allocation.settings.title')}</h4>
                            <div className="flex items-center justify-between">
                                <div>
                                    <strong className="text-sm">{t('ui.allocation.settings.treatResidue')}</strong>
                                    <p className="text-xs text-slate-400 mt-0.5">{t('ui.allocation.settings.treatResidueDesc')}</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" checked={state.allocationSettings.treatResidueAsWaste}
                                        onChange={(e) => dispatch({ type: 'UPDATE_ALLOC_SETTINGS', payload: { field: 'treatResidueAsWaste', value: e.target.checked } })} />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        </div>
                    </div>



                    {/* Verification Table */}
                    <div className="card">
                        <h3 className="text-lg font-semibold text-slate-700 mb-4">{t('ui.allocation.verification.title')}</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('ui.allocation.table.product')}</th>
                                    <th>{t('ui.allocation.verification.share')}</th>
                                    <th>{t('ui.allocation.verification.direct')}</th>
                                    <th>{t('ui.allocation.verification.indirect')}</th>
                                    <th>{t('ui.allocation.verification.total')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {state.products.map(p => {
                                    let ratio = 0;
                                    let isExcluded = treatResidueAsWaste && p.isResidue;
                                    if (!isExcluded && totalMass > 0) {
                                        ratio = (parseFloat(p.quantity) || 0) / totalMass;
                                    }
                                    const allocDirect = Math.round(totalDirect * ratio);
                                    const allocIndirect = Math.round(totalIndirect * ratio);
                                    const allocTotal = allocDirect + allocIndirect;
                                    const cnInfo = getCnCodeInfo(p.cnCode);

                                    return (
                                        <tr key={p.id} className={isExcluded ? 'row-muted' : ''}>
                                            <td>
                                                <div className="font-semibold">{p.name}</div>
                                                <div className="text-xs text-slate-400">
                                                    {cnInfo ? `${cnInfo.code} · ${cnInfo.sector}` : 'No CN Code'}
                                                </div>
                                                {isExcluded && <span className="badge-neutral text-[10px] mt-1 inline-block">RESIDUE</span>}
                                            </td>
                                            <td className="font-mono">{fmtPct(ratio * 100)}</td>
                                            <td className="font-mono">{fmtInt(allocDirect)}</td>
                                            <td className="font-mono">{fmtInt(allocIndirect)}</td>
                                            <td className="font-mono font-bold">{fmtInt(allocTotal)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Col: Overview */}
                <div className="card bg-slate-50 border-slate-200 h-fit">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">{t('ui.allocation.overview.title')}</h3>

                    {/* Donut Chart */}
                    <div className="h-[200px] w-full mb-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={state.products.map(p => {
                                        const isExcluded = treatResidueAsWaste && p.isResidue;
                                        const ratio = (!isExcluded && totalMass > 0) ? ((parseFloat(p.quantity) || 0) / totalMass) : 0;
                                        return { name: p.name, value: ratio * 100 };
                                    })}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {state.products.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981'][index % 4]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val) => `${val.toFixed(1)}%`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('ui.allocation.overview.direct')}</span>
                            <span className="font-semibold text-slate-700">{fmtInt(totalDirect)} tCO₂</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{t('ui.allocation.overview.indirect')}</span>
                            <span className="font-semibold text-slate-700">{fmtInt(totalIndirect)} tCO₂</span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-slate-800 pt-3 border-t border-slate-200 mt-2">
                            <span>{t('ui.allocation.overview.total')}</span>
                            <span>{fmtInt(totalDirect + totalIndirect)} tCO₂</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Datalist for flexible CN Code entry */}
            <datalist id="cn-codes-list">
                {getSectors().map(sector => (
                    <React.Fragment key={sector}>
                        {CBAM_CN_CODES.filter(c => c.sector === sector).map(c => (
                            <option key={c.code} value={c.code}>{c.name} ({sector})</option>
                        ))}
                    </React.Fragment>
                ))}
            </datalist>
        </div>
    );
}

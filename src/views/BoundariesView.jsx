import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { GRID_EF_BY_COUNTRY } from '../data/referenceData';
import FormattedMonthInput from '../components/FormattedMonthInput';
import { Factory, Zap, XCircle, Plus, Trash2 } from 'lucide-react';

// Scope tag values — labels come from t() at render time
const SCOPE_TAG_VALUES = ['direct', 'indirect', 'excluded'];

const BOUNDARY_TYPE_ICONS = {
    process: Factory,
    utility: Zap,
    external: XCircle,
};

export default function BoundariesView() {
    const { state, dispatch } = useApp();
    const { t } = useLanguage();

    // Group boundaries by type
    const processBoundaries = state.boundaries.filter(b => b.boundaryType === 'process');
    const utilityBoundaries = state.boundaries.filter(b => b.boundaryType === 'utility');
    const externalBoundaries = state.boundaries.filter(b => b.boundaryType === 'external');

    const addBoundaryItem = (type, defaultScope) => {
        dispatch({
            type: 'ADD_BOUNDARY',
            payload: {
                id: `b_custom_${Date.now()}`,
                name: `New ${type} item`,
                included: type !== 'external',
                notes: '',
                processId: null,
                boundaryType: type,
                scopeTag: defaultScope,
            }
        });
    };

    const renderBoundaryRow = (b, allowDelete = false) => {
        const Icon = BOUNDARY_TYPE_ICONS[b.boundaryType] || Factory;
        const linkedProcess = b.processId ? state.processes.find(p => p.id === b.processId) : null;

        return (
            <tr key={b.id} className={!b.included ? 'row-muted' : ''}>
                <td className="text-center">
                    <input type="checkbox"
                        checked={b.included}
                        onChange={(e) => dispatch({ type: 'UPDATE_BOUNDARY', payload: { id: b.id, field: 'included', value: e.target.checked } })}
                    />
                </td>
                <td>
                    <div className="flex items-center gap-2">
                        <Icon size={14} className={b.included ? 'text-blue-500' : 'text-slate-300'} />
                        <div className="flex-1 min-w-0">
                            {allowDelete ? (
                                <input type="text" className="input-cell font-medium" value={b.name}
                                    onChange={(e) => dispatch({ type: 'UPDATE_BOUNDARY', payload: { id: b.id, field: 'name', value: e.target.value } })}
                                />
                            ) : (
                                <>
                                    <div className="font-medium text-slate-700">{b.name}</div>
                                    {linkedProcess && (
                                        <div className="text-xs text-slate-400">→ {linkedProcess.name} ({linkedProcess.id})</div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </td>
                <td>
                    <select value={b.scopeTag || 'direct'} className="input-cell text-sm"
                        onChange={(e) => dispatch({ type: 'UPDATE_BOUNDARY', payload: { id: b.id, field: 'scopeTag', value: e.target.value } })}>
                        {SCOPE_TAG_VALUES.map(val => (
                            <option key={val} value={val}>{t(`ui.boundaries.scopeTags.${val}`)}</option>
                        ))}
                    </select>
                </td>
                <td>
                    <input type="text" className="input-cell"
                        value={b.notes || ''}
                        placeholder={t('ui.common.placeholder.notes')}
                        onChange={(e) => dispatch({ type: 'UPDATE_BOUNDARY', payload: { id: b.id, field: 'notes', value: e.target.value } })}
                    />
                </td>
                {allowDelete && (
                    <td>
                        <button className="btn-icon-danger"
                            onClick={() => dispatch({ type: 'DELETE_BOUNDARY', payload: b.id })}>
                            <Trash2 size={14} />
                        </button>
                    </td>
                )}
            </tr>
        );
    };

    const renderBoundarySection = (title, icon, boundaries, { addButton, addType, addScope, allowDelete } = {}) => {
        return (
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {icon}
                        <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{title}</h4>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            {boundaries.filter(b => b.included).length}/{boundaries.length}
                        </span>
                    </div>
                    {addButton && (
                        <button className="btn-ghost btn-sm text-xs" onClick={() => addBoundaryItem(addType, addScope)}>
                            <Plus size={12} /> {t('ui.boundaries.addItem')}
                        </button>
                    )}
                </div>
                {boundaries.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 50, textAlign: 'center' }}>{t('ui.boundaries.table.incl')}</th>
                                <th style={{ width: 280 }}>{t('ui.boundaries.table.item')}</th>
                                <th style={{ width: 160 }}>{t('ui.boundaries.scope')}</th>
                                <th>{t('ui.boundaries.table.notes')}</th>
                                {allowDelete && <th style={{ width: 50 }}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {boundaries.map(b => renderBoundaryRow(b, allowDelete))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-sm text-slate-400 italic py-3 pl-6">
                        {addButton ? t('ui.boundaries.noItemsAdd') : t('ui.boundaries.autoPopulated')}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <header className="view-header">
                <h2 className="section-title">{t('ui.boundaries.title')}</h2>
            </header>

            {/* ─── Installation Metadata & Map ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Left Column: Metadata */}
                <div className="card form-grid h-full mb-0">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>{t('ui.boundaries.installationName')}</label>
                        <input type="text" value={state.meta.installationName}
                            onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { field: 'installationName', value: e.target.value } })}
                            className="form-input"
                        />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>{t('ui.boundaries.country')}</label>
                        <select value={state.meta.country || ''}
                            onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { field: 'country', value: e.target.value } })}
                            className="form-select"
                        >
                            {GRID_EF_BY_COUNTRY.map(c => (
                                <option key={c.code} value={c.code}>{t(`ref.country.${c.code}`)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>{t('ui.boundaries.periodStart')}</label>
                        <FormattedMonthInput
                            value={state.meta.periodStart}
                            className="form-input"
                            onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { field: 'periodStart', value: e.target.value } })}
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('ui.boundaries.periodEnd')}</label>
                        <FormattedMonthInput
                            value={state.meta.periodEnd}
                            className="form-input"
                            onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { field: 'periodEnd', value: e.target.value } })}
                        />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="flex items-center gap-2 cursor-pointer p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 transition-colors h-full">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 shrink-0"
                                checked={state.meta.isFinalProducer !== false}
                                onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { field: 'isFinalProducer', value: e.target.checked } })}
                            />
                            <div>
                                <span className="block text-sm font-semibold text-slate-800">
                                    {t('ui.settings.isFinalProducer')}
                                </span>
                                <span className="block text-xs text-slate-500 mt-1">
                                    {t('ui.settings.isFinalProducerDesc')}
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Right Column: Location Map */}
                <div className="card flex flex-col h-full mb-0">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="form-group mb-0">
                            <label>{t('ui.boundaries.latitude')}</label>
                            <input type="number" step="any"
                                value={state.meta.latitude || ''}
                                onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { field: 'latitude', value: e.target.value } })}
                                className="form-input"
                                placeholder="e.g. 51.169"
                            />
                        </div>
                        <div className="form-group mb-0">
                            <label>{t('ui.boundaries.longitude')}</label>
                            <input type="number" step="any"
                                value={state.meta.longitude || ''}
                                onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { field: 'longitude', value: e.target.value } })}
                                className="form-input"
                                placeholder="e.g. 71.449"
                            />
                        </div>
                    </div>

                    <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden min-h-[250px] relative border border-slate-200">
                        {(state.meta.latitude && state.meta.longitude) ? (
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                scrolling="no"
                                marginHeight="0"
                                marginWidth="0"
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(state.meta.longitude) - 0.05}%2C${Number(state.meta.latitude) - 0.05}%2C${Number(state.meta.longitude) + 0.05}%2C${Number(state.meta.latitude) + 0.05}&layer=mapnik&marker=${state.meta.latitude}%2C${state.meta.longitude}`}
                                style={{ border: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                title="Installation Location Map"
                            ></iframe>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm p-6 text-center">
                                {t('ui.boundaries.enterCoordinates')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Production Processes ─── */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-700">{t('ui.processes.title')}</h3>
                        <p className="text-sm text-slate-400 mt-0.5">{t('ui.processes.description')}</p>
                    </div>
                    <button className="btn-primary btn-sm" onClick={() => dispatch({ type: 'ADD_PROCESS' })}>
                        <Plus size={14} />
                        {t('ui.processes.add')}
                    </button>
                </div>
                {state.processes.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 80 }}>{t('ui.processes.table.id')}</th>
                                <th style={{ width: 200 }}>{t('ui.processes.table.name')}</th>
                                <th>{t('ui.processes.table.desc')}</th>
                                <th style={{ width: 80, textAlign: 'center' }}>{t('ui.processes.table.active')}</th>
                                <th style={{ width: 60 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.processes.map(p => (
                                <tr key={p.id} className={!p.active ? 'row-muted' : ''}>
                                    <td><span className="font-mono text-xs text-text-muted">{p.id}</span></td>
                                    <td>
                                        <input type="text" className="input-cell" value={p.name}
                                            onChange={(e) => dispatch({ type: 'UPDATE_PROCESS', payload: { id: p.id, field: 'name', value: e.target.value } })}
                                        />
                                    </td>
                                    <td>
                                        <input type="text" className="input-cell" value={p.description}
                                            onChange={(e) => dispatch({ type: 'UPDATE_PROCESS', payload: { id: p.id, field: 'description', value: e.target.value } })}
                                        />
                                    </td>
                                    <td className="text-center">
                                        <label className="switch">
                                            <input type="checkbox" checked={p.active}
                                                onChange={(e) => dispatch({ type: 'UPDATE_PROCESS', payload: { id: p.id, field: 'active', value: e.target.checked } })}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                    </td>
                                    <td>
                                        <button className="btn-icon-danger"
                                            onClick={() => setTimeout(() => { if (window.confirm(t('ui.processes.deleteConfirm'))) dispatch({ type: 'DELETE_PROCESS', payload: p.id }); }, 0)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">{t('ui.processes.empty')}</div>
                )}
            </div>

            {/* ─── Operational Boundaries ─── */}
            <div className="card">
                <h3 className="text-lg font-semibold text-slate-700">{t('ui.boundaries.operationalBoundaries')}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    {t('ui.boundaries.description')}
                </p>

                {/* Process boundaries — auto-synced from processes above */}
                {renderBoundarySection(
                    t('ui.boundaries.sections.productionProcesses'),
                    <Factory size={14} className="text-blue-500" />,
                    processBoundaries,
                    { allowDelete: false }
                )}

                {/* Utility boundaries — user can add/remove */}
                {renderBoundarySection(
                    t('ui.boundaries.sections.sharedUtilities'),
                    <Zap size={14} className="text-cyan-500" />,
                    utilityBoundaries,
                    { addButton: true, addType: 'utility', addScope: 'indirect', allowDelete: true }
                )}

                {/* External/out-of-scope — user can add/remove */}
                {renderBoundarySection(
                    t('ui.boundaries.sections.external'),
                    <XCircle size={14} className="text-slate-400" />,
                    externalBoundaries,
                    { addButton: true, addType: 'external', addScope: 'excluded', allowDelete: true }
                )}
            </div>
        </>
    );
}

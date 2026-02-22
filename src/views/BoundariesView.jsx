import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { GRID_EF_BY_COUNTRY } from '../data/referenceData';
import FormattedMonthInput from '../components/FormattedMonthInput';

export default function BoundariesView() {
    const { state, dispatch } = useApp();
    const { t } = useLanguage();

    return (
        <>
            <header className="view-header">
                <h2 className="section-title">{t('ui.boundaries.title')}</h2>
            </header>

            {/* Top Form */}
            <div className="card form-grid">
                <div className="form-group">
                    <label>{t('ui.boundaries.installationName')}</label>
                    <input type="text" value={state.meta.installationName}
                        onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { field: 'installationName', value: e.target.value } })}
                        className="form-input"
                    />
                </div>
                <div className="form-group">
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
                    <label className="flex items-center gap-2 cursor-pointer p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 transition-colors">
                        <input
                            type="checkbox"
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
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

            {/* Boundaries Table */}
            <div className="card">
                <h3>{t('ui.boundaries.operationalBoundaries')}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    {t('ui.boundaries.description')}
                </p>
                {state.boundaries.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 50, textAlign: 'center' }}>{t('ui.boundaries.table.incl')}</th>
                                <th style={{ width: 250 }}>{t('ui.boundaries.table.item')}</th>
                                <th>{t('ui.boundaries.table.notes')}</th>
                                <th style={{ width: 200 }}>{t('ui.boundaries.table.evidence')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.boundaries.map(b => (
                                <tr key={b.id} className={!b.included ? 'row-muted' : ''}>
                                    <td className="text-center">
                                        <input type="checkbox"
                                            checked={b.included}
                                            onChange={(e) => dispatch({ type: 'UPDATE_BOUNDARY', payload: { id: b.id, field: 'included', value: e.target.checked } })}
                                        />
                                    </td>
                                    <td>
                                        <div className="font-medium text-slate-700">
                                            {b.key ? t(`ui.boundaries.items.${b.key}.name`) : b.name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {b.key ? t(`ui.boundaries.items.${b.key}.desc`) : (b.notes || '')}
                                        </div>
                                    </td>
                                    <td>
                                        <input type="text" className="input-cell"
                                            value={b.notes || ''}
                                            placeholder={t('ui.common.placeholder.notes')}
                                            onChange={(e) => dispatch({ type: 'UPDATE_BOUNDARY', payload: { id: b.id, field: 'notes', value: e.target.value } })}
                                        />
                                    </td>
                                    <td>
                                        <input type="text" className="input-cell"
                                            value={b.evidence || ''}
                                            placeholder={t('ui.common.placeholder.evidence')}
                                            onChange={(e) => dispatch({ type: 'UPDATE_BOUNDARY', payload: { id: b.id, field: 'evidence', value: e.target.value } })}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">{t('ui.boundaries.empty')}</div>
                )}
            </div>
        </>
    );
}

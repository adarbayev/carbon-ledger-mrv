import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { FUEL_TYPES, GRID_EF_BY_COUNTRY, getGridEf } from '../data/referenceData';
import { calcCombustionEmissions, calcElectricityEmissions, DEFAULT_EMISSION_FACTORS, GWP_AR6 } from '../engine/emissionEngine';
import { isIncomplete } from '../engine/qaEngine';
import { Flame, Zap, Info, Paperclip, Plus, Trash2 } from 'lucide-react';
import { fmtNum } from '../utils/formatUtils';
import FormattedMonthInput from '../components/FormattedMonthInput';
import { SectionWorkflowBadge } from '../components/SectionWorkflowBadge';
import { SectionWorkflowActions } from '../components/SectionWorkflowActions';

const DATA_SOURCES = [
    { id: 'manual' },
    { id: 'scada' },
    { id: 'erp' },
    { id: 'iot' },
    { id: 'lab' },
    { id: 'third_party' },
];
import EmissionBlockPanel from './EmissionBlockPanel';

export default function ActivityView() {
    const { state, dispatch } = useApp();
    const { t } = useLanguage();

    const errClass = (val) => isIncomplete(val) ? '!border-amber-400 !bg-amber-50' : '';

    // Totals (multi-gas)
    const sortedFuels = useMemo(() => {
        return [...state.activity.fuels].sort((a, b) => (a.period || '').localeCompare(b.period || ''));
    }, [state.activity.fuels]);

    const sortedElectricity = useMemo(() => {
        return [...state.activity.electricity].sort((a, b) => (a.period || '').localeCompare(b.period || ''));
    }, [state.activity.electricity]);

    const fuelResults = sortedFuels.map(f => calcCombustionEmissions(f));
    const totalFuelEmissions = fuelResults.reduce((sum, r) => sum + r.co2e, 0);
    const totalElecEmissions = sortedElectricity.reduce((sum, e) => sum + calcElectricityEmissions(e).co2e, 0);

    const handleGridCountryChange = (id, countryCode) => {
        const gridEf = getGridEf(countryCode);
        dispatch({ type: 'UPDATE_ELEC', payload: { id, field: 'gridCountry', value: countryCode } });
        const entry = state.activity.electricity.find(e => e.id === id);
        if (!entry?.efOverride) {
            dispatch({ type: 'UPDATE_ELEC', payload: { id, field: 'ef', value: gridEf } });
        }
    };

    // Determine lockdown status based on the workflow state for specific sections
    const period = state.meta.periodStart && state.meta.periodEnd
        ? `${state.meta.periodStart}_${state.meta.periodEnd}`
        : '2025-01_2025-03';

    // Lock fields if awaiting validation or approved
    const isFuelLocked = state.sectionWorkflows.fuels === 'AWAITING_VALIDATION' || state.sectionWorkflows.fuels === 'APPROVED';
    const isElecLocked = state.sectionWorkflows.electricity === 'AWAITING_VALIDATION' || state.sectionWorkflows.electricity === 'APPROVED';

    const handleAddFuel = () => dispatch({
        type: 'ADD_FUEL', payload: {
            id: `f${Date.now()}`,
            period: state.meta.periodStart || '2025-01',
            processId: state.processes[0]?.id || '',
            fuelTypeId: 'natural_gas', quantity: 0, unit: 't',
            source: 'manual', comment: '', attachment: null,
            customNcv: 0, customEf: 0, customEfCo2: 0, customEfCh4: 0, customEfN2o: 0
        }
    });

    const handleAddElec = () => dispatch({
        type: 'ADD_ELEC', payload: {
            id: `e${Date.now()}`,
            period: state.meta.periodStart || '2025-01',
            processId: state.processes[0]?.id || '',
            mwh: 0,
            gridCountry: state.meta.country || 'KAZ',
            ef: getGridEf(state.meta.country || 'KAZ'),
            efOverride: false,
            source: 'manual', comment: '', attachment: null
        }
    });

    const updateFuel = (id, field, value) => dispatch({ type: 'UPDATE_FUEL', payload: { id, field, value } });
    const removeFuel = (id) => dispatch({ type: 'DELETE_FUEL', payload: id });
    const updateElec = (id, field, value) => dispatch({ type: 'UPDATE_ELEC', payload: { id, field, value } });
    const removeElec = (id) => dispatch({ type: 'DELETE_ELEC', payload: id });

    return (
        <div className="space-y-8">
            {/* Fuel Combustion */}
            <div className={`card ${isFuelLocked ? 'border-slate-300 bg-slate-50/30' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Flame size={20} className="text-orange-500" />
                        <h3 className="text-lg font-semibold text-slate-700">{t('ui.activity.scope1.title')}</h3>
                        <SectionWorkflowBadge
                            section="fuels"
                            currentStatus={state.sectionWorkflows.fuels}
                            period={period}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-slate-500 font-medium">{t('ui.common.total')}</p>
                            <p className="text-xl font-bold text-orange-600 border-b-2 border-orange-200">
                                {totalFuelEmissions.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-sm font-normal text-slate-500">tCO₂e</span>
                            </p>
                        </div>
                        {!isFuelLocked && (
                            <button onClick={handleAddFuel} className="btn-primary flex items-center gap-2">
                                <Plus size={16} /> {t('ui.common.addRow')}
                            </button>
                        )}
                    </div>
                </div>
                {state.activity.fuels.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 140 }}>{t('ui.common.period')}</th>
                                    <th style={{ width: 120 }}>{t('ui.common.process')}</th>
                                    <th style={{ width: 160 }}>{t('ui.activity.table.fuelType')}</th>
                                    <th style={{ width: 100 }}>{t('ui.activity.table.qty')}</th>
                                    <th style={{ width: 80 }}>{t('ui.activity.table.ncv')}</th>
                                    <th style={{ width: 80 }}>{t('ui.activity.table.ef')}<sub>CO₂</sub></th>
                                    <th style={{ width: 100 }}>{t('ui.activity.table.tco2e')}</th>
                                    <th style={{ width: 100 }}>{t('ui.common.source')}</th>
                                    <th>{t('ui.common.comment')}</th>
                                    <th style={{ width: 36 }}></th>
                                    <th style={{ width: 40 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedFuels.map((f, idx) => {
                                    const fuelType = FUEL_TYPES.find(ft => ft.id === f.fuelTypeId);
                                    const efDef = DEFAULT_EMISSION_FACTORS[f.fuelTypeId] || DEFAULT_EMISSION_FACTORS.custom;
                                    const emissions = fuelResults[idx] || calcCombustionEmissions(f);
                                    const isCustom = f.fuelTypeId === 'other' || f.fuelTypeId === 'custom';
                                    return (
                                        <tr key={f.id}>
                                            <td>
                                                <FormattedMonthInput
                                                    value={f.period}
                                                    className="input-cell"
                                                    onChange={(e) => updateFuel(f.id, 'period', e.target.value)}
                                                    disabled={isFuelLocked}
                                                />
                                            </td>
                                            <td>
                                                <select value={f.processId} className="input-cell"
                                                    onChange={(e) => updateFuel(f.id, 'processId', e.target.value)}
                                                    disabled={isFuelLocked}>
                                                    {state.processes.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <select value={f.fuelTypeId} className="input-cell text-sm"
                                                    onChange={(e) => updateFuel(f.id, 'fuelTypeId', e.target.value)}
                                                    disabled={isFuelLocked}>
                                                    {FUEL_TYPES.map(ft => <option key={ft.id} value={ft.id}>{t(`ref.fuel.${ft.id}`)}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <input type="number" value={f.quantity} className={`input-cell font-mono ${errClass(f.quantity)}`}
                                                    onChange={(e) => updateFuel(f.id, 'quantity', e.target.value)}
                                                    disabled={isFuelLocked} />
                                            </td>
                                            <td className="text-xs text-slate-400 font-mono text-center">
                                                {isCustom ? (
                                                    <input type="number" value={f.customNcv} className={`input-cell text-xs w-16 ${errClass(f.customNcv)}`}
                                                        placeholder="NCV"
                                                        onChange={(e) => updateFuel(f.id, 'customNcv', e.target.value)}
                                                        disabled={isFuelLocked} />
                                                ) : efDef.ncv || fuelType?.ncv || '—'}
                                            </td>
                                            <td className="text-xs text-slate-400 font-mono text-center">
                                                {isCustom ? (
                                                    <div className="flex items-center gap-2">
                                                        <input type="number" value={f.customEfCo2 || 0} className={`input-cell text-xs w-16 ${errClass(f.customEfCo2)}`}
                                                            placeholder="EF"
                                                            onChange={(e) => updateFuel(f.id, 'customEfCo2', e.target.value)}
                                                            disabled={isFuelLocked} />
                                                    </div>
                                                ) : efDef.efCO2 || fuelType?.efCO2 || '—'}
                                            </td>
                                            <td className="font-mono font-semibold text-blue-700 text-right">
                                                {fmtNum(emissions.co2e, 1)}
                                            </td>
                                            <td>
                                                <select
                                                    value={f.source || 'manual'}
                                                    className="input-cell text-xs"
                                                    onChange={(e) => updateFuel(f.id, 'source', e.target.value)}
                                                    disabled={isFuelLocked}
                                                >
                                                    {DATA_SOURCES.map(ds => (
                                                        <option key={ds.id} value={ds.id}>{t(`ref.dataSource.${ds.id}`)}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input type="text" className="input-cell text-xs"
                                                    value={f.comment || ''}
                                                    placeholder={t('ui.common.placeholder.comment')}
                                                    onChange={(e) => updateFuel(f.id, 'comment', e.target.value)}
                                                    disabled={isFuelLocked}
                                                />
                                            </td>
                                            <td className="text-center">
                                                <label className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded hover:bg-slate-100 transition-colors" title={f.attachment || 'Attach file'}>
                                                    <Paperclip size={14} className={f.attachment ? 'text-blue-500' : 'text-slate-400'} />
                                                    <input type="file" className="hidden" onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) updateFuel(f.id, 'attachment', file.name);
                                                    }} disabled={isFuelLocked} />
                                                </label>
                                            </td>
                                            <td className="text-right">
                                                <button className={`btn-icon-danger ${isFuelLocked ? 'hidden' : ''}`} onClick={() => removeFuel(f.id)}><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : <div className="empty-state">{t('ui.activity.scope1.empty')}</div>}

                <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <span>{t('ui.activity.scope1.formula')}</span>
                </div>
                {state.activity.fuels.length > 0 && (
                    <SectionWorkflowActions
                        section="fuels"
                        period={period}
                    />
                )}
            </div>

            {/* Electricity */}
            <div className={`card ${isElecLocked ? 'border-slate-300 bg-slate-50/30' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Zap size={20} className="text-cyan-500" />
                        <h3 className="text-lg font-semibold text-slate-700">{t('ui.activity.scope2.title')}</h3>
                        <SectionWorkflowBadge
                            section="electricity"
                            currentStatus={state.sectionWorkflows.electricity}
                            period={period}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs text-slate-500 font-medium">{t('ui.common.total')}</p>
                            <p className="text-xl font-bold text-blue-600 border-b-2 border-blue-200">
                                {totalElecEmissions.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-sm font-normal text-slate-500">tCO₂e</span>
                            </p>
                        </div>
                        {!isElecLocked && (
                            <button onClick={handleAddElec} className="btn-primary flex items-center gap-2">
                                <Plus size={16} /> {t('ui.common.addRow')}
                            </button>
                        )}
                    </div>
                </div>
                {state.activity.electricity.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 140 }}>{t('ui.common.period')}</th>
                                    <th style={{ width: 120 }}>{t('ui.common.process')}</th>
                                    <th style={{ width: 100 }}>{t('ui.activity.table.mwh')}</th>
                                    <th style={{ width: 120 }}>{t('ui.activity.table.grid')}</th>
                                    <th style={{ width: 120 }}>{t('ui.activity.table.ef')} (tCO₂/MWh)</th>
                                    <th style={{ width: 100 }}>{t('ui.activity.table.tco2e')}</th>
                                    <th style={{ width: 100 }}>{t('ui.common.source')}</th>
                                    <th>{t('ui.common.comment')}</th>
                                    <th style={{ width: 36 }}></th>
                                    <th style={{ width: 40 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedElectricity.map(e => {
                                    const elecEmissions = calcElectricityEmissions(e);
                                    return (
                                        <tr key={e.id}>
                                            <td>
                                                <FormattedMonthInput
                                                    value={e.period}
                                                    className="input-cell"
                                                    onChange={(ev) => updateElec(e.id, 'period', ev.target.value)}
                                                    disabled={isElecLocked}
                                                />
                                            </td>
                                            <td>
                                                <select value={e.processId} className="input-cell"
                                                    onChange={(ev) => updateElec(e.id, 'processId', ev.target.value)}
                                                    disabled={isElecLocked}>
                                                    {state.processes.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <input type="number" value={e.mwh} className={`input-cell font-mono ${errClass(e.mwh)}`}
                                                    onChange={(ev) => updateElec(e.id, 'mwh', ev.target.value)}
                                                    disabled={isElecLocked} />
                                            </td>
                                            <td>
                                                <select value={e.gridCountry} className="input-cell text-sm"
                                                    onChange={(ev) => handleGridCountryChange(e.id, ev.target.value)}
                                                    disabled={isElecLocked}>
                                                    {GRID_EF_BY_COUNTRY.map(c => (
                                                        <option key={c.code} value={c.code}>{c.code} — {t(`ref.country.${c.code}`)}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input type="number" step="0.001" value={e.ef} className={`input-cell font-mono text-sm ${errClass(e.ef)}`}
                                                    onChange={(ev) => {
                                                        updateElec(e.id, 'ef', ev.target.value);
                                                        updateElec(e.id, 'efOverride', true);
                                                    }}
                                                    disabled={isElecLocked} />
                                            </td>
                                            <td className="font-mono font-semibold text-blue-700 text-right">
                                                {fmtNum(elecEmissions.co2e, 1)}
                                            </td>
                                            <td>
                                                <select
                                                    value={e.source || 'manual'}
                                                    className="input-cell text-xs"
                                                    onChange={(ev) => updateElec(e.id, 'source', ev.target.value)}
                                                    disabled={isElecLocked}
                                                >
                                                    {DATA_SOURCES.map(ds => (
                                                        <option key={ds.id} value={ds.id}>{t(`ref.dataSource.${ds.id}`)}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input type="text" className="input-cell text-xs"
                                                    value={e.comment || ''}
                                                    placeholder={t('ui.common.placeholder.comment')}
                                                    onChange={(ev) => dispatch({ type: 'UPDATE_ELEC', payload: { id: e.id, field: 'comment', value: ev.target.value } })}
                                                />
                                            </td>
                                            <td className="text-center">
                                                <label className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded hover:bg-slate-100 transition-colors" title={e.attachment || 'Attach file'}>
                                                    <Paperclip size={14} className={e.attachment ? 'text-blue-500' : 'text-slate-400'} />
                                                    <input type="file" className="hidden" onChange={(ev) => {
                                                        const file = ev.target.files?.[0];
                                                        if (file) dispatch({ type: 'UPDATE_ELEC', payload: { id: e.id, field: 'attachment', value: file.name } });
                                                    }} />
                                                </label>
                                            </td>
                                            <td className="text-right">
                                                <button className="btn-icon-danger" onClick={() => dispatch({ type: 'DELETE_ELEC', payload: e.id })}><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : <div className="empty-state">{t('ui.activity.scope2.empty')}</div>}

                <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <span>{t('ui.activity.scope2.formula')}</span>
                </div>
            </div>

            {/* Process Emissions — Formula Builder */}
            <EmissionBlockPanel />
        </div>
    );
}

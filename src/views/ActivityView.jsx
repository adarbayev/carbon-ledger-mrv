import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FUEL_TYPES, GRID_EF_BY_COUNTRY, getGridEf } from '../data/referenceData';
import { calcCombustionEmissions, calcElectricityEmissions, DEFAULT_EMISSION_FACTORS, GWP_AR6 } from '../engine/emissionEngine';
import { Flame, Zap, Info, Paperclip } from 'lucide-react';

const DATA_SOURCES = [
    { id: 'manual', label: 'Manual Entry' },
    { id: 'scada', label: 'SCADA' },
    { id: 'erp', label: 'ERP System' },
    { id: 'iot', label: 'IoT Meter' },
    { id: 'lab', label: 'Lab Certificate' },
    { id: 'third_party', label: 'Third-Party Report' },
];
import EmissionBlockPanel from './EmissionBlockPanel';

export default function ActivityView() {
    const { state, dispatch } = useApp();

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

    return (
        <div className="space-y-8">
            {/* Fuel Combustion */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Flame size={20} className="text-orange-500" />
                        <h3 className="text-lg font-semibold text-slate-700">Fuel Combustion — Direct Emissions (Scope 1)</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-slate-500">
                            Total: <strong className="text-slate-800">{totalFuelEmissions.toFixed(1)} tCO₂e</strong>
                        </span>
                        <button className="btn ghost small" onClick={() => dispatch({
                            type: 'ADD_FUEL', payload: {
                                id: `f${Date.now()}`,
                                period: state.meta.periodStart || '2025-01',
                                processId: state.processes[0]?.id || '',
                                fuelTypeId: 'natural_gas', quantity: 0, unit: 't',
                                source: 'manual', comment: '', attachment: null,
                                customNcv: 0, customEf: 0, customEfCo2: 0, customEfCh4: 0, customEfN2o: 0
                            }
                        })}>+ Add Row</button>
                    </div>
                </div>
                {state.activity.fuels.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 100 }}>Period</th>
                                    <th style={{ width: 120 }}>Process</th>
                                    <th style={{ width: 160 }}>Fuel Type</th>
                                    <th style={{ width: 100 }}>Qty (t)</th>
                                    <th style={{ width: 80 }}>NCV</th>
                                    <th style={{ width: 80 }}>EF<sub>CO₂</sub></th>
                                    <th style={{ width: 100 }}>tCO₂e</th>
                                    <th style={{ width: 100 }}>Source</th>
                                    <th>Comment</th>
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
                                                <input type="month" value={f.period} className="input-cell"
                                                    onChange={(e) => dispatch({ type: 'UPDATE_FUEL', payload: { id: f.id, field: 'period', value: e.target.value } })} />
                                            </td>
                                            <td>
                                                <select value={f.processId} className="input-cell"
                                                    onChange={(e) => dispatch({ type: 'UPDATE_FUEL', payload: { id: f.id, field: 'processId', value: e.target.value } })}>
                                                    {state.processes.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <select value={f.fuelTypeId} className="input-cell text-sm"
                                                    onChange={(e) => dispatch({ type: 'UPDATE_FUEL', payload: { id: f.id, field: 'fuelTypeId', value: e.target.value } })}>
                                                    {FUEL_TYPES.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <input type="number" value={f.quantity} className="input-cell font-mono"
                                                    onChange={(e) => dispatch({ type: 'UPDATE_FUEL', payload: { id: f.id, field: 'quantity', value: e.target.value } })} />
                                            </td>
                                            <td className="text-xs text-slate-400 font-mono text-center">
                                                {isCustom ? (
                                                    <input type="number" value={f.customNcv} className="input-cell text-xs w-16"
                                                        placeholder="NCV"
                                                        onChange={(e) => dispatch({ type: 'UPDATE_FUEL', payload: { id: f.id, field: 'customNcv', value: e.target.value } })} />
                                                ) : efDef.ncv || fuelType?.ncv || '—'}
                                            </td>
                                            <td className="text-xs text-slate-400 font-mono text-center">
                                                {isCustom ? (
                                                    <input type="number" value={f.customEf} className="input-cell text-xs w-16"
                                                        placeholder="EF"
                                                        onChange={(e) => dispatch({ type: 'UPDATE_FUEL', payload: { id: f.id, field: 'customEf', value: e.target.value } })} />
                                                ) : efDef.efCO2 || fuelType?.efCO2 || '—'}
                                            </td>
                                            <td className="font-mono font-semibold text-blue-700 text-right">
                                                {emissions.co2e.toFixed(1)}
                                            </td>
                                            <td>
                                                <select value={f.source || 'manual'} className="input-cell text-xs"
                                                    onChange={(e) => dispatch({ type: 'UPDATE_FUEL', payload: { id: f.id, field: 'source', value: e.target.value } })}>
                                                    {DATA_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <input type="text" value={f.comment || ''} className="input-cell text-xs"
                                                    placeholder="Note…"
                                                    onChange={(e) => dispatch({ type: 'UPDATE_FUEL', payload: { id: f.id, field: 'comment', value: e.target.value } })} />
                                            </td>
                                            <td className="text-center">
                                                <label className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded hover:bg-slate-100 transition-colors" title={f.attachment || 'Attach file'}>
                                                    <Paperclip size={14} className={f.attachment ? 'text-blue-500' : 'text-slate-400'} />
                                                    <input type="file" className="hidden" onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) dispatch({ type: 'UPDATE_FUEL', payload: { id: f.id, field: 'attachment', value: file.name } });
                                                    }} />
                                                </label>
                                            </td>
                                            <td className="text-right">
                                                <button className="btn ghost small danger-hover" onClick={() => dispatch({ type: 'DELETE_FUEL', payload: f.id })}>&times;</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : <div className="empty-state">No fuel data. Click "+ Add Row" to start.</div>}

                <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <span>Formula: tCO₂ = Quantity (t) × NCV (GJ/t) × EF (tCO₂/TJ) ÷ 1000. Source: IPCC 2006 Guidelines.</span>
                </div>
            </div>

            {/* Electricity */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Zap size={20} className="text-cyan-500" />
                        <h3 className="text-lg font-semibold text-slate-700">Electricity — Indirect Emissions (Scope 2)</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-slate-500">
                            Total: <strong className="text-slate-800">{totalElecEmissions.toFixed(1)} tCO₂e</strong>
                        </span>
                        <button className="btn ghost small" onClick={() => dispatch({
                            type: 'ADD_ELEC', payload: {
                                id: `e${Date.now()}`,
                                period: state.meta.periodStart || '2025-01',
                                processId: state.processes[0]?.id || '',
                                mwh: 0, gridCountry: 'KZ', ef: getGridEf('KZ'), efOverride: false,
                                source: 'manual', comment: '', attachment: null
                            }
                        })}>+ Add Row</button>
                    </div>
                </div>
                {state.activity.electricity.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 100 }}>Period</th>
                                    <th style={{ width: 120 }}>Process</th>
                                    <th style={{ width: 100 }}>MWh</th>
                                    <th style={{ width: 120 }}>Grid</th>
                                    <th style={{ width: 120 }}>EF (tCO₂/MWh)</th>
                                    <th style={{ width: 100 }}>tCO₂e</th>
                                    <th style={{ width: 100 }}>Source</th>
                                    <th>Comment</th>
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
                                                <input type="month" value={e.period} className="input-cell"
                                                    onChange={(ev) => dispatch({ type: 'UPDATE_ELEC', payload: { id: e.id, field: 'period', value: ev.target.value } })} />
                                            </td>
                                            <td>
                                                <select value={e.processId} className="input-cell"
                                                    onChange={(ev) => dispatch({ type: 'UPDATE_ELEC', payload: { id: e.id, field: 'processId', value: ev.target.value } })}>
                                                    {state.processes.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <input type="number" value={e.mwh} className="input-cell font-mono"
                                                    onChange={(ev) => dispatch({ type: 'UPDATE_ELEC', payload: { id: e.id, field: 'mwh', value: ev.target.value } })} />
                                            </td>
                                            <td>
                                                <select value={e.gridCountry} className="input-cell text-sm"
                                                    onChange={(ev) => handleGridCountryChange(e.id, ev.target.value)}>
                                                    {Object.entries(GRID_EF_BY_COUNTRY).map(([code, info]) => (
                                                        <option key={code} value={code}>{code} — {info.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input type="number" step="0.001" value={e.ef} className="input-cell font-mono text-sm"
                                                    onChange={(ev) => {
                                                        dispatch({ type: 'UPDATE_ELEC', payload: { id: e.id, field: 'ef', value: ev.target.value } });
                                                        dispatch({ type: 'UPDATE_ELEC', payload: { id: e.id, field: 'efOverride', value: true } });
                                                    }} />
                                            </td>
                                            <td className="font-mono font-semibold text-blue-700 text-right">
                                                {elecEmissions.co2e.toFixed(1)}
                                            </td>
                                            <td>
                                                <select value={e.source || 'manual'} className="input-cell text-xs"
                                                    onChange={(ev) => dispatch({ type: 'UPDATE_ELEC', payload: { id: e.id, field: 'source', value: ev.target.value } })}>
                                                    {DATA_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <input type="text" value={e.comment || ''} className="input-cell text-xs"
                                                    placeholder="Note…"
                                                    onChange={(ev) => dispatch({ type: 'UPDATE_ELEC', payload: { id: e.id, field: 'comment', value: ev.target.value } })} />
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
                                                <button className="btn ghost small danger-hover" onClick={() => dispatch({ type: 'DELETE_ELEC', payload: e.id })}>&times;</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : <div className="empty-state">No electricity data. Click "+ Add Row" to start.</div>}

                <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    <span>Formula: tCO₂ = MWh × Grid EF (tCO₂/MWh). EF auto-populated from country selection, editable for site-specific data.</span>
                </div>
            </div>

            {/* Process Emissions — Formula Builder */}
            <EmissionBlockPanel />
        </div>
    );
}

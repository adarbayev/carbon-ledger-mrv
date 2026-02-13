import React from 'react';
import { useApp } from '../context/AppContext';
import { FUEL_TYPES, GRID_EF_BY_COUNTRY, calcFuelEmissions, calcElecEmissions, getGridEf } from '../data/referenceData';
import { Flame, Zap, Info } from 'lucide-react';

export default function ActivityView() {
    const { state, dispatch } = useApp();

    // Totals
    const totalFuelEmissions = state.activity.fuels.reduce((sum, f) => sum + calcFuelEmissions(f).total, 0);
    const totalElecEmissions = state.activity.electricity.reduce((sum, e) => sum + calcElecEmissions(e), 0);

    const handleGridCountryChange = (id, countryCode) => {
        const gridEf = getGridEf(countryCode);
        dispatch({ type: 'UPDATE_ELEC', payload: { id, field: 'gridCountry', value: countryCode } });
        // Auto-set EF unless user has overridden
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
                            Total: <strong className="text-slate-800">{totalFuelEmissions.toFixed(1)} tCO₂</strong>
                        </span>
                        <button className="btn ghost small" onClick={() => dispatch({ type: 'ADD_FUEL' })}>+ Add Row</button>
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
                                    <th style={{ width: 80 }}>EF</th>
                                    <th style={{ width: 100 }}>tCO₂</th>
                                    <th>Evidence</th>
                                    <th style={{ width: 40 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {state.activity.fuels.map(f => {
                                    const fuelType = FUEL_TYPES.find(ft => ft.id === f.fuelTypeId);
                                    const emissions = calcFuelEmissions(f);
                                    const isCustom = f.fuelTypeId === 'other';
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
                                                ) : fuelType?.ncv || '—'}
                                            </td>
                                            <td className="text-xs text-slate-400 font-mono text-center">
                                                {isCustom ? (
                                                    <input type="number" value={f.customEf} className="input-cell text-xs w-16"
                                                        placeholder="EF"
                                                        onChange={(e) => dispatch({ type: 'UPDATE_FUEL', payload: { id: f.id, field: 'customEf', value: e.target.value } })} />
                                                ) : fuelType?.efCO2 || '—'}
                                            </td>
                                            <td className="font-mono font-semibold text-blue-700 text-right">
                                                {emissions.total.toFixed(1)}
                                            </td>
                                            <td>
                                                <input type="text" value={f.evidence} className="input-cell text-xs"
                                                    placeholder="Invoice / ref"
                                                    onChange={(e) => dispatch({ type: 'UPDATE_FUEL', payload: { id: f.id, field: 'evidence', value: e.target.value } })} />
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
                            Total: <strong className="text-slate-800">{totalElecEmissions.toFixed(1)} tCO₂</strong>
                        </span>
                        <button className="btn ghost small" onClick={() => dispatch({ type: 'ADD_ELEC' })}>+ Add Row</button>
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
                                    <th style={{ width: 160 }}>Grid Country</th>
                                    <th style={{ width: 100 }}>EF (tCO₂/MWh)</th>
                                    <th style={{ width: 100 }}>tCO₂</th>
                                    <th>Evidence</th>
                                    <th style={{ width: 40 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {state.activity.electricity.map(e => {
                                    const emissions = calcElecEmissions(e);
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
                                                <select value={e.gridCountry || 'OTHER'} className="input-cell text-sm"
                                                    onChange={(ev) => handleGridCountryChange(e.id, ev.target.value)}>
                                                    {GRID_EF_BY_COUNTRY.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <input type="number" step="0.001" value={e.ef} className="input-cell font-mono text-center"
                                                    onChange={(ev) => {
                                                        dispatch({ type: 'UPDATE_ELEC', payload: { id: e.id, field: 'ef', value: ev.target.value } });
                                                        dispatch({ type: 'UPDATE_ELEC', payload: { id: e.id, field: 'efOverride', value: true } });
                                                    }} />
                                            </td>
                                            <td className="font-mono font-semibold text-cyan-700 text-right">
                                                {emissions.toFixed(1)}
                                            </td>
                                            <td>
                                                <input type="text" value={e.evidence} className="input-cell text-xs"
                                                    placeholder="Meter / statement"
                                                    onChange={(ev) => dispatch({ type: 'UPDATE_ELEC', payload: { id: e.id, field: 'evidence', value: ev.target.value } })} />
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
        </div>
    );
}

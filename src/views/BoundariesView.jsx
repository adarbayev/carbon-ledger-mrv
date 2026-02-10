import React from 'react';
import { useApp } from '../context/AppContext';
import { GRID_EF_BY_COUNTRY } from '../data/referenceData';

export default function BoundariesView() {
    const { state, dispatch } = useApp();

    return (
        <>
            <header className="view-header">
                <h2 className="section-title">Installation Boundaries</h2>
            </header>

            {/* Top Form */}
            <div className="card form-grid">
                <div className="form-group">
                    <label>Installation Name</label>
                    <input type="text" value={state.meta.installationName}
                        onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { field: 'installationName', value: e.target.value } })}
                    />
                </div>
                <div className="form-group">
                    <label>Country</label>
                    <select value={state.meta.country || ''}
                        onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { field: 'country', value: e.target.value } })}>
                        {GRID_EF_BY_COUNTRY.map(c => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Reporting Start</label>
                    <input type="month" value={state.meta.periodStart}
                        onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { field: 'periodStart', value: e.target.value } })}
                    />
                </div>
                <div className="form-group">
                    <label>Reporting End</label>
                    <input type="month" value={state.meta.periodEnd}
                        onChange={(e) => dispatch({ type: 'UPDATE_META', payload: { field: 'periodEnd', value: e.target.value } })}
                    />
                </div>
            </div>

            {/* Boundaries Table */}
            <div className="card">
                <h3>Operational Boundaries</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Select the activities included in this assessment.
                </p>
                {state.boundaries.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 50, textAlign: 'center' }}>Incl.</th>
                                <th style={{ width: 250 }}>Boundary Item</th>
                                <th>Notes</th>
                                <th style={{ width: 200 }}>Evidence</th>
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
                                    <td>{b.name}</td>
                                    <td>
                                        <input type="text" className="input-cell"
                                            value={b.notes || ''}
                                            placeholder="Add notes..."
                                            onChange={(e) => dispatch({ type: 'UPDATE_BOUNDARY', payload: { id: b.id, field: 'notes', value: e.target.value } })}
                                        />
                                    </td>
                                    <td>
                                        <input type="text" className="input-cell"
                                            value={b.evidence || ''}
                                            placeholder="Link or Ref ID"
                                            onChange={(e) => dispatch({ type: 'UPDATE_BOUNDARY', payload: { id: b.id, field: 'evidence', value: e.target.value } })}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">No items defined.</div>
                )}
            </div>
        </>
    );
}

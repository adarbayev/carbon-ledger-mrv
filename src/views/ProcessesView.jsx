import React from 'react';
import { useApp } from '../context/AppContext';

export default function ProcessesView() {
    const { state, dispatch } = useApp();

    return (
        <>
            <header className="view-header">
                <h2 className="section-title">Production Processes</h2>
                <button className="btn primary" onClick={() => dispatch({ type: 'ADD_PROCESS' })}>+ Add Process</button>
            </header>

            <div className="card">
                <h3>Defined Processes</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Processes are used for attributing activity and allocating emissions.
                    Inactive processes are excluded from calculations.
                </p>
                {state.processes.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 80 }}>ID</th>
                                <th style={{ width: 200 }}>Name</th>
                                <th>Description</th>
                                <th style={{ width: 100, textAlign: 'center' }}>Active</th>
                                <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {state.processes.map(p => (
                                <tr key={p.id} className={!p.active ? 'row-muted' : ''}>
                                    <td><strong>{p.id}</strong></td>
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
                                    <td className="text-right">
                                        <button className="btn ghost small danger-hover"
                                            onClick={() => { if (confirm('Delete this process?')) dispatch({ type: 'DELETE_PROCESS', payload: p.id }); }}>
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">No processes defined.</div>
                )}
            </div>
        </>
    );
}

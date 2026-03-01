import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Trash2 } from 'lucide-react';

export default function ProcessesView() {
    const { state, dispatch } = useApp();
    const { t } = useLanguage();

    return (
        <>
            <header className="view-header">
                <h2 className="section-title">{t('ui.processes.title')}</h2>
                <button className="btn-primary btn-sm" onClick={() => dispatch({ type: 'ADD_PROCESS' })}>
                    <Plus size={14} />
                    {t('ui.processes.add')}
                </button>
            </header>

            <div className="card">
                <p className="text-sm text-text-muted mb-4">
                    {t('ui.processes.description')}
                </p>
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
        </>
    );
}

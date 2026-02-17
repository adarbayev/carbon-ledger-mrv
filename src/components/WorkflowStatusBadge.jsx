import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronDown, Circle, Lock, Unlock } from 'lucide-react';

const STATUSES = [
    { id: 'DRAFT', label: 'Draft', color: 'bg-slate-400', textColor: 'text-slate-600', bgLight: 'bg-slate-50', icon: '📝' },
    { id: 'IN_REVIEW', label: 'In Review', color: 'bg-amber-400', textColor: 'text-amber-700', bgLight: 'bg-amber-50', icon: '🔍' },
    { id: 'APPROVED', label: 'Approved', color: 'bg-emerald-400', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50', icon: '✅' },
    { id: 'SUBMITTED', label: 'Submitted', color: 'bg-blue-400', textColor: 'text-blue-700', bgLight: 'bg-blue-50', icon: '📤' },
];

export default function WorkflowStatusBadge() {
    const { state, dispatch } = useApp();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const currentStatus = state.meta.workflowStatus || 'DRAFT';
    const statusInfo = STATUSES.find(s => s.id === currentStatus) || STATUSES[0];
    const isLocked = currentStatus === 'APPROVED' || currentStatus === 'SUBMITTED';

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleStatusChange = (newStatus) => {
        if (newStatus === currentStatus) { setOpen(false); return; }

        // Revert from locked to DRAFT requires confirmation
        if (isLocked && newStatus === 'DRAFT') {
            if (!confirm('This will unlock all data for editing. Continue?')) return;
        }

        dispatch({
            type: 'SET_WORKFLOW_STATUS',
            payload: { status: newStatus, reviewer: '' }
        });
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all
                    ${statusInfo.bgLight} border-${statusInfo.color.replace('bg-', '')}/30 ${statusInfo.textColor}
                    hover:shadow-sm cursor-pointer`}
            >
                <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.color}`} />
                <span>{statusInfo.icon} {statusInfo.label}</span>
                {isLocked && <Lock size={12} className="text-amber-600" />}
                <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Change Status</span>
                    </div>
                    {STATUSES.map(s => (
                        <button key={s.id}
                            onClick={() => handleStatusChange(s.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 transition-colors
                                ${s.id === currentStatus ? 'bg-blue-50 font-semibold' : 'text-slate-600'}`}
                        >
                            <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                            <span>{s.icon} {s.label}</span>
                            {s.id === currentStatus && <span className="ml-auto text-xs text-blue-500">Current</span>}
                        </button>
                    ))}
                    {isLocked && (
                        <div className="px-3 py-2 border-t border-slate-100">
                            <button
                                onClick={() => handleStatusChange('DRAFT')}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                                <Unlock size={12} />
                                Revert to Draft (unlock editing)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

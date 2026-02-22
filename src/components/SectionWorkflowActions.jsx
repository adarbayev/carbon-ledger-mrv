import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Send, RotateCcw } from 'lucide-react';

export const SectionWorkflowActions = ({ section, period }) => {
    const { t } = useLanguage();
    const { state, dispatch } = useApp();
    const currentStatus = state.sectionWorkflows[section];

    const setStatus = (newStatus) => {
        dispatch({
            type: 'SET_SECTION_WORKFLOW_STATUS',
            payload: { period, section, status: newStatus }
        });
    };

    if (currentStatus === 'DRAFT') {
        return (
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <button
                    onClick={() => setStatus('AWAITING_VALIDATION')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
                >
                    <Send size={16} />
                    {t('ui.workflow.actions.submit')}
                </button>
            </div>
        );
    }

    if (currentStatus === 'AWAITING_VALIDATION') {
        return (
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center bg-amber-50/50 -mx-6 px-6 pb-2 rounded-b-xl">
                <p className="text-sm text-amber-700 font-medium flex items-center gap-2">
                    <ShieldCheck size={16} />
                    {t('ui.workflow.actions.validationReq')}
                </p>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setStatus('DRAFT')}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                    >
                        <RotateCcw size={16} />
                        {t('ui.workflow.actions.reject')}
                    </button>
                    <button
                        onClick={() => setStatus('APPROVED')}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
                    >
                        <ShieldCheck size={16} />
                        {t('ui.workflow.actions.approve')}
                    </button>
                </div>
            </div>
        );
    }

    if (currentStatus === 'APPROVED') {
        return (
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center bg-emerald-50/50 -mx-6 px-6 pb-2 rounded-b-xl">
                <p className="text-sm text-emerald-700 font-medium flex items-center gap-2">
                    <ShieldCheck size={16} />
                    {t('ui.workflow.actions.approvedLocked')}
                </p>
                <button
                    onClick={() => {
                        if (confirm(t('ui.workflow.actions.revertConfirm'))) {
                            setStatus('DRAFT');
                        }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors text-xs font-medium"
                >
                    <RotateCcw size={14} />
                    {t('ui.workflow.actions.revert')}
                </button>
            </div>
        );
    }

    return null;
};

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { CheckCircle, Clock, FileEdit, X } from 'lucide-react';
import * as DAL from '../db/dal';

export const SectionWorkflowBadge = ({ section, currentStatus, period }) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [history, setHistory] = useState([]);

    const fetchHistory = () => {
        // Fetch audit log history specifically for this section workflow
        const allAudits = DAL.getAuditLog({ entityType: 'section_workflow' });

        // Find the specific section workflow ID. This requires a query 
        // because audit log only stores the ID, not the period/section directly.
        const swRecords = DAL.getSectionWorkflows('default', period);
        const thisSw = swRecords.find(sw => sw.section === section);

        if (thisSw) {
            const relevantAudits = allAudits.filter(a => a.entity_id === thisSw.id);
            setHistory(relevantAudits);
        } else {
            setHistory([]);
        }
    };

    const handleOpen = () => {
        fetchHistory();
        setIsOpen(true);
    };

    // Styling based on status
    let badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
    let Icon = FileEdit;
    let label = t('ui.workflow.status.draft');

    if (currentStatus === 'AWAITING_VALIDATION') {
        badgeClass = "bg-amber-100 text-amber-700 border-amber-200";
        Icon = Clock;
        label = t('ui.workflow.status.awaitingValidation');
    } else if (currentStatus === 'APPROVED') {
        badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
        Icon = CheckCircle;
        label = t('ui.workflow.status.approved');
    }

    return (
        <>
            <button
                onClick={handleOpen}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border shadow-sm transition-colors hover:bg-opacity-80 ${badgeClass}`}
            >
                <Icon size={14} />
                {label}
            </button>

            {/* View-Only History Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-[500px] max-w-full overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                {t('ui.workflow.history.title')}
                                <span className={`px-2 py-0.5 text-xs rounded-full border ${badgeClass}`}>
                                    {label}
                                </span>
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - Timeline */}
                        <div className="px-6 py-6 border-b bg-slate-50">
                            <div className="flex items-center justify-between relative">
                                {/* Connecting Line */}
                                <div className="absolute left-6 right-6 top-1/2 h-0.5 bg-slate-200 -z-0 -translate-y-1/2"></div>

                                {/* Draft Node */}
                                <div className="relative z-10 flex flex-col items-center gap-2 bg-slate-50 px-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStatus === 'DRAFT' ? 'border-slate-500 bg-slate-100 text-slate-600' : 'border-emerald-500 bg-emerald-50 text-emerald-600'}`}>
                                        <FileEdit size={14} />
                                    </div>
                                    <span className="text-xs font-medium text-slate-600">{t('ui.workflow.status.draft')}</span>
                                </div>

                                {/* Awaiting Node */}
                                <div className="relative z-10 flex flex-col items-center gap-2 bg-slate-50 px-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                                        ${currentStatus === 'DRAFT' ? 'border-slate-200 bg-white text-slate-300'
                                            : currentStatus === 'AWAITING_VALIDATION' ? 'border-amber-500 bg-amber-50 text-amber-600'
                                                : 'border-emerald-500 bg-emerald-50 text-emerald-600'}`}>
                                        <Clock size={14} />
                                    </div>
                                    <span className="text-xs font-medium text-slate-600 text-center leading-tight max-w-[80px]">{t('ui.workflow.status.awaitingValidation')}</span>
                                </div>

                                {/* Approved Node */}
                                <div className="relative z-10 flex flex-col items-center gap-2 bg-slate-50 px-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                                        ${currentStatus === 'APPROVED' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-300'}`}>
                                        <CheckCircle size={14} />
                                    </div>
                                    <span className="text-xs font-medium text-slate-600">{t('ui.workflow.status.approved')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Audit Log List */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white min-h-[200px]">
                            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">{t('ui.workflow.history.auditLog')}</h4>
                            {history.length > 0 ? (
                                <div className="space-y-4">
                                    {history.map((entry, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className="w-2 h-2 rounded-full bg-slate-300 mt-2"></div>
                                                {idx < history.length - 1 && <div className="w-px h-full bg-slate-200 mt-2"></div>}
                                            </div>
                                            <div className="pb-4">
                                                <p className="text-sm font-medium text-slate-800">
                                                    {t('ui.workflow.history.statusUpdate')}
                                                    <span className="text-xs font-normal text-slate-500 ml-2">
                                                        {new Date(entry.changed_at).toLocaleString()}
                                                    </span>
                                                </p>
                                                <p className="text-sm text-slate-600 mt-1">
                                                    {t('ui.workflow.history.changedBy')} <span className="font-medium text-slate-700">{entry.changed_by}</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 italic">{t('ui.workflow.history.noHistory')}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

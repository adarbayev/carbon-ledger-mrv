import React, { useState, useMemo, useCallback } from 'react';
import { getAuditLog, getAuditEntryCount, getAuditEntityTypes } from '../db/dal';
import { useLanguage } from '../context/LanguageContext';
import { ClipboardList, Search, Filter, RefreshCw, ChevronDown, ArrowRight, Plus, Pencil, Trash2, Copy } from 'lucide-react';

const PAGE_SIZE = 50;

// Action badge styles
const ACTION_STYLES = {
    CREATE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Plus, dot: 'bg-emerald-500' },
    UPDATE: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Pencil, dot: 'bg-blue-500' },
    DELETE: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: Trash2, dot: 'bg-red-500' },
    CREATE_VERSION: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Copy, dot: 'bg-amber-500' },
};
const DEFAULT_ACTION = { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: Pencil, dot: 'bg-slate-400' };

function getLocale(lang) {
    switch (lang) {
        case 'kk': return 'kk-KZ';
        case 'ru': return 'ru-RU';
        default: return 'en-GB';
    }
}

function formatTimestamp(ts, locale) {
    if (!ts) return '—';
    try {
        const d = new Date(ts);
        return d.toLocaleString(locale, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch { return ts; }
}

function formatDate(ts, locale) {
    if (!ts) return 'Unknown Date';
    try {
        const d = new Date(ts);
        return d.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return ts; }
}

export default function AuditTrailView() {
    const { t, language } = useLanguage();
    const [filterType, setFilterType] = useState('');
    const [searchId, setSearchId] = useState('');
    const [offset, setOffset] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);

    const locale = getLocale(language);

    // Helper to format entity types using translations
    const formatEntityType = useCallback((type) => {
        // Try to find translation key, fallback to formatted string
        const key = `ui.audit.entityTypes.${type}`;
        const translated = t(key);
        return translated !== key ? translated : type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }, [t]);

    // Query data
    const filters = useMemo(() => ({
        entityType: filterType || null,
        entityId: searchId || null
    }), [filterType, searchId]);

    const entries = useMemo(() => {
        return getAuditLog({ limit: PAGE_SIZE, offset, ...filters });
    }, [offset, filters, refreshKey]);

    const totalCount = useMemo(() => {
        return getAuditEntryCount(filters);
    }, [filters, refreshKey]);

    const entityTypes = useMemo(() => {
        return getAuditEntityTypes();
    }, [refreshKey]);

    // Group entries by date
    const groupedByDate = useMemo(() => {
        const groups = new Map();
        for (const entry of entries) {
            const dateKey = entry.changed_at ? entry.changed_at.split('T')[0] : 'unknown';
            if (!groups.has(dateKey)) groups.set(dateKey, []);
            groups.get(dateKey).push(entry);
        }
        return [...groups.entries()];
    }, [entries]);

    const handleRefresh = useCallback(() => {
        setRefreshKey(k => k + 1);
        setOffset(0);
    }, []);

    const handleFilterChange = useCallback((type) => {
        setFilterType(type);
        setOffset(0);
    }, []);

    const handleSearchChange = useCallback((val) => {
        setSearchId(val);
        setOffset(0);
    }, []);

    const hasMore = offset + PAGE_SIZE < totalCount;
    const showingEnd = Math.min(offset + PAGE_SIZE, totalCount);

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <ClipboardList size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{t('ui.audit.title')}</h2>
                        <p className="text-xs text-slate-500">
                            {totalCount} {t('ui.audit.recorded')}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    className="btn-secondary btn-sm"
                >
                    <RefreshCw size={13} /> {t('ui.audit.refresh')}
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-5">
                <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                    <select
                        value={filterType}
                        onChange={(e) => handleFilterChange(e.target.value)}
                        className="form-select pl-9 pr-8 py-2 text-sm"
                    >
                        <option value="">{t('ui.audit.filters.all')}</option>
                        {entityTypes.map(t => (
                            <option key={t} value={t}>{formatEntityType(t)}</option>
                        ))}
                    </select>
                </div>
                <div className="relative flex-1 max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchId}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder={t('ui.audit.filters.search')}
                        className="form-input w-full pl-9 pr-3 py-2 text-sm"
                    />
                </div>
            </div>

            {/* Timeline */}
            {entries.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                    <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">{t('ui.audit.empty.title')}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('ui.audit.empty.desc')}</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {groupedByDate.map(([dateKey, dayEntries]) => (
                        <div key={dateKey}>
                            {/* Date header */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    {formatDate(dateKey, locale)}
                                </div>
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {dayEntries.length} {t('ui.audit.timeline.changes')}
                                </span>
                            </div>

                            {/* Entries for this date */}
                            <div className="relative ml-4">
                                {/* Timeline line */}
                                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200" />

                                <div className="space-y-1">
                                    {dayEntries.map((entry) => {
                                        const style = ACTION_STYLES[entry.action] || DEFAULT_ACTION;
                                        const Icon = style.icon;
                                        return (
                                            <div key={entry.id} className="relative flex items-start gap-3 group">
                                                {/* Timeline dot */}
                                                <div className={`relative z-10 w-[15px] h-[15px] rounded-full ${style.dot} border-2 border-white shadow-sm flex-shrink-0 mt-2.5`} />

                                                {/* Card */}
                                                <div className={`flex-1 px-3 py-2 rounded-lg border ${style.border} ${style.bg} group-hover:shadow-sm transition-shadow`}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            {/* Action badge */}
                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
                                                                <Icon size={10} />
                                                                {entry.action}
                                                            </span>
                                                            {/* Entity type */}
                                                            <span className="text-xs font-medium text-slate-700">
                                                                {formatEntityType(entry.entity_type)}
                                                            </span>
                                                            {/* Entity ID */}
                                                            <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]" title={entry.entity_id}>
                                                                {entry.entity_id}
                                                            </span>
                                                        </div>
                                                        {/* User + Timestamp */}
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                                                                {entry.changed_by || t('ui.audit.timeline.system')}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                                {formatTimestamp(entry.changed_at, locale)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Field change detail */}
                                                    {entry.field_name && (
                                                        <div className="mt-1 flex items-center gap-1.5 text-xs">
                                                            <span className="text-slate-500 font-medium">{entry.field_name}:</span>
                                                            {entry.old_value != null && (
                                                                <>
                                                                    <span className="font-mono text-red-500/70 line-through text-[11px] max-w-[150px] truncate" title={entry.old_value}>
                                                                        {entry.old_value}
                                                                    </span>
                                                                    <ArrowRight size={10} className="text-slate-300 flex-shrink-0" />
                                                                </>
                                                            )}
                                                            {entry.new_value != null && (
                                                                <span className="font-mono text-emerald-700 text-[11px] max-w-[150px] truncate" title={entry.new_value}>
                                                                    {entry.new_value}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Change reason */}
                                                    {entry.change_reason && (
                                                        <div className="mt-1 text-[11px] text-slate-500 italic">
                                                            {t('ui.audit.timeline.reason')}: {entry.change_reason}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination footer */}
            {totalCount > 0 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                    <span className="text-xs text-slate-500">
                        {t('ui.audit.pagination.showing')} {offset + 1}–{showingEnd} {t('ui.audit.pagination.of')} {totalCount}
                    </span>
                    <div className="flex gap-2">
                        {offset > 0 && (
                            <button
                                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                                className="btn-secondary btn-sm"
                            >
                                ← {t('ui.audit.pagination.newer')}
                            </button>
                        )}
                        {hasMore && (
                            <button
                                onClick={() => setOffset(offset + PAGE_SIZE)}
                                className="btn-secondary btn-sm"
                            >
                                {t('ui.audit.pagination.older')} →
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

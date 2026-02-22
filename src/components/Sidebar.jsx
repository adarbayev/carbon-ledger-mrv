import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
    Home, LayoutDashboard, Factory, Zap, PieChart, BarChart3,
    ClipboardList, ShieldCheck, FileOutput, FileText, Settings,
    ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import clsx from 'clsx';

const STORAGE_KEY = 'sidebar-collapsed';

export default function Sidebar() {
    const { state, dispatch } = useApp();
    const { t } = useLanguage();
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
    });
    const [showInstallations, setShowInstallations] = useState(false);

    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, collapsed); } catch { }
    }, [collapsed]);

    const navItems = [
        { id: 'dashboard', label: t('ui.sidebar.dashboard'), icon: Home },
        { id: 'boundaries', label: t('ui.sidebar.boundaries'), icon: LayoutDashboard },
        { id: 'processes', label: t('ui.sidebar.processes'), icon: Factory },
        { id: 'activity', label: t('ui.sidebar.activity'), icon: Zap },
        { id: 'allocation', label: t('ui.sidebar.allocation'), icon: PieChart },
        { id: 'results', label: t('ui.sidebar.results'), icon: BarChart3 },
        { id: 'audit', label: t('ui.sidebar.audit'), icon: ClipboardList },
        { id: 'qa', label: t('ui.sidebar.qa'), icon: ShieldCheck },
        { id: 'export', label: t('ui.sidebar.export'), icon: FileOutput },
        { id: 'report', label: t('ui.sidebar.report'), icon: FileText },
        { id: 'settings', label: t('ui.sidebar.settings'), icon: Settings },
    ];

    const sidebarWidth = collapsed ? 'w-[64px]' : 'w-[240px]';

    return (
        <aside className={clsx(
            sidebarWidth,
            "bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-20 transition-all duration-300 ease-in-out"
        )}>
            {/* Brand */}
            <div className="h-[60px] flex items-center px-4 border-b border-slate-800/50">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-xs"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
                        CL
                    </div>
                    {!collapsed && (
                        <span className="font-semibold text-white text-sm tracking-tight truncate">
                            Carbon Ledger
                        </span>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = state.activeTab === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => dispatch({ type: 'SET_TAB', payload: item.id })}
                            title={collapsed ? item.label : undefined}
                            className={clsx(
                                "w-full flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-200 group relative",
                                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
                                isActive
                                    ? "text-white bg-white/10"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                                    style={{ background: 'linear-gradient(180deg, #3b82f6, #06b6d4)' }} />
                            )}

                            <Icon size={18} className={clsx(
                                "flex-shrink-0",
                                isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                            )} />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            {/* Collapse toggle */}
            <div className="p-2 border-t border-slate-800/50">
                <button
                    onClick={() => setCollapsed(c => !c)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all text-xs"
                >
                    {collapsed
                        ? <ChevronRight size={16} />
                        : <><ChevronLeft size={16} /><span>Collapse</span></>
                    }
                </button>
            </div>

            {/* User / Meta */}
            {!collapsed && (
                <div className="p-3 border-t border-slate-800/50 relative">
                    <button
                        onClick={() => setShowInstallations(!showInstallations)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 transition-colors text-left"
                    >
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 flex-shrink-0">
                            {state.meta.country || 'US'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-400 truncate tracking-wide uppercase">Installation</p>
                            <p className="text-xs font-medium text-white truncate">{state.meta.installationName || 'No installation'}</p>
                        </div>
                        <ChevronDown size={14} className="text-slate-500" />
                    </button>

                    {/* Dropdown Menu */}
                    {showInstallations && (
                        <div className="absolute bottom-full left-3 w-[216px] mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden py-1 z-50">
                            <div className="px-3 py-2 border-b border-slate-700/50">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('ui.sidebar.switchInstallation') || 'Switch Installation'}</p>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {(state.installationsList || []).map(inst => (
                                    <button
                                        key={inst.id}
                                        onClick={() => {
                                            dispatch({ type: 'SET_ACTIVE_INSTALLATION', payload: inst.id });
                                            setShowInstallations(false);
                                        }}
                                        className={clsx(
                                            "w-full flex flex-col items-start px-3 py-2 text-left transition-colors",
                                            state.activeInstallationId === inst.id
                                                ? "bg-blue-500/10"
                                                : "hover:bg-slate-700/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <span className={clsx(
                                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                                state.activeInstallationId === inst.id ? "bg-blue-400" : "bg-transparent"
                                            )} />
                                            <span className={clsx(
                                                "text-xs font-medium truncate",
                                                state.activeInstallationId === inst.id ? "text-blue-400" : "text-slate-300"
                                            )}>{inst.name}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 pl-3.5 tracking-wide">{inst.country}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="px-2 py-1.5 border-t border-slate-700/50">
                                <button
                                    onClick={() => {
                                        const name = prompt(t('ui.sidebar.newInstallationName') || 'New Installation Name:');
                                        if (name) {
                                            dispatch({
                                                type: 'ADD_INSTALLATION',
                                                payload: { name: name, country: 'KAZ' }
                                            });
                                        }
                                        setShowInstallations(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-xs text-blue-400 hover:bg-slate-700/50 rounded-md transition-colors font-medium"
                                >
                                    + {t('ui.sidebar.createNewInstallation') || 'Create New Installation'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
}

// Export the collapsed state width for App.jsx
export function useSidebarWidth() {
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
    });

    useEffect(() => {
        const handler = () => {
            try { setCollapsed(localStorage.getItem(STORAGE_KEY) === 'true'); } catch { }
        };
        window.addEventListener('storage', handler);
        // Also listen for custom event from same tab
        window.addEventListener('sidebar-toggle', handler);
        return () => {
            window.removeEventListener('storage', handler);
            window.removeEventListener('sidebar-toggle', handler);
        };
    }, []);

    return collapsed ? 64 : 240;
}

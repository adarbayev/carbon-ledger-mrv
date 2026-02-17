import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, LayoutDashboard, Factory, Zap, PieChart, BarChart3, Settings, ClipboardList, ShieldCheck, FileOutput, FileText } from 'lucide-react';
import clsx from 'clsx';

export default function Sidebar() {
    const { state, dispatch } = useApp();

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'boundaries', label: 'Boundaries', icon: LayoutDashboard },
        { id: 'processes', label: 'Processes', icon: Factory },
        { id: 'activity', label: 'Activity', icon: Zap },
        { id: 'allocation', label: 'Allocation', icon: PieChart },
        { id: 'results', label: 'Results', icon: BarChart3 },
        { id: 'audit', label: 'Audit Trail', icon: ClipboardList },
        { id: 'qa', label: 'QA Checks', icon: ShieldCheck },
        { id: 'export', label: 'Export', icon: FileOutput },
        { id: 'report', label: 'Report', icon: FileText },
    ];

    return (
        <aside className="w-[260px] bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-20 shadow-xl">
            {/* Brand */}
            <div className="h-[70px] flex items-center px-6 border-b border-slate-800/50 bg-gradient-to-r from-slate-900 to-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                        CL
                    </div>
                    <span className="font-bold text-white tracking-tight">Carbon Ledger</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = state.activeTab === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => dispatch({ type: 'SET_TAB', payload: item.id })}
                            className={clsx(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                isActive
                                    ? "text-white bg-blue-600 shadow-lg shadow-blue-500/25"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                            )}
                        >
                            {/* Active indicator line */}
                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400" />}

                            <Icon size={18} className={clsx(isActive ? "text-cyan-200" : "group-hover:text-cyan-400 transition-colors")} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* User / Meta */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                        US
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">Demo User</p>
                        <p className="text-[10px] text-slate-500 truncate">{state.meta.installationName}</p>
                    </div>
                    <Settings size={14} className="text-slate-500 cursor-pointer hover:text-white" />
                </div>
            </div>
        </aside>
    );
}

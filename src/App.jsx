import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { LanguageProvider as GlobalLanguageProvider } from './context/LanguageContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Save, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

// Components
import Sidebar, { useSidebarWidth } from './components/Sidebar';

// Views
import BoundariesView from './views/BoundariesView';
import ActivityView from './views/ActivityView';
import AllocationView from './views/AllocationView';
import ResultsView from './views/ResultsView';
import AuditTrailView from './views/AuditTrailView';
import QADashboardView from './views/QADashboardView';
import DashboardView from './views/DashboardView';

import ExportView from './views/ExportView';
import ReportView from './views/ReportView';
import SettingsView from './views/SettingsView';
import './styles/print.css';



function App() {
  const { state, dispatch, save, reset } = useApp();
  const [toast, setToast] = useState(null);
  const sidebarWidth = useSidebarWidth();

  // Helper for Toasts
  const showToast = (msg, type = 'neutral') => {
    const id = Date.now();
    setToast({ id, msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    save();
    showToast('Changes saved successfully', 'success');
  };

  const handleReset = () => {
    reset();
  };

  // Keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [save]);

  // Tab Rendering
  const renderView = () => {
    switch (state.activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'boundaries': return <BoundariesView />;
      case 'processes': return <BoundariesView />;  /* legacy: redirect to boundaries */
      case 'activity': return <ActivityView />;
      case 'allocation': return <AllocationView />;
      case 'results': return <ResultsView />;
      case 'audit': return <AuditTrailView />;
      case 'qa': return <QADashboardView />;
      case 'export': return <ExportView />;
      case 'report': return <ReportView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <GlobalLanguageProvider>
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium border ${toast.type === 'success'
                ? 'bg-white text-emerald-700 border-emerald-100 shadow-emerald-500/10'
                : 'bg-white text-slate-700 border-slate-200'
                }`}
            >
              {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-500" />}
              {toast.type === 'neutral' && <AlertCircle size={18} className="text-blue-500" />}
              <span>{toast.msg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-y-auto transition-all duration-300"
          style={{ marginLeft: sidebarWidth }}>

          {/* Top Header */}
          <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-10 flex items-center justify-between px-6">
            <div className="flex items-center gap-5">
              <h2 className="text-sm font-medium text-slate-500 capitalize flex items-center gap-1.5">
                <span className="text-slate-300">/</span>
                {state.activeTab}
              </h2>
            </div>

            <div className="flex items-center gap-3">

              {state.isDirty && (
                <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                  Unsaved
                </span>
              )}

              <div className="h-5 w-px bg-slate-200 mx-1"></div>

              <button
                onClick={handleReset}
                className="btn-ghost btn-sm text-xs"
              >
                <RefreshCw size={14} />
                <span>Reset</span>
              </button>
              <button
                onClick={handleSave}
                className="btn-primary btn-sm"
              >
                <Save size={14} />
                <span>Save</span>
              </button>
            </div>
          </header>

          {/* View Content */}
          <div className="p-6 max-w-7xl mx-auto w-full">
            <motion.div
              key={state.activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {renderView()}
            </motion.div>
          </div>

        </main>
      </div>
    </GlobalLanguageProvider>
  );
}

export default App;

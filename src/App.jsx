import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Save, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

// Components
import Sidebar from './components/Sidebar';

// Views
import BoundariesView from './views/BoundariesView';
import ProcessesView from './views/ProcessesView';
import ActivityView from './views/ActivityView';
import AllocationView from './views/AllocationView';
import ResultsView from './views/ResultsView';

// --- Completeness Indicator Component ---
const CompletenessIndicator = () => {
  const { state } = useApp();

  // Check for data validity
  const hasInstallation = !!state.meta.installationName && !!state.meta.country;
  const hasProcess = state.processes.length > 0;
  const hasActivity = state.activity.fuels.length > 0 || state.activity.electricity.length > 0;
  const hasProducts = state.products.length > 0 && state.products.every(p => !!p.cnCode);
  // Basic check: mass balance error < 5%? For now just check availability.
  const hasAllocation = state.products.length > 0;

  const steps = [
    { label: "Installation details", done: hasInstallation, tab: "boundaries", hint: "Set installation name & country" },
    { label: "Processes defined", done: hasProcess, tab: "processes", hint: "Add at least one process" },
    { label: "Activity data entered", done: hasActivity, tab: "activity", hint: "Enter fuel or electricity data" },
    { label: "Products with CN codes", done: hasProducts, tab: "allocation", hint: "Add products and assign CN codes" },
    { label: "Allocation configured", done: hasAllocation, tab: "allocation", hint: "Configure product allocation" },
  ];

  const completed = steps.filter(s => s.done).length;
  const total = steps.length;
  const progress = Math.round((completed / total) * 100);
  const isComplete = progress === 100;

  // Color based on progress
  const colorClass = isComplete
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : "text-blue-700 bg-blue-50 border-blue-200";

  return (
    <div className="relative group">
      <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full border ${colorClass} text-sm font-medium transition-colors duration-300 cursor-help`}>
        <div className="relative w-5 h-5 flex items-center justify-center">
          {/* Background Circle */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className={isComplete ? "text-emerald-200" : "text-blue-200"}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />
            {/* Progress Circle */}
            <path
              className={isComplete ? "text-emerald-500" : "text-blue-500"}
              strokeDasharray={`${progress}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />
          </svg>
        </div>
        <span className="tabular-nums">{completed}/{total}</span>
        <div className={`h-4 w-px mx-1 ${isComplete ? "bg-emerald-200" : "bg-blue-200"}`}></div>
        <span className="hidden sm:inline-block">Completeness</span>
      </div>

      {/* Hover Tooltip */}
      <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
        <div className="text-xs font-semibold text-slate-600 mb-2">
          {isComplete ? '✓ All steps complete' : `${total - completed} step${total - completed > 1 ? 's' : ''} remaining`}
        </div>
        <div className="space-y-1.5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={s.done ? "text-emerald-500" : "text-slate-300"}>{s.done ? '✓' : '○'}</span>
              <div>
                <span className={s.done ? "text-slate-400 line-through" : "text-slate-700 font-medium"}>{s.label}</span>
                {!s.done && <div className="text-[10px] text-slate-400 mt-0.5">{s.hint}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function App() {
  const { state, dispatch, save, reset } = useApp();
  const [toast, setToast] = useState(null);

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
      case 'boundaries': return <BoundariesView />;
      case 'processes': return <ProcessesView />;
      case 'activity': return <ActivityView />;
      case 'allocation': return <AllocationView />;
      case 'results': return <ResultsView />;
      default: return <div className="text-center p-10 text-slate-400">View not found</div>;
    }
  };

  return (
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
      <main className="flex-1 ml-[260px] flex flex-col h-screen overflow-y-auto transition-all duration-300">

        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-semibold text-slate-800 capitalize flex items-center gap-2">
              <span className="text-slate-400 font-normal">Dashboard / </span>
              {state.activeTab}
            </h2>

            <CompletenessIndicator />
          </div>

          <div className="flex items-center gap-4">
            {state.isDirty && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 animate-pulse">
                Unsaved Changes
              </span>
            )}

            <div className="h-6 w-px bg-slate-200 mx-2"></div>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-md hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all px-4 py-2 rounded-lg shadow-md shadow-blue-500/20 active:scale-95"
            >
              <Save size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="p-8 max-w-7xl mx-auto w-full">
          <motion.div
            key={state.activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {renderView()}
          </motion.div>
        </div>

      </main>
    </div>
  );
}

export default App;

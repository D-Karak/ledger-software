import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { Customer, LedgerEntry, ViewType } from './types';
import { LedgerTable } from './components/LedgerTable';
import { Dashboard } from './components/Dashboard';
import { CustomerManagement } from './components/CustomerManagement';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('ledger');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [envError, setEnvError] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setEnvError(false);
    try {
      const [custs, dayEntries] = await Promise.all([
        api.getCustomers(),
        api.getEntries(currentDate)
      ]);
      setCustomers(custs);
      setEntries(dayEntries);
    } catch (err: any) {
      console.error("Failed to load local data", err);
      if (err.message === "ELECTRON_MISSING" || err.toString().includes('electron')) {
        setEnvError(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveEntry = async (entry: LedgerEntry) => {
    try {
      await api.saveEntry(entry);
      const updatedEntries = await api.getEntries(currentDate);
      setEntries(updatedEntries);
    } catch (err) {
      alert("Error saving entry to local database.");
    }
  };

  // --- ERROR STATE: Not running in Electron ---
  if (envError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white p-8 text-center">
        <div className="bg-rose-500/10 p-6 rounded-2xl border border-rose-500/20 max-w-lg">
          <div className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-500/20">
            <i className="fas fa-desktop text-2xl"></i>
          </div>
          <h2 className="text-2xl font-bold mb-2">Desktop Environment Required</h2>
          <p className="text-slate-300 mb-6 leading-relaxed">
            This application uses a local SQLite database which cannot be accessed from a standard web browser.
          </p>
          <div className="bg-slate-950 p-4 rounded-lg text-left font-mono text-sm text-blue-300 border border-slate-800">
            <p className="text-slate-500 mb-2"># Please run the following in your terminal:</p>
            <p>$ npm start</p>
          </div>
        </div>
      </div>
    );
  }

  // --- LOADING STATE ---
  if (isLoading && customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-medium tracking-wide">Loading Ledger...</h2>
        <p className="text-slate-500 text-sm mt-2">Connecting to local SQLite engine</p>
      </div>
    );
  }

  const NavButton = ({ id, label }: { id: ViewType; label: string }) => (
    <button
      onClick={() => setView(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${view === id
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <span className="font-medium text-sm tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900 flex-shrink-0 flex flex-col border-r border-slate-800 relative z-20">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-10 px-2">
            <div>
              <h1 className="text-white font-bold text-lg leading-tight tracking-tight">RadhaKrishna Fish Centre</h1>
              <p className="text-xs text-slate-500 font-medium">Daily Ledger</p>
            </div>
          </div>

          <nav className="space-y-2">
            <NavButton id="ledger" label="Daily Entry" />
            <NavButton id="dashboard" label="Reports & Analysis" />
            <NavButton id="customers" label="Customer Directory" />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800/50">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
              <span className="flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-500">Local SQLite DB Connected</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {view === 'ledger' && 'Daily Transactions'}
              {view === 'dashboard' && 'Financial Dashboard'}
              {view === 'customers' && 'Customer Management'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5 font-medium">
              {view === 'ledger' && `Managing entries for ${new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
              {view === 'dashboard' && 'View summaries and print statements'}
              {view === 'customers' && 'Add, edit, or reorder ledger accounts'}
            </p>
          </div>

          {view === 'ledger' && (
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              {/* <button
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() - 1);
                  setCurrentDate(d.toISOString().split('T')[0]);
                }}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <i className="fas fa-chevron-left text-xs"></i>
              </button> */}
              <input
                type="date"
                readOnly
                value={currentDate}
                onChange={e => setCurrentDate(e.target.value)}
                className="border-none text-sm font-semibold text-slate-700 focus:ring-0 px-3 py-1 outline-none bg-transparent font-mono"
              />
              {/* <button
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() + 1);
                  setCurrentDate(d.toISOString().split('T')[0]);
                }}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <i className="fas fa-chevron-right text-xs"></i>
              </button> */}
            </div>
          )}
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6">
            {view === 'ledger' && (
              <LedgerTable
                entries={entries}
                customers={customers}
                onUpdate={loadData}
                onEntryChange={handleSaveEntry}
                isLocked={false}
              />
            )}
            {view === 'dashboard' && <Dashboard entries={entries} customers={customers} />}
            {view === 'customers' && <CustomerManagement customers={customers} onUpdate={loadData} />}
          </div>
          <div className="h-12"></div> {/* Bottom spacer */}
        </div>
      </main>
    </div>
  );
};

export default App;
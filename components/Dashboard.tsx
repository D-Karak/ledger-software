import React, { useState } from 'react';
import { LedgerEntry, Customer } from '../types';
import { api } from '../api';

interface DashboardProps {
  entries: LedgerEntry[];
  customers: Customer[];
}

type ReportView = 'customer' | 'daily';

export const Dashboard: React.FC<DashboardProps> = ({ customers }) => {
  const [reportView, setReportView] = useState<ReportView>('customer');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [historyEntries, setHistoryEntries] = useState<LedgerEntry[]>([]);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dailyEntries, setDailyEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearchCustomer = async () => {
    if (!selectedCustomerId) return;
    setIsLoading(true);
    try {
      let entries = await api.getHistory(selectedCustomerId);

      // Client-side Date Filtering
      if (startDate) {
        entries = entries.filter(e => e.date >= startDate);
      }
      if (endDate) {
        entries = entries.filter(e => e.date <= endDate);
      }

      setHistoryEntries(entries);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchDaily = async () => {
    setIsLoading(true);
    try {
      const entries = await api.getEntries(reportDate);
      setDailyEntries(entries);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in slide-in-from-bottom-4 duration-500">

      {/* Control Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 no-print">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Toggle Switch */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl self-start">
            <button
              onClick={() => setReportView('customer')}
              className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${reportView === 'customer' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Account History
            </button>
            <button
              onClick={() => setReportView('daily')}
              className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${reportView === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Daily Summary
            </button>
          </div>

          <div className="w-px bg-slate-200 hidden md:block"></div>

          {/* Filters */}
          <div className="flex-1 flex gap-4">
            {reportView === 'customer' ? (
              <>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="input-field h-11"
                  >
                    <option value="">Select Customer Account...</option>
                    {[...customers].sort((a, b) => a.orderIndex - b.orderIndex).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  {/* Date Range Inputs */}
                  <div className="flex items-center space-x-2 w-72">
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="input-field h-11 w-32 text-xs"
                      placeholder="Start Date"
                      title="Start Date (Optional)"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="input-field h-11 w-32 text-xs"
                      placeholder="End Date"
                      title="End Date (Optional)"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSearchCustomer}
                  className="btn-primary flex items-center space-x-2"
                >
                  <i className="fas fa-search"></i>
                  <span>Fetch</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <input
                    type="date"
                    value={reportDate}
                    onChange={e => setReportDate(e.target.value)}
                    className="input-field h-11 font-medium"
                  />
                </div>
                <button
                  onClick={handleSearchDaily}
                  className="btn-primary flex items-center space-x-2"
                >
                  <i className="fas fa-file-invoice"></i>
                  <span>Generate</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Report Area */}
      <div className="card overflow-hidden min-h-[500px] flex flex-col">
        {/* Table Content */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-6 py-4 text-center w-16">Sr.</th>
                <th className="px-6 py-4 text-left">{reportView === 'customer' ? 'Date' : 'Account Name'}</th>
                <th className="px-6 py-4 text-right">Opening</th>
                <th className="px-6 py-4 text-right text-rose-600">Debit (-)</th>
                <th className="px-6 py-4 text-right text-slate-500">Total</th>
                <th className="px-6 py-4 text-right text-emerald-600">Credit (+)</th>
                <th className="px-6 py-4 text-right text-slate-900 bg-slate-100/50">Closing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(reportView === 'customer' ? historyEntries : dailyEntries).map((e, idx) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                  <td className="px-6 py-3 font-semibold text-slate-700">
                    {reportView === 'customer' ? e.date : (customers.find(c => c.id === e.customerId)?.name || 'N/A')}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-500 font-mono">{e.openingBalance.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right text-rose-600 font-bold font-mono">{e.debit > 0 ? `-${e.debit.toLocaleString()}` : '-'}</td>
                  <td className="px-6 py-3 text-right text-slate-500 font-mono font-medium">{(e.openingBalance - e.debit).toLocaleString()}</td>
                  <td className="px-6 py-3 text-right text-emerald-600 font-bold font-mono">{e.credit > 0 ? `+${e.credit.toLocaleString()}` : '-'}</td>
                  <td className="px-6 py-3 text-right font-bold text-slate-900 bg-slate-50/50 font-mono">{e.closingBalance.toLocaleString()}</td>
                </tr>
              ))}

              {/* Empty State */}
              {(reportView === 'customer' ? historyEntries : dailyEntries).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-search text-xl opacity-20"></i>
                    </div>
                    <p className="font-medium">No records found for current selection</p>
                  </td>
                </tr>
              )}
            </tbody>

            {/* Footer Totals */}
            {(reportView === 'daily' && dailyEntries.length > 0) && (
              <tfoot className="bg-slate-900 text-white font-bold text-sm">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-right uppercase text-xs tracking-wider opacity-60">Total</td>
                  <td className="px-6 py-4 text-right text-slate-300 font-mono">{dailyEntries.reduce((s, e) => s + e.openingBalance, 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-rose-400 font-mono">{dailyEntries.reduce((s, e) => s + e.debit, 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-slate-400 font-mono">-</td>
                  <td className="px-6 py-4 text-right text-emerald-400 font-mono">{dailyEntries.reduce((s, e) => s + e.credit, 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-white font-mono bg-slate-800">{dailyEntries.reduce((s, e) => s + e.closingBalance, 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
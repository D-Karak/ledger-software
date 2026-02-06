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
  const [reportCurrentPage, setReportCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const ROWS_PER_PAGE = 34;

  const sortedDailyEntries = React.useMemo(() => {
    return [...dailyEntries].sort((a, b) => {
      const custA = customers.find(c => c.id === a.customerId);
      const custB = customers.find(c => c.id === b.customerId);
      return (custA?.orderIndex || 0) - (custB?.orderIndex || 0);
    });
  }, [dailyEntries, customers]);

  const totalReportPages = Math.ceil(sortedDailyEntries.length / ROWS_PER_PAGE);

  const currentReportEntries = React.useMemo(() => {
    if (reportView !== 'daily') return sortedDailyEntries;
    return sortedDailyEntries.slice(reportCurrentPage * ROWS_PER_PAGE, (reportCurrentPage + 1) * ROWS_PER_PAGE);
  }, [sortedDailyEntries, reportCurrentPage, reportView]);

  const grandTotals = React.useMemo(() => {
    return sortedDailyEntries.reduce((acc, curr) => ({
      opening: acc.opening + curr.openingBalance,
      credit: acc.credit + curr.credit,
      debit: acc.debit + curr.debit,
      closing: acc.closing + curr.closingBalance
    }), { opening: 0, credit: 0, debit: 0, closing: 0 });
  }, [sortedDailyEntries]);

  const pageTotals = React.useMemo(() => {
    return currentReportEntries.reduce((acc, curr) => ({
      opening: acc.opening + curr.openingBalance,
      credit: acc.credit + curr.credit,
      debit: acc.debit + curr.debit,
      closing: acc.closing + curr.closingBalance
    }), { opening: 0, credit: 0, debit: 0, closing: 0 });
  }, [currentReportEntries]);

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

      {reportView === 'daily' && dailyEntries.length > 0 && (
        <>
          {/* Grand Total Row */}
          <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg border border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="p-1 bg-white/10 rounded-full">
                <svg className="w-4 h-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
              <span className="font-bold text-sm tracking-wide">GRAND TOTAL</span>
            </div>

            <div className="flex items-center space-x-6 text-sm">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Opening</span>
                <span className="font-mono font-bold text-slate-100">{grandTotals.opening.toLocaleString()}</span>
              </div>

              <div className="w-px h-8 bg-slate-700"></div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] text-rose-300 uppercase font-semibold">Total Debit</span>
                <span className="font-mono font-bold text-rose-400">{grandTotals.debit.toLocaleString()}</span>
              </div>

              <div className="w-px h-8 bg-slate-700"></div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] text-emerald-300 uppercase font-semibold">Total Credit</span>
                <span className="font-mono font-bold text-emerald-400">{grandTotals.credit.toLocaleString()}</span>
              </div>

              <div className="w-px h-8 bg-slate-700"></div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] text-blue-300 uppercase font-semibold">Total Closing</span>
                <span className="font-mono font-bold text-blue-400">{grandTotals.closing.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Pagination and Page Totals */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
              {Array.from({ length: totalReportPages || 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setReportCurrentPage(i)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${reportCurrentPage === i
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  Page {i + 1}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-6 text-xs font-medium text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Total Opening: <span className="text-slate-600 font-bold ml-1">{pageTotals.opening.toLocaleString()}</span></span>
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Total Debit: <span className="text-rose-700 font-bold ml-1">{pageTotals.debit.toLocaleString()}</span></span>
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Total Credit: <span className="text-emerald-700 font-bold ml-1">{pageTotals.credit.toLocaleString()}</span></span>
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                <span>Total Closing: <span className="text-slate-900 font-bold ml-1">{pageTotals.closing.toLocaleString()}</span></span>
              </div>
            </div>
          </div>
        </>
      )}

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
              {(reportView === 'customer' ? historyEntries : currentReportEntries).map((e, idx) => {
                const srNo = reportView === 'daily' ? (reportCurrentPage * ROWS_PER_PAGE + idx + 1) : (idx + 1);
                return (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-center text-slate-400 font-mono text-xs">{srNo}</td>
                    <td className="px-6 py-3 font-semibold text-slate-700">
                      {reportView === 'customer' ? e.date : (customers.find(c => c.id === e.customerId)?.name || 'N/A')}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-500 font-mono">{e.openingBalance.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-rose-600 font-bold font-mono">{e.debit > 0 ? `-${e.debit.toLocaleString()}` : '-'}</td>
                    <td className="px-6 py-3 text-right text-slate-500 font-mono font-medium">{(e.openingBalance - e.debit).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-emerald-600 font-bold font-mono">{e.credit > 0 ? `+${e.credit.toLocaleString()}` : '-'}</td>
                    <td className="px-6 py-3 text-right font-bold text-slate-900 bg-slate-50/50 font-mono">{e.closingBalance.toLocaleString()}</td>
                  </tr>
                )
              })}

              {/* Empty State */}
              {(reportView === 'customer' ? historyEntries : currentReportEntries).length === 0 && (
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

            {/* Footer Totals (Removed as requested, redundant with top totals) */}
          </table>
        </div>
      </div>
    </div >
  );
};
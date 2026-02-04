import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, LedgerEntry } from '../types';

interface LedgerTableProps {
  entries: LedgerEntry[];
  customers: Customer[];
  onUpdate: () => void;
  onEntryChange: (entry: LedgerEntry) => Promise<void>;
  isLocked: boolean;
}

const ROWS_PER_PAGE = 34;

export const LedgerTable: React.FC<LedgerTableProps> = ({ entries, customers, onEntryChange, isLocked }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [localEntries, setLocalEntries] = useState<LedgerEntry[]>([]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);

  const customerMap = useMemo(() => {
    return customers.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {} as Record<string, string>);
  }, [customers]);

  const sortedEntries = useMemo(() => {
    return [...localEntries].sort((a, b) => {
      const custA = customers.find(c => c.id === a.customerId);
      const custB = customers.find(c => c.id === b.customerId);
      return (custA?.orderIndex || 0) - (custB?.orderIndex || 0);
    });
  }, [localEntries, customers]);

  const totalPages = Math.ceil(sortedEntries.length / ROWS_PER_PAGE);
  const currentEntries = sortedEntries.slice(currentPage * ROWS_PER_PAGE, (currentPage + 1) * ROWS_PER_PAGE);

  const handleValueChange = (entryId: string, field: 'credit' | 'debit', value: number) => {
    const updated = localEntries.map(e => {
      if (e.id === entryId) {
        const newEntry = { ...e, [field]: value };
        // Logic Switched: Debit Adds, Credit Subtracts
        newEntry.closingBalance = newEntry.openingBalance - newEntry.debit + newEntry.credit;
        return newEntry;
      }
      return e;
    });
    setLocalEntries(updated);
  };

  const handleBlur = async (entry: LedgerEntry) => {
    if (isLocked) return;
    await onEntryChange(entry);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextId = `${currentEntries[index + 1]?.id}_${field}`;
      inputRefs.current[nextId]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevId = `${currentEntries[index - 1]?.id}_${field}`;
      inputRefs.current[prevId]?.focus();
    }
  };

  // Grand totals for the visible page
  const pageTotals = useMemo(() => {
    return currentEntries.reduce((acc, curr) => ({
      credit: acc.credit + curr.credit,
      debit: acc.debit + curr.debit
    }), { credit: 0, debit: 0 });
  }, [currentEntries]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          {Array.from({ length: totalPages || 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${currentPage === i
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
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Total Credit: <span className="text-emerald-700 font-bold ml-1">{pageTotals.credit.toLocaleString()}</span></span>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Total Debit: <span className="text-rose-700 font-bold ml-1">{pageTotals.debit.toLocaleString()}</span></span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden ring-1 ring-slate-900/5">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-center w-12 text-xs font-bold text-slate-400 uppercase tracking-wider border-r border-slate-200">No.</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Name</th>
              <th className="px-4 py-3 text-right w-32 text-xs font-bold text-slate-400 uppercase tracking-wider">Opening</th>
              <th className="px-4 py-3 text-right w-32 text-xs font-bold text-rose-600 uppercase tracking-wider bg-rose-50/50 border-l border-rose-100">Debit (-)</th>
              <th className="px-4 py-3 text-right w-32 text-xs font-bold text-slate-400 uppercase tracking-wider border-l border-slate-100">Total</th>
              <th className="px-4 py-3 text-right w-32 text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50/50 border-l border-emerald-100">Credit (+)</th>
              <th className="px-4 py-3 text-right w-32 text-xs font-bold text-slate-800 uppercase tracking-wider bg-slate-100/50 border-l border-slate-200">Closing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentEntries.map((entry, idx) => {
              const srNo = currentPage * ROWS_PER_PAGE + idx + 1;
              return (
                <tr key={entry.id} className="group hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-2.5 text-center text-slate-400 font-mono text-xs border-r border-slate-100 bg-slate-50/30 group-hover:bg-blue-50/30">{srNo}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">{customerMap[entry.customerId]}</td>
                  <td className="px-4 py-2.5 text-right text-slate-400 font-mono text-xs">{entry.openingBalance.toLocaleString()}</td>

                  {/* Debit Input (Now First) */}
                  <td className="p-1 border-l border-slate-100 bg-rose-50/10 group-hover:bg-rose-50/30">
                    <input
                      ref={el => { inputRefs.current[`${entry.id}_debit`] = el; }}
                      type="number"
                      disabled={isLocked}
                      className="w-full h-full text-right px-3 py-1.5 rounded bg-transparent font-bold text-rose-600 focus:bg-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all placeholder-transparent"
                      placeholder="0"
                      value={entry.debit || ''}
                      onChange={e => handleValueChange(entry.id, 'debit', Number(e.target.value))}
                      onBlur={() => handleBlur(entry)}
                      onKeyDown={e => handleKeyDown(e, idx, 'debit')}
                    />
                  </td>

                  {/* Running Total (Opening - Debit) */}
                  <td className="px-4 py-2.5 text-right text-slate-500 font-mono text-xs border-l border-slate-100 bg-slate-50/20">
                    {(entry.openingBalance - entry.debit).toLocaleString()}
                  </td>

                  {/* Credit Input (Now Second) */}
                  <td className="p-1 border-l border-slate-100 bg-emerald-50/10 group-hover:bg-emerald-50/30">
                    <input
                      ref={el => { inputRefs.current[`${entry.id}_credit`] = el; }}
                      type="number"
                      disabled={isLocked}
                      className="w-full h-full text-right px-3 py-1.5 rounded bg-transparent font-bold text-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-transparent"
                      placeholder="0"
                      value={entry.credit || ''}
                      onChange={e => handleValueChange(entry.id, 'credit', Number(e.target.value))}
                      onBlur={() => handleBlur(entry)}
                      onKeyDown={e => handleKeyDown(e, idx, 'credit')}
                    />
                  </td>

                  {/* Closing Balance */}
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900 border-l border-slate-200 bg-slate-50 group-hover:bg-slate-100 transition-colors font-mono">
                    {entry.closingBalance.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
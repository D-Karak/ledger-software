import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { api } from '../api';

interface CustomerManagementProps {
  customers: Customer[];
  onUpdate: () => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, onUpdate }) => {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([]);

  // Keep localCustomers in sync with prop for DND sorting
  useEffect(() => {
    setLocalCustomers([...customers].sort((a, b) => a.orderIndex - b.orderIndex));
  }, [customers]);

  const handleEdit = (customer: Customer) => {
    setEditingCustomer({ ...customer });
    setIsAdding(false);
  };

  const handleAdd = () => {
    const nextId = `cust_${Date.now()}`;
    setEditingCustomer({
      id: nextId,
      name: '',
      active: true,
      orderIndex: customers.length,
      initialBalance: 0
    });
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!editingCustomer) return;

    const action = isAdding ? 'add' : 'update';
    const confirmMsg = action === 'add'
      ? `Are you sure you want to add "${editingCustomer.name}"?`
      : `Are you sure you want to save changes to "${editingCustomer.name}"?`;

    if (confirm(confirmMsg)) {
      setIsSaving(true);
      try {
        await api.saveCustomer(editingCustomer);
        setEditingCustomer(null);
        setIsAdding(false);
        onUpdate();
      } catch (error) {
        console.error("Failed to save customer:", error);
        alert("An error occurred while saving.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (confirm(`Are you sure you want to PERMANENTLY delete "${customer.name}"? This will not delete ledger history but the customer will be removed from the list.`)) {
      try {
        await api.deleteCustomer(customer.id);
        onUpdate();
      } catch (error) {
        console.error("Failed to delete customer:", error);
        alert("An error occurred while deleting.");
      }
    }
  };

  const handleCancel = () => {
    setEditingCustomer(null);
    setIsAdding(false);
  };

  // Drag and Drop Logic
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const items = [...localCustomers];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setLocalCustomers(items);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    // Update indices in DB
    const updates = localCustomers.map((c, i) => ({ ...c, orderIndex: i }));
    try {
      for (const update of updates) {
        await api.saveCustomer(update);
      }
      onUpdate();
    } catch (error) {
      console.error("Failed to save reordered list:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Customer Directory</h3>
          <p className="text-sm text-slate-500">Manage names and active status of your {customers.length} ledger participants. Drag rows to reorder.</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-blue-200"
        >
          <span>Add New Customer</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 w-12 text-center"><span className="bg-blue-600 h-2 w-2 rounded-full" /></th>
              <th className="px-4 py-3 w-16 text-center">Sr.</th>
              <th className="px-4 py-3">Customer Name</th>
              <th className="px-4 py-3 text-right">Init. Balance</th>
              <th className="px-4 py-3 w-32 text-center">Status</th>
              <th className="px-4 py-3 w-32 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {localCustomers.map((c, idx) => (
              <tr
                key={c.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`border-b last:border-0 hover:bg-slate-50 transition-colors cursor-default ${draggedIndex === idx ? 'opacity-50 bg-blue-50' : ''}`}
              >
                <td className="px-4 py-3 text-center cursor-move text-slate-300 hover:text-slate-500">
                  <span className="bg-blue-600 h-2 w-2 rounded-full" />
                </td>
                <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{c.name}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-500">
                  {c.initialBalance?.toLocaleString() || '0'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <button
                      onClick={() => handleEdit(c)}
                      className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Edit Customer"
                    >
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Remove Customer"
                    >
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit/Add Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">{isAdding ? 'New Customer' : 'Edit Customer'}</h3>
              <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={editingCustomer.name}
                  onChange={e => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  placeholder="Enter full name"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Initial Opening Balance</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={editingCustomer.initialBalance || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, initialBalance: Number(e.target.value) })}
                  placeholder="Starting amount (e.g. 5000)"
                />
                <p className="text-[10px] text-slate-400 mt-1 italic">Note: This only sets the starting balance for the customer's very first day in the ledger.</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Account Status</h4>
                  <p className="text-xs text-slate-500">Visible in daily ledger entry pages.</p>
                </div>
                <button
                  onClick={() => setEditingCustomer({ ...editingCustomer, active: !editingCustomer.active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${editingCustomer.active ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editingCustomer.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex space-x-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editingCustomer.name.trim()}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
              >
                {isSaving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
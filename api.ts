import { Customer, LedgerEntry } from './types';

// Declare the window interface extension for TypeScript
declare global {
  interface Window {
    electron?: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

// Helper to safely access Electron IPC
const ipc = () => {
  if (typeof window !== 'undefined' && window.electron) {
    return window.electron;
  }
  // Throw a specific error code we can catch in the UI
  throw new Error("ELECTRON_MISSING");
};

export const api = {
  async getCustomers(): Promise<Customer[]> {
    return ipc().invoke('get-customers');
  },

  async saveCustomer(customer: Customer): Promise<void> {
    await ipc().invoke('save-customer', customer);
  },

  async deleteCustomer(id: string): Promise<void> {
    await ipc().invoke('delete-customer', id);
  },

  async getEntries(date: string): Promise<LedgerEntry[]> {
    return ipc().invoke('get-entries', date);
  },

  async getHistory(customerId: string): Promise<LedgerEntry[]> {
    return ipc().invoke('get-history', customerId);
  },

  async saveEntry(entry: LedgerEntry): Promise<void> {
    await ipc().invoke('save-entry', entry);
  },

  async checkHealth(): Promise<boolean> {
    try {
      // Just check if IPC exists
      ipc();
      return true;
    } catch {
      return false;
    }
  }
};
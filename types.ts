export interface Customer {
  id: string;
  name: string;
  active: boolean;
  orderIndex: number;
  initialBalance: number; // The very first opening balance
}

export interface LedgerEntry {
  id: string; // customerId_date
  customerId: string;
  date: string; // YYYY-MM-DD
  openingBalance: number;
  credit: number;
  debit: number;
  closingBalance: number;
}

export type ViewType = 'ledger' | 'dashboard' | 'customers';
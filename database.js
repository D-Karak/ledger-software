const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const { app } = require('electron');

// Determine DB location:
// - Dev: 'data' folder in project root
// - Prod: 'data' folder next to the executable (Portable)
const dbFolder = app.isPackaged
  ? path.join(path.dirname(app.getPath('exe')), 'data')
  : path.join(__dirname, 'data');

if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}
const dbPath = path.join(dbFolder, 'radhakrishna_local.db');
const db = new Database(dbPath);

// Enable WAL mode for performance and safety
db.pragma('journal_mode = WAL');

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    active INTEGER,
    orderIndex INTEGER,
    initialBalance REAL
  );

  CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    date TEXT,
    openingBalance REAL,
    credit REAL,
    debit REAL,
    closingBalance REAL
  );

  CREATE INDEX IF NOT EXISTS idx_entries_date ON ledger_entries(date);
  CREATE INDEX IF NOT EXISTS idx_entries_customer ON ledger_entries(customerId);
  CREATE INDEX IF NOT EXISTS idx_entries_cust_date ON ledger_entries(customerId, date);
`);

const api = {
  getCustomers: () => {
    const stmt = db.prepare('SELECT * FROM customers ORDER BY orderIndex ASC');
    const rows = stmt.all();
    return rows.map(r => ({ ...r, active: Boolean(r.active) }));
  },

  saveCustomer: (customer) => {
    const stmt = db.prepare(`
      INSERT INTO customers (id, name, active, orderIndex, initialBalance)
      VALUES (@id, @name, @active, @orderIndex, @initialBalance)
      ON CONFLICT(id) DO UPDATE SET
      name=@name, active=@active, orderIndex=@orderIndex, initialBalance=@initialBalance
    `);
    return stmt.run({ ...customer, active: customer.active ? 1 : 0 });
  },

  deleteCustomer: (id) => {
    const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
    return stmt.run(id);
  },

  getEntries: (date) => {
    // Transaction ensures we atomically initialize missing daily entries
    const tx = db.transaction(() => {
      const activeCustomers = db.prepare('SELECT * FROM customers WHERE active = 1 ORDER BY orderIndex ASC').all();
      const existingEntries = db.prepare('SELECT * FROM ledger_entries WHERE date = ?').all(date);

      const result = [];

      for (const customer of activeCustomers) {
        let entry = existingEntries.find(e => e.customerId === customer.id);

        if (!entry) {
          // Find last entry before this date to get opening balance
          const lastEntry = db.prepare(`
            SELECT closingBalance FROM ledger_entries 
            WHERE customerId = ? AND date < ? 
            ORDER BY date DESC LIMIT 1
          `).get(customer.id, date);

          const opening = lastEntry ? lastEntry.closingBalance : (customer.initialBalance || 0);

          entry = {
            id: `${customer.id}_${date}`,
            customerId: customer.id,
            date: date,
            openingBalance: opening,
            credit: 0,
            debit: 0,
            closingBalance: opening
          };

          db.prepare(`
            INSERT INTO ledger_entries (id, customerId, date, openingBalance, credit, debit, closingBalance)
            VALUES (@id, @customerId, @date, @openingBalance, @credit, @debit, @closingBalance)
          `).run(entry);
        }
        result.push(entry);
      }
      return result;
    });

    return tx();
  },

  getHistory: (customerId) => {
    return db.prepare('SELECT * FROM ledger_entries WHERE customerId = ? ORDER BY date ASC').all(customerId);
  },

  saveEntry: (entryData) => {
    // Complex Transaction: Update current -> Recalculate Future
    const tx = db.transaction((data) => {
      // 1. Get current state to ensure data integrity
      const current = db.prepare('SELECT openingBalance FROM ledger_entries WHERE id = ?').get(data.id);
      if (!current) throw new Error('Entry missing');

      const newClosing = current.openingBalance - data.debit + data.credit;

      // 2. Update the target entry
      db.prepare(`
        UPDATE ledger_entries 
        SET credit = @credit, debit = @debit, closingBalance = @closingBalance
        WHERE id = @id
      `).run({ ...data, closingBalance: newClosing });

      // 3. Forward Chaining: Find all future entries for this customer
      const futureEntries = db.prepare(`
        SELECT * FROM ledger_entries 
        WHERE customerId = ? AND date > ? 
        ORDER BY date ASC
      `).all(data.customerId, data.date);

      let runningOpening = newClosing;

      // 4. Update each future entry
      const updateStmt = db.prepare(`
        UPDATE ledger_entries 
        SET openingBalance = @op, closingBalance = @cl 
        WHERE id = @id
      `);

      for (const nextEntry of futureEntries) {
        const updatedClosing = runningOpening - nextEntry.debit + nextEntry.credit;
        updateStmt.run({
          op: runningOpening,
          cl: updatedClosing,
          id: nextEntry.id
        });
        runningOpening = updatedClosing;
      }
    });

    return tx(entryData);
  }
};

module.exports = api;
# RadhaKrishna Fish Centre - Digital Daily Ledger

A professional, offline-first desktop application designed for efficient daily accounting and customer ledger management. Built specifically for RadhaKrishna Fish Centre to replace manual paper records with a secure digital solution.

## Key Features

* **Daily Entry Ledger**:
  * Streamlined interface for daily debit (debt) and credit (payment) text entries.
  * Automatic balance calculations (Opening Balance + Debit - Credit = Closing Balance).
  * Real-time updates.
* **Customer Management**:
  * Maintain a digital directory of all customers.
  * Set initial balances and manage account status.
  * Custom ordering for ease of access.
* **Financial Dashboard**:
  * **Account History**: View detailed transaction history for any specific customer.
  * **Daily Summary**: Get a snapshot of total business done on any specific date.
  * **Date Filtering**: Filter reports by custom date ranges.
* **Secure & Offline**:
  * **100% Local**: Uses an embedded SQLite database (`radhakrishna_local.db`).
  * **Data Privacy**: No cloud dependencies; your financial data never leaves your machine.
  * **Reliable**: Works perfectly without an internet connection.

## Technology Stack

* **Runtime**: Electron (Desktop environment)
* **Frontend**: React + TypeScript
* **Styling**: Tailwind CSS
* **Database**: SQLite (via `better-sqlite3`)
* **Build Tool**: Vite

## Getting Started (Development)

To run this application locally for development purposes:

1. **Install Dependencies**:

   ```bash
   npm install
   ```

   *Note: You may need to rebuild native modules for Electron.*

   ```bash
   npm run rebuild
   ```
2. **Start the Application**:

   ```bash
   npm run dev   # Starts the Vite dev server
   # In a separate terminal:
   npm start     # Launches the Electron window
   ```

## Building for Production

To create a standalone Windows executable (`.exe`):

```bash
npm run dist
```

The output file (setup or portable exe) will be generated in the `release/` directory.

## Project Structure

* `/`: React source code (components, styles, types).
* `database.js`: Backend logic and SQLite integration.
* `main.js`: Electron main process configuration.
* `data/`: Location of the local database file (in development).

---

**Developed for RadhaKrishna Fish Centre**

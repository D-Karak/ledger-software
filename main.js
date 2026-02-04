const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: "RadhaKrishna Ledger",
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  });

  // In production (npm start), load the built index.html
  // In development, you could load localhost:5173 if you set up a watcher
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

// --- IPC HANDLERS ---
ipcMain.handle('get-customers', () => db.getCustomers());
ipcMain.handle('save-customer', (event, customer) => db.saveCustomer(customer));
ipcMain.handle('delete-customer', (event, id) => db.deleteCustomer(id));
ipcMain.handle('get-entries', (event, date) => db.getEntries(date));
ipcMain.handle('get-history', (event, customerId) => db.getHistory(customerId));
ipcMain.handle('save-entry', (event, entry) => db.saveEntry(entry));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
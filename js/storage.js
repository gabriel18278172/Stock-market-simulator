/**
 * storage.js — Enhanced localStorage persistence layer with versioning & export
 */

const AppStorage = {
  VERSION: 2,
  KEYS: {
    PORTFOLIO: 'sms_portfolio',
    CASH: 'sms_cash',
    TRANSACTIONS: 'sms_transactions',
    WATCHLIST: 'sms_watchlist',
    PRICE_HISTORY: 'sms_price_history',
    PORTFOLIO_HISTORY: 'sms_portfolio_history',
    STATS: 'sms_stats',
    SETTINGS: 'sms_settings',
    VERSION: 'sms_version',
  },

  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('[Storage] Failed to save key:', key, e);
      // If quota exceeded, try to free space
      if (e.name === 'QuotaExceededError') {
        this._freeSpace();
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch (_) {
          console.error('[Storage] Still cannot save after freeing space:', key);
        }
      }
    }
  },

  load(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[Storage] Failed to load key:', key, e);
      return defaultValue;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[Storage] Failed to remove key:', key, e);
    }
  },

  clear() {
    Object.values(this.KEYS).forEach(k => this.remove(k));
  },

  /* ── Version check ──────────────────────────────────────────────── */

  checkVersion() {
    const stored = this.load(this.KEYS.VERSION, 0);
    if (stored < this.VERSION) {
      console.info(`[Storage] Upgrading from v${stored} to v${this.VERSION}`);
      this.save(this.KEYS.VERSION, this.VERSION);
    }
    return stored;
  },

  /* ── Settings ───────────────────────────────────────────────────── */

  getSettings() {
    return this.load(this.KEYS.SETTINGS, {
      theme: 'dark',
      simSpeed: 1,
      notifications: true,
      soundEnabled: false,
    });
  },

  saveSettings(settings) {
    this.save(this.KEYS.SETTINGS, settings);
  },

  /* ── Export / Import ────────────────────────────────────────────── */

  exportAll() {
    const data = {};
    Object.entries(this.KEYS).forEach(([name, key]) => {
      data[name] = this.load(key);
    });
    data._exportDate = new Date().toISOString();
    data._version = this.VERSION;
    return JSON.stringify(data, null, 2);
  },

  importAll(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Invalid data format.' };
      }
      Object.entries(this.KEYS).forEach(([name, key]) => {
        if (data[name] !== undefined) {
          this.save(key, data[name]);
        }
      });
      return { success: true, message: 'Portfolio data imported successfully!' };
    } catch (e) {
      return { success: false, message: 'Failed to parse import data: ' + e.message };
    }
  },

  /* ── CSV Export ─────────────────────────────────────────────────── */

  transactionsToCSV(transactions) {
    if (!transactions || transactions.length === 0) return '';
    const headers = ['Date', 'Type', 'Ticker', 'Name', 'Amount ($)', 'Price ($)', 'Shares', 'Realised G/L ($)'];
    const rows = transactions.map(t => [
      new Date(t.date).toISOString(),
      t.type,
      t.ticker,
      `"${(t.name || '').replace(/"/g, '""')}"`,
      (t.amount || 0).toFixed(2),
      (t.price || 0).toFixed(4),
      (t.shares || 0).toFixed(6),
      t.gain !== null && t.gain !== undefined ? t.gain.toFixed(2) : '',
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || 'stocksim_transactions.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  },

  /* ── Space management ───────────────────────────────────────────── */

  _freeSpace() {
    // Trim price history to last 200 entries per stock
    const hist = this.load(this.KEYS.PRICE_HISTORY, {});
    if (hist && typeof hist === 'object') {
      Object.keys(hist).forEach(ticker => {
        if (Array.isArray(hist[ticker]) && hist[ticker].length > 200) {
          hist[ticker] = hist[ticker].slice(-200);
        }
      });
      this.save(this.KEYS.PRICE_HISTORY, hist);
    }
  },

  getStorageUsage() {
    let total = 0;
    Object.values(this.KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) total += item.length * 2; // approximate bytes (UTF-16)
    });
    return {
      bytes: total,
      formatted: total < 1024 ? total + ' B' : (total / 1024).toFixed(1) + ' KB',
    };
  },
};
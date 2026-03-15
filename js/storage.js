/**
 * storage.js — localStorage persistence layer
 */

const AppStorage = {
  KEYS: {
    PORTFOLIO: 'sms_portfolio',
    CASH: 'sms_cash',
    TRANSACTIONS: 'sms_transactions',
    WATCHLIST: 'sms_watchlist',
    PRICE_HISTORY: 'sms_price_history',
    PORTFOLIO_HISTORY: 'sms_portfolio_history',
    STATS: 'sms_stats',
  },

  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('[Storage] Failed to save key:', key, e);
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
};

/**
 * app.js — Main application entry point
 */

(function () {
  const PRICE_INTERVAL_MS = 2000;
  const SNAPSHOT_EVERY = 10; // snapshots every 10 price updates
  let tickCount = 0;

  const stocks = Market.STOCKS;
  let priceHistory = {};
  let watchlist = [];

  /* ── Initialise ──────────────────────────────────────────────────────────── */

  function init() {
    // 1. Portfolio
    Portfolio.init();

    // 2. Price history
    const savedHistory = AppStorage.load(AppStorage.KEYS.PRICE_HISTORY, null);
    if (savedHistory && Object.keys(savedHistory).length === stocks.length) {
      priceHistory = savedHistory;
      // Sync current prices from latest history entry
      stocks.forEach(stock => {
        const entries = priceHistory[stock.ticker];
        if (entries && entries.length) {
          stock.price = entries[entries.length - 1].price;
        }
      });
    } else {
      priceHistory = Market.initPriceHistory();
      AppStorage.save(AppStorage.KEYS.PRICE_HISTORY, priceHistory);
    }

    // 3. Watchlist
    watchlist = AppStorage.load(AppStorage.KEYS.WATCHLIST, []);

    // 4. Expose global app state
    window.App = {
      portfolio: Portfolio,
      stocks,
      priceHistory,
      watchlist,
      toggleWatchlist,
    };

    // 5. Wire UI events
    wireNavigation();
    wireStockModal();
    UI.wireMarketSearch();
    UI.wireHistoryFilters();
    UI.wireModalRangeBtns();
    wireResetButton();

    // 6. Initial render
    UI.navigateTo('dashboard');

    // 7. Start price simulation
    startPriceLoop();

    // 8. Start news engine
    NewsEngine.scheduleNews(stocks, onNewsEvent);
  }

  /* ── Price simulation loop ───────────────────────────────────────────────── */

  function startPriceLoop() {
    setInterval(() => {
      tickCount++;
      stocks.forEach(stock => {
        const oldPrice = stock.price;
        Market.simulatePriceUpdate(stock);
        // Append to history
        if (!priceHistory[stock.ticker]) priceHistory[stock.ticker] = [];
        priceHistory[stock.ticker].push({ time: Date.now(), price: stock.price });
        // Cap history at 500 entries per stock
        if (priceHistory[stock.ticker].length > 500) {
          priceHistory[stock.ticker] = priceHistory[stock.ticker].slice(-500);
        }
      });

      // Update portfolio position values
      Portfolio.updatePositionValues(stocks);

      // Snapshot every N ticks
      if (tickCount % SNAPSHOT_EVERY === 0) {
        Portfolio.recordPortfolioSnapshot();
        // Persist price history periodically (every 50 ticks)
        if (tickCount % 50 === 0) {
          AppStorage.save(AppStorage.KEYS.PRICE_HISTORY, priceHistory);
        }
      }

      // Refresh current page UI
      refreshCurrentPage();
    }, PRICE_INTERVAL_MS);
  }

  function refreshCurrentPage() {
    switch (UI.currentPage) {
      case 'dashboard':
        UI.updateDashboard(Portfolio, stocks);
        break;
      case 'market':
        UI.updateMarketList(stocks, watchlist);
        break;
      case 'portfolio':
        UI.updatePortfolioView(Portfolio, stocks);
        break;
      case 'history':
        // History doesn't need live refresh
        break;
      case 'stats':
        UI.updateStatsView(Portfolio);
        break;
    }
    // If stock modal is open, refresh its price header and trade panel
    if (UI.currentStockModal) {
      const stock = stocks.find(s => s.ticker === UI.currentStockModal);
      if (stock) {
        UI._updateModalPriceHeader(stock);
        UI._updateModalTradePanel(stock);
      }
    }
  }

  /* ── News handler ────────────────────────────────────────────────────────── */

  function onNewsEvent(item) {
    // Update portfolio values since a price just changed
    Portfolio.updatePositionValues(stocks);
    UI.showToast(`📰 ${item.ticker}: ${item.headline.substring(0, 60)}…`, item.sentiment === 'negative' ? 'warning' : 'info');
    if (UI.currentPage === 'dashboard') UI._updateNewsFeed();
  }

  /* ── Watchlist ───────────────────────────────────────────────────────────── */

  function toggleWatchlist(ticker) {
    const idx = watchlist.indexOf(ticker);
    if (idx === -1) {
      watchlist.push(ticker);
      UI.showToast(`${ticker} added to watchlist.`, 'info');
    } else {
      watchlist.splice(idx, 1);
      UI.showToast(`${ticker} removed from watchlist.`, 'info');
    }
    AppStorage.save(AppStorage.KEYS.WATCHLIST, watchlist);
    // Re-render market if visible
    if (UI.currentPage === 'market') UI.updateMarketList(stocks, watchlist);
    if (UI.currentPage === 'dashboard') UI.updateDashboard(Portfolio, stocks);
  }

  /* ── Navigation wiring ───────────────────────────────────────────────────── */

  function wireNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        if (page) UI.navigateTo(page);
      });
    });
  }

  /* ── Stock modal wiring ──────────────────────────────────────────────────── */

  function wireStockModal() {
    // Close button
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', UI.closeStockModal);

    // Close on backdrop click
    const modal = document.getElementById('stock-modal');
    if (modal) {
      modal.addEventListener('click', e => {
        if (e.target === modal) UI.closeStockModal();
      });
    }

    // Confirm modal close
    const confirmModal = document.getElementById('confirm-modal');
    if (confirmModal) {
      confirmModal.addEventListener('click', e => {
        if (e.target === confirmModal) UI.closeConfirmModal();
      });
      const cancelBtn = document.getElementById('confirm-cancel');
      if (cancelBtn) cancelBtn.addEventListener('click', UI.closeConfirmModal);
    }

    // Buy button
    const buyBtn = document.getElementById('modal-buy-btn');
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        const ticker = UI.currentStockModal;
        const amountStr = document.getElementById('trade-amount').value;
        const amount = parseFloat(amountStr);
        if (!ticker || isNaN(amount) || amount <= 0) {
          UI.showToast('Please enter a valid dollar amount.', 'error');
          return;
        }
        const stock = stocks.find(s => s.ticker === ticker);
        if (!stock) return;
        const message = `Buy $${amount.toFixed(2)} of ${ticker} at ${UI.formatCurrency(stock.price)}?`;
        UI.showConfirmModal('Confirm Purchase', message, () => {
          const result = Portfolio.buy(ticker, amount, stock.price, stock);
          UI.showToast(result.message, result.success ? 'success' : 'error');
          if (result.success) {
            document.getElementById('trade-amount').value = '';
            UI._updateModalTradePanel(stock);
          }
        });
      });
    }

    // Sell button
    const sellBtn = document.getElementById('modal-sell-btn');
    if (sellBtn) {
      sellBtn.addEventListener('click', () => {
        const ticker = UI.currentStockModal;
        const amountStr = document.getElementById('trade-amount').value;
        const amount = parseFloat(amountStr);
        if (!ticker || isNaN(amount) || amount <= 0) {
          UI.showToast('Please enter a valid dollar amount.', 'error');
          return;
        }
        const stock = stocks.find(s => s.ticker === ticker);
        if (!stock) return;
        const message = `Sell $${amount.toFixed(2)} of ${ticker} at ${UI.formatCurrency(stock.price)}?`;
        UI.showConfirmModal('Confirm Sale', message, () => {
          const result = Portfolio.sell(ticker, amount, stock.price);
          UI.showToast(result.message, result.success ? 'success' : 'error');
          if (result.success) {
            document.getElementById('trade-amount').value = '';
            UI._updateModalTradePanel(stock);
          }
        });
      });
    }

    // Max buy / max sell quick buttons
    const maxBuyBtn = document.getElementById('max-buy-btn');
    if (maxBuyBtn) {
      maxBuyBtn.addEventListener('click', () => {
        document.getElementById('trade-amount').value = Portfolio.cash.toFixed(2);
      });
    }
    const maxSellBtn = document.getElementById('max-sell-btn');
    if (maxSellBtn) {
      maxSellBtn.addEventListener('click', () => {
        const ticker = UI.currentStockModal;
        if (!ticker) return;
        const pos = Portfolio.positions[ticker];
        if (pos) document.getElementById('trade-amount').value = pos.currentValue.toFixed(2);
      });
    }

    // ESC to close modals
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (document.getElementById('stock-modal').classList.contains('modal-open')) UI.closeStockModal();
        if (document.getElementById('confirm-modal').classList.contains('modal-open')) UI.closeConfirmModal();
      }
    });
  }

  /* ── Reset button ────────────────────────────────────────────────────────── */

  function wireResetButton() {
    const btn = document.getElementById('reset-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      UI.showConfirmModal(
        'Reset Simulator',
        'This will reset your portfolio to $10,000 cash and clear all history. Are you sure?',
        () => {
          Portfolio.reset();
          priceHistory = Market.initPriceHistory();
          AppStorage.save(AppStorage.KEYS.PRICE_HISTORY, priceHistory);
          window.App.priceHistory = priceHistory;
          UI.showToast('Portfolio reset to $10,000!', 'info');
          UI.navigateTo('dashboard');
        }
      );
    });
  }

  /* ── Boot ────────────────────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', init);
})();

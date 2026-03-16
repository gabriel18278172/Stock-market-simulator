/**
 * ui.js — UI updates and DOM manipulation
 */

const UI = (() => {
  let currentPage = 'dashboard';
  let currentStockModal = null;
  let _historyFilter = 'ALL';
  let _historySortField = 'date';
  let _historySortDir = -1;
  let _marketSearch = '';
  let _marketSector = 'All';
  let _stockModalRange = '3M';
  let _stockModalTab = 'chart';
  let _lastMarketFilterKey = '';

  /* ── Formatters ─────────────────────────────────────────────────────────── */

  function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
    return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPercent(pct) {
    if (pct === null || pct === undefined || isNaN(pct)) return '0.00%';
    const sign = pct >= 0 ? '+' : '';
    return sign + Number(pct).toFixed(2) + '%';
  }

  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function formatDateShort(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function _gainClass(n) { return n >= 0 ? 'positive' : 'negative'; }
  function _sectorClass(s) { return 'sector-' + (s || '').toLowerCase().replace(/\s+/g, '-'); }

  /* ── Toast notifications ────────────────────────────────────────────────── */

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-msg">${message}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      toast.classList.add('toast-hide');
      setTimeout(() => { if (toast.parentElement) toast.remove(); }, 400);
    }, 3500);
  }

  /* ── Confirm modal ──────────────────────────────────────────────────────── */

  function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    const btn = document.getElementById('confirm-ok');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => {
      closeConfirmModal();
      if (typeof onConfirm === 'function') onConfirm();
    });
    modal.classList.add('modal-open');
    document.body.classList.add('modal-active');
  }

  function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.remove('modal-open');
    document.body.classList.remove('modal-active');
  }

  /* ── Stock modal ────────────────────────────────────────────────────────── */

  function showStockModal(ticker) {
    const app = window.App;
    if (!app) return;
    const stock = app.stocks.find(s => s.ticker === ticker);
    if (!stock) return;
    currentStockModal = ticker;
    _stockModalRange = '3M';
    _stockModalTab = 'chart';

    const modal = document.getElementById('stock-modal');
    if (!modal) return;

    document.getElementById('modal-ticker').textContent = stock.ticker;
    document.getElementById('modal-company').textContent = stock.name;
    document.getElementById('modal-sector-badge').textContent = stock.sector;
    document.getElementById('modal-sector-badge').className = 'sector-badge ' + _sectorClass(stock.sector);

    _updateModalPriceHeader(stock);
    _renderModalChart(stock);
    _updateModalStats(stock);
    _updateModalTradePanel(stock);

    modal.querySelectorAll('.range-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.range === _stockModalRange);
    });
    _switchModalTab(_stockModalTab);

    modal.classList.add('modal-open');
    document.body.classList.add('modal-active');
  }

  function _updateModalPriceHeader(stock) {
    const priceEl = document.getElementById('modal-price');
    const changeEl = document.getElementById('modal-change');
    if (!priceEl || !changeEl) return;

    priceEl.textContent = formatCurrency(stock.price);
    const chg = stock.price - stock.initialPrice;
    const chgPct = (chg / stock.initialPrice) * 100;
    changeEl.textContent = `${chg >= 0 ? '+' : ''}${formatCurrency(Math.abs(chg))} (${formatPercent(chgPct)})`;
    changeEl.className = 'modal-price-change ' + _gainClass(chg);
  }

  function _renderModalChart(stock) {
    const app = window.App;
    Charts.renderPriceChart('stock-price-chart', stock, app.priceHistory, _stockModalRange);
  }

  function _updateModalStats(stock) {
    const app = window.App;
    const hist = (app.priceHistory[stock.ticker] || []);
    const prices = hist.map(e => e.price);
    const high = prices.length ? Math.max(...prices) : stock.price;
    const low = prices.length ? Math.min(...prices) : stock.price;
    const open = prices.length ? prices[0] : stock.price;
    const volume = Math.floor(Math.random() * 50000000 + 5000000);
    const mktCap = (stock.price * (Math.random() * 5e9 + 1e9)).toFixed(0);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('modal-stat-open', formatCurrency(open));
    set('modal-stat-high', formatCurrency(high));
    set('modal-stat-low', formatCurrency(low));
    set('modal-stat-volume', Number(volume).toLocaleString());
    set('modal-stat-mktcap', '$' + (mktCap / 1e9).toFixed(2) + 'B');
    set('modal-stat-description', stock.description || '');
  }

  function _updateModalTradePanel(stock) {
    const app = window.App;
    const pos = app.portfolio.positions[stock.ticker];
    const posValEl = document.getElementById('modal-position-info');
    if (posValEl) {
      if (pos) {
        const gl = pos.currentValue - pos.invested;
        const glPct = pos.invested > 0 ? (gl / pos.invested) * 100 : 0;
        posValEl.innerHTML = `
          <div class="pos-summary">
            <div class="pos-row"><span>Position Value</span><span class="pos-value">${formatCurrency(pos.currentValue)}</span></div>
            <div class="pos-row"><span>Avg Cost</span><span>${formatCurrency(pos.avgCostPrice)}</span></div>
            <div class="pos-row"><span>Shares</span><span>${pos.shares.toFixed(4)}</span></div>
            <div class="pos-row"><span>Gain/Loss</span><span class="${_gainClass(gl)}">${formatCurrency(gl)} (${formatPercent(glPct)})</span></div>
          </div>`;
      } else {
        posValEl.innerHTML = '<p class="no-position">No position held</p>';
      }
    }

    const cashEl = document.getElementById('modal-available-cash');
    if (cashEl) cashEl.textContent = `Available: ${formatCurrency(app.portfolio.cash)}`;

    const sellMaxEl = document.getElementById('modal-sell-max');
    if (sellMaxEl) {
      sellMaxEl.textContent = pos ? `Max: ${formatCurrency(pos.currentValue)}` : 'No position';
    }
  }

  function closeStockModal() {
    const modal = document.getElementById('stock-modal');
    if (modal) modal.classList.remove('modal-open');
    document.body.classList.remove('modal-active');
    currentStockModal = null;
  }

  function _switchModalTab(tab) {
    _stockModalTab = tab;
    document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    const chartSec = document.getElementById('modal-chart-section');
    const statsSec = document.getElementById('modal-stats-section');
    if (chartSec) chartSec.style.display = tab === 'chart' ? '' : 'none';
    if (statsSec) statsSec.style.display = tab === 'stats' ? '' : 'none';
  }

  /* ── Dashboard ──────────────────────────────────────────────────────────── */

  function updateDashboard(portfolio, stocks) {
    const totalValue = portfolio.getTotalValue();
    const invested = portfolio.getTotalInvested();
    const gainLoss = portfolio.getTotalGainLoss();
    const gainPct = invested > 0 ? (gainLoss / invested) * 100 : 0;

    _setText('stat-total-value', formatCurrency(totalValue));
    _setText('stat-cash', formatCurrency(portfolio.cash));
    _setText('stat-invested', formatCurrency(invested));

    const glEl = document.getElementById('stat-gainloss');
    if (glEl) { glEl.textContent = formatCurrency(gainLoss); glEl.className = 'stat-value ' + _gainClass(gainLoss); }
    const glPctEl = document.getElementById('stat-gainloss-pct');
    if (glPctEl) { glPctEl.textContent = formatPercent(gainPct); glPctEl.className = 'stat-pct ' + _gainClass(gainPct); }

    Charts.renderPortfolioChart('portfolio-chart', portfolio.portfolioHistory);
    Charts.renderAllocationChart('allocation-chart', portfolio.positions);

    _updateNewsFeed();
    _updateWatchlist(stocks);
  }

  function _updateNewsFeed() {
    const feed = document.getElementById('news-feed');
    if (!feed) return;
    const news = NewsEngine.recentNews;
    if (news.length === 0) {
      feed.innerHTML = '<p class="empty-state">No news yet. Market events will appear here.</p>';
      return;
    }
    feed.innerHTML = news.map(item => `
      <div class="news-item news-${item.sentiment}">
        <div class="news-header">
          <span class="news-ticker">${item.ticker}</span>
          <span class="news-sentiment news-sentiment-${item.sentiment}">${item.sentiment}</span>
          <span class="news-time">${_timeAgo(item.timestamp)}</span>
        </div>
        <p class="news-headline">${item.headline}</p>
        <span class="news-impact ${_gainClass(item.impact)}">${item.impact >= 0 ? '+' : ''}${(item.impact * 100).toFixed(1)}%</span>
      </div>`).join('');
  }

  function _updateWatchlist(stocks) {
    const app = window.App;
    const container = document.getElementById('watchlist-container');
    if (!container) return;
    const watchlist = app ? app.watchlist : [];
    if (watchlist.length === 0) {
      container.innerHTML = '<p class="empty-state">Add stocks to your watchlist from the Market page.</p>';
      return;
    }
    const watched = stocks.filter(s => watchlist.includes(s.ticker));
    container.innerHTML = watched.map(s => {
      const chgPct = ((s.price - s.initialPrice) / s.initialPrice) * 100;
      return `
        <div class="watchlist-item" onclick="UI.showStockModal('${s.ticker}')">
          <div class="watchlist-left">
            <span class="stock-ticker">${s.ticker}</span>
            <span class="stock-name-small">${s.name}</span>
          </div>
          <div class="watchlist-right">
            <span class="stock-price">${formatCurrency(s.price)}</span>
            <span class="price-badge ${_gainClass(chgPct)}">${formatPercent(chgPct)}</span>
          </div>
        </div>`;
    }).join('');
  }

  /* ── Market ─────────────────────────────────────────────────────────────── */

  function _getFilteredStocks(stocks) {
    let filtered = stocks;
    if (_marketSector !== 'All') filtered = filtered.filter(s => s.sector === _marketSector);
    if (_marketSearch.trim()) {
      const q = _marketSearch.trim().toLowerCase();
      filtered = filtered.filter(s => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    return filtered;
  }

  function _buildMarketFilterKey(filtered, watchlist) {
    return filtered.map(s => s.ticker).join(',') + '|' + (watchlist || []).join(',');
  }

  function updateMarketList(stocks, watchlist) {
    const grid = document.getElementById('market-grid');
    if (!grid) return;

    const filtered = _getFilteredStocks(stocks);

    if (filtered.length === 0) {
      grid.innerHTML = '<p class="empty-state">No stocks match your search.</p>';
      _lastMarketFilterKey = '';
      return;
    }

    const filterKey = _buildMarketFilterKey(filtered, watchlist);
    const needsFullRebuild = (filterKey !== _lastMarketFilterKey);

    if (needsFullRebuild) {
      // Full rebuild: filters/watchlist changed, or first render
      _lastMarketFilterKey = filterKey;
      grid.innerHTML = filtered.map(stock => {
        const chg = stock.price - stock.initialPrice;
        const chgPct = (chg / stock.initialPrice) * 100;
        const isWatched = watchlist && watchlist.includes(stock.ticker);
        const sparkId = 'spark-' + stock.ticker;
        return `
          <div class="stock-card" data-ticker="${stock.ticker}" onclick="UI.showStockModal('${stock.ticker}')">
            <div class="stock-card-header">
              <div>
                <div class="stock-ticker">${stock.ticker}</div>
                <div class="stock-name-small">${stock.name}</div>
              </div>
              <button class="watchlist-btn ${isWatched ? 'watched' : ''}"
                onclick="event.stopPropagation(); window.App && window.App.toggleWatchlist('${stock.ticker}')"
                title="${isWatched ? 'Remove from watchlist' : 'Add to watchlist'}">
                ${isWatched ? '★' : '☆'}
              </button>
            </div>
            <div class="stock-card-price">
              <span class="stock-price" data-field="price">${formatCurrency(stock.price)}</span>
              <span class="price-badge ${_gainClass(chgPct)}" data-field="change">${formatPercent(chgPct)}</span>
            </div>
            <div class="stock-card-meta">
              <span class="sector-badge ${_sectorClass(stock.sector)}">${stock.sector}</span>
            </div>
            <div class="sparkline-wrap">
              <canvas id="${sparkId}" width="160" height="48"></canvas>
            </div>
          </div>`;
      }).join('');

      // Render sparklines after DOM is painted
      requestAnimationFrame(() => {
        filtered.forEach(stock => {
          const app = window.App;
          if (app) Charts.renderMiniSparkline('spark-' + stock.ticker, stock.ticker, app.priceHistory);
        });
      });
    } else {
      // Incremental update: only update price text and sparkline data (no innerHTML nuke)
      filtered.forEach(stock => {
        const card = grid.querySelector(`.stock-card[data-ticker="${stock.ticker}"]`);
        if (!card) return;

        const chg = stock.price - stock.initialPrice;
        const chgPct = (chg / stock.initialPrice) * 100;

        const priceEl = card.querySelector('[data-field="price"]');
        if (priceEl) priceEl.textContent = formatCurrency(stock.price);

        const changeEl = card.querySelector('[data-field="change"]');
        if (changeEl) {
          changeEl.textContent = formatPercent(chgPct);
          changeEl.className = 'price-badge ' + _gainClass(chgPct);
        }

        // Update sparkline in-place (canvas is still alive)
        const app = window.App;
        if (app) Charts.renderMiniSparkline('spark-' + stock.ticker, stock.ticker, app.priceHistory);
      });
    }
  }

  /* ── Portfolio ───────────────────────────────────────────────────────────── */

  function updatePortfolioView(portfolio, stocks) {
    const tbody = document.getElementById('positions-table');
    if (!tbody) return;
    const positions = Object.values(portfolio.positions);
    const totalValue = portfolio.getTotalValue();

    _setText('port-total-value', formatCurrency(totalValue));
    _setText('port-cash', formatCurrency(portfolio.cash));
    _setText('port-invested', formatCurrency(portfolio.getTotalInvested()));
    const gl = portfolio.getTotalGainLoss();
    const glPct = portfolio.getTotalInvested() > 0 ? (gl / portfolio.getTotalInvested()) * 100 : 0;
    const glEl = document.getElementById('port-gainloss');
    if (glEl) { glEl.textContent = `${formatCurrency(gl)} (${formatPercent(glPct)})`; glEl.className = _gainClass(gl); }

    if (positions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No positions yet. Buy some stocks from the Market page!</td></tr>';
      return;
    }
    tbody.innerHTML = positions.map(pos => {
      const gl = pos.currentValue - pos.invested;
      const glPct = pos.invested > 0 ? (gl / pos.invested) * 100 : 0;
      const allocation = totalValue > 0 ? (pos.currentValue / totalValue * 100).toFixed(1) : 0;
      return `
        <tr class="position-row" onclick="UI.showStockModal('${pos.ticker}')">
          <td><span class="stock-ticker">${pos.ticker}</span><br><span class="stock-name-small">${pos.name}</span></td>
          <td>${pos.shares.toFixed(4)}</td>
          <td>${formatCurrency(pos.avgCostPrice)}</td>
          <td>${formatCurrency(pos.currentValue)}</td>
          <td>${formatCurrency(pos.invested)}</td>
          <td class="${_gainClass(gl)}">${formatCurrency(gl)}<br><small>${formatPercent(glPct)}</small></td>
          <td>${allocation}%</td>
        </tr>`;
    }).join('');
  }

  /* ── History ─────────────────────────────────────────────────────────────── */

  function updateHistoryView(transactions) {
    const tbody = document.getElementById('transactions-table');
    if (!tbody) return;
    let txns = [...transactions];
    if (_historyFilter !== 'ALL') txns = txns.filter(t => t.type === _historyFilter);
    txns.sort((a, b) => (a[_historySortField] > b[_historySortField] ? 1 : -1) * _historySortDir);

    if (txns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No transactions yet.</td></tr>';
      return;
    }
    tbody.innerHTML = txns.map(t => {
      const gainHtml = t.type === 'SELL' && t.gain !== null
        ? `<span class="${_gainClass(t.gain)}">${formatCurrency(t.gain)}</span>` : '—';
      return `
        <tr>
          <td>${formatDate(t.date)}</td>
          <td><span class="type-badge type-${t.type.toLowerCase()}">${t.type}</span></td>
          <td><span class="stock-ticker">${t.ticker}</span></td>
          <td>${formatCurrency(t.amount)}</td>
          <td>${formatCurrency(t.price)}</td>
          <td>${t.shares ? t.shares.toFixed(4) : '—'}</td>
          <td>${gainHtml}</td>
        </tr>`;
    }).join('');
  }

  /* ── Stats ───────────────────────────────────────────────────────────────── */

  function updateStatsView(portfolio) {
    const stats = portfolio.stats;
    const totalValue = portfolio.getTotalValue();
    const invested = portfolio.getTotalInvested();
    const totalGL = portfolio.getTotalGainLoss();
    const totalGLPct = invested > 0 ? (totalGL / invested) * 100 : 0;

    const sells = portfolio.transactions.filter(t => t.type === 'SELL');
    const wins = sells.filter(t => (t.gain || 0) > 0).length;
    const winRate = sells.length > 0 ? (wins / sells.length * 100).toFixed(1) : 0;
    const totalRealised = sells.reduce((s, t) => s + (t.gain || 0), 0);
    const avgTrade = sells.length > 0 ? totalRealised / sells.length : 0;

    const set = (id, val, cls) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = val;
      if (cls) el.className = cls;
    };

    set('stats-total-value', formatCurrency(totalValue));
    set('stats-total-gl', formatCurrency(totalGL), _gainClass(totalGL));
    set('stats-total-gl-pct', formatPercent(totalGLPct), _gainClass(totalGLPct));
    set('stats-peak', formatCurrency(stats.peakValue));
    set('stats-low', formatCurrency(stats.lowestValue));
    set('stats-total-trades', stats.totalTrades);
    set('stats-buy-count', stats.buyCount);
    set('stats-sell-count', stats.sellCount);
    set('stats-win-rate', winRate + '%');
    set('stats-realised', formatCurrency(totalRealised), _gainClass(totalRealised));
    set('stats-avg-trade', formatCurrency(avgTrade), _gainClass(avgTrade));

    if (stats.bestTrade && stats.bestTrade.ticker) {
      set('stats-best-ticker', stats.bestTrade.ticker);
      set('stats-best-gain', formatCurrency(stats.bestTrade.gain), 'positive');
    }
    if (stats.worstTrade && stats.worstTrade.ticker) {
      set('stats-worst-ticker', stats.worstTrade.ticker);
      set('stats-worst-loss', formatCurrency(stats.worstTrade.loss), 'negative');
    }
  }

  /* ── Navigation ──────────────────────────────────────────────────────────── */

  function navigateTo(page) {
    currentPage = page;
    // When leaving market, reset the filter key so next visit does a full build
    if (page !== 'market') _lastMarketFilterKey = '';
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === page);
    });

    const app = window.App;
    if (!app) return;
    switch (page) {
      case 'dashboard':  updateDashboard(app.portfolio, app.stocks); break;
      case 'market':     updateMarketList(app.stocks, app.watchlist); break;
      case 'portfolio':  updatePortfolioView(app.portfolio, app.stocks); break;
      case 'history':    updateHistoryView(app.portfolio.transactions); break;
      case 'stats':      updateStatsView(app.portfolio); break;
    }
  }

  /* ── Helpers ─────────────────────────────────────────────────────────────── */

  function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function _timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return formatDateShort(ts);
  }

  /* ── Public event wiring helpers (called from app.js) ─────────────────── */

  function wireMarketSearch() {
    const inp = document.getElementById('market-search');
    if (inp) {
      inp.addEventListener('input', e => {
        _marketSearch = e.target.value;
        _lastMarketFilterKey = ''; // force full rebuild on filter change
        const app = window.App;
        if (app) updateMarketList(app.stocks, app.watchlist);
      });
    }
    document.querySelectorAll('.sector-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _marketSector = btn.dataset.sector || 'All';
        _lastMarketFilterKey = ''; // force full rebuild on filter change
        document.querySelectorAll('.sector-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const app = window.App;
        if (app) updateMarketList(app.stocks, app.watchlist);
      });
    });
  }

  function wireHistoryFilters() {
    document.querySelectorAll('.history-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _historyFilter = btn.dataset.filter || 'ALL';
        document.querySelectorAll('.history-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const app = window.App;
        if (app) updateHistoryView(app.portfolio.transactions);
      });
    });
    document.querySelectorAll('.sort-header').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (_historySortField === field) _historySortDir *= -1;
        else { _historySortField = field; _historySortDir = -1; }
        const app = window.App;
        if (app) updateHistoryView(app.portfolio.transactions);
      });
    });
  }

  function wireModalRangeBtns() {
    document.querySelectorAll('.range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _stockModalRange = btn.dataset.range;
        document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const app = window.App;
        if (app && currentStockModal) {
          const stock = app.stocks.find(s => s.ticker === currentStockModal);
          if (stock) Charts.renderPriceChart('stock-price-chart', stock, app.priceHistory, _stockModalRange);
        }
      });
    });
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => _switchModalTab(btn.dataset.tab));
    });
  }

  return {
    get currentPage() { return currentPage; },
    get currentStockModal() { return currentStockModal; },
    formatCurrency, formatPercent, formatDate,
    showToast, showConfirmModal, closeConfirmModal,
    showStockModal, closeStockModal,
    updateDashboard, updateMarketList, updatePortfolioView,
    updateHistoryView, updateStatsView, navigateTo,
    wireMarketSearch, wireHistoryFilters, wireModalRangeBtns,
    _updateModalPriceHeader, _updateModalTradePanel, _updateNewsFeed,
    _renderModalChart,
  };
})();
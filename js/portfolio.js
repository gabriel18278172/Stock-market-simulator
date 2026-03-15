/**
 * portfolio.js — Dollar-based portfolio management
 */

const Portfolio = (() => {
  const INITIAL_CASH = 10000;
  const FLOAT_TOLERANCE = 0.01;
  const MIN_SHARES_THRESHOLD = 0.0001;
  const MIN_VALUE_THRESHOLD = 0.01;

  const state = {
    cash: INITIAL_CASH,
    positions: {},      // ticker → { ticker, name, sector, invested, currentValue, shares, avgCostPrice }
    transactions: [],   // { id, date, type, ticker, name, amount, price, shares, gain }
    stats: {
      totalTrades: 0,
      buyCount: 0,
      sellCount: 0,
      bestTrade: { ticker: null, gain: 0 },
      worstTrade: { ticker: null, loss: 0 },
      peakValue: INITIAL_CASH,
      lowestValue: INITIAL_CASH,
    },
    portfolioHistory: [], // { date, value }
  };

  function _genId() {
    return 'txn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function init() {
    const saved = AppStorage.load(AppStorage.KEYS.PORTFOLIO, null);
    if (saved) {
      state.cash = saved.cash ?? INITIAL_CASH;
      state.positions = saved.positions ?? {};
      state.transactions = saved.transactions ?? [];
      state.stats = Object.assign({
        totalTrades: 0, buyCount: 0, sellCount: 0,
        bestTrade: { ticker: null, gain: 0 },
        worstTrade: { ticker: null, loss: 0 },
        peakValue: INITIAL_CASH, lowestValue: INITIAL_CASH,
      }, saved.stats ?? {});
      state.portfolioHistory = saved.portfolioHistory ?? [];
    }
  }

  function save() {
    AppStorage.save(AppStorage.KEYS.PORTFOLIO, {
      cash: state.cash,
      positions: state.positions,
      transactions: state.transactions,
      stats: state.stats,
      portfolioHistory: state.portfolioHistory,
    });
  }

  function getTotalValue() {
    const posVal = Object.values(state.positions)
      .reduce((sum, pos) => sum + (pos.currentValue || 0), 0);
    return state.cash + posVal;
  }

  function getTotalInvested() {
    return Object.values(state.positions)
      .reduce((sum, pos) => sum + (pos.invested || 0), 0);
  }

  function getTotalGainLoss() {
    return Object.values(state.positions)
      .reduce((sum, pos) => sum + ((pos.currentValue || 0) - (pos.invested || 0)), 0);
  }

  function updatePositionValues(stocks) {
    stocks.forEach(stock => {
      const pos = state.positions[stock.ticker];
      if (!pos) return;
      if (pos.avgCostPrice && pos.avgCostPrice > 0) {
        pos.currentValue = parseFloat((pos.shares * stock.price).toFixed(2));
      }
    });
    // Update peak / lowest
    const total = getTotalValue();
    if (total > state.stats.peakValue) state.stats.peakValue = parseFloat(total.toFixed(2));
    if (total < state.stats.lowestValue) state.stats.lowestValue = parseFloat(total.toFixed(2));
  }

  function buy(ticker, dollarAmount, currentPrice, stockInfo) {
    dollarAmount = parseFloat(dollarAmount);
    currentPrice = parseFloat(currentPrice);

    if (!ticker || isNaN(dollarAmount) || dollarAmount <= 0) {
      return { success: false, message: 'Invalid buy parameters.' };
    }
    if (dollarAmount < 1) {
      return { success: false, message: 'Minimum trade amount is $1.00.' };
    }
    if (dollarAmount > state.cash) {
      return { success: false, message: `Insufficient cash. Available: $${state.cash.toFixed(2)}` };
    }
    if (currentPrice <= 0) {
      return { success: false, message: 'Invalid stock price.' };
    }

    const shares = dollarAmount / currentPrice;
    state.cash = parseFloat((state.cash - dollarAmount).toFixed(2));

    if (state.positions[ticker]) {
      const pos = state.positions[ticker];
      const totalShares = pos.shares + shares;
      const totalInvested = pos.invested + dollarAmount;
      pos.shares = totalShares;
      pos.invested = parseFloat(totalInvested.toFixed(2));
      pos.avgCostPrice = parseFloat((totalInvested / totalShares).toFixed(4));
      pos.currentValue = parseFloat((totalShares * currentPrice).toFixed(2));
    } else {
      state.positions[ticker] = {
        ticker,
        name: stockInfo ? stockInfo.name : ticker,
        sector: stockInfo ? stockInfo.sector : '',
        invested: parseFloat(dollarAmount.toFixed(2)),
        currentValue: parseFloat(dollarAmount.toFixed(2)),
        shares: shares,
        avgCostPrice: parseFloat(currentPrice.toFixed(4)),
      };
    }

    state.transactions.unshift({
      id: _genId(),
      date: Date.now(),
      type: 'BUY',
      ticker,
      name: stockInfo ? stockInfo.name : ticker,
      amount: parseFloat(dollarAmount.toFixed(2)),
      price: parseFloat(currentPrice.toFixed(4)),
      shares: parseFloat(shares.toFixed(6)),
      gain: null,
    });

    state.stats.totalTrades++;
    state.stats.buyCount++;
    save();
    return { success: true, message: `Bought $${dollarAmount.toFixed(2)} of ${ticker} at $${currentPrice.toFixed(2)}.` };
  }

  function sell(ticker, dollarAmount, currentPrice) {
    dollarAmount = parseFloat(dollarAmount);
    currentPrice = parseFloat(currentPrice);

    if (!ticker || isNaN(dollarAmount) || dollarAmount <= 0) {
      return { success: false, message: 'Invalid sell parameters.' };
    }
    const pos = state.positions[ticker];
    if (!pos) {
      return { success: false, message: `You have no position in ${ticker}.` };
    }
    if (dollarAmount < 1) {
      return { success: false, message: 'Minimum trade amount is $1.00.' };
    }
    if (dollarAmount > pos.currentValue + FLOAT_TOLERANCE) {
      return { success: false, message: `Cannot sell more than your position value ($${pos.currentValue.toFixed(2)}).` };
    }

    const sharesToSell = dollarAmount / currentPrice;
    const costBasisOfSold = sharesToSell * pos.avgCostPrice;
    const gain = parseFloat((dollarAmount - costBasisOfSold).toFixed(2));

    state.cash = parseFloat((state.cash + dollarAmount).toFixed(2));
    pos.shares -= sharesToSell;
    pos.invested = parseFloat((pos.shares * pos.avgCostPrice).toFixed(2));
    pos.currentValue = parseFloat((pos.shares * currentPrice).toFixed(2));

    // Remove position if essentially empty
    if (pos.shares < MIN_SHARES_THRESHOLD || pos.currentValue < MIN_VALUE_THRESHOLD) {
      delete state.positions[ticker];
    }

    state.transactions.unshift({
      id: _genId(),
      date: Date.now(),
      type: 'SELL',
      ticker,
      name: pos.name,
      amount: parseFloat(dollarAmount.toFixed(2)),
      price: parseFloat(currentPrice.toFixed(4)),
      shares: parseFloat(sharesToSell.toFixed(6)),
      gain,
    });

    state.stats.totalTrades++;
    state.stats.sellCount++;

    if (gain > (state.stats.bestTrade.gain || 0)) {
      state.stats.bestTrade = { ticker, gain };
    }
    if (gain < (state.stats.worstTrade.loss || 0)) {
      state.stats.worstTrade = { ticker, loss: gain };
    }

    save();
    return { success: true, message: `Sold $${dollarAmount.toFixed(2)} of ${ticker} at $${currentPrice.toFixed(2)}.` };
  }

  function getPortfolioAllocation() {
    const total = Object.values(state.positions).reduce((s, p) => s + p.currentValue, 0);
    if (total <= 0) return [];
    return Object.values(state.positions)
      .map(pos => ({
        ticker: pos.ticker,
        name: pos.name,
        value: pos.currentValue,
        percentage: parseFloat(((pos.currentValue / total) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }

  function recordPortfolioSnapshot() {
    const value = parseFloat(getTotalValue().toFixed(2));
    state.portfolioHistory.push({ date: Date.now(), value });
    // Keep last 500 snapshots
    if (state.portfolioHistory.length > 500) {
      state.portfolioHistory = state.portfolioHistory.slice(-500);
    }
  }

  function reset() {
    state.cash = INITIAL_CASH;
    state.positions = {};
    state.transactions = [];
    state.stats = {
      totalTrades: 0, buyCount: 0, sellCount: 0,
      bestTrade: { ticker: null, gain: 0 },
      worstTrade: { ticker: null, loss: 0 },
      peakValue: INITIAL_CASH, lowestValue: INITIAL_CASH,
    };
    state.portfolioHistory = [];
    AppStorage.clear();
  }

  return {
    INITIAL_CASH,
    get cash() { return state.cash; },
    get positions() { return state.positions; },
    get transactions() { return state.transactions; },
    get stats() { return state.stats; },
    get portfolioHistory() { return state.portfolioHistory; },
    init, save, getTotalValue, getTotalInvested, getTotalGainLoss,
    updatePositionValues, buy, sell, getPortfolioAllocation,
    recordPortfolioSnapshot, reset,
  };
})();

/**
 * market.js — Stock data and price simulation engine
 * Enhanced with market trends, sector correlation, and order types
 */

const Market = (() => {
  const STOCKS = [
    // Technology (5)
    { ticker: 'AAPL',  name: 'Apple Inc.',         sector: 'Technology', price: 182.00, initialPrice: 182.00, volatility: 0.015, drift: 0.0003, description: 'Consumer electronics, software & services giant.', pe: 28.5, dividend: 0.58, beta: 1.2 },
    { ticker: 'MSFT',  name: 'Microsoft Corp.',     sector: 'Technology', price: 378.00, initialPrice: 378.00, volatility: 0.013, drift: 0.0003, description: 'Cloud computing, productivity software, and gaming.', pe: 35.2, dividend: 0.75, beta: 1.1 },
    { ticker: 'GOOGL', name: 'Alphabet Inc.',        sector: 'Technology', price: 140.00, initialPrice: 140.00, volatility: 0.016, drift: 0.0003, description: 'Search, advertising, cloud, and AI technologies.', pe: 24.8, dividend: 0.0, beta: 1.15 },
    { ticker: 'AMZN',  name: 'Amazon.com Inc.',      sector: 'Technology', price: 178.00, initialPrice: 178.00, volatility: 0.018, drift: 0.0003, description: 'E-commerce, cloud infrastructure, and streaming.', pe: 60.1, dividend: 0.0, beta: 1.3 },
    { ticker: 'NVDA',  name: 'Nvidia Corp.',          sector: 'Technology', price: 495.00, initialPrice: 495.00, volatility: 0.025, drift: 0.0005, description: 'GPU chips powering AI, gaming, and data centres.', pe: 65.3, dividend: 0.04, beta: 1.7 },
    // Healthcare (3)
    { ticker: 'JNJ',   name: 'Johnson & Johnson',    sector: 'Healthcare', price: 158.00, initialPrice: 158.00, volatility: 0.009, drift: 0.0002, description: 'Pharmaceuticals, medical devices, and consumer health.', pe: 15.2, dividend: 3.76, beta: 0.6 },
    { ticker: 'PFE',   name: 'Pfizer Inc.',           sector: 'Healthcare', price: 28.00,  initialPrice: 28.00,  volatility: 0.012, drift: 0.0001, description: 'Global pharmaceutical and biotech leader.', pe: 12.8, dividend: 1.64, beta: 0.7 },
    { ticker: 'UNH',   name: 'UnitedHealth Group',   sector: 'Healthcare', price: 524.00, initialPrice: 524.00, volatility: 0.011, drift: 0.0003, description: 'Diversified health care and insurance services.', pe: 22.1, dividend: 2.60, beta: 0.8 },
    // Energy (3)
    { ticker: 'XOM',   name: 'ExxonMobil Corp.',      sector: 'Energy',     price: 104.00, initialPrice: 104.00, volatility: 0.014, drift: 0.0002, description: 'Integrated oil, gas, and petrochemical company.', pe: 11.5, dividend: 3.64, beta: 0.9 },
    { ticker: 'CVX',   name: 'Chevron Corp.',          sector: 'Energy',     price: 153.00, initialPrice: 153.00, volatility: 0.013, drift: 0.0002, description: 'Global energy company focused on oil and gas.', pe: 13.2, dividend: 4.04, beta: 0.85 },
    { ticker: 'BP',    name: 'BP plc',                 sector: 'Energy',     price: 35.00,  initialPrice: 35.00,  volatility: 0.016, drift: 0.0001, description: 'British multinational oil and gas company.', pe: 8.9, dividend: 4.2, beta: 0.95 },
    // Finance (3)
    { ticker: 'JPM',   name: 'JPMorgan Chase & Co.', sector: 'Finance',    price: 197.00, initialPrice: 197.00, volatility: 0.012, drift: 0.0002, description: 'Leading global investment bank and financial services.', pe: 11.8, dividend: 4.00, beta: 1.1 },
    { ticker: 'BAC',   name: 'Bank of America',       sector: 'Finance',    price: 35.00,  initialPrice: 35.00,  volatility: 0.013, drift: 0.0002, description: 'Consumer banking, wealth management, and trading.', pe: 10.5, dividend: 0.96, beta: 1.3 },
    { ticker: 'GS',    name: 'Goldman Sachs Group',   sector: 'Finance',    price: 389.00, initialPrice: 389.00, volatility: 0.014, drift: 0.0002, description: 'Investment banking, securities, and asset management.', pe: 14.2, dividend: 10.00, beta: 1.4 },
    // Consumer (3)
    { ticker: 'WMT',   name: 'Walmart Inc.',           sector: 'Consumer',   price: 60.00,  initialPrice: 60.00,  volatility: 0.008, drift: 0.0002, description: 'World\'s largest retailer by revenue.', pe: 25.6, dividend: 2.28, beta: 0.5 },
    { ticker: 'MCD',   name: 'McDonald\'s Corp.',      sector: 'Consumer',   price: 296.00, initialPrice: 296.00, volatility: 0.009, drift: 0.0002, description: 'Global fast-food chain and real estate franchise.', pe: 24.1, dividend: 6.52, beta: 0.65 },
    { ticker: 'KO',    name: 'Coca-Cola Co.',           sector: 'Consumer',   price: 59.00,  initialPrice: 59.00,  volatility: 0.007, drift: 0.0001, description: 'Iconic beverage brand sold in over 200 countries.', pe: 22.8, dividend: 1.84, beta: 0.55 },
    // Industrial (3)
    { ticker: 'GE',    name: 'GE Aerospace',           sector: 'Industrial', price: 159.00, initialPrice: 159.00, volatility: 0.014, drift: 0.0003, description: 'Aviation engines, defence systems, and energy tech.', pe: 32.5, dividend: 0.32, beta: 1.15 },
    { ticker: 'CAT',   name: 'Caterpillar Inc.',        sector: 'Industrial', price: 340.00, initialPrice: 340.00, volatility: 0.013, drift: 0.0002, description: 'World\'s largest construction & mining equipment maker.', pe: 17.5, dividend: 5.20, beta: 1.0 },
    { ticker: 'BA',    name: 'Boeing Co.',               sector: 'Industrial', price: 185.00, initialPrice: 185.00, volatility: 0.022, drift: 0.0001, description: 'Commercial aircraft, defence, and space systems.', pe: -15.2, dividend: 0.0, beta: 1.5 },
  ];

  const SECTORS = ['Technology', 'Healthcare', 'Energy', 'Finance', 'Consumer', 'Industrial'];

  // Market trend state — affects all stocks
  let marketTrend = 0; // -1 to 1 scale (bear to bull)
  let trendDuration = 0;
  let trendTicksLeft = 0;

  // Sector-specific sentiment
  const sectorSentiment = {};
  SECTORS.forEach(s => { sectorSentiment[s] = 0; });

  // Box-Muller transform for standard normal random variable
  function randomNormal() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // Price simulation constants
  const DT = 1 / (252 * 78);
  const MIN_STOCK_PRICE = 0.50;

  function updateMarketTrend() {
    if (trendTicksLeft <= 0) {
      // Randomly start a new trend
      if (Math.random() < 0.05) {
        marketTrend = (Math.random() - 0.5) * 1.6; // -0.8 to 0.8
        trendTicksLeft = Math.floor(20 + Math.random() * 80); // 20-100 ticks
      } else {
        marketTrend *= 0.95; // Decay toward 0
      }
    } else {
      trendTicksLeft--;
    }

    // Randomly shift sector sentiment
    if (Math.random() < 0.03) {
      const sector = SECTORS[Math.floor(Math.random() * SECTORS.length)];
      sectorSentiment[sector] = (Math.random() - 0.5) * 0.8;
    }
    // Decay sector sentiment
    SECTORS.forEach(s => { sectorSentiment[s] *= 0.98; });
  }

  function simulatePriceUpdate(stock) {
    const { drift, volatility, price, sector, beta } = stock;
    const z = randomNormal();

    // Market-wide influence
    const trendEffect = marketTrend * 0.0005 * (beta || 1.0);
    // Sector-specific influence
    const sectorEffect = (sectorSentiment[sector] || 0) * 0.0003;

    const adjustedDrift = drift + trendEffect + sectorEffect;
    const exponent = (adjustedDrift - 0.5 * volatility * volatility) * DT + volatility * Math.sqrt(DT) * z;
    let newPrice = price * Math.exp(exponent);
    if (newPrice < MIN_STOCK_PRICE) newPrice = MIN_STOCK_PRICE;
    stock.price = parseFloat(newPrice.toFixed(2));
    return stock.price;
  }

  // Generate `days` daily closing prices using daily GBM (dt = 1/252)
  function generateHistoricalPrices(stock, days) {
    const DT_DAILY = 1 / 252;
    const prices = [];
    let p = stock.initialPrice;
    for (let i = 0; i < days; i++) {
      const z = randomNormal();
      const exp = (stock.drift - 0.5 * stock.volatility * stock.volatility) * DT_DAILY
        + stock.volatility * Math.sqrt(DT_DAILY) * z;
      p = p * Math.exp(exp);
      if (p < MIN_STOCK_PRICE) p = MIN_STOCK_PRICE;
      prices.push(parseFloat(p.toFixed(2)));
    }
    const scale = stock.price / prices[prices.length - 1];
    return prices.map(px => parseFloat((px * scale).toFixed(2)));
  }

  function initPriceHistory() {
    const history = {};
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const DAYS = 90;

    STOCKS.forEach(stock => {
      const prices = generateHistoricalPrices(stock, DAYS);
      const entries = prices.map((price, i) => ({
        time: now - (DAYS - i) * DAY_MS,
        price,
      }));
      history[stock.ticker] = entries;
    });
    return history;
  }

  /* ── Limit Orders ───────────────────────────────────────────────── */

  let limitOrders = []; // { id, ticker, type: 'BUY'|'SELL', limitPrice, amount, createdAt }
  let _orderIdCounter = 0;

  function placeLimitOrder(ticker, type, limitPrice, amount) {
    limitPrice = parseFloat(limitPrice);
    amount = parseFloat(amount);
    if (!ticker || isNaN(limitPrice) || limitPrice <= 0 || isNaN(amount) || amount < 1) {
      return { success: false, message: 'Invalid limit order parameters.' };
    }
    const order = {
      id: 'lmt_' + Date.now() + '_' + (++_orderIdCounter),
      ticker,
      type,
      limitPrice: parseFloat(limitPrice.toFixed(2)),
      amount: parseFloat(amount.toFixed(2)),
      createdAt: Date.now(),
    };
    limitOrders.push(order);
    return { success: true, message: `${type} limit order placed: $${amount.toFixed(2)} of ${ticker} at $${limitPrice.toFixed(2)}.`, order };
  }

  function cancelLimitOrder(orderId) {
    const idx = limitOrders.findIndex(o => o.id === orderId);
    if (idx === -1) return { success: false, message: 'Order not found.' };
    limitOrders.splice(idx, 1);
    return { success: true, message: 'Order cancelled.' };
  }

  function checkLimitOrders(stocks, executeFn) {
    const toRemove = [];
    limitOrders.forEach((order, idx) => {
      const stock = stocks.find(s => s.ticker === order.ticker);
      if (!stock) return;
      let shouldExecute = false;
      if (order.type === 'BUY' && stock.price <= order.limitPrice) shouldExecute = true;
      if (order.type === 'SELL' && stock.price >= order.limitPrice) shouldExecute = true;
      if (shouldExecute) {
        const result = executeFn(order, stock);
        if (result && result.success) toRemove.push(idx);
      }
    });
    // Remove executed orders (reverse to keep indices valid)
    toRemove.reverse().forEach(idx => limitOrders.splice(idx, 1));
  }

  /* ── Market indicators ──────────────────────────────────────────── */

  function getMarketIndex(stocks) {
    const total = stocks.reduce((sum, s) => sum + s.price, 0);
    const totalInitial = stocks.reduce((sum, s) => sum + s.initialPrice, 0);
    const indexValue = (total / totalInitial) * 10000; // Base 10000
    const change = ((total - totalInitial) / totalInitial) * 100;
    return { value: parseFloat(indexValue.toFixed(2)), change: parseFloat(change.toFixed(2)) };
  }

  function getSectorPerformance(stocks) {
    const sectors = {};
    stocks.forEach(s => {
      if (!sectors[s.sector]) sectors[s.sector] = { total: 0, initial: 0, count: 0 };
      sectors[s.sector].total += s.price;
      sectors[s.sector].initial += s.initialPrice;
      sectors[s.sector].count++;
    });
    return Object.entries(sectors).map(([name, data]) => ({
      name,
      change: parseFloat((((data.total - data.initial) / data.initial) * 100).toFixed(2)),
      avgPrice: parseFloat((data.total / data.count).toFixed(2)),
    })).sort((a, b) => b.change - a.change);
  }

  return {
    STOCKS,
    SECTORS,
    get marketTrend() { return marketTrend; },
    get sectorSentiment() { return { ...sectorSentiment }; },
    get limitOrders() { return [...limitOrders]; },
    simulatePriceUpdate,
    updateMarketTrend,
    randomNormal,
    generateHistoricalPrices,
    initPriceHistory,
    placeLimitOrder,
    cancelLimitOrder,
    checkLimitOrders,
    getMarketIndex,
    getSectorPerformance,
  };
})();

/**
 * market.js — Stock data and price simulation engine
 */

const Market = (() => {
  const STOCKS = [
    // Technology (5)
    { ticker: 'AAPL',  name: 'Apple Inc.',         sector: 'Technology', price: 182.00, initialPrice: 182.00, volatility: 0.015, drift: 0.0003, description: 'Consumer electronics, software & services giant.' },
    { ticker: 'MSFT',  name: 'Microsoft Corp.',     sector: 'Technology', price: 378.00, initialPrice: 378.00, volatility: 0.013, drift: 0.0003, description: 'Cloud computing, productivity software, and gaming.' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.',        sector: 'Technology', price: 140.00, initialPrice: 140.00, volatility: 0.016, drift: 0.0003, description: 'Search, advertising, cloud, and AI technologies.' },
    { ticker: 'AMZN',  name: 'Amazon.com Inc.',      sector: 'Technology', price: 178.00, initialPrice: 178.00, volatility: 0.018, drift: 0.0003, description: 'E-commerce, cloud infrastructure, and streaming.' },
    { ticker: 'NVDA',  name: 'Nvidia Corp.',          sector: 'Technology', price: 495.00, initialPrice: 495.00, volatility: 0.025, drift: 0.0005, description: 'GPU chips powering AI, gaming, and data centres.' },
    // Healthcare (3)
    { ticker: 'JNJ',   name: 'Johnson & Johnson',    sector: 'Healthcare', price: 158.00, initialPrice: 158.00, volatility: 0.009, drift: 0.0002, description: 'Pharmaceuticals, medical devices, and consumer health.' },
    { ticker: 'PFE',   name: 'Pfizer Inc.',           sector: 'Healthcare', price: 28.00,  initialPrice: 28.00,  volatility: 0.012, drift: 0.0001, description: 'Global pharmaceutical and biotech leader.' },
    { ticker: 'UNH',   name: 'UnitedHealth Group',   sector: 'Healthcare', price: 524.00, initialPrice: 524.00, volatility: 0.011, drift: 0.0003, description: 'Diversified health care and insurance services.' },
    // Energy (3)
    { ticker: 'XOM',   name: 'ExxonMobil Corp.',      sector: 'Energy',     price: 104.00, initialPrice: 104.00, volatility: 0.014, drift: 0.0002, description: 'Integrated oil, gas, and petrochemical company.' },
    { ticker: 'CVX',   name: 'Chevron Corp.',          sector: 'Energy',     price: 153.00, initialPrice: 153.00, volatility: 0.013, drift: 0.0002, description: 'Global energy company focused on oil and gas.' },
    { ticker: 'BP',    name: 'BP plc',                 sector: 'Energy',     price: 35.00,  initialPrice: 35.00,  volatility: 0.016, drift: 0.0001, description: 'British multinational oil and gas company.' },
    // Finance (3)
    { ticker: 'JPM',   name: 'JPMorgan Chase & Co.', sector: 'Finance',    price: 197.00, initialPrice: 197.00, volatility: 0.012, drift: 0.0002, description: 'Leading global investment bank and financial services.' },
    { ticker: 'BAC',   name: 'Bank of America',       sector: 'Finance',    price: 35.00,  initialPrice: 35.00,  volatility: 0.013, drift: 0.0002, description: 'Consumer banking, wealth management, and trading.' },
    { ticker: 'GS',    name: 'Goldman Sachs Group',   sector: 'Finance',    price: 389.00, initialPrice: 389.00, volatility: 0.014, drift: 0.0002, description: 'Investment banking, securities, and asset management.' },
    // Consumer (3)
    { ticker: 'WMT',   name: 'Walmart Inc.',           sector: 'Consumer',   price: 60.00,  initialPrice: 60.00,  volatility: 0.008, drift: 0.0002, description: 'World\'s largest retailer by revenue.' },
    { ticker: 'MCD',   name: 'McDonald\'s Corp.',      sector: 'Consumer',   price: 296.00, initialPrice: 296.00, volatility: 0.009, drift: 0.0002, description: 'Global fast-food chain and real estate franchise.' },
    { ticker: 'KO',    name: 'Coca-Cola Co.',           sector: 'Consumer',   price: 59.00,  initialPrice: 59.00,  volatility: 0.007, drift: 0.0001, description: 'Iconic beverage brand sold in over 200 countries.' },
    // Industrial (3)
    { ticker: 'GE',    name: 'GE Aerospace',           sector: 'Industrial', price: 159.00, initialPrice: 159.00, volatility: 0.014, drift: 0.0003, description: 'Aviation engines, defence systems, and energy tech.' },
    { ticker: 'CAT',   name: 'Caterpillar Inc.',        sector: 'Industrial', price: 340.00, initialPrice: 340.00, volatility: 0.013, drift: 0.0002, description: 'World\'s largest construction & mining equipment maker.' },
    { ticker: 'BA',    name: 'Boeing Co.',               sector: 'Industrial', price: 185.00, initialPrice: 185.00, volatility: 0.022, drift: 0.0001, description: 'Commercial aircraft, defence, and space systems.' },
  ];

  // Box-Muller transform for standard normal random variable
  function randomNormal() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // Price simulation constants
  const DT = 1 / (252 * 78); // one intraday step (1/252 trading days / 78 five-minute bars)
  const MIN_STOCK_PRICE = 0.50;

  function simulatePriceUpdate(stock) {
    const { drift, volatility, price } = stock;
    const z = randomNormal();
    const exponent = (drift - 0.5 * volatility * volatility) * DT + volatility * Math.sqrt(DT) * z;
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
    // Adjust last price so history ends near the stock's current price
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
      // Build array of { time, price } with one entry per trading day going back DAYS
      const entries = prices.map((price, i) => ({
        time: now - (DAYS - i) * DAY_MS,
        price,
      }));
      history[stock.ticker] = entries;
    });
    return history;
  }
function getGlobalMarketTrend() {
  let totalChange = 0;

  STOCKS.forEach(stock => {
    const change = (stock.price - stock.initialPrice) / stock.initialPrice;
    totalChange += change;
  });

  const avgChange = totalChange / STOCKS.length;

  if (avgChange > 0.01) return "bull";
  if (avgChange < -0.01) return "bear";
  return "neutral";
}
  return { 
  STOCKS, 
  simulatePriceUpdate, 
  randomNormal, 
  generateHistoricalPrices, 
  initPriceHistory,
  getGlobalMarketTrend
};
})();

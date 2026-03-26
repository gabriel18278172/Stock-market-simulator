# 📈 StockSim — Dollar-Based Stock Market Simulator

🚀 **LIVE DEMO:** [https://stock-market-sim.vercel.app](https://stock-market-simulator-two.vercel.app)

A fully-polished, real-time **dollar-based** stock market simulator that runs entirely in your browser — no server, no sign-up, no install required. Just open `index.html` and start trading with a virtual **$10,000**.

---

## 💡 Dollar-Based Investing Concept

Unlike traditional share-based simulators, StockSim lets you invest in **dollar amounts** (e.g. "buy $250 of NVDA"), automatically calculating fractional shares. This mirrors how many modern brokerages work and makes portfolio management more intuitive — you always know exactly how much money you have in each position.

---

## ✨ Features

- 📊 **20 real stocks** across 6 sectors (Technology, Healthcare, Energy, Finance, Consumer, Industrial)
- 💵 **Dollar-based trading** — enter any amount, fractional shares calculated automatically
- ⚡ **Live price simulation** — prices update every 2 seconds using Geometric Brownian Motion
- 📰 **Market news engine** — random news events with real price impact every 15–45 seconds
- 📈 **Interactive charts** — price history, portfolio performance, and allocation doughnut charts (via Chart.js)
- 🔥 **Mini sparklines** on every stock card
- ⭐ **Watchlist** — pin any stocks for quick dashboard access
- 💼 **Portfolio tracking** — cost basis, shares, unrealised gain/loss, and allocation %
- 🕐 **Transaction history** — sortable/filterable log of every trade
- 🏆 **Performance stats** — win rate, best/worst trade, peak value, realised P&L
- 🌙 **Beautiful dark theme** — polished CSS with smooth animations and responsive layout
- 💾 **Persistent storage** — all data saved to `localStorage` automatically
- 🔄 **Reset button** — start fresh any time

---

## 🚀 How to Run

```bash
# No build step required — just open the file
open index.html
# or double-click index.html in your file manager
```

That's it. No npm, no bundler, no server needed.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Vanilla JavaScript (ES5/ES6, no modules) |
| Charts | [Chart.js 4.4](https://www.chartjs.org/) via CDN |
| Fonts | Inter (Google Fonts) |
| Storage | Browser `localStorage` |
| Styling | Custom CSS with CSS Variables (dark theme) |
| Simulation | Geometric Brownian Motion (Box-Muller transform) |

---

## 📸 Screenshots

> _Open `index.html` in your browser to see the live application._

| Dashboard | Market | Portfolio |
|-----------|--------|-----------|
| Live value, chart, news, watchlist | 20 stock cards with sparklines | Positions table with G/L |

---

## 📁 File Structure

```
Stock-market-simulator/
├── index.html          # Main entry point
├── css/
│   └── styles.css      # Dark theme stylesheet
├── js/
│   ├── storage.js      # localStorage persistence layer
│   ├── market.js       # Stock data + GBM price simulation
│   ├── portfolio.js    # Dollar-based portfolio management
│   ├── news.js         # Random news events engine
│   ├── charts.js       # Chart.js rendering helpers
│   ├── ui.js           # DOM updates & UI logic
│   └── app.js          # Application bootstrap & wiring
└── README.md
```

---

## 📐 Architecture

All JavaScript files are loaded as plain `<script>` tags in dependency order and share the global scope. Each module exposes a single object (`AppStorage`, `Market`, `Portfolio`, `NewsEngine`, `Charts`, `UI`) and `app.js` wires everything together, exposing `window.App` for cross-module access.

---

## 📜 License

MIT — see [LICENSE](LICENSE).

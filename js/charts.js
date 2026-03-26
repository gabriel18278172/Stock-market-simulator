/**
 * charts.js — Chart rendering using Chart.js (loaded via CDN)
 */
const Charts = (() => {
  let priceChartInstance = null;
  let portfolioChartInstance = null;
  let allocationChartInstance = null;
  const sparklineInstances = {};
  const PALETTE = [
    '#6c63ff', '#00d4a8', '#ff4d6d', '#f59e0b', '#38bdf8',
    '#a78bfa', '#34d399', '#fb923c', '#e879f9', '#60a5fa',
    '#facc15', '#4ade80', '#f87171', '#818cf8', '#2dd4bf',
  ];
  const baseConfig = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a2235',
        borderColor: '#2d3748',
        borderWidth: 1,
        titleColor: '#e8eaf0',
        bodyColor: '#8892a4',
        padding: 10,
        cornerRadius: 8,
      },
    },
  };
  function destroyChart(instance) {
    if (instance && typeof instance.destroy === 'function') {
      try { instance.destroy(); } catch (_) {}
    }
    return null;
  }
  function _filterHistory(entries, range) {
    if (!entries || entries.length === 0) return entries;
    const now = Date.now();
    const DAY = 86400000;
    const cutoffs = { '1D': now - DAY, '1W': now - 7 * DAY, '1M': now - 30 * DAY, '3M': now - 90 * DAY };
    if (range === 'ALL' || !cutoffs[range]) return entries;
    const cutoff = cutoffs[range];
    const filtered = entries.filter(e => e.time >= cutoff);
    return filtered.length > 1 ? filtered : entries.slice(-2);
  }
  function _gradientFill(ctx, chartArea, colorUp, colorDown, isUp) {
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    const color = isUp ? colorUp : colorDown;
    gradient.addColorStop(0, color + '55');
    gradient.addColorStop(1, color + '00');
    return gradient;
  }
  function renderPriceChart(canvasId, stock, priceHistory, range) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const entries = _filterHistory(priceHistory[stock.ticker] || [], range || '3M');
    const labels = entries.map(e => {
      const d = new Date(e.time);
      if (range === '1D') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    });
    const data = entries.map(e => e.price);
    const trend = Market.getGlobalMarketTrend();

let lineColor;
let isUp;

if (trend === "bull") {
  lineColor = "#22c55e";
  isUp = true;
} else if (trend === "bear") {
  lineColor = "#ef4444";
  isUp = false;
} else {
  lineColor = "#888";
  isUp = true;
}
    // Update existing chart in-place for smooth animation
    if (priceChartInstance && priceChartInstance.canvas === canvas) {
      priceChartInstance.data.labels = labels;
      priceChartInstance.data.datasets[0].data = data;
      priceChartInstance.data.datasets[0].borderColor = lineColor;
      priceChartInstance.data.datasets[0].fill = true;
      priceChartInstance.data.datasets[0].backgroundColor = function(context) {
  const chart = context.chart;
  const { ctx, chartArea } = chart;
  if (!chartArea) return 'transparent';

  const trend = Market.getGlobalMarketTrend();

  if (trend === "bull") {
    return _gradientFill(ctx, chartArea, '#22c55e', '#22c55e', true);
  } else if (trend === "bear") {
    return _gradientFill(ctx, chartArea, '#ef4444', '#ef4444', false);
  } else {
    return _gradientFill(ctx, chartArea, '#888', '#888', true);
  }
};
     priceChartInstance.update(); 
      return priceChartInstance;
    }
    priceChartInstance = destroyChart(priceChartInstance);
    priceChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: lineColor,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: true,
          backgroundColor: function(context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'transparent';
            return _gradientFill(ctx, chartArea, '#00d4a8', '#ff4d6d', isUp);
          },
        }],
      },
      options: {
        ...baseConfig,
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: '#8892a4', maxTicksLimit: 6, maxRotation: 0 },
            border: { display: false },
          },
          y: {
            position: 'right',
            grid: { color: '#1e2a3d', drawBorder: false },
            ticks: {
              color: '#8892a4',
              callback: v => '$' + v.toFixed(2),
            },
            border: { display: false },
          },
        },
      },
    });
    return priceChartInstance;
  }
  function renderPortfolioChart(canvasId, portfolioHistory) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    portfolioChartInstance = destroyChart(portfolioChartInstance);
    const entries = (portfolioHistory || []).slice(-60);
    if (entries.length < 2) {
      portfolioChartInstance = null;
      return;
    }
    const labels = entries.map(e => {
      const d = new Date(e.date);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    const data = entries.map(e => e.value);
    const trend = Market.getGlobalMarketTrend();

let lineColor;
let isUp;

if (trend === "bull") {
  lineColor = "#22c55e";
  isUp = true;
} else if (trend === "bear") {
  lineColor = "#ef4444";
  isUp = false;
} else {
  lineColor = "#888";
  isUp = true;
}
    portfolioChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: lineColor,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.4,
          fill: true,
          backgroundColor: function(context) {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'transparent';
            return _gradientFill(ctx, chartArea, '#6c63ff', '#ff4d6d', isUp);
          },
        }],
      },
      options: {
        ...baseConfig,
        plugins: {
          ...baseConfig.plugins,
          tooltip: {
            ...baseConfig.plugins.tooltip,
            callbacks: {
              label: ctx => ' $' + ctx.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { display: false },
            border: { display: false },
          },
          y: {
            position: 'right',
            grid: { color: '#1e2a3d22', drawBorder: false },
            ticks: {
              color: '#8892a4',
              callback: v => '$' + v.toLocaleString(),
            },
            border: { display: false },
          },
        },
      },
    });
    return portfolioChartInstance;
  }
  function renderAllocationChart(canvasId, positions) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    allocationChartInstance = destroyChart(allocationChartInstance);
    const posArr = Object.values(positions || {}).filter(p => p.currentValue > 0);
    if (posArr.length === 0) return;
    const labels = posArr.map(p => p.ticker);
    const data = posArr.map(p => p.currentValue);
    const colors = posArr.map((_, i) => PALETTE[i % PALETTE.length]);
    allocationChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#0a0e1a', borderWidth: 3, hoverOffset: 6 }] },
      options: {
        ...baseConfig,
        cutout: '68%',
        plugins: {
          ...baseConfig.plugins,
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#8892a4',
              boxWidth: 10,
              boxHeight: 10,
              padding: 12,
              font: { size: 11 },
            },
          },
          tooltip: {
            ...baseConfig.plugins.tooltip,
            callbacks: {
              label: ctx => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return ` ${ctx.label}: $${ctx.parsed.toFixed(2)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
    return allocationChartInstance;
  }
  function renderMiniSparkline(canvasId, ticker, priceHistory) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const entries = (priceHistory[ticker] || []).slice(-30);
    if (entries.length < 2) return null;
    const data = entries.map(e => e.price);
    const isUp = data[data.length - 1] >= data[0];
    const lineColor = isUp ? '#00d4a8' : '#ff4d6d';
    // Update existing sparkline in-place instead of destroying/recreating
    if (sparklineInstances[canvasId] && sparklineInstances[canvasId].canvas === canvas) {
      const inst = sparklineInstances[canvasId];
      inst.data.labels = data.map(() => '');
      inst.data.datasets[0].data = data;
      inst.data.datasets[0].borderColor = lineColor;
      inst.update('none');
      return inst;
    }
    // Destroy old instance if canvas changed
    if (sparklineInstances[canvasId]) {
      try { sparklineInstances[canvasId].destroy(); } catch (_) {}
      delete sparklineInstances[canvasId];
    }
    const instance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(() => ''),
        datasets: [{
          data,
          borderColor: lineColor,
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3,
          fill: false,
        }],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
        elements: { line: { borderCapStyle: 'round' } },
      },
    });
    sparklineInstances[canvasId] = instance;
    return instance;
  }
  return {
    get priceChartInstance() { return priceChartInstance; },
    get portfolioChartInstance() { return portfolioChartInstance; },
    get allocationChartInstance() { return allocationChartInstance; },
    destroyChart,
    renderPriceChart,
    renderPortfolioChart,
    renderAllocationChart,
    renderMiniSparkline,
  };
})();

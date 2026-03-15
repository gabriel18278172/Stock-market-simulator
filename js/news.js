/**
 * news.js — Market news / events generator
 */

const NewsEngine = (() => {
  const NEWS_TEMPLATES = [
    { template: '{company} reports record quarterly earnings, beating analyst estimates.', impact: 0.035, sentiment: 'positive' },
    { template: '{company} announces major share buyback program worth billions.', impact: 0.028, sentiment: 'positive' },
    { template: '{company} reveals breakthrough product launch, driving investor excitement.', impact: 0.045, sentiment: 'positive' },
    { template: 'Analysts upgrade {company} to "Strong Buy" citing strong growth outlook.', impact: 0.022, sentiment: 'positive' },
    { template: '{company} signs landmark partnership deal expanding into new markets.', impact: 0.030, sentiment: 'positive' },
    { template: '{company} raises full-year guidance above Wall Street expectations.', impact: 0.033, sentiment: 'positive' },
    { template: '{company} achieves major regulatory approval for flagship product.', impact: 0.040, sentiment: 'positive' },
    { template: '{company} dividend increased by 15%, signalling strong cash generation.', impact: 0.018, sentiment: 'positive' },
    { template: '{company} reports surprise profit after months of restructuring.', impact: 0.027, sentiment: 'positive' },
    { template: '{company} stock added to major index, boosting institutional demand.', impact: 0.020, sentiment: 'positive' },
    { template: '{company} misses earnings expectations, shares fall sharply.', impact: -0.038, sentiment: 'negative' },
    { template: '{company} faces class-action lawsuit over product defects.', impact: -0.042, sentiment: 'negative' },
    { template: '{company} issues profit warning amid slowing demand conditions.', impact: -0.050, sentiment: 'negative' },
    { template: 'Regulators launch antitrust investigation into {company} practices.', impact: -0.055, sentiment: 'negative' },
    { template: '{company} announces significant workforce reduction of 8%.', impact: -0.025, sentiment: 'negative' },
    { template: '{company} CFO resigns unexpectedly, raising governance concerns.', impact: -0.035, sentiment: 'negative' },
    { template: '{company} recalls major product line following safety complaints.', impact: -0.048, sentiment: 'negative' },
    { template: '{company} cuts dividend to preserve cash amid margin pressure.', impact: -0.030, sentiment: 'negative' },
    { template: '{company} loses key contract to rival, clouding revenue outlook.', impact: -0.022, sentiment: 'negative' },
    { template: '{company} faces supply chain disruption impacting production targets.', impact: -0.020, sentiment: 'negative' },
    { template: '{company} maintains steady outlook amid mixed market conditions.', impact: 0.005, sentiment: 'neutral' },
    { template: 'Investors watch {company} closely ahead of upcoming earnings release.', impact: 0.004, sentiment: 'neutral' },
    { template: '{company} restructures executive leadership team for next growth phase.', impact: -0.005, sentiment: 'neutral' },
    { template: '{company} holds annual shareholder meeting with no major announcements.', impact: 0.002, sentiment: 'neutral' },
    { template: '{company} updates product roadmap in line with prior guidance.', impact: 0.006, sentiment: 'neutral' },
  ];

  let recentNews = [];
  let _intervalId = null;

  function generateNewsEvent(stocks) {
    if (!stocks || stocks.length === 0) return null;
    const stock = stocks[Math.floor(Math.random() * stocks.length)];
    const template = NEWS_TEMPLATES[Math.floor(Math.random() * NEWS_TEMPLATES.length)];
    const headline = template.template.replace('{company}', stock.name);

    // Apply impact to price (cap at ±8%)
    const impact = Math.max(-0.08, Math.min(0.08, template.impact));
    stock.price = parseFloat(Math.max(0.50, stock.price * (1 + impact)).toFixed(2));

    const item = {
      id: 'news_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      headline,
      ticker: stock.ticker,
      company: stock.name,
      impact: template.impact,
      sentiment: template.sentiment,
      timestamp: Date.now(),
    };

    recentNews.unshift(item);
    if (recentNews.length > 10) recentNews = recentNews.slice(0, 10);
    return item;
  }

  function scheduleNews(stocks, callback) {
    function fire() {
      const item = generateNewsEvent(stocks);
      if (item && typeof callback === 'function') callback(item);
      // Schedule next event between 15-45 seconds
      const delay = 15000 + Math.random() * 30000;
      _intervalId = setTimeout(fire, delay);
    }
    const initialDelay = 8000 + Math.random() * 10000;
    _intervalId = setTimeout(fire, initialDelay);
  }

  function stopNews() {
    if (_intervalId !== null) {
      clearTimeout(_intervalId);
      _intervalId = null;
    }
  }

  return { NEWS_TEMPLATES, get recentNews() { return recentNews; }, generateNewsEvent, scheduleNews, stopNews };
})();

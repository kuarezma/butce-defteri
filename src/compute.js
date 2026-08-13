import { transactionsInMonth, shiftPeriod } from './state.js';
import { categoryById } from './data/categories.js';
import { CATEGORY_CHART_CAP } from './palette.js';

export function monthTotals(state, period) {
  const txs = transactionsInMonth(state, period);
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense, count: txs.length };
}

/** Kategoriye göre kırılım, büyükten küçüğe sıralı. `cap` üstü tek dilimde "Diğer"e katlanır. */
export function categoryBreakdown(state, period, type, cap = CATEGORY_CHART_CAP) {
  const txs = transactionsInMonth(state, period).filter((t) => t.type === type);
  const sums = new Map();
  for (const t of txs) sums.set(t.categoryId, (sums.get(t.categoryId) || 0) + t.amount);

  const rows = [...sums.entries()]
    .map(([categoryId, amount]) => ({ categoryId, category: categoryById(categoryId, state.customCategories), amount }))
    .sort((a, b) => b.amount - a.amount);

  if (rows.length <= cap) return rows;

  const head = rows.slice(0, cap - 1);
  const tailSum = rows.slice(cap - 1).reduce((s, r) => s + r.amount, 0);
  head.push({ categoryId: '__other__', category: { id: '__other__', name: 'Diğer', icon: '…' }, amount: tailSum });
  return head;
}

/** Son `n` ay için gelir/gider serisi, en eskiden en yeniye. */
export function trendSeries(state, currentPeriod, n = 6) {
  const periods = [];
  let p = currentPeriod;
  for (let i = 0; i < n; i += 1) {
    periods.unshift(p);
    p = shiftPeriod(p, -1);
  }
  return periods.map((period) => ({ period, ...monthTotals(state, period) }));
}

/** Bütçe limiti tanımlı her kategori için kullanım durumu, en kritikten aza sıralı. */
export function budgetStatus(state, period) {
  const txs = transactionsInMonth(state, period).filter((t) => t.type === 'expense');
  const spent = new Map();
  for (const t of txs) spent.set(t.categoryId, (spent.get(t.categoryId) || 0) + t.amount);

  const rows = Object.entries(state.budgets).map(([categoryId, limit]) => {
    const used = spent.get(categoryId) || 0;
    const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;
    let severity = 'good';
    if (percent >= 100) severity = 'critical';
    else if (percent >= 90) severity = 'serious';
    else if (percent >= 70) severity = 'warning';
    return { categoryId, category: categoryById(categoryId, state.customCategories), limit, used, percent, severity };
  });

  return rows.sort((a, b) => b.percent - a.percent);
}

/**
 * Son `n` ayın (mevcut ay hariç, kapanmış aylar) ortalama gideri.
 * "Future-Proof Canvas" planındaki f1-butce-tabani maddesinin ("aylık gider
 * tabanını ölç") doğrudan girdisi — acil durum fonu hedefi buna göre hesaplanır.
 */
export function trailingAverageExpense(state, currentPeriod, n = 3) {
  let p = shiftPeriod(currentPeriod, -1);
  let sum = 0;
  let counted = 0;
  for (let i = 0; i < n; i += 1) {
    const t = monthTotals(state, p);
    if (t.count > 0) {
      sum += t.expense;
      counted += 1;
    }
    p = shiftPeriod(p, -1);
  }
  return counted > 0 ? Math.round(sum / counted) : 0;
}

/** Gelirin ne kadarının tasarruf edildiğini (%) hesaplar. */
export function savingsRate(totals) {
  if (!totals || totals.income <= 0) return 0;
  return Math.round(((totals.income - totals.expense) / totals.income) * 100);
}

/**
 * Geçerli ay ile önceki ayın kategori harcamalarını karşılaştırır.
 */
export function categoryComparison(state, currentPeriod, type = 'expense') {
  const prevPeriod = shiftPeriod(currentPeriod, -1);
  const currentTxs = transactionsInMonth(state, currentPeriod).filter((t) => t.type === type);
  const prevTxs = transactionsInMonth(state, prevPeriod).filter((t) => t.type === type);

  const currentSums = new Map();
  for (const t of currentTxs) currentSums.set(t.categoryId, (currentSums.get(t.categoryId) || 0) + t.amount);

  const prevSums = new Map();
  for (const t of prevTxs) prevSums.set(t.categoryId, (prevSums.get(t.categoryId) || 0) + t.amount);

  const allCatIds = new Set([...currentSums.keys(), ...prevSums.keys()]);
  const rows = [];

  for (const categoryId of allCatIds) {
    const cur = currentSums.get(categoryId) || 0;
    const prev = prevSums.get(categoryId) || 0;
    const diff = cur - prev;
    const diffPercent = prev > 0 ? Math.round((diff / prev) * 100) : cur > 0 ? 100 : 0;
    rows.push({
      categoryId,
      category: categoryById(categoryId, state.customCategories) || { id: categoryId, name: 'Diğer', icon: '🔹' },
      currentAmount: cur,
      prevAmount: prev,
      diff,
      diffPercent,
    });
  }

  return rows.sort((a, b) => b.currentAmount - a.currentAmount);
}

/**
 * 50/30/20 Kural Analizi:
 * İhtiyaçlar (%50), İstekler (%30), Tasarruf (%20).
 */
export function computeFiftyThirtyTwenty(state, period) {
  const totals = monthTotals(state, period);
  const txs = transactionsInMonth(state, period).filter((t) => t.type === 'expense');

  let needsAmount = 0;
  let wantsAmount = 0;

  for (const t of txs) {
    const cat = categoryById(t.categoryId, state.customCategories);
    if (cat && cat.bucket === 'needs') {
      needsAmount += t.amount;
    } else {
      wantsAmount += t.amount;
    }
  }

  const netSavings = Math.max(totals.net, 0);
  const base = totals.income > 0 ? totals.income : (needsAmount + wantsAmount);

  const needsPct = base > 0 ? Math.round((needsAmount / base) * 100) : 0;
  const wantsPct = base > 0 ? Math.round((wantsAmount / base) * 100) : 0;
  const savingsPct = totals.income > 0 ? Math.round((netSavings / totals.income) * 100) : 0;

  let evaluation = '';
  let statusTone = 'info';

  if (totals.income <= 0) {
    evaluation = '50/30/20 analizi için bu aya gelir işlemi ekleyin.';
    statusTone = 'neutral';
  } else if (totals.net < 0) {
    evaluation = 'Bu ay giderler geliri aşıyor. Bütçe açığını kapatmak için istek harcamalarını kısabilirsiniz.';
    statusTone = 'critical';
  } else if (needsPct <= 55 && wantsPct <= 35 && savingsPct >= 15) {
    evaluation = 'Harika bütçe yönetimi! Harcamalarınız ve tasarrufunuz ideal dengede. 🌟';
    statusTone = 'good';
  } else if (needsPct > 55) {
    evaluation = `Zorunlu ihtiyaç harcamaları gelirin %${needsPct}'ini kapsıyor (hedef: %50).`;
    statusTone = 'warning';
  } else if (wantsPct > 35) {
    evaluation = `İstek harcamaları gelirin %${wantsPct}'ini buldu (hedef: %30).`;
    statusTone = 'warning';
  } else {
    evaluation = 'Dengeli bir bütçe dağılımı mevcut.';
    statusTone = 'good';
  }

  return {
    income: totals.income,
    expense: totals.expense,
    net: totals.net,
    needsAmount,
    wantsAmount,
    savingsAmount: netSavings,
    needsPct,
    wantsPct,
    savingsPct,
    evaluation,
    statusTone,
  };
}

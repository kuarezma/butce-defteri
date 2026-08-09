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
    .map(([categoryId, amount]) => ({ categoryId, category: categoryById(categoryId), amount }))
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
    return { categoryId, category: categoryById(categoryId), limit, used, percent, severity };
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

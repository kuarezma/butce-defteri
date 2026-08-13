import { describe, it, expect } from 'vitest';
import { normalize, addTransaction, setBudget, addCustomCategory } from '../src/state.js';
import {
  monthTotals,
  categoryBreakdown,
  trendSeries,
  budgetStatus,
  trailingAverageExpense,
  savingsRate,
  categoryComparison,
  computeFiftyThirtyTwenty,
} from '../src/compute.js';

describe('compute.js unit tests', () => {
  it('monthTotals correctly calculates income, expense, net and count', () => {
    const s = normalize({});
    addTransaction(s, { type: 'income', amount: 50000, categoryId: 'gelir-maas', date: '2026-08-01' });
    addTransaction(s, { type: 'expense', amount: 15000, categoryId: 'gider-konut', date: '2026-08-05' });
    addTransaction(s, { type: 'expense', amount: 5000, categoryId: 'gider-market', date: '2026-08-10' });

    const totals = monthTotals(s, '2026-08');
    expect(totals.income).toBe(50000);
    expect(totals.expense).toBe(20000);
    expect(totals.net).toBe(30000);
    expect(totals.count).toBe(3);
  });

  it('savingsRate calculates percentage correctly', () => {
    expect(savingsRate({ income: 50000, expense: 20000 })).toBe(60);
    expect(savingsRate({ income: 20000, expense: 25000 })).toBe(-25);
    expect(savingsRate({ income: 0, expense: 5000 })).toBe(0);
  });

  it('categoryBreakdown sorts categories descending and respects cap', () => {
    const s = normalize({});
    addTransaction(s, { type: 'expense', amount: 3000, categoryId: 'gider-market', date: '2026-08-01' });
    addTransaction(s, { type: 'expense', amount: 15000, categoryId: 'gider-konut', date: '2026-08-02' });
    addTransaction(s, { type: 'expense', amount: 1200, categoryId: 'gider-fatura', date: '2026-08-03' });

    const breakdown = categoryBreakdown(s, '2026-08', 'expense');
    expect(breakdown[0].categoryId).toBe('gider-konut');
    expect(breakdown[0].amount).toBe(15000);
    expect(breakdown[1].categoryId).toBe('gider-market');
    expect(breakdown[1].amount).toBe(3000);
  });

  it('budgetStatus computes severity correctly', () => {
    const s = normalize({});
    setBudget(s, 'gider-market', 1000);
    setBudget(s, 'gider-ulasim', 1000);

    addTransaction(s, { type: 'expense', amount: 750, categoryId: 'gider-market', date: '2026-08-01' });
    addTransaction(s, { type: 'expense', amount: 1100, categoryId: 'gider-ulasim', date: '2026-08-01' });

    const status = budgetStatus(s, '2026-08');
    const ulasim = status.find((x) => x.categoryId === 'gider-ulasim');
    const market = status.find((x) => x.categoryId === 'gider-market');

    expect(ulasim.severity).toBe('critical'); // >= 100%
    expect(market.severity).toBe('warning');  // >= 70%
  });

  it('trailingAverageExpense averages past closed months', () => {
    const s = normalize({});
    // July 2026: 10000
    addTransaction(s, { type: 'expense', amount: 10000, categoryId: 'gider-market', date: '2026-07-10' });
    // June 2026: 20000
    addTransaction(s, { type: 'expense', amount: 20000, categoryId: 'gider-market', date: '2026-06-10' });

    const avg = trailingAverageExpense(s, '2026-08', 2);
    expect(avg).toBe(15000);
  });

  it('categoryComparison calculates month-over-month differences', () => {
    const s = normalize({});
    addTransaction(s, { type: 'expense', amount: 4000, categoryId: 'gider-market', date: '2026-08-05' });
    addTransaction(s, { type: 'expense', amount: 2000, categoryId: 'gider-market', date: '2026-07-05' });

    const comp = categoryComparison(s, '2026-08', 'expense');
    const market = comp.find((c) => c.categoryId === 'gider-market');
    expect(market.currentAmount).toBe(4000);
    expect(market.prevAmount).toBe(2000);
    expect(market.diff).toBe(2000);
    expect(market.diffPercent).toBe(100);
  });

  it('computeFiftyThirtyTwenty correctly breaks down needs, wants and savings', () => {
    const s = normalize({});
    addTransaction(s, { type: 'income', amount: 10000, categoryId: 'gelir-maas', date: '2026-08-01' });
    addTransaction(s, { type: 'expense', amount: 5000, categoryId: 'gider-konut', date: '2026-08-02' }); // needs (50%)
    addTransaction(s, { type: 'expense', amount: 3000, categoryId: 'gider-eglence', date: '2026-08-03' }); // wants (30%)

    const custom = addCustomCategory(s, { type: 'expense', name: 'Hobi', icon: '🎨', bucket: 'wants' });
    addTransaction(s, { type: 'expense', amount: 500, categoryId: custom.id, date: '2026-08-04' }); // wants (+5%)

    const ftt = computeFiftyThirtyTwenty(s, '2026-08');
    expect(ftt.needsAmount).toBe(5000);
    expect(ftt.wantsAmount).toBe(3500);
    expect(ftt.savingsAmount).toBe(1500); // 10000 - 8500
    expect(ftt.needsPct).toBe(50);
    expect(ftt.wantsPct).toBe(35);
    expect(ftt.savingsPct).toBe(15);
  });
});

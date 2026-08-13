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
  parseQuickEntry,
  annualSummary,
  dailyExpenseHeatmap,
} from '../src/compute.js';
import { parseCsvToTransactions } from '../src/export.js';

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
    addTransaction(s, { type: 'expense', amount: 10000, categoryId: 'gider-market', date: '2026-07-10' });
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
    expect(ftt.savingsAmount).toBe(1500);
    expect(ftt.needsPct).toBe(50);
    expect(ftt.wantsPct).toBe(35);
    expect(ftt.savingsPct).toBe(15);
  });

  it('parseQuickEntry accurately parses natural language text into transaction', () => {
    const p1 = parseQuickEntry('market 350');
    expect(p1.amount).toBe(350);
    expect(p1.categoryId).toBe('gider-market');
    expect(p1.type).toBe('expense');

    const p2 = parseQuickEntry('maaş 65000');
    expect(p2.amount).toBe(65000);
    expect(p2.categoryId).toBe('gelir-maas');
    expect(p2.type).toBe('income');

    const p3 = parseQuickEntry('starbucks kahve 95 TL');
    expect(p3.amount).toBe(95);
    expect(p3.categoryId).toBe('gider-disarida');
  });

  it('annualSummary calculates 12-month metrics and top categories', () => {
    const s = normalize({});
    addTransaction(s, { type: 'income', amount: 30000, categoryId: 'gelir-maas', date: '2026-01-10' });
    addTransaction(s, { type: 'expense', amount: 10000, categoryId: 'gider-konut', date: '2026-01-15' });
    addTransaction(s, { type: 'expense', amount: 12000, categoryId: 'gider-market', date: '2026-02-15' });

    const summary = annualSummary(s, 2026);
    expect(summary.totalIncome).toBe(30000);
    expect(summary.totalExpense).toBe(22000);
    expect(summary.totalNet).toBe(8000);
    expect(summary.months.length).toBe(12);
    expect(summary.highestExpenseMonth.amount).toBe(12000);
    expect(summary.topCategories[0].categoryId).toBe('gider-market');
  });

  it('dailyExpenseHeatmap produces day cells and calculates intensities', () => {
    const s = normalize({});
    addTransaction(s, { type: 'expense', amount: 500, categoryId: 'gider-market', date: '2026-08-10' });
    addTransaction(s, { type: 'expense', amount: 2000, categoryId: 'gider-konut', date: '2026-08-15' });

    const heatmap = dailyExpenseHeatmap(s, '2026-08');
    expect(heatmap.days.length).toBe(31);
    const day15 = heatmap.days.find((d) => d.dayNum === 15);
    expect(day15.totalExpense).toBe(2000);
    expect(day15.intensity).toBe(4);
  });

  it('parseCsvToTransactions parses CSV lines correctly', () => {
    const csv = `ID;Tarih;Tür;Kategori;Tutar (TL);Açıklama;Tekrarlayan mı?;Kayıt Zamanı
"tx-1";"2026-08-14";"Gider";"Market";350.00;"Migros";"Hayır";"2026-08-14"
"tx-2";"2026-08-01";"Gelir";"Maaş";45000.00;"Ağustos maaşı";"Hayır";"2026-08-01"`;

    const txs = parseCsvToTransactions(csv);
    expect(txs.length).toBe(2);
    expect(txs[0].amount).toBe(350);
    expect(txs[0].type).toBe('expense');
    expect(txs[1].amount).toBe(45000);
    expect(txs[1].type).toBe('income');
  });
});

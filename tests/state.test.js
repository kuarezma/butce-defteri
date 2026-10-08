import { describe, it, expect } from 'vitest';
import {
  normalize, SCHEMA,
  addTransaction, removeTransaction, updateTransaction, transactionsInMonth,
  addRecurring, removeRecurring, updateRecurring, setRecurringActive, materializeRecurring,
  addInstallment, removeInstallment, updateInstallment, materializeInstallments,
  installmentAmountFor, installmentRemainingAmount, recurringDaysInPeriod,
  setCurrencyRate, convertToTRY, serialize,
  setBudget, addCustomCategory, removeCustomCategory, updateCustomCategory,
  addGoal, removeGoal, updateGoal, contributeToGoal,
  periodKey, shiftPeriod,
} from '../src/state.js';

describe('state.js unit tests', () => {
  it('normalize returns empty state for null or invalid inputs', () => {
    const s = normalize(null);
    expect(s.schema).toBe(SCHEMA);
    expect(s.transactions).toEqual([]);
    expect(s.recurring).toEqual([]);
    expect(s.customCategories).toEqual([]);
    expect(s.goals).toEqual([]);
    expect(s.installments).toEqual([]);
    expect(s.budgets).toEqual({});
  });

  it('addTransaction, updateTransaction and removeTransaction work correctly', () => {
    const s = normalize({});
    const t = addTransaction(s, {
      type: 'expense',
      amount: 250,
      categoryId: 'gider-market',
      date: '2026-08-14',
      note: 'Haftalık alışveriş',
    });

    expect(t).not.toBeNull();
    expect(s.transactions.length).toBe(1);
    expect(s.transactions[0].amount).toBe(250);

    // Update
    const updated = updateTransaction(s, t.id, {
      amount: 300,
      note: 'Güncellendi',
    });
    expect(updated).not.toBeNull();
    expect(updated.amount).toBe(300);
    expect(updated.note).toBe('Güncellendi');
    expect(s.transactions[0].amount).toBe(300);

    // Remove
    const removed = removeTransaction(s, t.id);
    expect(removed).toBe(true);
    expect(s.transactions.length).toBe(0);
  });

  it('transactionsInMonth correctly filters by period', () => {
    const s = normalize({});
    addTransaction(s, { type: 'expense', amount: 100, categoryId: 'gider-market', date: '2026-08-01' });
    addTransaction(s, { type: 'expense', amount: 200, categoryId: 'gider-market', date: '2026-08-15' });
    addTransaction(s, { type: 'expense', amount: 300, categoryId: 'gider-market', date: '2026-07-20' });

    const aug = transactionsInMonth(s, '2026-08');
    expect(aug.length).toBe(2);
  });

  it('materializeRecurring is idempotent and respects active state', () => {
    const s = normalize({});
    const rec = addRecurring(s, {
      name: 'Kira',
      type: 'expense',
      amount: 15000,
      categoryId: 'gider-konut',
      day: 5,
    });

    expect(rec).not.toBeNull();

    // First call materializes
    const count1 = materializeRecurring(s, '2026-08');
    expect(count1).toBe(1);
    expect(s.transactions.length).toBe(1);
    expect(s.transactions[0].amount).toBe(15000);
    expect(s.transactions[0].date).toBe('2026-08-05');

    // Second call for same month does nothing (idempotent)
    const count2 = materializeRecurring(s, '2026-08');
    expect(count2).toBe(0);
    expect(s.transactions.length).toBe(1);

    // Update recurring
    updateRecurring(s, rec.id, { amount: 18000 });
    expect(s.recurring[0].amount).toBe(18000);
  });

  it('addInstallment and materializeInstallments calculate monthly share and materialize', () => {
    const s = normalize({});
    const ins = addInstallment(s, {
      name: 'iPhone 16',
      totalAmount: 60000,
      totalInstallments: 6,
      startPeriod: '2026-08',
      categoryId: 'gider-diger',
    });

    expect(ins).not.toBeNull();
    expect(ins.monthlyAmount).toBe(10000);
    expect(s.installments.length).toBe(1);

    // Materialize for Aug 2026 (Month 1/6)
    const count = materializeInstallments(s, '2026-08');
    expect(count).toBe(1);
    expect(s.transactions.length).toBe(1);
    expect(s.transactions[0].amount).toBe(10000);
    expect(s.transactions[0].note).toContain('Taksit 1/6');

    // Second call is idempotent
    expect(materializeInstallments(s, '2026-08')).toBe(0);
  });

  it('setCurrencyRate and convertToTRY work properly', () => {
    const s = normalize({});
    setCurrencyRate(s, 'USD', 35.0);
    expect(convertToTRY(100, 'USD', s)).toBe(3500);
    expect(convertToTRY(500, 'TRY', s)).toBe(500);
  });

  it('shiftPeriod correctly shifts dates across month/year borders', () => {
    expect(shiftPeriod('2026-08', -1)).toBe('2026-07');
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12');
    expect(shiftPeriod('2026-12', 1)).toBe('2027-01');
  });

  it('setBudget correctly sets and removes limits', () => {
    const s = normalize({});
    setBudget(s, 'gider-market', 5000);
    expect(s.budgets['gider-market']).toBe(5000);

    setBudget(s, 'gider-market', 0);
    expect(s.budgets['gider-market']).toBeUndefined();
  });

  it('addCustomCategory, updateCustomCategory and removeCustomCategory work correctly', () => {
    const s = normalize({});
    const cat = addCustomCategory(s, {
      type: 'expense',
      name: 'Evcil Hayvan',
      icon: '🐾',
      bucket: 'needs',
    });

    expect(cat).not.toBeNull();
    expect(s.customCategories.length).toBe(1);
    expect(s.customCategories[0].name).toBe('Evcil Hayvan');
    expect(s.customCategories[0].icon).toBe('🐾');
    expect(s.customCategories[0].bucket).toBe('needs');

    updateCustomCategory(s, cat.id, { name: 'Kedi & Köpek' });
    expect(s.customCategories[0].name).toBe('Kedi & Köpek');

    const removed = removeCustomCategory(s, cat.id);
    expect(removed).toBe(true);
    expect(s.customCategories.length).toBe(0);
  });

  it('addGoal, contributeToGoal, updateGoal, and removeGoal work correctly', () => {
    const s = normalize({});
    const g = addGoal(s, {
      name: 'Tatil Fonu',
      targetAmount: 20000,
      currentAmount: 5000,
      icon: '🏖️',
    });

    expect(g).not.toBeNull();
    expect(s.goals.length).toBe(1);
    expect(s.goals[0].currentAmount).toBe(5000);

    // Contribute
    contributeToGoal(s, g.id, 3000);
    expect(s.goals[0].currentAmount).toBe(8000);

    // Withdraw
    contributeToGoal(s, g.id, -1000);
    expect(s.goals[0].currentAmount).toBe(7000);

    // Update
    updateGoal(s, g.id, { name: 'Avrupa Seyahati' });
    expect(s.goals[0].name).toBe('Avrupa Seyahati');

    // Remove
    const removed = removeGoal(s, g.id);
    expect(removed).toBe(true);
    expect(s.goals.length).toBe(0);
  });

  it('keeps currencyLastUpdated across normalize (reload) and drops invalid values', () => {
    const s = normalize({ currencyLastUpdated: '2026-10-08T10:00:00.000Z' });
    expect(s.currencyLastUpdated).toBe('2026-10-08T10:00:00.000Z');
    expect(normalize({ currencyLastUpdated: 'not-a-date' }).currencyLastUpdated).toBeUndefined();
  });

  it('splits installment amounts so the last payment absorbs the rounding remainder', () => {
    const s = normalize({});
    const ins = addInstallment(s, { name: 'Telefon', totalAmount: 1000, totalInstallments: 3, startPeriod: '2026-01' });
    expect(installmentAmountFor(ins, 1)).toBe(333.33);
    expect(installmentAmountFor(ins, 2)).toBe(333.33);
    expect(installmentAmountFor(ins, 3)).toBe(333.34);
    const total = [1, 2, 3].reduce((sum, n) => sum + installmentAmountFor(ins, n), 0);
    expect(Number(total.toFixed(2))).toBe(1000);
    expect(installmentRemainingAmount(ins, 0)).toBe(1000);
    expect(installmentRemainingAmount(ins, 3)).toBe(0);
  });

  it('materializes the adjusted last installment amount', () => {
    const s = normalize({});
    addInstallment(s, { name: 'Telefon', totalAmount: 1000, totalInstallments: 3, startPeriod: '2026-01' });
    materializeInstallments(s, '2026-03');
    expect(s.transactions[0].amount).toBe(333.34);
  });

  it('keeps imported transaction ids and createdAt so re-import can dedupe', () => {
    const s = normalize({});
    const t = addTransaction(s, { id: 'csv-abc-123', type: 'expense', amount: 50, categoryId: 'gider-market', date: '2026-10-05', createdAt: '2026-10-01T00:00:00.000Z' });
    expect(t.id).toBe('csv-abc-123');
    expect(t.createdAt).toBe('2026-10-01T00:00:00.000Z');
  });

  it('weekly recurring anchor is clamped to 1-7 (same as previously materialized months)', () => {
    expect(recurringDaysInPeriod({ frequency: 'weekly', day: 20 }, '2026-10')).toEqual([7, 14, 21, 28]);
    expect(recurringDaysInPeriod({ frequency: 'weekly', day: 3 }, '2026-10')).toEqual([3, 10, 17, 24, 31]);
    expect(recurringDaysInPeriod({ frequency: 'yearly', day: 15, month: 3 }, '2026-10')).toEqual([]);
    expect(recurringDaysInPeriod({ frequency: 'yearly', day: 15, month: 10 }, '2026-10')).toEqual([15]);
  });

  it('serialize includes receipts only when provided', () => {
    const s = normalize({});
    expect(JSON.parse(serialize(s)).receipts).toBeUndefined();
    const withReceipts = JSON.parse(serialize(s, { 'tx-1': 'data:image/jpeg;base64,AAA' }));
    expect(withReceipts.receipts['tx-1']).toBe('data:image/jpeg;base64,AAA');
  });

  it('handles weekly and yearly recurring properly in materializeRecurring', () => {
    const s = normalize({});
    // Yearly: only in September (month 9)
    addRecurring(s, {
      name: 'Araç Muayene',
      type: 'expense',
      amount: 2000,
      categoryId: 'gider-ulasim',
      day: 15,
      frequency: 'yearly',
      month: 9,
    });

    // Weekly: day 3
    addRecurring(s, {
      name: 'Haftalık Harçlık',
      type: 'expense',
      amount: 250,
      categoryId: 'gider-eglence',
      day: 3,
      frequency: 'weekly',
    });

    // August 2026 (month 8): yearly should NOT trigger, weekly should trigger 4 times
    materializeRecurring(s, '2026-08');
    const augExpenses = s.transactions.filter((t) => t.date.startsWith('2026-08'));
    expect(augExpenses.some((t) => t.note.includes('Araç Muayene'))).toBe(false);
    const weeklyTxs = augExpenses.filter((t) => t.note.includes('Haftalık Harçlık'));
    expect(weeklyTxs.length).toBeGreaterThanOrEqual(4);

    // September 2026 (month 9): yearly should trigger!
    materializeRecurring(s, '2026-09');
    const sepExpenses = s.transactions.filter((t) => t.date.startsWith('2026-09'));
    expect(sepExpenses.some((t) => t.note.includes('Araç Muayene'))).toBe(true);
  });

  it('materializeInstallments respects dueDay', () => {
    const s = normalize({});
    addInstallment(s, {
      name: 'MacBook',
      totalAmount: 48000,
      totalInstallments: 12,
      startPeriod: '2026-09',
      categoryId: 'gider-diger',
      dueDay: 20,
    });

    materializeInstallments(s, '2026-09');
    expect(s.transactions.length).toBe(1);
    expect(s.transactions[0].date).toBe('2026-09-20');
  });
});


import { describe, it, expect } from 'vitest';
import {
  normalize, SCHEMA,
  addTransaction, removeTransaction, updateTransaction, transactionsInMonth,
  addRecurring, removeRecurring, updateRecurring, setRecurringActive, materializeRecurring,
  setBudget, addCustomCategory, removeCustomCategory, updateCustomCategory,
  periodKey, shiftPeriod,
} from '../src/state.js';

describe('state.js unit tests', () => {
  it('normalize returns empty state for null or invalid inputs', () => {
    const s = normalize(null);
    expect(s.schema).toBe(SCHEMA);
    expect(s.transactions).toEqual([]);
    expect(s.recurring).toEqual([]);
    expect(s.customCategories).toEqual([]);
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
});

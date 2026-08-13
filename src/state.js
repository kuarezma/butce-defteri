/**
 * Durum katmanı: şema versiyonlu localStorage, bozuk veriye dayanıklı,
 * dışa/içe aktarılabilir. Deseni "Future-Proof Canvas" projesinden alındı.
 */

const KEY = 'butceDefteri.v1';
export const SCHEMA = 1;

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function emptyState() {
  const now = nowIso();
  return {
    schema: SCHEMA,
    transactions: [],
    recurring: [],
    customCategories: [], // [{ id, type, name, icon, bucket, active }]
    budgets: {}, // { [categoryId]: monthlyLimit }
    materialized: {}, // { "YYYY-MM": [recurringId, ...] }
    createdAt: now,
    updatedAt: now,
  };
}

function readRaw() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parseJson(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function normalizeCustomCategory(c) {
  if (!c || typeof c !== 'object') return null;
  if (typeof c.name !== 'string' || !c.name.trim()) return null;
  if (c.type !== 'income' && c.type !== 'expense') return null;
  const bucket = c.type === 'income' ? 'income' : (c.bucket === 'needs' ? 'needs' : 'wants');
  return {
    id: typeof c.id === 'string' && c.id ? c.id : `custom-${uid()}`,
    name: c.name.trim(),
    type: c.type,
    icon: typeof c.icon === 'string' && c.icon.trim() ? c.icon.trim() : '🏷️',
    bucket,
    active: c.active !== false,
  };
}

function normalizeTransaction(t) {
  if (!t || typeof t !== 'object') return null;
  const amount = Number(t.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (t.type !== 'income' && t.type !== 'expense') return null;
  if (typeof t.categoryId !== 'string' || !t.categoryId) return null;
  if (typeof t.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return null;
  return {
    id: typeof t.id === 'string' && t.id ? t.id : uid(),
    type: t.type,
    amount,
    categoryId: t.categoryId,
    date: t.date,
    note: typeof t.note === 'string' ? t.note : '',
    recurringId: typeof t.recurringId === 'string' ? t.recurringId : null,
    createdAt: typeof t.createdAt === 'string' ? t.createdAt : nowIso(),
  };
}

function normalizeRecurring(r) {
  if (!r || typeof r !== 'object') return null;
  const amount = Number(r.amount);
  const day = Number(r.day);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (r.type !== 'income' && r.type !== 'expense') return null;
  if (typeof r.categoryId !== 'string' || !r.categoryId) return null;
  if (!Number.isInteger(day) || day < 1 || day > 28) return null; // 28: her ayda güvenli gün
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    name: typeof r.name === 'string' && r.name ? r.name : 'Tekrarlayan işlem',
    type: r.type,
    amount,
    categoryId: r.categoryId,
    day,
    active: r.active !== false,
    note: typeof r.note === 'string' ? r.note : '',
  };
}

/** Dışarıdan gelen her kaydı bilinen şekle indirger; bozuk/eksik alanları atar. */
export function normalize(input) {
  const base = emptyState();
  if (!input || typeof input !== 'object') return base;

  const transactions = Array.isArray(input.transactions)
    ? input.transactions.map(normalizeTransaction).filter(Boolean)
    : [];

  const recurring = Array.isArray(input.recurring)
    ? input.recurring.map(normalizeRecurring).filter(Boolean)
    : [];

  const customCategories = Array.isArray(input.customCategories)
    ? input.customCategories.map(normalizeCustomCategory).filter(Boolean)
    : [];

  const budgets = {};
  if (input.budgets && typeof input.budgets === 'object') {
    for (const [categoryId, limit] of Object.entries(input.budgets)) {
      const n = Number(limit);
      if (Number.isFinite(n) && n > 0) budgets[categoryId] = n;
    }
  }

  const materialized = {};
  if (input.materialized && typeof input.materialized === 'object') {
    for (const [period, ids] of Object.entries(input.materialized)) {
      if (/^\d{4}-\d{2}$/.test(period) && Array.isArray(ids)) {
        materialized[period] = ids.filter((id) => typeof id === 'string');
      }
    }
  }

  return {
    schema: SCHEMA,
    transactions,
    recurring,
    customCategories,
    budgets,
    materialized,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : base.createdAt,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : base.updatedAt,
  };
}

export function load() {
  const parsed = parseJson(readRaw());
  return parsed ? normalize(parsed) : emptyState();
}

/** Kayıt başarısız olursa (kota, özel mod) sessizce yutulmaz — çağıran haberdar edilir. */
export function save(state) {
  state.updatedAt = nowIso();
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// ---------- İşlemler ----------

export function addTransaction(state, input) {
  const t = normalizeTransaction({ ...input, id: uid(), createdAt: nowIso() });
  if (!t) return null;
  state.transactions.push(t);
  return t;
}

export function removeTransaction(state, id) {
  const idx = state.transactions.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  state.transactions.splice(idx, 1);
  return true;
}

export function updateTransaction(state, id, updates) {
  const t = state.transactions.find((tx) => tx.id === id);
  if (!t) return null;
  const merged = { ...t, ...updates, id: t.id, createdAt: t.createdAt };
  const normalized = normalizeTransaction(merged);
  if (!normalized) return null;
  Object.assign(t, normalized);
  return t;
}

export function transactionsInMonth(state, periodKey) {
  return state.transactions.filter((t) => t.date.startsWith(periodKey));
}

// ---------- Tekrarlayan işlemler ----------

export function addRecurring(state, input) {
  const r = normalizeRecurring({ ...input, id: uid() });
  if (!r) return null;
  state.recurring.push(r);
  return r;
}

export function removeRecurring(state, id) {
  const idx = state.recurring.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  state.recurring.splice(idx, 1);
  return true;
}

export function updateRecurring(state, id, updates) {
  const r = state.recurring.find((rec) => rec.id === id);
  if (!r) return null;
  const merged = { ...r, ...updates, id: r.id };
  const normalized = normalizeRecurring(merged);
  if (!normalized) return null;
  Object.assign(r, normalized);
  return r;
}

export function setRecurringActive(state, id, active) {
  const r = state.recurring.find((x) => x.id === id);
  if (r) r.active = active;
}

/**
 * Bir ay için tanımlı tüm aktif tekrarlayan işlemleri o aya işler.
 * İdempotenttir: aynı ay ikinci kez çağrılırsa hiçbir şey eklemez —
 * `materialized[periodKey]` işlenen recurring id'lerini tutar.
 * Geriye yeni eklenen işlem sayısını döner.
 */
export function materializeRecurring(state, periodKey) {
  const done = new Set(state.materialized[periodKey] || []);
  let added = 0;
  for (const r of state.recurring) {
    if (!r.active || done.has(r.id)) continue;
    const [y, m] = periodKey.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate(); // ayın gerçek gün sayısı
    const day = Math.min(r.day, lastDay);
    const date = `${periodKey}-${String(day).padStart(2, '0')}`;
    addTransaction(state, {
      type: r.type,
      amount: r.amount,
      categoryId: r.categoryId,
      date,
      note: r.note,
      recurringId: r.id,
    });
    done.add(r.id);
    added += 1;
  }
  if (added > 0) state.materialized[periodKey] = [...done];
  return added;
}

export function setBudget(state, categoryId, limit) {
  const n = Number(limit);
  if (Number.isFinite(n) && n > 0) state.budgets[categoryId] = n;
  else delete state.budgets[categoryId];
}

// ---------- Özel Kategoriler ----------

export function addCustomCategory(state, input) {
  const c = normalizeCustomCategory({ ...input, id: `custom-${uid()}` });
  if (!c) return null;
  if (!state.customCategories) state.customCategories = [];
  state.customCategories.push(c);
  return c;
}

export function removeCustomCategory(state, id) {
  if (!state.customCategories) return false;
  const idx = state.customCategories.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  state.customCategories.splice(idx, 1);
  return true;
}

export function updateCustomCategory(state, id, updates) {
  if (!state.customCategories) return null;
  const c = state.customCategories.find((cat) => cat.id === id);
  if (!c) return null;
  const merged = { ...c, ...updates, id: c.id };
  const normalized = normalizeCustomCategory(merged);
  if (!normalized) return null;
  Object.assign(c, normalized);
  return c;
}

export function serialize(state) {
  return JSON.stringify({ ...state, schema: SCHEMA, exportedAt: nowIso() }, null, 2);
}

export function periodKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftPeriod(periodKeyStr, delta) {
  const [y, m] = periodKeyStr.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return periodKey(d);
}

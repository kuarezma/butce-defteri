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
    goals: [], // [{ id, name, targetAmount, currentAmount, targetDate, icon }]
    installments: [], // [{ id, name, totalAmount, monthlyAmount, totalInstallments, startPeriod, categoryId, note, active }]
    currencies: { USD: 33.5, EUR: 36.8, GBP: 43.0, GLD: 2600.0 },
    budgets: {}, // { [categoryId]: monthlyLimit }
    materialized: {}, // { "YYYY-MM": [recurringId, ...] }
    createdAt: now,
    updatedAt: now,
  };
}

function getStorage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
  } catch {}
  if (!globalThis._memStorage) {
    const store = new Map();
    globalThis._memStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
  }
  return globalThis._memStorage;
}

function readRaw() {
  try {
    return getStorage().getItem(KEY);
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

function normalizeGoal(g) {
  if (!g || typeof g !== 'object') return null;
  if (typeof g.name !== 'string' || !g.name.trim()) return null;
  const targetAmount = Number(g.targetAmount);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return null;
  const currentAmount = Number(g.currentAmount);
  return {
    id: typeof g.id === 'string' && g.id ? g.id : `goal-${uid()}`,
    name: g.name.trim(),
    targetAmount,
    currentAmount: Number.isFinite(currentAmount) && currentAmount >= 0 ? currentAmount : 0,
    targetDate: typeof g.targetDate === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(g.targetDate) ? g.targetDate : null,
    icon: typeof g.icon === 'string' && g.icon.trim() ? g.icon.trim() : '🎯',
    createdAt: typeof g.createdAt === 'string' ? g.createdAt : nowIso(),
  };
}

function normalizeInstallment(ins) {
  if (!ins || typeof ins !== 'object') return null;
  if (typeof ins.name !== 'string' || !ins.name.trim()) return null;
  const totalAmount = Number(ins.totalAmount);
  const totalInstallments = Number(ins.totalInstallments);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return null;
  if (!Number.isInteger(totalInstallments) || totalInstallments < 2 || totalInstallments > 60) return null;
  const monthlyAmount = Number((totalAmount / totalInstallments).toFixed(2));
  return {
    id: typeof ins.id === 'string' && ins.id ? ins.id : `inst-${uid()}`,
    name: ins.name.trim(),
    totalAmount,
    monthlyAmount,
    totalInstallments,
    startPeriod: typeof ins.startPeriod === 'string' && /^\d{4}-\d{2}$/.test(ins.startPeriod) ? ins.startPeriod : periodKey(),
    categoryId: typeof ins.categoryId === 'string' && ins.categoryId ? ins.categoryId : 'gider-diger',
    dueDay: Number.isInteger(Number(ins.dueDay)) && Number(ins.dueDay) >= 1 && Number(ins.dueDay) <= 28 ? Number(ins.dueDay) : 1,
    note: typeof ins.note === 'string' ? ins.note : '',
    active: ins.active !== false,
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
    currency: typeof t.currency === 'string' ? t.currency : 'TRY',
    originalAmount: Number.isFinite(Number(t.originalAmount)) && Number(t.originalAmount) > 0 ? Number(t.originalAmount) : amount,
    categoryId: t.categoryId,
    date: t.date,
    note: typeof t.note === 'string' ? t.note : '',
    recurringId: typeof t.recurringId === 'string' ? t.recurringId : null,
    installmentId: typeof t.installmentId === 'string' ? t.installmentId : null,
    hasReceipt: Boolean(t.hasReceipt || (typeof t.receiptImage === 'string' && t.receiptImage.startsWith('data:image/'))),
    receiptImage: typeof t.receiptImage === 'string' && t.receiptImage.startsWith('data:image/') ? t.receiptImage : null,
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
  const frequency = ['monthly', 'weekly', 'yearly'].includes(r.frequency) ? r.frequency : 'monthly';
  const month = frequency === 'yearly' && Number.isInteger(Number(r.month)) && Number(r.month) >= 1 && Number(r.month) <= 12 ? Number(r.month) : 1;
  return {
    id: typeof r.id === 'string' && r.id ? r.id : uid(),
    name: typeof r.name === 'string' && r.name ? r.name : 'Tekrarlayan işlem',
    type: r.type,
    amount,
    categoryId: r.categoryId,
    day,
    frequency,
    month: frequency === 'yearly' ? month : null,
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

  const goals = Array.isArray(input.goals)
    ? input.goals.map(normalizeGoal).filter(Boolean)
    : [];

  const installments = Array.isArray(input.installments)
    ? input.installments.map(normalizeInstallment).filter(Boolean)
    : [];

  const currencies = (input.currencies && typeof input.currencies === 'object')
    ? { ...base.currencies, ...input.currencies }
    : base.currencies;

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

  const currencyLastUpdated = typeof input.currencyLastUpdated === 'string' && !Number.isNaN(Date.parse(input.currencyLastUpdated))
    ? input.currencyLastUpdated
    : null;

  return {
    schema: SCHEMA,
    transactions,
    recurring,
    customCategories,
    goals,
    installments,
    currencies,
    budgets,
    materialized,
    ...(currencyLastUpdated ? { currencyLastUpdated } : {}),
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : base.createdAt,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : base.updatedAt,
  };
}

// Bozuk veya şemaya uymayan kayıtlar yüklemede atılır; bu sırada ham veri
// tek bir yedek anahtarında saklanır ki bir sonraki kayıt onu sessizce silmesin.
export const RAW_BACKUP_KEY = 'butceDefteri.v1.rawBackup';
// Geri yüklemeden hemen önceki kayıt; yanlış bir yedek seçilirse elle kurtarma için.
export const PRE_IMPORT_KEY = 'butceDefteri.v1.beforeImport';

let recoveredThisLoad = false;

function keepRawBackup(raw) {
  recoveredThisLoad = true;
  try {
    // Önceki ham kopya varsa üzerine yazılmaz: ilk bozulmanın içeriği en değerli olanıdır.
    const storage = getStorage();
    if (storage.getItem(RAW_BACKUP_KEY) === null) storage.setItem(RAW_BACKUP_KEY, raw);
  } catch {}
}

/** Bu oturumda yüklemede kayıt kurtarıldı/atlandı mı? (uyarı göstermek için) */
export function recoveredOnLoad() {
  return recoveredThisLoad;
}

/** Geri yüklemeden önce mevcut durumu saklar. Başarısızlıkta false döner, işlem yine yapılabilir. */
export function keepPreImportSnapshot(current) {
  try {
    getStorage().setItem(PRE_IMPORT_KEY, JSON.stringify(current));
    return true;
  } catch {
    return false;
  }
}

/** Yüklemede kurtarılamayan ham veri (yoksa null). Kullanıcı indirip geri yükleyebilir. */
export function getRawBackup() {
  try {
    return getStorage().getItem(RAW_BACKUP_KEY);
  } catch {
    return null;
  }
}

function countDropped(parsed, state) {
  const pairs = [
    ['transactions', state.transactions],
    ['recurring', state.recurring],
    ['installments', state.installments],
    ['goals', state.goals],
    ['customCategories', state.customCategories],
  ];
  return pairs.reduce((sum, [key, kept]) => {
    const incoming = Array.isArray(parsed[key]) ? parsed[key].length : 0;
    return sum + (incoming - kept.length);
  }, 0);
}

export function load() {
  const raw = readRaw();
  if (!raw) return emptyState();

  const parsed = parseJson(raw);
  if (!parsed) {
    keepRawBackup(raw);
    return emptyState();
  }

  const state = normalize(parsed);
  if (countDropped(parsed, state) > 0) keepRawBackup(raw);
  return state;
}

/** Kayıt başarısız olursa (kota, özel mod) sessizce yutulmaz — çağıran haberdar edilir. */
export function save(state) {
  state.updatedAt = nowIso();
  try {
    getStorage().setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// ---------- İşlemler ----------

export function addTransaction(state, input) {
  // Dışarıdan (CSV içe aktarma) gelen kimlik korunur; böylece tekrar içe aktarma çoğaltmaz.
  const t = normalizeTransaction({
    ...input,
    id: typeof input.id === 'string' && input.id ? input.id : uid(),
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : nowIso(),
  });
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
/**
 * Tekrarlayan bir kalemin verilen aydaki gün numaraları.
 * Aylık: r.day (ayın kısa olduğu durumda son güne kırpılır).
 * Yıllık: yalnızca r.month ayında, r.day günü.
 * Haftalık: 1-7 arası ilk gün, sonra her 7 günde bir, ay bitene kadar.
 *   Eski kayıtlar (r.day > 7) da min(day, 7) ile işlendi; kural değişirse
 *   geçmiş aylar yeniden işlenip mükerrer kayıt oluşur, bu yüzden değiştirilmedi.
 */
export function recurringDaysInPeriod(r, periodKeyStr) {
  const [y, m] = periodKeyStr.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const freq = r.frequency || 'monthly';

  if (freq === 'yearly') {
    return m === (r.month || 1) ? [Math.min(r.day, lastDay)] : [];
  }
  if (freq === 'weekly') {
    const days = [];
    for (let d = Math.min(Math.max(1, r.day || 1), 7); d <= lastDay; d += 7) days.push(d);
    return days;
  }
  return [Math.min(r.day, lastDay)];
}

function periodDate(periodKeyStr, day) {
  return `${periodKeyStr}-${String(day).padStart(2, '0')}`;
}

function recurringNote(r, suffix) {
  if (suffix) return `${r.name || ''}${r.note ? ' · ' + r.note : ''} (${suffix})`.trim();
  return r.note || r.name || '';
}

export function materializeRecurring(state, periodKeyStr) {
  const done = new Set(state.materialized[periodKeyStr] || []);
  let added = 0;

  for (const r of state.recurring) {
    if (!r.active) continue;
    const freq = r.frequency || 'monthly';
    const days = recurringDaysInPeriod(r, periodKeyStr);

    if (freq === 'weekly') {
      for (const d of days) {
        const date = periodDate(periodKeyStr, d);
        const subId = `${r.id}_${date}`;
        if (done.has(subId)) continue;
        addTransaction(state, {
          type: r.type,
          amount: r.amount,
          categoryId: r.categoryId,
          date,
          note: recurringNote(r, 'Haftalık'),
          recurringId: r.id,
        });
        done.add(subId);
        added += 1;
      }
    } else {
      if (days.length === 0 || done.has(r.id)) continue;
      addTransaction(state, {
        type: r.type,
        amount: r.amount,
        categoryId: r.categoryId,
        date: periodDate(periodKeyStr, days[0]),
        note: freq === 'yearly' ? recurringNote(r, 'Yıllık') : recurringNote(r),
        recurringId: r.id,
      });
      done.add(r.id);
      added += 1;
    }
  }
  if (added > 0) state.materialized[periodKeyStr] = [...done];
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

// ---------- Hedef Birikimler (Kumbara) ----------

export function addGoal(state, input) {
  const g = normalizeGoal({ ...input, id: `goal-${uid()}` });
  if (!g) return null;
  if (!state.goals) state.goals = [];
  state.goals.push(g);
  return g;
}

export function removeGoal(state, id) {
  if (!state.goals) return false;
  const idx = state.goals.findIndex((g) => g.id === id);
  if (idx === -1) return false;
  state.goals.splice(idx, 1);
  return true;
}

export function updateGoal(state, id, updates) {
  if (!state.goals) return null;
  const g = state.goals.find((goal) => goal.id === id);
  if (!g) return null;
  const merged = { ...g, ...updates, id: g.id };
  const normalized = normalizeGoal(merged);
  if (!normalized) return null;
  Object.assign(g, normalized);
  return g;
}

export function contributeToGoal(state, id, delta) {
  if (!state.goals) return null;
  const g = state.goals.find((goal) => goal.id === id);
  if (!g) return null;
  const d = Number(delta);
  if (!Number.isFinite(d)) return null;
  g.currentAmount = Math.max(0, g.currentAmount + d);
  return g;
}

// ---------- Taksitli Harcamalar (Installments) ----------

export function addInstallment(state, input) {
  const ins = normalizeInstallment({ ...input, id: `inst-${uid()}` });
  if (!ins) return null;
  if (!state.installments) state.installments = [];
  state.installments.push(ins);
  return ins;
}

export function removeInstallment(state, id) {
  if (!state.installments) return false;
  const idx = state.installments.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  state.installments.splice(idx, 1);
  return true;
}

export function updateInstallment(state, id, updates) {
  if (!state.installments) return null;
  const ins = state.installments.find((i) => i.id === id);
  if (!ins) return null;
  const merged = { ...ins, ...updates, id: ins.id };
  const normalized = normalizeInstallment(merged);
  if (!normalized) return null;
  Object.assign(ins, normalized);
  return ins;
}

/** Taksit numarası `installmentNum` (1'den başlar) için tutar. Son taksit kuruş farkını üstlenir. */
export function installmentAmountFor(ins, installmentNum) {
  if (installmentNum < ins.totalInstallments) return ins.monthlyAmount;
  return Number((ins.totalAmount - ins.monthlyAmount * (ins.totalInstallments - 1)).toFixed(2));
}

/** `paidCount` taksit ödendikten sonra kalan borç. */
export function installmentRemainingAmount(ins, paidCount) {
  if (paidCount >= ins.totalInstallments) return 0;
  return Number((ins.totalAmount - paidCount * ins.monthlyAmount).toFixed(2));
}

/** Verilen aydaki taksit ödeme günü; o ay taksit yoksa veya plan pasifse null. */
export function installmentDueDay(ins, periodKeyStr) {
  if (!ins.active) return null;
  const [startY, startM] = ins.startPeriod.split('-').map(Number);
  const [curY, curM] = periodKeyStr.split('-').map(Number);
  const monthDiff = (curY - startY) * 12 + (curM - startM);
  if (monthDiff < 0 || monthDiff >= ins.totalInstallments) return null;
  return Math.min(ins.dueDay || 1, 28);
}

/**
 * Bir ay için tanımlı aktif taksitleri o aya işler.
 */
export function materializeInstallments(state, periodKeyStr) {
  if (!state.installments || !Array.isArray(state.installments)) return 0;
  const done = new Set(state.materialized[periodKeyStr] || []);
  let added = 0;

  for (const ins of state.installments) {
    if (!ins.active || done.has(ins.id)) continue;
    const day = installmentDueDay(ins, periodKeyStr);
    if (day === null) continue;

    const [startY, startM] = ins.startPeriod.split('-').map(Number);
    const [curY, curM] = periodKeyStr.split('-').map(Number);
    const installmentNum = (curY - startY) * 12 + (curM - startM) + 1;
    addTransaction(state, {
      type: 'expense',
      amount: installmentAmountFor(ins, installmentNum),
      categoryId: ins.categoryId,
      date: `${periodKeyStr}-${String(day).padStart(2, '0')}`,
      note: `${ins.name} (Taksit ${installmentNum}/${ins.totalInstallments})`,
      installmentId: ins.id,
    });
    done.add(ins.id);
    added += 1;
  }

  if (added > 0) state.materialized[periodKeyStr] = [...done];
  return added;
}

// ---------- Para Birimi & Kur Yönetimi ----------

export function setCurrencyRate(state, code, rate) {
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) return false;
  if (!state.currencies) state.currencies = { USD: 33.5, EUR: 36.8, GBP: 43.0, GLD: 2600.0 };
  state.currencies[code.toUpperCase()] = r;
  return true;
}

export function setCurrencyRates(state, rates, updatedAt = nowIso()) {
  if (!state.currencies) state.currencies = { USD: 33.5, EUR: 36.8, GBP: 43.0, GLD: 2600.0 };
  if (rates && typeof rates === 'object') {
    for (const [code, rate] of Object.entries(rates)) {
      const r = Number(rate);
      if (Number.isFinite(r) && r > 0) {
        state.currencies[code.toUpperCase()] = Number(r.toFixed(2));
      }
    }
    state.currencyLastUpdated = updatedAt;
    return true;
  }
  return false;
}

export function convertToTRY(amount, currencyCode, state) {
  const num = Number(amount);
  if (!Number.isFinite(num)) return 0;
  const code = (currencyCode || 'TRY').toUpperCase();
  if (code === 'TRY') return num;
  const rate = state.currencies?.[code] || 1;
  return Number((num * rate).toFixed(2));
}

/**
 * Yedek dosyası. `receipts` ({ [transactionId]: dataUrl }) fiş görsellerini IndexedDB'den
 * alınıp eklenir; yoksa yedek yalnızca state'i içerir.
 */
export function serialize(state, receipts = {}) {
  const payload = { ...state, schema: SCHEMA, exportedAt: nowIso() };
  if (receipts && Object.keys(receipts).length > 0) payload.receipts = receipts;
  return JSON.stringify(payload, null, 2);
}

export function periodKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftPeriod(periodKeyStr, delta) {
  const [y, m] = periodKeyStr.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return periodKey(d);
}

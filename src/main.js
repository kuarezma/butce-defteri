import './style.css';
import {
  load, save, normalize, serialize,
  addTransaction, removeTransaction, transactionsInMonth,
  addRecurring, removeRecurring, setRecurringActive, materializeRecurring,
  setBudget,
  periodKey, shiftPeriod,
} from './state.js';
import {
  monthTotals, categoryBreakdown, trendSeries, budgetStatus, trailingAverageExpense,
} from './compute.js';
import {
  fillCategorySelect, fillBudgetCategorySelect,
  renderStats, renderTransactionList, renderCategoryChart, renderTrendChart,
  renderBudgetList, renderRecurringList, monthLabel,
} from './render.js';

const state = load();
let currentPeriod = periodKey();
let categoryChartType = 'expense';

// Ay açılınca o aya tanımlı tekrarlayanları işle (idempotent).
if (materializeRecurring(state, currentPeriod) > 0) save(state);

const els = {
  monthLabel: document.getElementById('month-label'),
  prevMonth: document.getElementById('prev-month'),
  nextMonth: document.getElementById('next-month'),
  income: document.getElementById('stat-income'),
  expense: document.getElementById('stat-expense'),
  net: document.getElementById('stat-net'),
  netTile: document.getElementById('stat-net-tile'),
  avgLine: document.getElementById('avg-line'),

  txForm: document.getElementById('tx-form'),
  txType: document.getElementById('tx-type'),
  txCategory: document.getElementById('tx-category'),
  txList: document.getElementById('tx-list'),
  txCountBadge: document.getElementById('tx-count-badge'),

  categoryChartHost: document.getElementById('category-chart'),
  trendChartHost: document.getElementById('trend-chart'),

  budgetList: document.getElementById('budget-list'),
  budgetForm: document.getElementById('budget-form'),
  budgetCategory: document.getElementById('budget-category'),

  recurringForm: document.getElementById('recurring-form'),
  recType: document.getElementById('rec-type'),
  recCategory: document.getElementById('rec-category'),
  recurringList: document.getElementById('recurring-list'),

  exportBtn: document.getElementById('export-btn'),
  importBtn: document.getElementById('import-btn'),
  importInput: document.getElementById('import-input'),
  resetBtn: document.getElementById('reset-btn'),
  resetConfirm: document.getElementById('reset-confirm'),
  statusLine: document.getElementById('status-line'),
};

let statusTimer = null;
function status(message, tone = 'info') {
  els.statusLine.textContent = message;
  els.statusLine.dataset.tone = tone;
  clearTimeout(statusTimer);
  if (tone !== 'error') statusTimer = setTimeout(() => { els.statusLine.textContent = ''; }, 4000);
}

function persist() {
  if (!save(state)) {
    status('Kaydedilemedi — tarayıcı depolaması dolu veya kapalı. Yedek al ve sekmeyi kapatma.', 'error');
  }
}

// ---------- Segmented kontrol yardımcı ----------

function wireSegmented(root, hiddenInput, onChange) {
  root.addEventListener('click', (event) => {
    const btn = event.target.closest('.seg-btn');
    if (!btn) return;
    root.querySelectorAll('.seg-btn').forEach((b) => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-checked', String(b === btn));
    });
    hiddenInput.value = btn.dataset.type;
    onChange(btn.dataset.type);
  });
}

// ---------- Ana çizim ----------

function paint() {
  els.monthLabel.textContent = monthLabel(currentPeriod);

  const totals = monthTotals(state, currentPeriod);
  const avg = trailingAverageExpense(state, currentPeriod);
  renderStats(els, totals, avg);

  renderTransactionList(els.txList, els.txCountBadge, transactionsInMonth(state, currentPeriod));

  const rows = categoryBreakdown(state, currentPeriod, categoryChartType);
  renderCategoryChart(els.categoryChartHost, rows, categoryChartType);

  renderTrendChart(els.trendChartHost, trendSeries(state, currentPeriod, 6));

  renderBudgetList(els.budgetList, budgetStatus(state, currentPeriod));
  renderRecurringList(els.recurringList, state.recurring);
}

fillCategorySelect(els.txCategory, 'expense');
fillCategorySelect(els.recCategory, 'expense');
fillBudgetCategorySelect(els.budgetCategory);
paint();

// ---------- Ay gezinme ----------

els.prevMonth.addEventListener('click', () => {
  currentPeriod = shiftPeriod(currentPeriod, -1);
  if (materializeRecurring(state, currentPeriod) > 0) persist();
  paint();
});

els.nextMonth.addEventListener('click', () => {
  currentPeriod = shiftPeriod(currentPeriod, 1);
  if (materializeRecurring(state, currentPeriod) > 0) persist();
  paint();
});

// ---------- İşlem ekleme ----------

wireSegmented(els.txForm.querySelector('.segmented'), els.txType, (type) => {
  fillCategorySelect(els.txCategory, type);
});

// Varsayılan tarih: bugün, ama görüntülenen ay içinde kalınırsa ayın 1'i.
els.txForm.date.value = new Date().toISOString().slice(0, 10);

els.txForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(els.txForm);
  const t = addTransaction(state, {
    type: form.get('type'),
    amount: form.get('amount'),
    categoryId: form.get('categoryId'),
    date: form.get('date'),
    note: form.get('note'),
  });
  if (!t) {
    status('İşlem eklenemedi — tutarı ve tarihi kontrol et.', 'error');
    return;
  }
  persist();
  // Eklenen işlem farklı bir aya düştüyse o aya geç.
  const addedPeriod = t.date.slice(0, 7);
  if (addedPeriod !== currentPeriod) currentPeriod = addedPeriod;
  paint();
  els.txForm.reset();
  els.txForm.date.value = new Date().toISOString().slice(0, 10);
  fillCategorySelect(els.txCategory, 'expense');
  els.txForm.querySelectorAll('.seg-btn').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.type === 'expense');
    b.setAttribute('aria-checked', String(b.dataset.type === 'expense'));
  });
  els.txType.value = 'expense';
  status('İşlem eklendi.');
});

els.txList.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-delete-tx]');
  if (!btn) return;
  removeTransaction(state, btn.dataset.deleteTx);
  persist();
  paint();
  status('İşlem silindi.');
});

// ---------- Kategori grafiği geçişi ----------

document.querySelectorAll('[data-chart-type]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-chart-type]').forEach((b) => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-checked', String(b === btn));
    });
    categoryChartType = btn.dataset.chartType;
    renderCategoryChart(els.categoryChartHost, categoryBreakdown(state, currentPeriod, categoryChartType), categoryChartType);
  });
});

// ---------- Bütçe limitleri ----------

els.budgetForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(els.budgetForm);
  setBudget(state, form.get('categoryId'), form.get('limit'));
  persist();
  renderBudgetList(els.budgetList, budgetStatus(state, currentPeriod));
  els.budgetForm.reset();
  status('Bütçe limiti kaydedildi.');
});

els.budgetList.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-delete-budget]');
  if (!btn) return;
  delete state.budgets[btn.dataset.deleteBudget];
  persist();
  renderBudgetList(els.budgetList, budgetStatus(state, currentPeriod));
  status('Bütçe limiti kaldırıldı.');
});

// ---------- Tekrarlayan işlemler ----------

wireSegmented(els.recurringForm.querySelector('.segmented'), els.recType, (type) => {
  fillCategorySelect(els.recCategory, type);
});

els.recurringForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(els.recurringForm);
  const r = addRecurring(state, {
    name: form.get('name'),
    type: form.get('type'),
    amount: form.get('amount'),
    categoryId: form.get('categoryId'),
    day: form.get('day'),
  });
  if (!r) {
    status('Tekrarlayan işlem eklenemedi — alanları kontrol et.', 'error');
    return;
  }
  // Şimdiki ay için de anında işlensin.
  materializeRecurring(state, currentPeriod);
  persist();
  paint();
  els.recurringForm.reset();
  els.recurringForm.day.value = '1';
  fillCategorySelect(els.recCategory, 'expense');
  els.recurringForm.querySelectorAll('.seg-btn').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.type === 'expense');
    b.setAttribute('aria-checked', String(b.dataset.type === 'expense'));
  });
  els.recType.value = 'expense';
  status('Tekrarlayan işlem eklendi.');
});

els.recurringList.addEventListener('click', (event) => {
  const del = event.target.closest('[data-delete-recurring]');
  const toggle = event.target.closest('[data-toggle-recurring]');
  if (del) {
    removeRecurring(state, del.dataset.deleteRecurring);
    persist();
    renderRecurringList(els.recurringList, state.recurring);
    status('Tekrarlayan işlem silindi. Daha önce işlenmiş kayıtlar listede kalır.');
  } else if (toggle) {
    const r = state.recurring.find((x) => x.id === toggle.dataset.toggleRecurring);
    if (r) {
      setRecurringActive(state, r.id, !r.active);
      persist();
      renderRecurringList(els.recurringList, state.recurring);
      status(r.active ? 'Tekrarlayan işlem aktifleştirildi.' : 'Tekrarlayan işlem pasifleştirildi.');
    }
  }
});

// ---------- Yedek al / yükle / sıfırla ----------

els.exportBtn.addEventListener('click', () => {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([serialize(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `butce-defteri-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
  status('Yedek indirildi. Bulut veya harici diskte de bir kopya tut.');
});

els.importBtn.addEventListener('click', () => els.importInput.click());

els.importInput.addEventListener('change', async () => {
  const file = els.importInput.files?.[0];
  els.importInput.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.transactions)) {
      throw new Error('şema uyuşmuyor');
    }
    const incoming = normalize(parsed);
    Object.assign(state, incoming);
    persist();
    paint();
    status(`Yedek yüklendi · ${state.transactions.length} işlem.`);
  } catch {
    status('Dosya okunamadı: geçerli bir Bütçe Defteri yedeği değil.', 'error');
  }
});

els.resetBtn.addEventListener('click', () => {
  els.resetConfirm.hidden = false;
  els.resetBtn.hidden = true;
  els.resetConfirm.querySelector('[data-action="reset-yes"]').focus();
});

els.resetConfirm.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'reset-yes') {
    state.transactions = [];
    state.recurring = [];
    state.budgets = {};
    state.materialized = {};
    persist();
    paint();
    status('Tüm veriler sıfırlandı.');
  }
  els.resetConfirm.hidden = true;
  els.resetBtn.hidden = false;
  els.resetBtn.focus();
});

import './style.css';
import {
  load, save, normalize, serialize,
  addTransaction, removeTransaction, updateTransaction, transactionsInMonth,
  addRecurring, removeRecurring, updateRecurring, setRecurringActive, materializeRecurring,
  setBudget,
  periodKey, shiftPeriod,
} from './state.js';
import {
  monthTotals, categoryBreakdown, trendSeries, budgetStatus, trailingAverageExpense, savingsRate,
} from './compute.js';
import {
  fillCategorySelect, fillBudgetCategorySelect,
  renderStats, renderTransactionList, renderCategoryChart, renderTrendChart,
  renderBudgetList, renderRecurringList, monthLabel,
} from './render.js';
import { transactionsToCsv, downloadCsv } from './export.js';

const state = load();
let currentPeriod = periodKey();
let categoryChartType = 'expense';
let txSearchQuery = '';
let txTypeFilter = 'all';

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
  savings: document.getElementById('stat-savings'),
  savingsTile: document.getElementById('stat-savings-tile'),
  avgLine: document.getElementById('avg-line'),

  txForm: document.getElementById('tx-form'),
  txType: document.getElementById('tx-type'),
  txCategory: document.getElementById('tx-category'),
  txList: document.getElementById('tx-list'),
  txCountBadge: document.getElementById('tx-count-badge'),
  txSearchInput: document.getElementById('tx-search-input'),
  txFilterGroup: document.getElementById('tx-filter-group'),

  categoryChartHost: document.getElementById('category-chart'),
  trendChartHost: document.getElementById('trend-chart'),

  budgetList: document.getElementById('budget-list'),
  budgetForm: document.getElementById('budget-form'),
  budgetCategory: document.getElementById('budget-category'),

  recurringForm: document.getElementById('recurring-form'),
  recType: document.getElementById('rec-type'),
  recCategory: document.getElementById('rec-category'),
  recurringList: document.getElementById('recurring-list'),

  // Edit Modalleri
  editTxDialog: document.getElementById('edit-tx-dialog'),
  editTxForm: document.getElementById('edit-tx-form'),
  editTxId: document.getElementById('edit-tx-id'),
  editTxType: document.getElementById('edit-tx-type'),
  editTxAmount: document.getElementById('edit-tx-amount'),
  editTxDate: document.getElementById('edit-tx-date'),
  editTxCategory: document.getElementById('edit-tx-category'),
  editTxNote: document.getElementById('edit-tx-note'),
  closeEditTx: document.getElementById('close-edit-tx'),
  cancelEditTx: document.getElementById('cancel-edit-tx'),

  editRecDialog: document.getElementById('edit-rec-dialog'),
  editRecForm: document.getElementById('edit-rec-form'),
  editRecId: document.getElementById('edit-rec-id'),
  editRecType: document.getElementById('edit-rec-type'),
  editRecName: document.getElementById('edit-rec-name'),
  editRecAmount: document.getElementById('edit-rec-amount'),
  editRecDay: document.getElementById('edit-rec-day'),
  editRecCategory: document.getElementById('edit-rec-category'),
  closeEditRec: document.getElementById('close-edit-rec'),
  cancelEditRec: document.getElementById('cancel-edit-rec'),

  exportCsvBtn: document.getElementById('export-csv-btn'),
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

function getDefaultDateForPeriod(period) {
  const todayIso = new Date().toISOString().slice(0, 10);
  if (todayIso.startsWith(period)) return todayIso;
  return `${period}-01`;
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

function setSegmentedValue(root, hiddenInput, value) {
  hiddenInput.value = value;
  root.querySelectorAll('.seg-btn').forEach((b) => {
    const match = b.dataset.type === value;
    b.classList.toggle('is-active', match);
    b.setAttribute('aria-checked', String(match));
  });
}

// ---------- Ana çizim ----------

function paint() {
  els.monthLabel.textContent = monthLabel(currentPeriod);

  const totals = monthTotals(state, currentPeriod);
  const avg = trailingAverageExpense(state, currentPeriod);
  const sRate = savingsRate(totals);
  renderStats(els, totals, avg, sRate);

  renderTransactionList(els.txList, els.txCountBadge, transactionsInMonth(state, currentPeriod), {
    search: txSearchQuery,
    filter: txTypeFilter,
  });

  const rows = categoryBreakdown(state, currentPeriod, categoryChartType);
  renderCategoryChart(els.categoryChartHost, rows, categoryChartType);

  renderTrendChart(els.trendChartHost, trendSeries(state, currentPeriod, 6));

  renderBudgetList(els.budgetList, budgetStatus(state, currentPeriod));
  renderRecurringList(els.recurringList, state.recurring);
}

fillCategorySelect(els.txCategory, 'expense');
fillCategorySelect(els.recCategory, 'expense');
fillBudgetCategorySelect(els.budgetCategory);
els.txForm.date.value = getDefaultDateForPeriod(currentPeriod);
paint();

// ---------- Ay gezinme ----------

els.prevMonth.addEventListener('click', () => {
  currentPeriod = shiftPeriod(currentPeriod, -1);
  if (materializeRecurring(state, currentPeriod) > 0) persist();
  els.txForm.date.value = getDefaultDateForPeriod(currentPeriod);
  paint();
});

els.nextMonth.addEventListener('click', () => {
  currentPeriod = shiftPeriod(currentPeriod, 1);
  if (materializeRecurring(state, currentPeriod) > 0) persist();
  els.txForm.date.value = getDefaultDateForPeriod(currentPeriod);
  paint();
});

// ---------- Arama ve Filtreleme ----------

if (els.txSearchInput) {
  els.txSearchInput.addEventListener('input', (event) => {
    txSearchQuery = event.target.value;
    renderTransactionList(els.txList, els.txCountBadge, transactionsInMonth(state, currentPeriod), {
      search: txSearchQuery,
      filter: txTypeFilter,
    });
  });
}

if (els.txFilterGroup) {
  els.txFilterGroup.addEventListener('click', (event) => {
    const btn = event.target.closest('.seg-btn');
    if (!btn) return;
    els.txFilterGroup.querySelectorAll('.seg-btn').forEach((b) => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-checked', String(b === btn));
    });
    txTypeFilter = btn.dataset.filter;
    renderTransactionList(els.txList, els.txCountBadge, transactionsInMonth(state, currentPeriod), {
      search: txSearchQuery,
      filter: txTypeFilter,
    });
  });
}

// ---------- İşlem ekleme ----------

wireSegmented(els.txForm.querySelector('.segmented'), els.txType, (type) => {
  fillCategorySelect(els.txCategory, type);
});

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
  els.txForm.date.value = getDefaultDateForPeriod(currentPeriod);
  fillCategorySelect(els.txCategory, 'expense');
  setSegmentedValue(els.txForm.querySelector('.segmented'), els.txType, 'expense');
  status('İşlem eklendi.');
});

// ---------- İşlem Silme ve Düzenleme ----------

els.txList.addEventListener('click', (event) => {
  const deleteBtn = event.target.closest('[data-delete-tx]');
  const editBtn = event.target.closest('[data-edit-tx]');

  if (deleteBtn) {
    removeTransaction(state, deleteBtn.dataset.deleteTx);
    persist();
    paint();
    status('İşlem silindi.');
    return;
  }

  if (editBtn) {
    const id = editBtn.dataset.editTx;
    const t = state.transactions.find((tx) => tx.id === id);
    if (!t) return;

    els.editTxId.value = t.id;
    setSegmentedValue(els.editTxForm.querySelector('.segmented'), els.editTxType, t.type);
    fillCategorySelect(els.editTxCategory, t.type);
    els.editTxCategory.value = t.categoryId;
    els.editTxAmount.value = t.amount;
    els.editTxDate.value = t.date;
    els.editTxNote.value = t.note || '';

    if (els.editTxDialog.showModal) els.editTxDialog.showModal();
    else els.editTxDialog.setAttribute('open', '');
  }
});

wireSegmented(els.editTxForm.querySelector('.segmented'), els.editTxType, (type) => {
  fillCategorySelect(els.editTxCategory, type);
});

els.closeEditTx.addEventListener('click', () => els.editTxDialog.close());
els.cancelEditTx.addEventListener('click', () => els.editTxDialog.close());

els.editTxForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const id = els.editTxId.value;
  const form = new FormData(els.editTxForm);
  const updated = updateTransaction(state, id, {
    type: form.get('type'),
    amount: form.get('amount'),
    categoryId: form.get('categoryId'),
    date: form.get('date'),
    note: form.get('note'),
  });

  if (!updated) {
    status('Güncelleme başarısız oldu — alanları kontrol et.', 'error');
    return;
  }

  persist();
  const updatedPeriod = updated.date.slice(0, 7);
  if (updatedPeriod !== currentPeriod) currentPeriod = updatedPeriod;
  paint();
  els.editTxDialog.close();
  status('İşlem başarıyla güncellendi.');
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
  setSegmentedValue(els.recurringForm.querySelector('.segmented'), els.recType, 'expense');
  status('Tekrarlayan işlem eklendi.');
});

// ---------- Tekrarlayan Düzenleme ve İşlemler ----------

els.recurringList.addEventListener('click', (event) => {
  const del = event.target.closest('[data-delete-recurring]');
  const toggle = event.target.closest('[data-toggle-recurring]');
  const edit = event.target.closest('[data-edit-recurring]');

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
  } else if (edit) {
    const r = state.recurring.find((x) => x.id === edit.dataset.editRecurring);
    if (!r) return;

    els.editRecId.value = r.id;
    setSegmentedValue(els.editRecForm.querySelector('.segmented'), els.editRecType, r.type);
    fillCategorySelect(els.editRecCategory, r.type);
    els.editRecCategory.value = r.categoryId;
    els.editRecName.value = r.name;
    els.editRecAmount.value = r.amount;
    els.editRecDay.value = r.day;

    if (els.editRecDialog.showModal) els.editRecDialog.showModal();
    else els.editRecDialog.setAttribute('open', '');
  }
});

wireSegmented(els.editRecForm.querySelector('.segmented'), els.editRecType, (type) => {
  fillCategorySelect(els.editRecCategory, type);
});

els.closeEditRec.addEventListener('click', () => els.editRecDialog.close());
els.cancelEditRec.addEventListener('click', () => els.editRecDialog.close());

els.editRecForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const id = els.editRecId.value;
  const form = new FormData(els.editRecForm);
  const updated = updateRecurring(state, id, {
    name: form.get('name'),
    type: form.get('type'),
    amount: form.get('amount'),
    day: form.get('day'),
    categoryId: form.get('categoryId'),
  });

  if (!updated) {
    status('Tekrarlayan işlem güncellenemedi — alanları kontrol et.', 'error');
    return;
  }

  persist();
  paint();
  els.editRecDialog.close();
  status('Tekrarlayan işlem güncellendi.');
});

// ---------- CSV Dışa Aktarma ----------

if (els.exportCsvBtn) {
  els.exportCsvBtn.addEventListener('click', () => {
    if (state.transactions.length === 0) {
      status('Dışa aktarılacak işlem bulunmuyor.', 'error');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const csvData = transactionsToCsv(state.transactions);
    downloadCsv(csvData, `butce-defteri-${stamp}.csv`);
    status('İşlemler Excel/CSV olarak indirildi.');
  });
}

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

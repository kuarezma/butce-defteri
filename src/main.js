import './style.css';
import {
  load, save, normalize, serialize,
  addTransaction, removeTransaction, updateTransaction, transactionsInMonth,
  addRecurring, removeRecurring, updateRecurring, setRecurringActive, materializeRecurring,
  setBudget, addCustomCategory, removeCustomCategory,
  addGoal, removeGoal, updateGoal, contributeToGoal,
  hasPin, setPin, verifyPin, removePin,
  periodKey, shiftPeriod,
} from './state.js';
import {
  monthTotals, categoryBreakdown, trendSeries, budgetStatus, trailingAverageExpense, savingsRate,
  computeFiftyThirtyTwenty, parseQuickEntry, annualSummary, dailyExpenseHeatmap,
} from './compute.js';
import {
  fillCategorySelect, fillBudgetCategorySelect,
  renderStats, renderTransactionList, renderCategoryChart, renderTrendChart,
  renderBudgetList, renderRecurringList, renderFiftyThirtyTwenty, renderCustomCategoryList,
  renderGoalsList, renderCalendarHeatmap, renderAnnualReport,
  monthLabel, setPrivacyMode, isPrivacyMode,
} from './render.js';
import { transactionsToCsv, downloadCsv, parseCsvToTransactions } from './export.js';
import { getIcon } from './icons.js';

const state = load();
let currentPeriod = periodKey();
let currentAnnualYear = parseInt(currentPeriod.slice(0, 4), 10);
let categoryChartType = 'expense';
let txSearchQuery = '';
let txTypeFilter = 'all';

// Ay açılınca o aya tanımlı tekrarlayanları işle (idempotent).
if (materializeRecurring(state, currentPeriod) > 0) save(state);

// ---------- Tema ve Gizlilik Modu Başlatma ----------

const THEME_KEY = 'butceDefteri.theme';
const PRIVACY_KEY = 'butceDefteri.privacy';

let currentTheme = localStorage.getItem(THEME_KEY) || 'system';
let privacyActive = localStorage.getItem(PRIVACY_KEY) === 'true';

setPrivacyMode(privacyActive);
applyTheme(currentTheme);

function applyTheme(theme) {
  currentTheme = theme;
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
  localStorage.setItem(THEME_KEY, theme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const host = document.getElementById('theme-icon');
  if (!host) return;
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  host.innerHTML = isDark ? getIcon('sun') : getIcon('moon');
}

function updatePrivacyIcon() {
  const host = document.getElementById('privacy-icon');
  if (!host) return;
  host.innerHTML = isPrivacyMode() ? getIcon('eyeOff') : getIcon('eye');
}

function updatePinIcon() {
  const host = document.getElementById('pin-icon');
  if (!host) return;
  host.innerHTML = hasPin() ? getIcon('lock') : getIcon('unlock');
}

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

  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  privacyToggleBtn: document.getElementById('privacy-toggle-btn'),
  customCatBtn: document.getElementById('custom-cat-btn'),
  pinToggleBtn: document.getElementById('pin-toggle-btn'),
  annualReportBtn: document.getElementById('annual-report-btn'),

  // Quick Entry
  quickEntryForm: document.getElementById('quick-entry-form'),
  quickEntryInput: document.getElementById('quick-entry-input'),

  txForm: document.getElementById('tx-form'),
  txType: document.getElementById('tx-type'),
  txCategory: document.getElementById('tx-category'),
  txAmountInput: document.getElementById('tx-amount-input'),
  txList: document.getElementById('tx-list'),
  txCountBadge: document.getElementById('tx-count-badge'),
  txSearchInput: document.getElementById('tx-search-input'),
  txFilterGroup: document.getElementById('tx-filter-group'),

  categoryChartHost: document.getElementById('category-chart'),
  trendChartHost: document.getElementById('trend-chart'),
  fttHost: document.getElementById('ftt-host'),
  heatmapHost: document.getElementById('heatmap-host'),
  goalsList: document.getElementById('goals-list'),
  addGoalBtn: document.getElementById('add-goal-btn'),

  budgetList: document.getElementById('budget-list'),
  budgetForm: document.getElementById('budget-form'),
  budgetCategory: document.getElementById('budget-category'),

  recurringForm: document.getElementById('recurring-form'),
  recType: document.getElementById('rec-type'),
  recCategory: document.getElementById('rec-category'),
  recurringList: document.getElementById('recurring-list'),

  // Modals
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

  customCatDialog: document.getElementById('custom-cat-dialog'),
  customCatForm: document.getElementById('custom-cat-form'),
  customCatType: document.getElementById('custom-cat-type'),
  customCatIcon: document.getElementById('custom-cat-icon'),
  customCatName: document.getElementById('custom-cat-name'),
  customCatBucket: document.getElementById('custom-cat-bucket'),
  customCatBucketField: document.getElementById('custom-cat-bucket-field'),
  customCatList: document.getElementById('custom-cat-list'),
  closeCustomCat: document.getElementById('close-custom-cat'),

  // Goal Modals
  goalDialog: document.getElementById('goal-dialog'),
  goalForm: document.getElementById('goal-form'),
  goalIcon: document.getElementById('goal-icon'),
  goalName: document.getElementById('goal-name'),
  goalTarget: document.getElementById('goal-target'),
  goalCurrent: document.getElementById('goal-current'),
  goalDate: document.getElementById('goal-date'),
  closeGoalDialog: document.getElementById('close-goal-dialog'),
  cancelGoalBtn: document.getElementById('cancel-goal-btn'),

  goalDepositDialog: document.getElementById('goal-deposit-dialog'),
  goalDepositForm: document.getElementById('goal-deposit-form'),
  goalDepositTitle: document.getElementById('goal-deposit-title'),
  depositGoalId: document.getElementById('deposit-goal-id'),
  depositGoalMode: document.getElementById('deposit-goal-mode'),
  depositAmountLabel: document.getElementById('deposit-amount-label'),
  depositGoalAmount: document.getElementById('deposit-goal-amount'),
  closeGoalDeposit: document.getElementById('close-goal-deposit'),
  cancelDepositBtn: document.getElementById('cancel-deposit-btn'),

  // Annual Report Modal
  annualDialog: document.getElementById('annual-dialog'),
  annualYearLabel: document.getElementById('annual-year-label'),
  annualReportHost: document.getElementById('annual-report-host'),
  prevYearBtn: document.getElementById('prev-year-btn'),
  nextYearBtn: document.getElementById('next-year-btn'),
  closeAnnualDialog: document.getElementById('close-annual-dialog'),

  // PIN Lock & Modal
  pinDialog: document.getElementById('pin-dialog'),
  pinForm: document.getElementById('pin-form'),
  pinInput: document.getElementById('pin-input'),
  pinStatusDesc: document.getElementById('pin-status-desc'),
  savePinBtn: document.getElementById('save-pin-btn'),
  removePinBtn: document.getElementById('remove-pin-btn'),
  closePinDialog: document.getElementById('close-pin-dialog'),
  cancelPinBtn: document.getElementById('cancel-pin-btn'),

  pinLockOverlay: document.getElementById('pin-lock-overlay'),
  pinUnlockForm: document.getElementById('pin-unlock-form'),
  pinUnlockInput: document.getElementById('pin-unlock-input'),
  pinErrorMsg: document.getElementById('pin-error-msg'),

  exportCsvBtn: document.getElementById('export-csv-btn'),
  importCsvBtn: document.getElementById('import-csv-btn'),
  importCsvInput: document.getElementById('import-csv-input'),
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

// ---------- PIN Kilit Kontrolü ----------

if (hasPin()) {
  els.pinLockOverlay.hidden = false;
  setTimeout(() => els.pinUnlockInput.focus(), 100);
}

if (els.pinUnlockForm) {
  els.pinUnlockForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = els.pinUnlockInput.value.trim();
    if (verifyPin(pin)) {
      els.pinLockOverlay.hidden = true;
      els.pinUnlockInput.value = '';
      els.pinErrorMsg.hidden = true;
    } else {
      els.pinErrorMsg.hidden = false;
      els.pinUnlockInput.value = '';
      els.pinUnlockInput.focus();
    }
  });
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

// ---------- Hızlı Tutar Çipleri ----------

document.querySelectorAll('.amount-chips').forEach((chipContainer) => {
  chipContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const targetId = chipContainer.dataset.target;
    const targetInput = document.getElementById(targetId);
    if (!targetInput) return;
    const addVal = Number(btn.dataset.add) || 0;
    const currentVal = Number(targetInput.value) || 0;
    targetInput.value = (currentVal + addVal).toFixed(2).replace(/\.00$/, '');
    targetInput.focus();
  });
});

// ---------- Akıllı Tek Satır Hızlı Giriş ----------

if (els.quickEntryForm) {
  els.quickEntryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = els.quickEntryInput.value.trim();
    if (!text) return;

    const parsed = parseQuickEntry(text, state.customCategories);
    if (!parsed) {
      status('Anlaşılamadı — örn: "market 350", "kahve 85", "maaş 65000"', 'error');
      return;
    }

    const t = addTransaction(state, {
      type: parsed.type,
      amount: parsed.amount,
      categoryId: parsed.categoryId,
      date: getDefaultDateForPeriod(currentPeriod),
      note: parsed.note,
    });

    if (!t) {
      status('Hızlı işlem eklenemedi.', 'error');
      return;
    }

    persist();
    paint();
    els.quickEntryInput.value = '';
    status(`"₺${parsed.amount} - ${parsed.note}" akıllı olarak eklendi.`);
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
    customCategories: state.customCategories,
  });

  const rows = categoryBreakdown(state, currentPeriod, categoryChartType);
  renderCategoryChart(els.categoryChartHost, rows, categoryChartType);

  renderTrendChart(els.trendChartHost, trendSeries(state, currentPeriod, 6));

  const fttAnalysis = computeFiftyThirtyTwenty(state, currentPeriod);
  renderFiftyThirtyTwenty(els.fttHost, fttAnalysis);

  const heatmapData = dailyExpenseHeatmap(state, currentPeriod);
  renderCalendarHeatmap(els.heatmapHost, heatmapData);

  renderGoalsList(els.goalsList, state.goals);
  renderBudgetList(els.budgetList, budgetStatus(state, currentPeriod));
  renderRecurringList(els.recurringList, state.recurring, state.customCategories);
  renderCustomCategoryList(els.customCatList, state.customCategories);
}

function refreshCategorySelects() {
  fillCategorySelect(els.txCategory, els.txType.value || 'expense', state.customCategories);
  fillCategorySelect(els.recCategory, els.recType.value || 'expense', state.customCategories);
  fillBudgetCategorySelect(els.budgetCategory, state.customCategories);
}

refreshCategorySelects();
els.txForm.date.value = getDefaultDateForPeriod(currentPeriod);
updatePrivacyIcon();
updateThemeIcon();
updatePinIcon();
paint();

// ---------- Isı Haritası Tıklama Filtresi ----------

if (els.heatmapHost) {
  els.heatmapHost.addEventListener('click', (e) => {
    const cell = e.target.closest('.heatmap-cell:not(.is-empty)');
    if (!cell) return;
    const date = cell.dataset.date;
    if (!date) return;
    txSearchQuery = date;
    els.txSearchInput.value = date;
    renderTransactionList(els.txList, els.txCountBadge, transactionsInMonth(state, currentPeriod), {
      search: txSearchQuery,
      filter: txTypeFilter,
      customCategories: state.customCategories,
    });
    els.txList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

// ---------- Tema ve Gizlilik Butonları ----------

if (els.themeToggleBtn) {
  els.themeToggleBtn.addEventListener('click', () => {
    const isDark = currentTheme === 'dark' || (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const nextTheme = isDark ? 'light' : 'dark';
    applyTheme(nextTheme);
    status(nextTheme === 'dark' ? 'Koyu tema aktif.' : 'Açık tema aktif.');
  });
}

if (els.privacyToggleBtn) {
  els.privacyToggleBtn.addEventListener('click', () => {
    const next = !isPrivacyMode();
    setPrivacyMode(next);
    localStorage.setItem(PRIVACY_KEY, String(next));
    updatePrivacyIcon();
    paint();
    status(next ? 'Gizlilik modu aktif (tutarlar gizlendi).' : 'Gizlilik modu kapatıldı.');
  });
}

// ---------- PIN Dialog ----------

if (els.pinToggleBtn) {
  els.pinToggleBtn.addEventListener('click', () => {
    const active = hasPin();
    els.pinStatusDesc.textContent = active
      ? 'PIN koruması aktif. PIN kodunu değiştirebilir veya kilidi kaldırabilirsiniz.'
      : 'Uygulama açılışında gizlilik için 4 haneli PIN kodu belirleyin.';
    els.removePinBtn.hidden = !active;
    els.savePinBtn.textContent = active ? 'PIN Güncelle' : 'PIN Kaydet';
    els.pinInput.value = '';
    if (els.pinDialog.showModal) els.pinDialog.showModal();
    else els.pinDialog.setAttribute('open', '');
  });
}

if (els.closePinDialog) els.closePinDialog.addEventListener('click', () => els.pinDialog.close());
if (els.cancelPinBtn) els.cancelPinBtn.addEventListener('click', () => els.pinDialog.close());

if (els.pinForm) {
  els.pinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = els.pinInput.value.trim();
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      status('PIN tam olarak 4 haneli rakam olmalıdır.', 'error');
      return;
    }
    setPin(pin);
    updatePinIcon();
    els.pinDialog.close();
    status('PIN kilidi başarıyla etkinleştirildi.');
  });
}

if (els.removePinBtn) {
  els.removePinBtn.addEventListener('click', () => {
    removePin();
    updatePinIcon();
    els.pinDialog.close();
    status('PIN kilidi kaldırıldı.');
  });
}

// ---------- Yıllık Özet Dialog ----------

function openAnnualReport(year) {
  currentAnnualYear = year;
  els.annualYearLabel.textContent = `${year} Yıllık Finans Özeti`;
  const summary = annualSummary(state, year);
  renderAnnualReport(els.annualReportHost, summary);
  if (els.annualDialog.showModal) els.annualDialog.showModal();
  else els.annualDialog.setAttribute('open', '');
}

if (els.annualReportBtn) {
  els.annualReportBtn.addEventListener('click', () => {
    openAnnualReport(parseInt(currentPeriod.slice(0, 4), 10));
  });
}

if (els.prevYearBtn) {
  els.prevYearBtn.addEventListener('click', () => openAnnualReport(currentAnnualYear - 1));
}

if (els.nextYearBtn) {
  els.nextYearBtn.addEventListener('click', () => openAnnualReport(currentAnnualYear + 1));
}

if (els.closeAnnualDialog) {
  els.closeAnnualDialog.addEventListener('click', () => els.annualDialog.close());
}

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
      customCategories: state.customCategories,
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
      customCategories: state.customCategories,
    });
  });
}

// ---------- İşlem ekleme ----------

wireSegmented(els.txForm.querySelector('.segmented'), els.txType, (type) => {
  fillCategorySelect(els.txCategory, type, state.customCategories);
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
  const addedPeriod = t.date.slice(0, 7);
  if (addedPeriod !== currentPeriod) currentPeriod = addedPeriod;
  paint();
  els.txForm.reset();
  els.txForm.date.value = getDefaultDateForPeriod(currentPeriod);
  fillCategorySelect(els.txCategory, 'expense', state.customCategories);
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
    fillCategorySelect(els.editTxCategory, t.type, state.customCategories);
    els.editTxCategory.value = t.categoryId;
    els.editTxAmount.value = t.amount;
    els.editTxDate.value = t.date;
    els.editTxNote.value = t.note || '';

    if (els.editTxDialog.showModal) els.editTxDialog.showModal();
    else els.editTxDialog.setAttribute('open', '');
  }
});

wireSegmented(els.editTxForm.querySelector('.segmented'), els.editTxType, (type) => {
  fillCategorySelect(els.editTxCategory, type, state.customCategories);
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

// ---------- Hedef Birikimler (Kumbara) Yönetimi ----------

if (els.addGoalBtn) {
  els.addGoalBtn.addEventListener('click', () => {
    els.goalForm.reset();
    els.goalIcon.value = '🎯';
    if (els.goalDialog.showModal) els.goalDialog.showModal();
    else els.goalDialog.setAttribute('open', '');
  });
}

if (els.closeGoalDialog) els.closeGoalDialog.addEventListener('click', () => els.goalDialog.close());
if (els.cancelGoalBtn) els.cancelGoalBtn.addEventListener('click', () => els.goalDialog.close());

if (els.goalForm) {
  els.goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData(els.goalForm);
    const goal = addGoal(state, {
      name: form.get('name'),
      targetAmount: form.get('targetAmount'),
      currentAmount: form.get('currentAmount') || 0,
      targetDate: form.get('targetDate') || null,
      icon: form.get('icon') || '🎯',
    });

    if (!goal) {
      status('Hedef eklenemedi — alanları kontrol et.', 'error');
      return;
    }

    persist();
    paint();
    els.goalDialog.close();
    status(`"${goal.name}" birikim hedefi oluşturuldu.`);
  });
}

if (els.goalsList) {
  els.goalsList.addEventListener('click', (e) => {
    const depositBtn = e.target.closest('[data-deposit-goal]');
    const withdrawBtn = e.target.closest('[data-withdraw-goal]');
    const deleteBtn = e.target.closest('[data-delete-goal]');

    if (deleteBtn) {
      removeGoal(state, deleteBtn.dataset.deleteGoal);
      persist();
      paint();
      status('Birikim hedefi silindi.');
      return;
    }

    if (depositBtn || withdrawBtn) {
      const goalId = depositBtn ? depositBtn.dataset.depositGoal : withdrawBtn.dataset.withdrawGoal;
      const isDeposit = Boolean(depositBtn);
      const goal = state.goals.find((g) => g.id === goalId);
      if (!goal) return;

      els.depositGoalId.value = goal.id;
      els.depositGoalMode.value = isDeposit ? 'deposit' : 'withdraw';
      els.goalDepositTitle.textContent = isDeposit ? `"${goal.name}" Hedefine Para Ekle` : `"${goal.name}" Hedefinden Para Çek`;
      els.depositAmountLabel.textContent = isDeposit ? 'Eklenecek Tutar (₺)' : 'Çekilecek Tutar (₺)';
      els.depositGoalAmount.value = '';

      if (els.goalDepositDialog.showModal) els.goalDepositDialog.showModal();
      else els.goalDepositDialog.setAttribute('open', '');
    }
  });
}

if (els.closeGoalDeposit) els.closeGoalDeposit.addEventListener('click', () => els.goalDepositDialog.close());
if (els.cancelDepositBtn) els.cancelDepositBtn.addEventListener('click', () => els.goalDepositDialog.close());

if (els.goalDepositForm) {
  els.goalDepositForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = els.depositGoalId.value;
    const mode = els.depositGoalMode.value;
    const amount = Number(els.depositGoalAmount.value);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const delta = mode === 'deposit' ? amount : -amount;
    const updated = contributeToGoal(state, id, delta);
    if (!updated) return;

    persist();
    paint();
    els.goalDepositDialog.close();
    status(mode === 'deposit' ? `Hedefe ₺${amount} eklendi.` : `Hedeften ₺${amount} çekildi.`);
  });
}

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
  fillCategorySelect(els.recCategory, type, state.customCategories);
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
  materializeRecurring(state, currentPeriod);
  persist();
  paint();
  els.recurringForm.reset();
  els.recurringForm.day.value = '1';
  fillCategorySelect(els.recCategory, 'expense', state.customCategories);
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
    renderRecurringList(els.recurringList, state.recurring, state.customCategories);
    status('Tekrarlayan işlem silindi. Daha önce işlenmiş kayıtlar listede kalır.');
  } else if (toggle) {
    const r = state.recurring.find((x) => x.id === toggle.dataset.toggleRecurring);
    if (r) {
      setRecurringActive(state, r.id, !r.active);
      persist();
      renderRecurringList(els.recurringList, state.recurring, state.customCategories);
      status(r.active ? 'Tekrarlayan işlem aktifleştirildi.' : 'Tekrarlayan işlem pasifleştirildi.');
    }
  } else if (edit) {
    const r = state.recurring.find((x) => x.id === edit.dataset.editRecurring);
    if (!r) return;

    els.editRecId.value = r.id;
    setSegmentedValue(els.editRecForm.querySelector('.segmented'), els.editRecType, r.type);
    fillCategorySelect(els.editRecCategory, r.type, state.customCategories);
    els.editRecCategory.value = r.categoryId;
    els.editRecName.value = r.name;
    els.editRecAmount.value = r.amount;
    els.editRecDay.value = r.day;

    if (els.editRecDialog.showModal) els.editRecDialog.showModal();
    else els.editRecDialog.setAttribute('open', '');
  }
});

wireSegmented(els.editRecForm.querySelector('.segmented'), els.editRecType, (type) => {
  fillCategorySelect(els.editRecCategory, type, state.customCategories);
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

// ---------- Özel Kategori Yönetimi ----------

if (els.customCatBtn) {
  els.customCatBtn.addEventListener('click', () => {
    renderCustomCategoryList(els.customCatList, state.customCategories);
    if (els.customCatDialog.showModal) els.customCatDialog.showModal();
    else els.customCatDialog.setAttribute('open', '');
  });
}

if (els.closeCustomCat) {
  els.closeCustomCat.addEventListener('click', () => els.customCatDialog.close());
}

if (els.customCatForm) {
  wireSegmented(els.customCatForm.querySelector('.segmented'), els.customCatType, (type) => {
    els.customCatBucketField.style.display = type === 'expense' ? 'flex' : 'none';
  });

  els.customCatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(els.customCatForm);
    const cat = addCustomCategory(state, {
      type: form.get('type'),
      name: form.get('name'),
      icon: form.get('icon'),
      bucket: form.get('bucket'),
    });

    if (!cat) {
      status('Özel kategori eklenemedi — alanları kontrol et.', 'error');
      return;
    }

    persist();
    refreshCategorySelects();
    paint();
    renderCustomCategoryList(els.customCatList, state.customCategories);
    els.customCatForm.reset();
    els.customCatIcon.value = '🏷️';
    status(`"${cat.name}" özel kategorisi eklendi.`);
  });
}

if (els.customCatList) {
  els.customCatList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-delete-custom-cat]');
    if (!btn) return;
    const id = btn.dataset.deleteCustomCat;
    removeCustomCategory(state, id);
    persist();
    refreshCategorySelects();
    paint();
    renderCustomCategoryList(els.customCatList, state.customCategories);
    status('Özel kategori silindi.');
  });
}

// ---------- CSV Dışa / İçe Aktarma ----------

if (els.exportCsvBtn) {
  els.exportCsvBtn.addEventListener('click', () => {
    if (state.transactions.length === 0) {
      status('Dışa aktarılacak işlem bulunmuyor.', 'error');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const csvData = transactionsToCsv(state.transactions, state.customCategories);
    downloadCsv(csvData, `butce-islemleri-${stamp}.csv`);
    status('İşlemler Excel/CSV olarak indirildi.');
  });
}

if (els.importCsvBtn) {
  els.importCsvBtn.addEventListener('click', () => els.importCsvInput.click());
}

if (els.importCsvInput) {
  els.importCsvInput.addEventListener('change', async () => {
    const file = els.importCsvInput.files?.[0];
    els.importCsvInput.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const importedTxs = parseCsvToTransactions(text, state.customCategories);
      if (importedTxs.length === 0) {
        status('CSV dosyasında geçerli işlem satırı bulunamadı.', 'error');
        return;
      }
      for (const t of importedTxs) {
        addTransaction(state, t);
      }
      persist();
      paint();
      status(`${importedTxs.length} işlem CSV'den başarıyla içe aktarıldı.`);
    } catch {
      status('CSV dosyası okunamadı veya format uyumsuz.', 'error');
    }
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
    refreshCategorySelects();
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
    state.customCategories = [];
    state.goals = [];
    state.budgets = {};
    state.materialized = {};
    persist();
    refreshCategorySelects();
    paint();
    status('Tüm veriler sıfırlandı.');
  }
  els.resetConfirm.hidden = true;
  els.resetBtn.hidden = false;
  els.resetBtn.focus();
});

import { CATEGORIES, categoriesByType, categoryById } from './data/categories.js';
import { rankedBarChart, trendLineChart } from './charts.js';
import { getIcon } from './icons.js';

let privacyMode = false;

export function setPrivacyMode(enabled) {
  privacyMode = Boolean(enabled);
}

export function isPrivacyMode() {
  return privacyMode;
}

const fmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
export const money = (n) => (privacyMode ? '₺••••' : `₺${fmt.format(n)}`);

const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const monthShort = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export function monthLabel(periodKey) {
  const [y, m] = periodKey.split('-').map(Number);
  return `${monthNames[m - 1]} ${y}`;
}

export function monthShortLabel(periodKey) {
  const [, m] = periodKey.split('-').map(Number);
  return monthShort[m - 1];
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });
function fmtDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

// ---------- Kategori <select> doldurma ----------

export function fillCategorySelect(select, type, customCategories = []) {
  select.innerHTML = categoriesByType(type, customCategories)
    .map((c) => `<option value="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</option>`)
    .join('');
}

export function fillBudgetCategorySelect(select, customCategories = []) {
  select.innerHTML = categoriesByType('expense', customCategories)
    .map((c) => `<option value="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</option>`)
    .join('');
}

// ---------- Üst bilgi ----------

export function renderStats(elements, totals, avgExpense, savingsPct) {
  elements.income.textContent = money(totals.income);
  elements.expense.textContent = money(totals.expense);
  elements.net.textContent = money(totals.net);
  elements.netTile.dataset.sign = totals.net >= 0 ? 'positive' : 'negative';

  if (elements.savings && elements.savingsTile) {
    elements.savings.textContent = privacyMode ? '%••' : `%${savingsPct}`;
    elements.savingsTile.dataset.sign = savingsPct > 0 ? 'positive' : savingsPct < 0 ? 'negative' : 'neutral';
  }

  elements.avgLine.textContent = avgExpense > 0
    ? `Son 3 ayın ortalama gideri: ${money(avgExpense)} — acil durum fonu hedefini buna göre kur.`
    : 'Son 3 ayın ortalama gideri için henüz yeterli veri yok.';
}

// ---------- İşlem listesi ----------

export function renderTransactionList(container, badge, transactions, options = {}) {
  const { search = '', filter = 'all', customCategories = [] } = options;
  const q = search.trim().toLowerCase();

  let filtered = [...transactions];
  if (filter !== 'all') {
    filtered = filtered.filter((t) => t.type === filter);
  }
  if (q) {
    filtered = filtered.filter((t) => {
      const cat = categoryById(t.categoryId, customCategories);
      const catName = (cat ? cat.name : '').toLowerCase();
      const note = (t.note || '').toLowerCase();
      return catName.includes(q) || note.includes(q);
    });
  }

  badge.textContent = (q || filter !== 'all')
    ? `${filtered.length} / ${transactions.length} işlem`
    : `${transactions.length} işlem`;

  if (transactions.length === 0) {
    container.innerHTML = '<li class="empty-row">Bu ay henüz işlem bulunmuyor. Eklemek için formu kullanabilirsin.</li>';
    return;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<li class="empty-row">Arama kriterine uygun işlem bulunamadı.</li>';
    return;
  }

  const sorted = filtered.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  container.innerHTML = sorted.map((t) => {
    const cat = categoryById(t.categoryId, customCategories) || { icon: '❔', name: 'Bilinmeyen' };
    const sign = t.type === 'income' ? '+' : '−';
    return `
      <li class="tx-row" data-id="${esc(t.id)}">
        <span class="tx-icon" aria-hidden="true">${esc(cat.icon)}</span>
        <div class="tx-main">
          <div class="tx-title">${esc(cat.name)}</div>
          <div class="tx-sub">${esc(fmtDate(t.date))}${t.note ? ` · ${esc(t.note)}` : ''}${t.recurringId ? ' · tekrarlayan' : ''}</div>
        </div>
        <span class="tx-amount" data-type="${t.type}">${sign}${esc(money(t.amount))}</span>
        <div class="row-actions">
          <button type="button" class="row-edit" data-edit-tx="${esc(t.id)}" aria-label="İşlemi düzenle">${getIcon('edit')}</button>
          <button type="button" class="row-delete" data-delete-tx="${esc(t.id)}" aria-label="İşlemi sil">${getIcon('trash')}</button>
        </div>
      </li>`;
  }).join('');
}

// ---------- 50/30/20 Kural Görselleştirmesi ----------

export function renderFiftyThirtyTwenty(host, analysis) {
  if (!host) return;

  const total = Math.max(analysis.needsPct + analysis.wantsPct + analysis.savingsPct, 1);
  const nW = Math.round((analysis.needsPct / total) * 100);
  const wW = Math.round((analysis.wantsPct / total) * 100);
  const sW = Math.max(100 - nW - wW, 0);

  host.innerHTML = `
    <div class="ftt-card">
      <div class="ftt-bar-wrapper" role="progressbar" aria-label="50/30/20 Bütçe Dağılımı">
        <div class="ftt-segment ftt-needs" style="width: ${nW}%" title="İhtiyaçlar: %${analysis.needsPct}"></div>
        <div class="ftt-segment ftt-wants" style="width: ${wW}%" title="İstekler: %${analysis.wantsPct}"></div>
        <div class="ftt-segment ftt-savings" style="width: ${sW}%" title="Tasarruf: %${analysis.savingsPct}"></div>
      </div>

      <div class="ftt-grid">
        <div class="ftt-item needs-item">
          <span class="ftt-badge">İhtiyaçlar (%50 Hedef)</span>
          <strong>${money(analysis.needsAmount)}</strong>
          <span class="ftt-pct">%${analysis.needsPct}</span>
        </div>
        <div class="ftt-item wants-item">
          <span class="ftt-badge">İstekler (%30 Hedef)</span>
          <strong>${money(analysis.wantsAmount)}</strong>
          <span class="ftt-pct">%${analysis.wantsPct}</span>
        </div>
        <div class="ftt-item savings-item">
          <span class="ftt-badge">Tasarruf (%20 Hedef)</span>
          <strong>${money(analysis.savingsAmount)}</strong>
          <span class="ftt-pct">%${analysis.savingsPct}</span>
        </div>
      </div>

      <div class="ftt-eval" data-tone="${esc(analysis.statusTone)}">
        <span class="eval-icon">${analysis.statusTone === 'good' ? '✨' : analysis.statusTone === 'warning' ? '⚠️' : '💡'}</span>
        <span>${esc(analysis.evaluation)}</span>
      </div>
    </div>
  `;
}

// ---------- Kategori grafiği ----------

export function renderCategoryChart(host, rows, type) {
  const hue = type === 'income' ? 'blue' : 'orange';
  const emptyText = type === 'income' ? 'Bu ay gelir kaydı yok.' : 'Bu ay gider kaydı yok.';
  const chart = rankedBarChart(rows, { hue, emptyText });
  host.innerHTML = chart.svg;
  chart.attach(host);
}

// ---------- Trend grafiği ----------

export function renderTrendChart(host, series) {
  const chart = trendLineChart(series, monthShortLabel);
  host.innerHTML = chart.svg;
  chart.attach(host);
}

// ---------- Bütçe listesi ----------

const severityIcon = { good: '🟢', warning: '🟡', serious: '🟠', critical: '🔴' };
const severityLabel = { good: 'İyi', warning: 'Uyarı', serious: 'Ciddi', critical: 'Kritik' };

export function renderBudgetList(container, rows) {
  if (rows.length === 0) {
    container.innerHTML = '<li class="empty-row">Henüz bütçe limiti tanımlanmadı.</li>';
    return;
  }

  container.innerHTML = rows.map((row) => `
    <li class="budget-row" data-id="${esc(row.categoryId)}">
      <div class="budget-top">
        <span class="budget-name">
          <span class="status-icon" aria-hidden="true">${severityIcon[row.severity]}</span>
          ${esc(row.category ? row.category.icon : '🏷️')} ${esc(row.category ? row.category.name : row.categoryId)}
          <span class="sr-only">${esc(severityLabel[row.severity])}</span>
        </span>
        <span class="budget-figures">${esc(money(row.used))} / ${esc(money(row.limit))} · %${row.percent}</span>
      </div>
      <div class="budget-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow="${Math.min(row.percent, 100)}"
           aria-label="${esc(row.category ? row.category.name : row.categoryId)} bütçe kullanımı">
        <div class="budget-meter-fill" data-severity="${row.severity}" style="width:${Math.min(row.percent, 100)}%"></div>
      </div>
      <button type="button" class="link-btn" data-delete-budget="${esc(row.categoryId)}">Limiti kaldır</button>
    </li>`).join('');
}

// ---------- Tekrarlayan işlemler ----------

export function renderRecurringList(container, list, customCategories = []) {
  if (list.length === 0) {
    container.innerHTML = '<li class="empty-row">Henüz tekrarlayan işlem yok.</li>';
    return;
  }

  container.innerHTML = list.map((r) => {
    const cat = categoryById(r.categoryId, customCategories) || { icon: '❔', name: 'Bilinmeyen' };
    const sign = r.type === 'income' ? '+' : '−';
    return `
      <li class="rec-row" data-id="${esc(r.id)}">
        <span class="tx-icon" aria-hidden="true">${esc(cat.icon)}</span>
        <div class="tx-main">
          <div class="tx-title">${esc(r.name)}${r.active ? '' : ' (pasif)'}</div>
          <div class="tx-sub">${esc(cat.name)} · her ayın ${r.day}. günü</div>
        </div>
        <span class="tx-amount" data-type="${r.type}">${sign}${esc(money(r.amount))}</span>
        <div class="row-actions">
          <button type="button" class="row-edit" data-edit-recurring="${esc(r.id)}" aria-label="Tekrarlayan işlemi düzenle">${getIcon('edit')}</button>
          <button type="button" class="row-delete" data-toggle-recurring="${esc(r.id)}" aria-label="${r.active ? 'Pasifleştir' : 'Aktifleştir'}">${r.active ? getIcon('pause') : getIcon('play')}</button>
          <button type="button" class="row-delete" data-delete-recurring="${esc(r.id)}" aria-label="Tekrarlayan işlemi sil">${getIcon('trash')}</button>
        </div>
      </li>`;
  }).join('');
}

// ---------- Özel Kategoriler Listesi ----------

export function renderCustomCategoryList(container, customCategories = []) {
  if (!container) return;
  if (!customCategories || customCategories.length === 0) {
    container.innerHTML = '<li class="empty-row">Henüz özel kategori eklenmedi.</li>';
    return;
  }

  container.innerHTML = customCategories.map((c) => {
    const typeLabel = c.type === 'income' ? 'Gelir' : c.bucket === 'needs' ? 'İhtiyaç' : 'İstek';
    return `
      <li class="custom-cat-row" data-id="${esc(c.id)}">
        <span class="tx-icon" aria-hidden="true">${esc(c.icon)}</span>
        <div class="tx-main">
          <div class="tx-title">${esc(c.name)}</div>
          <div class="tx-sub">${typeLabel}</div>
        </div>
        <button type="button" class="row-delete" data-delete-custom-cat="${esc(c.id)}" aria-label="Özel kategoriyi sil">${getIcon('trash')}</button>
      </li>
    `;
  }).join('');
}

export { CATEGORIES };

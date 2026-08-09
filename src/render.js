import { CATEGORIES, categoriesByType, categoryById } from './data/categories.js';
import { rankedBarChart, trendLineChart } from './charts.js';

const fmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
export const money = (n) => `₺${fmt.format(n)}`;

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

export function fillCategorySelect(select, type) {
  select.innerHTML = categoriesByType(type)
    .map((c) => `<option value="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</option>`)
    .join('');
}

export function fillBudgetCategorySelect(select) {
  select.innerHTML = categoriesByType('expense')
    .map((c) => `<option value="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</option>`)
    .join('');
}

// ---------- Üst bilgi ----------

export function renderStats(elements, totals, avgExpense) {
  elements.income.textContent = money(totals.income);
  elements.expense.textContent = money(totals.expense);
  elements.net.textContent = money(totals.net);
  elements.netTile.dataset.sign = totals.net >= 0 ? 'positive' : 'negative';

  elements.avgLine.textContent = avgExpense > 0
    ? `Son 3 ayın ortalama gideri: ${money(avgExpense)} — acil durum fonu hedefini buna göre kur.`
    : 'Son 3 ayın ortalama gideri için henüz yeterli veri yok.';
}

// ---------- İşlem listesi ----------

export function renderTransactionList(container, badge, transactions) {
  badge.textContent = `${transactions.length} işlem`;

  if (transactions.length === 0) {
    container.innerHTML = '<li class="empty-row">Bu ay henüz işlem yok.</li>';
    return;
  }

  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  container.innerHTML = sorted.map((t) => {
    const cat = categoryById(t.categoryId) || { icon: '❔', name: 'Bilinmeyen' };
    const sign = t.type === 'income' ? '+' : '−';
    return `
      <li class="tx-row" data-id="${esc(t.id)}">
        <span class="tx-icon" aria-hidden="true">${esc(cat.icon)}</span>
        <div class="tx-main">
          <div class="tx-title">${esc(cat.name)}</div>
          <div class="tx-sub">${esc(fmtDate(t.date))}${t.note ? ` · ${esc(t.note)}` : ''}${t.recurringId ? ' · tekrarlayan' : ''}</div>
        </div>
        <span class="tx-amount" data-type="${t.type}">${sign}${esc(money(t.amount))}</span>
        <button type="button" class="row-delete" data-delete-tx="${esc(t.id)}" aria-label="İşlemi sil">✕</button>
      </li>`;
  }).join('');
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
          ${esc(row.category.icon)} ${esc(row.category.name)}
          <span class="sr-only">${esc(severityLabel[row.severity])}</span>
        </span>
        <span class="budget-figures">${esc(money(row.used))} / ${esc(money(row.limit))} · %${row.percent}</span>
      </div>
      <div class="budget-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow="${Math.min(row.percent, 100)}"
           aria-label="${esc(row.category.name)} bütçe kullanımı">
        <div class="budget-meter-fill" data-severity="${row.severity}" style="width:${Math.min(row.percent, 100)}%"></div>
      </div>
      <button type="button" class="link-btn" data-delete-budget="${esc(row.categoryId)}">Limiti kaldır</button>
    </li>`).join('');
}

// ---------- Tekrarlayan işlemler ----------

export function renderRecurringList(container, list) {
  if (list.length === 0) {
    container.innerHTML = '<li class="empty-row">Henüz tekrarlayan işlem yok.</li>';
    return;
  }

  container.innerHTML = list.map((r) => {
    const cat = categoryById(r.categoryId) || { icon: '❔', name: 'Bilinmeyen' };
    const sign = r.type === 'income' ? '+' : '−';
    return `
      <li class="rec-row" data-id="${esc(r.id)}">
        <span class="tx-icon" aria-hidden="true">${esc(cat.icon)}</span>
        <div class="tx-main">
          <div class="tx-title">${esc(r.name)}${r.active ? '' : ' (pasif)'}</div>
          <div class="tx-sub">${esc(cat.name)} · her ayın ${r.day}. günü</div>
        </div>
        <span class="tx-amount" data-type="${r.type}">${sign}${esc(money(r.amount))}</span>
        <button type="button" class="row-delete" data-toggle-recurring="${esc(r.id)}" aria-label="${r.active ? 'Pasifleştir' : 'Aktifleştir'}">${r.active ? '⏸' : '▶'}</button>
        <button type="button" class="row-delete" data-delete-recurring="${esc(r.id)}" aria-label="Tekrarlayan işlemi sil">✕</button>
      </li>`;
  }).join('');
}

export { CATEGORIES };

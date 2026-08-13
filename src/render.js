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

const fmtWhole = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const fmtDec = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (n) => {
  if (privacyMode) return '₺••••';
  const num = Number(n) || 0;
  return num % 1 === 0 ? `₺${fmtWhole.format(num)}` : `₺${fmtDec.format(num)}`;
};

export function trLower(str) {
  return String(str || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

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
  const q = search.trim();
  const qNorm = trLower(q);

  let filtered = [...transactions];
  if (filter !== 'all') {
    filtered = filtered.filter((t) => t.type === filter);
  }
  if (q) {
    filtered = filtered.filter((t) => {
      const cat = categoryById(t.categoryId, customCategories);
      const catName = cat ? cat.name : '';
      const note = t.note || '';
      return (
        trLower(catName).includes(qNorm) ||
        trLower(note).includes(qNorm) ||
        t.date.includes(q)
      );
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
    const hasCurrency = t.currency && t.currency !== 'TRY' && t.originalAmount;
    const currencyTag = hasCurrency ? `<span class="tx-curr-tag">${t.currency === 'USD' ? '$' : t.currency === 'EUR' ? '€' : t.currency === 'GBP' ? '£' : ''}${t.originalAmount} ${t.currency}</span>` : '';
    const receiptBtn = t.receiptImage ? `<button type="button" class="tx-receipt-badge" data-preview-receipt="${esc(t.id)}" title="Fiş Fotoğrafını Gör">${getIcon('camera')} Fiş</button>` : '';
    const instTag = t.installmentId ? `<span class="tx-inst-badge">Taksit</span>` : '';

    return `
      <li class="tx-row" data-id="${esc(t.id)}">
        <span class="tx-icon" aria-hidden="true">${esc(cat.icon)}</span>
        <div class="tx-main">
          <div class="tx-title">${esc(cat.name)} ${currencyTag} ${instTag} ${receiptBtn}</div>
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

// ---------- Hedef Birikimler (Kumbara) ----------

export function renderGoalsList(container, goals = []) {
  if (!container) return;
  if (!goals || goals.length === 0) {
    container.innerHTML = '<li class="empty-row">Henüz birikim hedefi eklenmedi. "Yeni Hedef Ekle" butonuyla başlayabilirsin.</li>';
    return;
  }

  container.innerHTML = goals.map((g) => {
    const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    const isCompleted = g.currentAmount >= g.targetAmount;

    return `
      <li class="goal-card ${isCompleted ? 'is-completed' : ''}" data-id="${esc(g.id)}">
        <div class="goal-header">
          <span class="goal-icon">${esc(g.icon || '🎯')}</span>
          <div class="goal-info">
            <h4>${esc(g.name)} ${isCompleted ? '🎉 (Tamamlandı!)' : ''}</h4>
            <div class="goal-sub">
              ${g.targetDate ? `Hedef Tarih: ${esc(g.targetDate)} · ` : ''}
              Kalan: ${money(remaining)}
            </div>
          </div>
          <div class="goal-figures">
            <strong>${money(g.currentAmount)}</strong>
            <span>/ ${money(g.targetAmount)} (%${pct})</span>
          </div>
        </div>

        <div class="goal-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="goal-progress-fill" style="width: ${pct}%"></div>
        </div>

        <div class="goal-actions">
          <button type="button" class="btn btn-xs btn-primary" data-deposit-goal="${esc(g.id)}">
            <span>+ Para Ekle</span>
          </button>
          <button type="button" class="btn btn-xs btn-secondary" data-withdraw-goal="${esc(g.id)}">
            <span>− Para Çek</span>
          </button>
          <button type="button" class="row-delete" data-delete-goal="${esc(g.id)}" aria-label="Hedefi Sil">
            ${getIcon('trash')}
          </button>
        </div>
      </li>
    `;
  }).join('');
}

// ---------- Harcama Isı Haritası (Calendar Heatmap) ----------

export function renderCalendarHeatmap(host, heatmapData) {
  if (!host || !heatmapData) return;

  const weekdays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const headerHtml = weekdays.map((w) => `<div class="heatmap-day-label">${w}</div>`).join('');

  let emptyCells = '';
  for (let i = 0; i < heatmapData.firstDayOfWeek; i += 1) {
    emptyCells += '<div class="heatmap-cell is-empty"></div>';
  }

  const cellsHtml = heatmapData.days.map((d) => {
    const title = `${d.dayNum} ${monthShortLabel(heatmapData.period)}: ${money(d.totalExpense)} (${d.count} işlem)`;
    return `
      <div class="heatmap-cell" data-intensity="${d.intensity}" data-date="${esc(d.date)}" title="${esc(title)}">
        <span class="cell-day">${d.dayNum}</span>
        ${d.totalExpense > 0 ? `<span class="cell-dot"></span>` : ''}
      </div>
    `;
  }).join('');

  host.innerHTML = `
    <div class="calendar-heatmap">
      <div class="heatmap-grid">
        ${headerHtml}
        ${emptyCells}
        ${cellsHtml}
      </div>
      <div class="heatmap-legend">
        <span>0 ₺</span>
        <div class="legend-scale">
          <span class="scale-box" data-intensity="0"></span>
          <span class="scale-box" data-intensity="1"></span>
          <span class="scale-box" data-intensity="2"></span>
          <span class="scale-box" data-intensity="3"></span>
          <span class="scale-box" data-intensity="4"></span>
        </div>
        <span>Çok</span>
      </div>
    </div>
  `;
}

// ---------- Yıllık Özet Raporu (Annual Overview) ----------

export function renderAnnualReport(host, summary) {
  if (!host || !summary) return;

  const monthRows = summary.months.map((m) => `
    <tr class="annual-row ${m.count === 0 ? 'is-empty-month' : ''}">
      <td class="col-month">${esc(m.monthName)}</td>
      <td class="col-inc">${money(m.income)}</td>
      <td class="col-exp">${money(m.expense)}</td>
      <td class="col-net" data-sign="${m.net >= 0 ? 'positive' : 'negative'}">${money(m.net)}</td>
      <td class="col-rate">%${m.savingsRate}</td>
    </tr>
  `).join('');

  const topCatsHtml = summary.topCategories.map((c) => `
    <div class="top-cat-pill">
      <span class="pill-icon">${esc(c.category.icon)}</span>
      <span class="pill-name">${esc(c.category.name)}</span>
      <strong class="pill-amt">${money(c.amount)}</strong>
      <span class="pill-pct">%${c.percent}</span>
    </div>
  `).join('');

  host.innerHTML = `
    <div class="annual-report-card">
      <div class="annual-stats-grid">
        <div class="annual-stat-tile">
          <span class="stat-label">Toplam Gelir</span>
          <strong class="stat-value text-blue">${money(summary.totalIncome)}</strong>
        </div>
        <div class="annual-stat-tile">
          <span class="stat-label">Toplam Gider</span>
          <strong class="stat-value text-orange">${money(summary.totalExpense)}</strong>
        </div>
        <div class="annual-stat-tile">
          <span class="stat-label">Net Yıllık Birikim</span>
          <strong class="stat-value ${summary.totalNet >= 0 ? 'text-green' : 'text-red'}">${money(summary.totalNet)}</strong>
        </div>
        <div class="annual-stat-tile">
          <span class="stat-label">Ort. Tasarruf Oranı</span>
          <strong class="stat-value text-aqua">%${summary.avgSavingsRate}</strong>
        </div>
      </div>

      ${summary.topCategories.length > 0 ? `
        <div class="annual-top-cats">
          <h5>Yılın En Çok Harcama Yapılan Kategorileri</h5>
          <div class="top-cats-wrapper">${topCatsHtml}</div>
        </div>
      ` : ''}

      <div class="annual-table-wrapper">
        <table class="annual-table">
          <thead>
            <tr>
              <th>Ay</th>
              <th>Gelir</th>
              <th>Gider</th>
              <th>Net</th>
              <th>Tasarruf</th>
            </tr>
          </thead>
          <tbody>
            ${monthRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------- Taksit Listesi Render ----------

export function renderInstallmentList(container, statsData) {
  if (!container) return;
  if (!statsData || statsData.list.length === 0) {
    container.innerHTML = '<li class="empty-row">Kayıtlı taksitli harcama veya borç bulunmuyor.</li>';
    return;
  }

  container.innerHTML = statsData.list.map((ins) => `
    <li class="installment-card ${ins.remainingCount === 0 ? 'is-paid-off' : ''}" data-id="${esc(ins.id)}">
      <div class="inst-header">
        <span class="inst-icon">${esc(ins.category.icon)}</span>
        <div class="inst-info">
          <h4>${esc(ins.name)}</h4>
          <span class="inst-sub">Aylık: <strong>${money(ins.monthlyAmount)}</strong> · Kalan: ${ins.remainingCount} / ${ins.totalInstallments} ay</span>
        </div>
        <div class="inst-figures">
          <strong>${money(ins.remainingDebt)}</strong>
          <span>kalan borç</span>
        </div>
      </div>
      <div class="inst-progress" role="progressbar" aria-valuenow="${ins.progressPct}" aria-valuemin="0" aria-valuemax="100">
        <div class="inst-progress-fill" style="width: ${ins.progressPct}%"></div>
      </div>
      <div class="inst-footer">
        <span class="inst-tag ${ins.isActiveThisMonth ? 'is-active' : ''}">
          ${ins.isActiveThisMonth ? 'Bu ay taksiti aktif' : ins.remainingCount === 0 ? 'Tamamı Ödendi' : 'Beklemede'}
        </span>
        <button type="button" class="btn btn-xs btn-danger" data-delete-inst="${esc(ins.id)}">Sil</button>
      </div>
    </li>
  `).join('');
}

// ---------- Bütçe Simülatörü Render ----------

export function renderSimulator(container, sim, customCategories = []) {
  if (!container) return;

  container.innerHTML = `
    <div class="simulator-card">
      <div class="sim-stats-grid">
        <div class="sim-stat-box">
          <span class="stat-label">Mevcut Net</span>
          <strong class="stat-value ${sim.currentNet >= 0 ? 'text-blue' : 'text-red'}">${money(sim.currentNet)}</strong>
        </div>
        <div class="sim-stat-box sim-highlight">
          <span class="stat-label">Simüle Edilen Net</span>
          <strong class="stat-value ${sim.newNet >= 0 ? 'text-green' : 'text-red'}">${money(sim.newNet)}</strong>
        </div>
        <div class="sim-stat-box">
          <span class="stat-label">Aylık Ek Kazanç</span>
          <strong class="stat-value text-aqua">+${money(sim.netImprovement)}</strong>
        </div>
        <div class="sim-stat-box">
          <span class="stat-label">Yıllık Ek Tasarruf</span>
          <strong class="stat-value text-green">+${money(sim.yearlyCutSavings + (sim.newIncome - sim.currentIncome) * 12)}</strong>
        </div>
      </div>

      <div class="sim-feedback">
        <span class="sim-badge">🎯 Tasarruf Oranı: %${sim.newSavingsRate}</span>
        <p>Bu senaryo ile yılda <strong>${money(sim.yearlyCutSavings + (sim.newIncome - sim.currentIncome) * 12)}</strong> ek birikim yapabilirsin!</p>
      </div>
    </div>
  `;
}

// ---------- Hızlı Komut Paleti Render ----------

export function renderCommandPalette(container, items, selectedIndex = 0) {
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = '<div class="palette-empty">Sonuç bulunamadı.</div>';
    return;
  }

  container.innerHTML = items.map((item, idx) => `
    <div class="palette-item ${idx === selectedIndex ? 'is-selected' : ''}" data-palette-index="${idx}">
      <span class="palette-icon">${item.icon || '⚡'}</span>
      <div class="palette-text">
        <span class="palette-title">${esc(item.title)}</span>
        ${item.sub ? `<span class="palette-sub">${esc(item.sub)}</span>` : ''}
      </div>
      ${item.badge ? `<span class="palette-badge">${esc(item.badge)}</span>` : ''}
    </div>
  `).join('');
}

export { CATEGORIES };


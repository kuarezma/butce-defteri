/**
 * Bağımlılıksız SVG grafikler — Modern Luminous & Gradient Stilleme.
 */

const fmt = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const money = (n) => `₺${fmt.format(n)}`;

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function niceMax(value) {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) {
    if (value <= s * magnitude) return s * magnitude;
  }
  return 10 * magnitude;
}

let tooltipEl = null;
function tooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'chart-tooltip';
  tooltipEl.hidden = true;
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function showTooltip(x, y, rows) {
  const el = tooltip();
  el.innerHTML = '';
  for (const row of rows) {
    const line = document.createElement('div');
    line.className = 'tt-row';
    if (row.swatch) {
      const key = document.createElement('span');
      key.className = 'tt-key';
      key.style.background = row.swatch;
      line.appendChild(key);
    }
    const val = document.createElement('strong');
    val.textContent = row.value;
    const label = document.createElement('span');
    label.textContent = row.label;
    line.append(val, label);
    el.appendChild(line);
  }
  el.hidden = false;
  const w = el.offsetWidth || 160;
  const h = el.offsetHeight || 40;
  const maxX = (window.innerWidth || 360) - w - 16;
  const maxY = (window.innerHeight || 640) - h - 16;
  const clampedX = Math.max(12, Math.min(x, maxX));
  const clampedY = Math.max(12, Math.min(y, maxY));
  el.style.left = `${clampedX}px`;
  el.style.top = `${clampedY}px`;
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.hidden = true;
}

// ---------- Sıralı yatay çubuk grafik (kategori kırılımı) ----------

export function rankedBarChart(rows, { hue, emptyText }) {
  const width = 560;
  const rowH = 38;
  const barH = 22;
  const labelW = 160;
  const gap = 3;
  const height = Math.max(rows.length, 1) * rowH + 12;
  const max = niceMax(Math.max(...rows.map((r) => r.amount), 1));
  const plotW = width - labelW - 80;

  if (rows.length === 0) {
    return { svg: `<div class="chart-empty">${esc(emptyText)}</div>`, attach() {} };
  }

  let bars = '';
  rows.forEach((row, i) => {
    const y = i * rowH + gap;
    const w = Math.max((row.amount / max) * plotW, 4);
    const cx = labelW;
    bars += `
      <g class="bar-row" data-i="${i}" tabindex="0" role="img"
         aria-label="${esc(row.category.name)}: ${esc(money(row.amount))}">
        <text x="${labelW - 12}" y="${y + barH / 2 + 5}" text-anchor="end" class="bar-label">${esc(row.category.icon)} ${esc(row.category.name)}</text>
        <rect class="bar-hit" x="${cx}" y="${y}" width="${plotW}" height="${barH}" fill="transparent" />
        <rect class="bar-fill" x="${cx}" y="${y}" width="${w}" height="${barH}" rx="6" ry="6" fill="var(--series-${hue})" />
        <text x="${cx + w + 10}" y="${y + barH / 2 + 5}" class="bar-value">${esc(money(row.amount))}</text>
      </g>`;
  });

  const svg = `
    <svg viewBox="0 0 ${width} ${height}" class="viz-root" role="group" aria-label="Kategori dağılımı">
      ${bars}
    </svg>`;

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return {
    svg,
    attach(container) {
      const els = container.querySelectorAll('.bar-row');
      els.forEach((el, i) => {
        const row = rows[i];
        const move = (evt) => {
          const percent = total > 0 ? Math.round((row.amount / total) * 100) : 0;
          const point = evt.touches ? evt.touches[0] : evt;
          showTooltip((point?.clientX ?? 0) + 14, (point?.clientY ?? 0) + 14, [
            { label: `${row.category.name} · %${percent}`, value: money(row.amount) },
          ]);
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerenter', move);
        el.addEventListener('focus', () => {
          const rect = el.getBoundingClientRect();
          move({ clientX: rect.right, clientY: rect.top });
        });
        el.addEventListener('pointerleave', hideTooltip);
        el.addEventListener('blur', hideTooltip);
      });
    },
  };
}

// ---------- Aylık gelir/gider trendi (çizgi + alan gradyanı) ----------

export function trendLineChart(series, monthLabelFn) {
  const width = 560;
  const height = 230;
  const padL = 48;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  if (series.length === 0) {
    return { svg: '<div class="chart-empty">Henüz veri yok.</div>', attach() {} };
  }

  const max = niceMax(Math.max(...series.map((s) => Math.max(s.income, s.expense)), 1));
  const stepX = series.length > 1 ? plotW / (series.length - 1) : 0;
  const xAt = (i) => padL + i * stepX;
  const yAt = (v) => padT + plotH - (v / max) * plotH;

  const gridLines = [0, 0.5, 1].map((f) => {
    const y = padT + plotH * (1 - f);
    return `<line x1="${padL}" x2="${width - padR}" y1="${y}" y2="${y}" class="grid-line" />
            <text x="${padL - 10}" y="${y + 4}" text-anchor="end" class="axis-tick">${esc(fmt.format(Math.round(max * f)))}</text>`;
  }).join('');

  const pathOf = (key) => series.map((s, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(s[key])}`).join(' ');

  // Alan gradyanı yolu
  const areaPathOf = (key) => {
    if (series.length === 0) return '';
    const line = pathOf(key);
    const lastX = xAt(series.length - 1);
    const firstX = xAt(0);
    const bottomY = padT + plotH;
    return `${line} L${lastX},${bottomY} L${firstX},${bottomY} Z`;
  };

  const dots = (key, hue) => series.map((s, i) => `
    <circle class="line-dot" data-i="${i}" cx="${xAt(i)}" cy="${yAt(s[key])}" r="5"
            fill="var(--series-${hue})" stroke="var(--chart-surface)" stroke-width="2.5" />`).join('');

  const xLabels = series.map((s, i) => `
    <text x="${xAt(i)}" y="${height - 6}" text-anchor="middle" class="axis-tick">${esc(monthLabelFn(s.period))}</text>`).join('');

  const hitCols = series.map((s, i) => `
    <rect class="trend-hit" data-i="${i}" x="${xAt(i) - stepX / 2}" y="${padT}" width="${Math.max(stepX, 1)}" height="${plotH}" fill="transparent" />`).join('');

  const svg = `
    <svg viewBox="0 0 ${width} ${height}" class="viz-root" role="group" aria-label="Aylık gelir gider trendi">
      <defs>
        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--series-blue)" stop-opacity="0.25" />
          <stop offset="100%" stop-color="var(--series-blue)" stop-opacity="0.0" />
        </linearGradient>
        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--series-orange)" stop-opacity="0.2" />
          <stop offset="100%" stop-color="var(--series-orange)" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaPathOf('income')}" fill="url(#incomeGradient)" />
      <path d="${areaPathOf('expense')}" fill="url(#expenseGradient)" />
      <path d="${pathOf('income')}" class="line-path" stroke="var(--series-blue)" fill="none" />
      <path d="${pathOf('expense')}" class="line-path" stroke="var(--series-orange)" fill="none" />
      ${dots('income', 'blue')}
      ${dots('expense', 'orange')}
      ${xLabels}
      <line class="crosshair" x1="0" x2="0" y1="${padT}" y2="${padT + plotH}" hidden />
      ${hitCols}
    </svg>`;

  return {
    svg,
    attach(container) {
      const crosshair = container.querySelector('.crosshair');
      const cols = container.querySelectorAll('.trend-hit');
      cols.forEach((col, i) => {
        const s = series[i];
        const move = (evt) => {
          crosshair.setAttribute('x1', xAt(i));
          crosshair.setAttribute('x2', xAt(i));
          crosshair.hidden = false;
          const point = evt.touches ? evt.touches[0] : evt;
          showTooltip((point?.clientX ?? 0) + 14, (point?.clientY ?? 0) + 14, [
            { label: 'Gelir', value: money(s.income), swatch: 'var(--series-blue)' },
            { label: 'Gider', value: money(s.expense), swatch: 'var(--series-orange)' },
            { label: 'Net', value: money(s.net) },
          ]);
        };
        col.addEventListener('pointermove', move);
        col.addEventListener('pointerenter', move);
        col.addEventListener('focus', () => move({ clientX: 0, clientY: 0 }));
        col.addEventListener('pointerleave', () => { crosshair.hidden = true; hideTooltip(); });
        col.addEventListener('blur', () => { crosshair.hidden = true; hideTooltip(); });
      });
    },
  };
}

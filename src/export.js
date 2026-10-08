/**
 * CSV / Excel Dışa Aktarma Modülü.
 * UTF-8 BOM (\uFEFF) ile Excel ve Numbers'ta Türkçe karakter sorunsuz açılır.
 */
import { CATEGORIES, categoryById } from './data/categories.js';

// Formül enjeksiyonu: Excel/Numbers bu karakterlerle başlayan hücreyi formül sayar.
const FORMULA_START = /^[=+\-@\t\r]/;
// İçe aktarmada dışa aktarmanın eklediği koruyucu tek tırnak geri alınır.
const ESCAPED_FORMULA = /^'(?=[=+\-@\t\r])/;

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (FORMULA_START.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
}

export function transactionsToCsv(transactions, customCategories = []) {
  const headers = ['ID', 'Tarih', 'Tür', 'Kategori', 'Tutar (TL)', 'Açıklama', 'Tekrarlayan mı?', 'Kayıt Zamanı'];
  const rows = transactions.map((t) => {
    const cat = categoryById(t.categoryId, customCategories);
    const catName = cat ? cat.name : t.categoryId;
    const typeStr = t.type === 'income' ? 'Gelir' : 'Gider';
    const isRecStr = t.recurringId ? 'Evet' : 'Hayır';
    return [
      escapeCsv(t.id),
      escapeCsv(t.date),
      escapeCsv(typeStr),
      escapeCsv(catName),
      t.amount.toFixed(2),
      escapeCsv(t.note || ''),
      escapeCsv(isRecStr),
      escapeCsv(t.createdAt || ''),
    ].join(';');
  });

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

export function downloadCsv(csvContent, filename = 'butce-islemleri.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// render.js DOM'a bağlı olduğundan trLower burada yerel tutuldu (aynı davranış).
function trLower(str) {
  return String(str || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Başlık karşılaştırması: 'ID' -> 'ıd' tuzağına karşı noktasız ı da i'ye çevrilir.
const headerKey = (s) => trLower(s).replace(/ı/g, 'i').trim();

const HEADER_FIELDS = {
  id: 'id',
  tarih: 'date',
  tur: 'type',
  kategori: 'category',
  'tutar (tl)': 'amount',
  aciklama: 'note',
  'kayit zamani': 'createdAt',
};

// ID benzeri belirteç: hex/uuid veya base36 "xxxxxxx-xxxxxx" (en az bir rakam içerir).
function looksLikeId(s) {
  return /^[0-9a-f-]{10,}$/i.test(s) || /^(?=.*\d)[a-z0-9]{5,}-[a-z0-9]{4,}$/i.test(s);
}

// Gerçek takvim tarihi olan YYYY-MM-DD veya DD.MM.YYYY -> 'YYYY-MM-DD', aksi halde null.
function normDate(str) {
  const s = String(str).trim();
  let y; let m; let d;
  let mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (mt) [, y, m, d] = mt;
  else if ((mt = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s))) [, d, m, y] = mt;
  else return null;
  const dt = new Date(Date.UTC(+y, +m - 1, +d));
  if (dt.getUTCFullYear() !== +y || dt.getUTCMonth() !== +m - 1 || dt.getUTCDate() !== +d) return null;
  return `${y}-${m}-${d}`;
}

// '350.00', '1.250,50', '1250,50', '1.250' -> sayı.
// Kurallar: iki ayraç türü varsa sonuncusu ondalık, diğerleri binlik; aynı ayraç
// birden çok kez geçiyorsa binlik; tek '.' ve ardından tam 3 rakam binlik ("1.250" -> 1250,
// "0.250" hariç); tek '.' diğer durumlarda ondalık; tek ',' her zaman Türkçe ondalık.
// "1,250" bilinçli olarak 1.25 okunur: Türkçe'de virgül ondalıktır, binlik değil.
function parseAmount(str) {
  const raw = String(str).replace(/[\s₺]|TL$/gi, '');
  const m = /^([-+]?)([\d.,]+)$/.exec(raw);
  if (!m) return null;
  const [, sign, body] = m;
  const dots = body.split('.').length - 1;
  const commas = body.split(',').length - 1;
  let s;
  if (dots && commas) {
    const dec = Math.max(body.lastIndexOf('.'), body.lastIndexOf(','));
    s = `${body.slice(0, dec).replace(/[.,]/g, '')}.${body.slice(dec + 1)}`;
  } else if (commas) {
    s = commas > 1 ? body.replace(/,/g, '') : body.replace(',', '.');
  } else if (dots > 1 || /^[1-9]\d*\.\d{3}$/.test(body)) {
    s = body.replace(/\./g, '');
  } else {
    s = body;
  }
  const n = Number(sign + s);
  return Number.isFinite(n) ? n : null;
}

// Tek geçişte RFC4180 benzeri ayrıştırma: tırnak içinde ayraç, "" ve satır sonu korunur.
function tokenizeCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  let quoted = false;
  const endCell = () => {
    row.push(quoted ? cur : cur.trim());
    cur = '';
    quoted = false;
  };
  const endRow = () => {
    endCell();
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i += 1; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
      quoted = true;
    } else if (ch === delimiter) endCell();
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      endRow();
    } else cur += ch;
  }
  if (cur !== '' || quoted || row.length) endRow();
  return rows;
}

function resolveCategoryId(name, type, customCategories) {
  const key = trLower(name);
  if (key) {
    const builtin = CATEGORIES.find((c) => c.type === type && trLower(c.name) === key);
    if (builtin) return builtin.id;
    const custom = (Array.isArray(customCategories) ? customCategories : [])
      .find((c) => c.type === type && trLower(c.name) === key);
    if (custom) return custom.id;
  }
  return type === 'income' ? 'gelir-maas' : 'gider-diger';
}

function parseTypeCell(cell) {
  const t = trLower(cell);
  if (t === 'gelir' || t === 'income') return 'income';
  if (t === 'gider' || t === 'expense') return 'expense';
  return null;
}

// Başlıklı (dışa aktarılan) satır -> işlem veya null.
function parseHeaderRow(cols, map, customCategories) {
  const get = (f) => (map[f] === undefined ? '' : (cols[map[f]] ?? '').replace(ESCAPED_FORMULA, ''));
  const date = normDate(get('date'));
  const num = parseAmount(get('amount'));
  if (!date || num === null || num === 0) return null;
  const type = num < 0 ? 'expense' : parseTypeCell(get('type')) || 'expense';
  const tx = {
    type,
    amount: Math.abs(num),
    categoryId: resolveCategoryId(get('category'), type, customCategories),
    date,
    note: get('note'),
  };
  const id = get('id').trim();
  if (id) tx.id = id;
  const created = get('createdAt').trim();
  if (created && !Number.isNaN(Date.parse(created))) tx.createdAt = new Date(created).toISOString();
  return tx;
}

// Başlıksız / tanınmayan format için sezgisel satır ayrıştırma.
function parseHeuristicRow(cols, customCategories) {
  if (cols.length < 3) return null;
  let date = null;
  let type = 'expense';
  let categoryNameOrId = '';
  let amount = null;
  let note = '';

  for (const col of cols) {
    const nd = date ? null : normDate(col);
    if (nd) {
      date = nd;
    } else if (col.toLowerCase() === 'gelir' || col.toLowerCase() === 'income') {
      type = 'income';
    } else if (col.toLowerCase() === 'gider' || col.toLowerCase() === 'expense') {
      type = 'expense';
    } else if (amount === null && /^-?\d+([.,]\d+)?$/.test(col)) {
      const num = parseAmount(col);
      if (num !== 0) {
        amount = Math.abs(num);
        if (num < 0) type = 'expense';
      }
    } else if (looksLikeId(col)) {
      // ID benzeri değer kategori/not olamaz.
    } else if (!categoryNameOrId && col.length > 1) {
      categoryNameOrId = col;
    } else if (!note && col.length > 0) {
      note = col;
    }
  }

  if (!(date && amount && amount > 0)) return null;
  let catId = type === 'income' ? 'gelir-maas' : 'gider-diger';
  const cLow = categoryNameOrId.toLowerCase();
  if (cLow.includes('market') || cLow.includes('gıda')) catId = 'gider-market';
  else if (cLow.includes('konut') || cLow.includes('kira')) catId = 'gider-konut';
  else if (cLow.includes('fatura') || cLow.includes('elektrik')) catId = 'gider-fatura';
  else if (cLow.includes('ulaşım') || cLow.includes('yakıt')) catId = 'gider-ulasim';
  else if (cLow.includes('yemek') || cLow.includes('kafe')) catId = 'gider-disarida';
  else if (cLow.includes('eğlence')) catId = 'gider-eglence';
  else if (cLow.includes('sağlık')) catId = 'gider-saglik';
  else if (cLow.includes('maaş')) catId = 'gelir-maas';
  else if (cLow.includes('ek')) catId = 'gelir-ek';

  for (const custom of customCategories) {
    if (cLow.includes(custom.name.toLowerCase()) || custom.id === categoryNameOrId) {
      catId = custom.id;
      type = custom.type;
      break;
    }
  }
  return { type, amount, categoryId: catId, date, note: note || categoryNameOrId };
}

/**
 * CSV metnini ayrıştırır: { transactions, skipped }.
 * Başlık satırı tanınırsa sütunlar ada göre eşlenir (dışa aktarma formatı, ID dahil);
 * aksi halde sezgisel sütun tespiti kullanılır. Ayraç: ';' veya ','.
 */
export function parseCsvDetailed(csvText, customCategories = []) {
  const result = { transactions: [], skipped: 0 };
  if (!csvText || typeof csvText !== 'string') return result;
  const clean = csvText.replace(/^﻿/, '');
  if (!clean.trim()) return result;

  const firstLine = clean.split(/\r?\n/, 1)[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const rows = tokenizeCsv(clean, delimiter);
  if (!rows.length) return result;

  const map = {};
  rows[0].forEach((h, i) => {
    const field = HEADER_FIELDS[headerKey(h)];
    if (field && map[field] === undefined) map[field] = i;
  });
  const hasHeader = Object.keys(map).length > 0;

  rows.forEach((cols, idx) => {
    if (hasHeader) {
      if (idx === 0) return;
      const tx = parseHeaderRow(cols, map, customCategories);
      if (tx) result.transactions.push(tx); else result.skipped += 1;
      return;
    }
    const tx = parseHeuristicRow(cols, customCategories);
    if (tx) result.transactions.push(tx);
    else if (idx > 0) result.skipped += 1; // ilk satır geçersizse başlık sayılır
  });
  return result;
}

/**
 * CSV metnini ayrıştırarak geçerli işlem listesi döner.
 * Ayrıntı (atlanan satır sayısı) için parseCsvDetailed kullanın.
 */
export function parseCsvToTransactions(csvText, customCategories = []) {
  return parseCsvDetailed(csvText, customCategories).transactions;
}

/**
 * CSV / Excel Dışa Aktarma Modülü.
 * UTF-8 BOM (\uFEFF) ile Excel ve Numbers'ta Türkçe karakter sorunsuz açılır.
 */
import { categoryById } from './data/categories.js';

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
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

/**
 * CSV metnini ayrıştırarak geçerli işlem listesi döner.
 * Noktalı virgül (;) ve virgül (,) destekler.
 */
export function parseCsvToTransactions(csvText, customCategories = []) {
  if (!csvText || typeof csvText !== 'string') return [];
  const clean = csvText.replace(/^\uFEFF/, '').trim();
  if (!clean) return [];

  const lines = clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return []; // Sadece başlık varsa

  // Ayraç tespiti
  const delimiter = lines[0].includes(';') ? ';' : ',';

  function splitLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const transactions = [];
  // Başlık satırını atla
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitLine(lines[i]);
    if (cols.length < 3) continue;

    // Beklenen format: ID; Tarih; Tür; Kategori; Tutar; Açıklama (veya Tarih; Tür; Kategori; Tutar...)
    // Akıllı sütun tespiti
    let date = null;
    let type = 'expense';
    let categoryNameOrId = '';
    let amount = null;
    let note = '';

    for (const col of cols) {
      // Tarih tespiti: YYYY-MM-DD veya DD.MM.YYYY
      if (!date && /^\d{4}-\d{2}-\d{2}$/.test(col)) {
        date = col;
      } else if (!date && /^\d{2}\.\d{2}\.\d{4}$/.test(col)) {
        const [d, m, y] = col.split('.');
        date = `${y}-${m}-${d}`;
      } else if (col.toLowerCase() === 'gelir' || col.toLowerCase() === 'income') {
        type = 'income';
      } else if (col.toLowerCase() === 'gider' || col.toLowerCase() === 'expense') {
        type = 'expense';
      } else if (amount === null && /^-?\d+([.,]\d+)?$/.test(col)) {
        const num = parseFloat(col.replace(',', '.'));
        if (num !== 0) {
          amount = Math.abs(num);
          if (num < 0) type = 'expense';
        }
      } else if (!categoryNameOrId && col.length > 1 && !/^[0-9a-f-]{10,}$/i.test(col)) {
        categoryNameOrId = col;
      } else if (!note && col.length > 0 && !/^[0-9a-f-]{10,}$/i.test(col)) {
        note = col;
      }
    }

    if (date && amount && amount > 0) {
      // Kategori id çözümle
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

      // Özel kategorilerde arama
      for (const custom of customCategories) {
        if (cLow.includes(custom.name.toLowerCase()) || custom.id === categoryNameOrId) {
          catId = custom.id;
          type = custom.type;
          break;
        }
      }

      transactions.push({
        type,
        amount,
        categoryId: catId,
        date,
        note: note || categoryNameOrId,
      });
    }
  }

  return transactions;
}

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

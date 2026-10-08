import { describe, it, expect } from 'vitest';
import { transactionsToCsv, parseCsvDetailed, parseCsvToTransactions } from '../src/export.js';

const custom = [{ id: 'ozel-kahve', type: 'expense', name: 'Kahve Köşesi', active: true }];

const txs = [
  { id: 'muzzlmv7-i1jauo', type: 'expense', amount: 350, categoryId: 'gider-market', date: '2026-10-05', note: 'akşam alışverişi', createdAt: '2026-10-08T20:26:32.323Z' },
  { id: 'muzzlmv7-2bn88y', type: 'income', amount: 65000, categoryId: 'gelir-maas', date: '2026-10-01', note: 'Ekim maaşı', createdAt: '2026-10-08T20:26:32.323Z' },
  { id: 'muzzlmv7-zzz111', type: 'expense', amount: 42.5, categoryId: 'ozel-kahve', date: '2026-10-06', note: '', createdAt: '2026-10-08T20:26:32.323Z' },
  { id: 'muzzlmv7-nnn222', type: 'expense', amount: 10, categoryId: 'gider-diger', date: '2026-10-07', note: 'a;b "alıntı"\nikinci satır\r\nüçüncü', createdAt: '2026-10-08T20:26:32.323Z' },
];

const pick = (t) => ({ id: t.id, type: t.type, amount: t.amount, categoryId: t.categoryId, date: t.date, note: t.note });

describe('CSV round-trip', () => {
  it('yerleşik ve özel kategori dahil birebir geri okunur', () => {
    const { transactions, skipped } = parseCsvDetailed(transactionsToCsv(txs, custom), custom);
    expect(skipped).toBe(0);
    expect(transactions.map(pick)).toEqual(txs.map(pick));
    expect(transactions[0].createdAt).toBe('2026-10-08T20:26:32.323Z');
  });

  it('BOM olmadan da çalışır', () => {
    const csv = transactionsToCsv(txs, custom).replace(/^﻿/, '');
    expect(parseCsvDetailed(csv, custom).transactions.map(pick)).toEqual(txs.map(pick));
  });

  it('iki kez parse edilince id aynı kalır', () => {
    const csv = transactionsToCsv(txs, custom);
    const a = parseCsvDetailed(csv, custom).transactions.map((t) => t.id);
    const b = parseCsvDetailed(csv, custom).transactions.map((t) => t.id);
    expect(a).toEqual(b);
    expect(a).toEqual(txs.map((t) => t.id));
  });

  it('eşleşmeyen kategori adı notu değiştirmez, varsayılana düşer', () => {
    const csv = 'ID;Tarih;Tür;Kategori;Tutar (TL);Açıklama\r\n"";"2026-10-05";"Gider";"Bilinmeyen";5.00;"not"';
    const [t] = parseCsvDetailed(csv).transactions;
    expect(t).toMatchObject({ categoryId: 'gider-diger', note: 'not' });
    expect(t.id).toBeUndefined();
    expect(t.createdAt).toBeUndefined();
  });
});

describe('CSV formül enjeksiyonu', () => {
  const triggers = ['=1+1', '+5', '-3', '@SUM(A1)', '\tsekme', '\rcr'];
  const mk = (note) => ({ id: 'fx-' + Math.abs(note.length), type: 'expense', amount: 5, categoryId: 'gider-diger', date: '2026-10-05', note });

  it('formül başlatıcılı not dışa aktarmada tek tırnakla başlar', () => {
    for (const note of triggers) {
      const csv = transactionsToCsv([mk(note)]);
      expect(csv).toContain(`;"'${note}";`);
    }
  });
  it('round-trip orijinal notu verir', () => {
    for (const note of triggers) {
      const [t] = parseCsvDetailed(transactionsToCsv([mk(note)])).transactions;
      expect(t.note).toBe(note);
    }
  });
  it('özel kategori adı da korunur ve geri okunur', () => {
    const cc = [{ id: 'ozel-x', type: 'expense', name: '=Kategori', active: true }];
    const t = { ...mk('x'), categoryId: 'ozel-x' };
    const csv = transactionsToCsv([t], cc);
    expect(csv).toContain(`;"'=Kategori";`);
    expect(parseCsvDetailed(csv, cc).transactions[0].categoryId).toBe('ozel-x');
  });
  it('sıradan not ve sayısal alanlar değişmez', () => {
    const csv = transactionsToCsv([mk('normal not')]);
    expect(csv).toContain(';5.00;"normal not";');
    expect(parseCsvDetailed(csv).transactions[0].note).toBe('normal not');
  });
  it('formül başlatıcısı olmayan baştaki tek tırnak korunur', () => {
    const csv = 'Tarih;Tür;Kategori;Tutar (TL);Açıklama\n2026-10-05;Gider;Market;5;"\'merhaba"';
    expect(parseCsvDetailed(csv).transactions[0].note).toBe("'merhaba");
  });
});

describe('tutar ve tarih', () => {
  const head = 'Tarih;Tür;Kategori;Tutar (TL);Açıklama\n';
  it('TR ve nokta biçimleri', () => {
    const amounts = ['350.00', '1250.50', '1.250,50', '1250,50'];
    const csv = head + amounts.map((a) => `2026-10-05;Gider;Market;"${a}";x`).join('\n');
    expect(parseCsvDetailed(csv).transactions.map((t) => t.amount)).toEqual([350, 1250.5, 1250.5, 1250.5]);
  });
  const parseAmounts = (list) => parseCsvDetailed(head + list.map((a) => `2026-10-05;Gider;Market;"${a}";x`).join('\n')).transactions.map((t) => t.amount);
  it('tek nokta + tam 3 rakam binliktir', () => {
    expect(parseAmounts(['1.250', '10.000', '999.999'])).toEqual([1250, 10000, 999999]);
  });
  it('tek nokta + 1-2 rakam ondalıktır', () => {
    expect(parseAmounts(['350.00', '1.5', '0.25', '1250.5'])).toEqual([350, 1.5, 0.25, 1250.5]);
  });
  it('tek virgül Türkçe ondalıktır; "1,250" bilinçli olarak 1.25', () => {
    expect(parseAmounts(['1250,50', '1,25', '1,250'])).toEqual([1250.5, 1.25, 1.25]);
  });
  it('iki ayraç türü: sonuncusu ondalık', () => {
    expect(parseAmounts(['1.250,50', '1,250.50'])).toEqual([1250.5, 1250.5]);
  });
  it('aynı ayraç birden çok kez geçerse binliktir', () => {
    expect(parseAmounts(['1.250.500', '1,250,500', '1.250.500,75'])).toEqual([1250500, 1250500, 1250500.75]);
  });
  it('geçersiz tutar atlanır', () => {
    const r = parseCsvDetailed(head + ['abc', '1.2x', '0,00'].map((a) => `2026-10-05;Gider;Market;"${a}";x`).join('\n'));
    expect(r.transactions).toHaveLength(0);
    expect(r.skipped).toBe(3);
  });
  it('dışa aktarılan 1250 geri 1250 okunur', () => {
    const t = [{ id: 'a1b2c3d4-e5f6g7', type: 'expense', amount: 1250, categoryId: 'gider-market', date: '2026-10-05', note: '' }];
    expect(parseCsvDetailed(transactionsToCsv(t)).transactions[0].amount).toBe(1250);
  });
  it('negatif tutar gider olur, pozitif döner', () => {
    const [t] = parseCsvDetailed(head + '2026-10-05;Gelir;Maaş;-100;x').transactions;
    expect(t).toMatchObject({ type: 'expense', amount: 100 });
  });
  it('geçersiz tarih ve sıfır/boş tutar atlanır ve sayılır', () => {
    const csv = head + ['2026-02-30;Gider;Market;5;x', '2026-02-10;Gider;Market;0;x', '2026-02-10;Gider;Market;;x', '10.02.2026;Gider;Market;5;ok'].join('\n');
    const r = parseCsvDetailed(csv);
    expect(r.skipped).toBe(3);
    expect(r.transactions).toHaveLength(1);
    expect(r.transactions[0].date).toBe('2026-02-10');
  });
});

describe('boş girdi ve sezgisel mod', () => {
  it('boş ve yalnızca başlık', () => {
    expect(parseCsvDetailed('')).toEqual({ transactions: [], skipped: 0 });
    expect(parseCsvDetailed('﻿ID;Tarih;Tür;Kategori;Tutar (TL);Açıklama;Tekrarlayan mı?;Kayıt Zamanı\r\n')).toEqual({ transactions: [], skipped: 0 });
  });
  it('başlıksız virgül ayraçlı CSV, ID kategori sayılmaz', () => {
    const csv = 'muzzlmv7-i1jauo,05.10.2026,Gider,Market,350.00,market notu\n12.10.2026,Gelir,Maaş,1000,';
    const r = parseCsvToTransactions(csv);
    expect(r[0]).toMatchObject({ type: 'expense', amount: 350, categoryId: 'gider-market', date: '2026-10-05', note: 'market notu' });
    expect(r[0].id).toBeUndefined();
    expect(r[1]).toMatchObject({ type: 'income', amount: 1000, categoryId: 'gelir-maas', date: '2026-10-12' });
  });
  it('başlık satırlı sezgisel CSV: ilk satır başlık sayılır', () => {
    const r = parseCsvDetailed('Date,Type,Cat,Amount\n05.10.2026,Gider,Ulaşım,20');
    expect(r.skipped).toBe(0);
    expect(r.transactions).toHaveLength(1);
  });
});

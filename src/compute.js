import { transactionsInMonth, shiftPeriod } from './state.js';
import { categoryById } from './data/categories.js';
import { CATEGORY_CHART_CAP } from './palette.js';

export function monthTotals(state, period) {
  const txs = transactionsInMonth(state, period);
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense, count: txs.length };
}

/** Kategoriye göre kırılım, büyükten küçüğe sıralı. `cap` üstü tek dilimde "Diğer"e katlanır. */
export function categoryBreakdown(state, period, type, cap = CATEGORY_CHART_CAP) {
  const txs = transactionsInMonth(state, period).filter((t) => t.type === type);
  const sums = new Map();
  for (const t of txs) sums.set(t.categoryId, (sums.get(t.categoryId) || 0) + t.amount);

  const rows = [...sums.entries()]
    .map(([categoryId, amount]) => ({ categoryId, category: categoryById(categoryId, state.customCategories), amount }))
    .sort((a, b) => b.amount - a.amount);

  if (rows.length <= cap) return rows;

  const head = rows.slice(0, cap - 1);
  const tailSum = rows.slice(cap - 1).reduce((s, r) => s + r.amount, 0);
  head.push({ categoryId: '__other__', category: { id: '__other__', name: 'Diğer', icon: '…' }, amount: tailSum });
  return head;
}

/** Son `n` ay için gelir/gider serisi, en eskiden en yeniye. */
export function trendSeries(state, currentPeriod, n = 6) {
  const periods = [];
  let p = currentPeriod;
  for (let i = 0; i < n; i += 1) {
    periods.unshift(p);
    p = shiftPeriod(p, -1);
  }
  return periods.map((period) => ({ period, ...monthTotals(state, period) }));
}

/** Bütçe limiti tanımlı her kategori için kullanım durumu, en kritikten aza sıralı. */
export function budgetStatus(state, period) {
  const txs = transactionsInMonth(state, period).filter((t) => t.type === 'expense');
  const spent = new Map();
  for (const t of txs) spent.set(t.categoryId, (spent.get(t.categoryId) || 0) + t.amount);

  const rows = Object.entries(state.budgets).map(([categoryId, limit]) => {
    const used = spent.get(categoryId) || 0;
    const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;
    let severity = 'good';
    if (percent >= 100) severity = 'critical';
    else if (percent >= 90) severity = 'serious';
    else if (percent >= 70) severity = 'warning';
    return { categoryId, category: categoryById(categoryId, state.customCategories), limit, used, percent, severity };
  });

  return rows.sort((a, b) => b.percent - a.percent);
}

/**
 * Son `n` ayın (mevcut ay hariç, kapanmış aylar) ortalama gideri.
 * "Future-Proof Canvas" planındaki f1-butce-tabani maddesinin ("aylık gider
 * tabanını ölç") doğrudan girdisi — acil durum fonu hedefi buna göre hesaplanır.
 */
export function trailingAverageExpense(state, currentPeriod, n = 3) {
  let p = shiftPeriod(currentPeriod, -1);
  let sum = 0;
  let counted = 0;
  for (let i = 0; i < n; i += 1) {
    const t = monthTotals(state, p);
    if (t.count > 0) {
      sum += t.expense;
      counted += 1;
    }
    p = shiftPeriod(p, -1);
  }
  return counted > 0 ? Math.round(sum / counted) : 0;
}

/** Gelirin ne kadarının tasarruf edildiğini (%) hesaplar. */
export function savingsRate(totals) {
  if (!totals || totals.income <= 0) return 0;
  return Math.round(((totals.income - totals.expense) / totals.income) * 100);
}

/**
 * Geçerli ay ile önceki ayın kategori harcamalarını karşılaştırır.
 */
export function categoryComparison(state, currentPeriod, type = 'expense') {
  const prevPeriod = shiftPeriod(currentPeriod, -1);
  const currentTxs = transactionsInMonth(state, currentPeriod).filter((t) => t.type === type);
  const prevTxs = transactionsInMonth(state, prevPeriod).filter((t) => t.type === type);

  const currentSums = new Map();
  for (const t of currentTxs) currentSums.set(t.categoryId, (currentSums.get(t.categoryId) || 0) + t.amount);

  const prevSums = new Map();
  for (const t of prevTxs) prevSums.set(t.categoryId, (prevSums.get(t.categoryId) || 0) + t.amount);

  const allCatIds = new Set([...currentSums.keys(), ...prevSums.keys()]);
  const rows = [];

  for (const categoryId of allCatIds) {
    const cur = currentSums.get(categoryId) || 0;
    const prev = prevSums.get(categoryId) || 0;
    const diff = cur - prev;
    const diffPercent = prev > 0 ? Math.round((diff / prev) * 100) : cur > 0 ? 100 : 0;
    rows.push({
      categoryId,
      category: categoryById(categoryId, state.customCategories) || { id: categoryId, name: 'Diğer', icon: '🔹' },
      currentAmount: cur,
      prevAmount: prev,
      diff,
      diffPercent,
    });
  }

  return rows.sort((a, b) => b.currentAmount - a.currentAmount);
}

/**
 * 50/30/20 Kural Analizi:
 * İhtiyaçlar (%50), İstekler (%30), Tasarruf (%20).
 */
export function computeFiftyThirtyTwenty(state, period) {
  const totals = monthTotals(state, period);
  const txs = transactionsInMonth(state, period).filter((t) => t.type === 'expense');

  let needsAmount = 0;
  let wantsAmount = 0;

  for (const t of txs) {
    const cat = categoryById(t.categoryId, state.customCategories);
    if (cat && cat.bucket === 'needs') {
      needsAmount += t.amount;
    } else {
      wantsAmount += t.amount;
    }
  }

  const netSavings = Math.max(totals.net, 0);
  const base = totals.income > 0 ? totals.income : (needsAmount + wantsAmount);

  const needsPct = base > 0 ? Math.round((needsAmount / base) * 100) : 0;
  const wantsPct = base > 0 ? Math.round((wantsAmount / base) * 100) : 0;
  const savingsPct = totals.income > 0 ? Math.round((netSavings / totals.income) * 100) : 0;

  let evaluation = '';
  let statusTone = 'info';

  if (totals.income <= 0) {
    evaluation = '50/30/20 analizi için bu aya gelir işlemi ekleyin.';
    statusTone = 'neutral';
  } else if (totals.net < 0) {
    evaluation = 'Bu ay giderler geliri aşıyor. Bütçe açığını kapatmak için istek harcamalarını kısabilirsiniz.';
    statusTone = 'critical';
  } else if (needsPct <= 55 && wantsPct <= 35 && savingsPct >= 15) {
    evaluation = 'Harika bütçe yönetimi! Harcamalarınız ve tasarrufunuz ideal dengede. 🌟';
    statusTone = 'good';
  } else if (needsPct > 55) {
    evaluation = `Zorunlu ihtiyaç harcamaları gelirin %${needsPct}'ini kapsıyor (hedef: %50).`;
    statusTone = 'warning';
  } else if (wantsPct > 35) {
    evaluation = `İstek harcamaları gelirin %${wantsPct}'ini buldu (hedef: %30).`;
    statusTone = 'warning';
  } else {
    evaluation = 'Dengeli bir bütçe dağılımı mevcut.';
    statusTone = 'good';
  }

  return {
    income: totals.income,
    expense: totals.expense,
    net: totals.net,
    needsAmount,
    wantsAmount,
    savingsAmount: netSavings,
    needsPct,
    wantsPct,
    savingsPct,
    evaluation,
    statusTone,
  };
}

/**
 * Akıllı Tek Satır Hızlı Giriş Ayrıştırıcı (Smart Quick Entry Parser)
 * "market 350", "kahve 85 arkadaşla", "maaş 65000", "$100 freelance", "€50 amazon"
 */
export function parseQuickEntry(rawText, customCategories = [], state = null) {
  if (!rawText || typeof rawText !== 'string') return null;
  const text = rawText.trim();
  if (!text) return null;

  // Döviz tespiti
  let currency = 'TRY';
  if (/\$|usd/i.test(text)) currency = 'USD';
  else if (/€|eur/i.test(text)) currency = 'EUR';
  else if (/£|gbp/i.test(text)) currency = 'GBP';
  else if (/altın|gld/i.test(text)) currency = 'GLD';

  // Tutarı bul (örn. 350, 45.50, 1200 TL, ₺500, $100, €50)
  const amountMatch = text.match(/(?:[₺$€£]\s*)?(\d+(?:[.,]\d+)?)(?:\s*(?:tl|₺|usd|eur|gbp|\$|€|£|gr|gram))?/i);
  if (!amountMatch) return null;

  const rawAmountStr = amountMatch[1].replace(',', '.');
  const originalAmount = parseFloat(rawAmountStr);
  if (!Number.isFinite(originalAmount) || originalAmount <= 0) return null;

  let amount = originalAmount;
  if (currency !== 'TRY' && state && state.currencies) {
    const rate = state.currencies[currency] || 1;
    amount = Number((originalAmount * rate).toFixed(2));
  }

  const textWithoutAmount = text.replace(amountMatch[0], '').trim();
  const lower = textWithoutAmount.toLowerCase();

  const keywordsMap = [
    { keys: ['maaş', 'maas', 'avans', 'gelir', 'hakediş', 'ücret', 'burs'], catId: 'gelir-maas', type: 'income' },
    { keys: ['ek iş', 'freelance', 'satış', 'ek gelir', 'ikramiye', 'prim'], catId: 'gelir-ek', type: 'income' },
    { keys: ['kira', 'aidat', 'ev', 'tadilat', 'apartman'], catId: 'gider-konut', type: 'expense' },
    { keys: ['market', 'bakkal', 'süpermarket', 'manav', 'kasap', 'şok', 'bim', 'a101', 'migros', 'carrefour'], catId: 'gider-market', type: 'expense' },
    { keys: ['fatura', 'elektrik', 'su', 'doğalgaz', 'dogalgaz', 'internet', 'telefon', 'turkcell', 'vodafone', 'türk telekom'], catId: 'gider-fatura', type: 'expense' },
    { keys: ['benzin', 'mazot', 'yakıt', 'otobüs', 'metro', 'akbil', 'taksi', 'uber', 'otopark', 'hgs', 'ulasim', 'ulaşım'], catId: 'gider-ulasim', type: 'expense' },
    { keys: ['yemek', 'kahve', 'cafe', 'kafe', 'restoran', 'lokanta', 'starbucks', 'yemeksepeti', 'getir', 'trendyol yemek', 'dışarıda'], catId: 'gider-disarida', type: 'expense' },
    { keys: ['netflix', 'spotify', 'youtube', 'sinema', 'tiyatro', 'konser', 'oyun', 'steam', 'playstation', 'eğlence', 'tatil'], catId: 'gider-eglence', type: 'expense' },
    { keys: ['eczane', 'ilaç', 'doktor', 'hastane', 'sağlık', 'diş', 'tedavi'], catId: 'gider-saglik', type: 'expense' },
    { keys: ['giyim', 'kıyafet', 'ayakkabı', 'pantolon', 'tişört', 'zara', 'h&m'], catId: 'gider-giyim', type: 'expense' },
    { keys: ['kurs', 'kitap', 'eğitim', 'udemy', 'okul', 'harç'], catId: 'gider-egitim', type: 'expense' },
    { keys: ['kredi', 'borç', 'kart', 'taksit', 'faiz'], catId: 'gider-borc', type: 'expense' },
  ];

  for (const c of customCategories) {
    keywordsMap.unshift({
      keys: [c.name.toLowerCase(), c.name.toLowerCase().replace(/\s+/g, '')],
      catId: c.id,
      type: c.type,
    });
  }

  let matchedType = 'expense';
  let matchedCatId = 'gider-diger';

  for (const item of keywordsMap) {
    if (item.keys.some((k) => lower.includes(k))) {
      matchedType = item.type;
      matchedCatId = item.catId;
      break;
    }
  }

  const note = textWithoutAmount || (matchedType === 'income' ? 'Gelir' : 'Gider');

  return {
    type: matchedType,
    categoryId: matchedCatId,
    amount,
    originalAmount,
    currency,
    note,
  };
}

/**
 * Taksit Durum Özeti & Kalan Borç Hesaplaması
 */
export function installmentStats(state, currentPeriod) {
  if (!state.installments || state.installments.length === 0) {
    return { list: [], totalMonthly: 0, totalRemainingDebt: 0 };
  }

  const [curY, curM] = currentPeriod.split('-').map(Number);
  let totalMonthly = 0;
  let totalRemainingDebt = 0;

  const list = state.installments.map((ins) => {
    const [startY, startM] = ins.startPeriod.split('-').map(Number);
    const monthDiff = (curY - startY) * 12 + (curM - startM);
    const currentInstallment = Math.max(0, Math.min(ins.totalInstallments, monthDiff + 1));
    const paidCount = Math.max(0, Math.min(ins.totalInstallments, monthDiff));
    const remainingCount = Math.max(0, ins.totalInstallments - paidCount);
    const remainingDebt = Number((remainingCount * ins.monthlyAmount).toFixed(2));
    const isActiveThisMonth = ins.active && monthDiff >= 0 && monthDiff < ins.totalInstallments;

    if (isActiveThisMonth) totalMonthly += ins.monthlyAmount;
    if (ins.active) totalRemainingDebt += remainingDebt;

    return {
      ...ins,
      category: categoryById(ins.categoryId, state.customCategories) || { id: ins.categoryId, name: 'Diğer', icon: '💳' },
      currentInstallment,
      remainingCount,
      remainingDebt,
      isActiveThisMonth,
      progressPct: Math.round((paidCount / ins.totalInstallments) * 100),
    };
  });

  return {
    list,
    totalMonthly: Number(totalMonthly.toFixed(2)),
    totalRemainingDebt: Number(totalRemainingDebt.toFixed(2)),
  };
}

/**
 * Bütçe Simülatörü ("Ne Olursa?" Senaryoları)
 */
export function simulateScenario(state, period, options = {}) {
  const totals = monthTotals(state, period);
  const {
    cutCategoryId = null,
    cutPercent = 0,
    incomeBoostPercent = 0,
  } = options;

  let categoryExpense = 0;
  if (cutCategoryId) {
    const txs = transactionsInMonth(state, period).filter((t) => t.type === 'expense' && t.categoryId === cutCategoryId);
    categoryExpense = txs.reduce((sum, t) => sum + t.amount, 0);
  }

  const monthlyCutSavings = Math.round((categoryExpense * cutPercent) / 100);
  const yearlyCutSavings = monthlyCutSavings * 12;

  const extraIncome = Math.round((totals.income * incomeBoostPercent) / 100);
  const newIncome = totals.income + extraIncome;
  const newExpense = Math.max(0, totals.expense - monthlyCutSavings);
  const newNet = newIncome - newExpense;
  const newSavingsRate = newIncome > 0 ? Math.round((newNet / newIncome) * 100) : 0;

  return {
    currentIncome: totals.income,
    currentExpense: totals.expense,
    currentNet: totals.net,
    categoryExpense,
    monthlyCutSavings,
    yearlyCutSavings,
    newIncome,
    newExpense,
    newNet,
    newSavingsRate,
    netImprovement: newNet - totals.net,
  };
}

/**
 * Yıllık Kümülatif Özet ve Karşılaştırma Raporu (Annual Overview)
 */
export function annualSummary(state, year = new Date().getFullYear()) {
  const yearStr = String(year);
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  
  const months = [];
  let totalIncome = 0;
  let totalExpense = 0;
  let highestExpense = { monthName: '-', amount: 0 };
  const categorySums = new Map();

  for (let m = 1; m <= 12; m += 1) {
    const period = `${yearStr}-${String(m).padStart(2, '0')}`;
    const totals = monthTotals(state, period);
    const sRate = savingsRate(totals);

    totalIncome += totals.income;
    totalExpense += totals.expense;

    if (totals.expense > highestExpense.amount) {
      highestExpense = { monthName: monthNames[m - 1], amount: totals.expense };
    }

    const txs = transactionsInMonth(state, period).filter((t) => t.type === 'expense');
    for (const t of txs) {
      categorySums.set(t.categoryId, (categorySums.get(t.categoryId) || 0) + t.amount);
    }

    months.push({
      period,
      monthName: monthNames[m - 1],
      income: totals.income,
      expense: totals.expense,
      net: totals.net,
      savingsRate: sRate,
      count: totals.count,
    });
  }

  const topCategories = [...categorySums.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      category: categoryById(categoryId, state.customCategories) || { id: categoryId, name: 'Diğer', icon: '🏷️' },
      amount,
      percent: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const totalNet = totalIncome - totalExpense;
  const avgSavingsRate = totalIncome > 0 ? Math.round((totalNet / totalIncome) * 100) : 0;

  return {
    year: yearStr,
    months,
    totalIncome,
    totalExpense,
    totalNet,
    avgSavingsRate,
    topCategories,
    highestExpenseMonth: highestExpense,
  };
}

/**
 * Günlük Harcama Dağılım Isı Haritası (Daily Expense Heatmap)
 */
export function dailyExpenseHeatmap(state, period) {
  const [y, m] = period.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const txs = transactionsInMonth(state, period).filter((t) => t.type === 'expense');

  const dayMap = new Map();
  for (const t of txs) {
    const day = parseInt(t.date.slice(8, 10), 10);
    const cur = dayMap.get(day) || { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count += 1;
    dayMap.set(day, cur);
  }

  let maxDaily = 0;
  for (const val of dayMap.values()) {
    if (val.total > maxDaily) maxDaily = val.total;
  }

  const days = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dateStr = `${period}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = (dateObj.getDay() + 6) % 7; // 0: Pazartesi, 6: Pazar
    const info = dayMap.get(d) || { total: 0, count: 0 };

    let intensity = 0;
    if (info.total > 0 && maxDaily > 0) {
      const ratio = info.total / maxDaily;
      if (ratio > 0.75) intensity = 4;
      else if (ratio > 0.45) intensity = 3;
      else if (ratio > 0.2) intensity = 2;
      else intensity = 1;
    }

    days.push({
      date: dateStr,
      dayNum: d,
      dayOfWeek,
      totalExpense: info.total,
      count: info.count,
      intensity,
    });
  }

  return {
    period,
    days,
    maxDaily,
    firstDayOfWeek: (new Date(y, m - 1, 1).getDay() + 6) % 7,
  };
}

// src/currency.js
// Canlı döviz kuru: open.er-api.com (anahtar gerektirmez). Ağ yoksa veya yanıt
// geçersizse { success: false } döner; mevcut kurlar çağıran tarafta korunur.

export async function fetchLiveRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/TRY');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.result === 'success' && data.rates) {
      const rates = {};
      if (data.rates.USD && data.rates.USD > 0) rates.USD = Number((1 / data.rates.USD).toFixed(2));
      if (data.rates.EUR && data.rates.EUR > 0) rates.EUR = Number((1 / data.rates.EUR).toFixed(2));
      if (data.rates.GBP && data.rates.GBP > 0) rates.GBP = Number((1 / data.rates.GBP).toFixed(2));
      return { success: true, rates, time: new Date().toISOString() };
    }
    return { success: false, error: 'Kurlar ayrıştırılamadı' };
  } catch (err) {
    return { success: false, error: err.message || 'Ağ hatası' };
  }
}

// src/notifications.js
// Yerel Hatırlatıcı Bildirimler (Fatura, taksit ve ay sonu bütçe kontrolleri)

import { recurringDaysInPeriod, installmentDueDay, installmentAmountFor, periodKey } from './state.js';

const ALERT_STORAGE_KEY = 'butceDefteri.lastNotificationDate';

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

// Yerel takvim günü 'YYYY-MM-DD' (toISOString UTC verdiği için kullanılmaz)
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Chrome Android `new Notification()` fırlatır; iOS PWA'da da SW yolu güvenilirdir.
// Önce Service Worker, olmazsa/başarısızsa kurucu denenir. Asla throw etmez.
export async function showReminder(title, options) {
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker?.ready) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
      return true;
    }
  } catch {}
  try {
    new Notification(title, options);
    return true;
  } catch (err) {
    console.warn('Bildirim gösterilemedi:', err);
    return false;
  }
}

export async function checkUpcomingReminders(state, referenceDate = new Date()) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return false;

  const todayStr = localDateStr(referenceDate);
  try {
    if (localStorage.getItem(ALERT_STORAGE_KEY) === todayStr) {
      return false; // Bugün zaten kontrol edildi
    }
  } catch {}

  // Yaklaşan taksit ve tekrarlayan ödemeleri topla (bugün + yarın, gerçek takvimle)
  const dueItems = [];

  for (const offset of [0, 1]) {
    const day = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + offset);
    const pk = periodKey(day);
    const dayNum = day.getDate();
    const isToday = offset === 0;

    for (const r of (state.recurring || [])) {
      if (!r.active || r.type !== 'expense') continue;
      if (recurringDaysInPeriod(r, pk).includes(dayNum)) {
        dueItems.push({ name: r.name, amount: r.amount, isToday });
      }
    }

    for (const ins of (state.installments || [])) {
      if (installmentDueDay(ins, pk) !== dayNum) continue;
      const [sy, sm] = ins.startPeriod.split('-').map(Number);
      const n = (day.getFullYear() - sy) * 12 + (day.getMonth() + 1 - sm) + 1;
      dueItems.push({ name: `${ins.name} Taksiti`, amount: installmentAmountFor(ins, n), isToday });
    }
  }

  if (dueItems.length === 0) return false;

  const total = dueItems.reduce((acc, item) => acc + item.amount, 0);
  const titles = dueItems.map((i) => i.name).slice(0, 2).join(', ');
  const more = dueItems.length > 2 ? ` ve ${dueItems.length - 2} diğer` : '';
  const body = `Bugün/yarın yaklaşan ödeme: ${titles}${more} (Toplam: ₺${total.toLocaleString('tr-TR')})`;

  const shown = await showReminder('Bütçe Defteri: Yaklaşan Ödeme', {
    body,
    icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    tag: 'butce-due-reminder',
  });
  if (!shown) return false;
  try { localStorage.setItem(ALERT_STORAGE_KEY, todayStr); } catch {}
  return true;
}

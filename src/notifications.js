// src/notifications.js
// Yerel Hatırlatıcı Bildirimler (Fatura, taksit ve ay sonu bütçe kontrolleri)

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

export function checkUpcomingReminders(state, periodKeyStr, referenceDate = new Date()) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return false;

  const todayStr = referenceDate.toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(ALERT_STORAGE_KEY) === todayStr) {
      return false; // Bugün zaten kontrol edildi
    }
  } catch {}

  const currentDay = referenceDate.getDate();
  const nextDay = currentDay + 1;

  // Yaklaşan taksit ve tekrarlayan ödemeleri topla
  const dueItems = [];

  for (const r of (state.recurring || [])) {
    if (!r.active || r.type !== 'expense') continue;
    if (r.day === currentDay || r.day === nextDay) {
      dueItems.push({
        name: r.name,
        amount: r.amount,
        isToday: r.day === currentDay,
      });
    }
  }

  for (const ins of (state.installments || [])) {
    if (!ins.active) continue;
    const due = ins.dueDay || 1;
    if (due === currentDay || due === nextDay) {
      dueItems.push({
        name: `${ins.name} Taksiti`,
        amount: ins.monthlyAmount,
        isToday: due === currentDay,
      });
    }
  }

  if (dueItems.length === 0) return false;

  const total = dueItems.reduce((acc, item) => acc + item.amount, 0);
  const titles = dueItems.map((i) => i.name).slice(0, 2).join(', ');
  const more = dueItems.length > 2 ? ` ve ${dueItems.length - 2} diğer` : '';
  const body = `Bugün/yarın yaklaşan ödeme: ${titles}${more} (Toplam: ₺${total.toLocaleString('tr-TR')})`;

  try {
    new Notification('Bütçe Defteri: Yaklaşan Ödeme', {
      body,
      icon: '/icons/icon-192.png',
      tag: 'butce-due-reminder',
    });
    localStorage.setItem(ALERT_STORAGE_KEY, todayStr);
    return true;
  } catch (err) {
    console.warn('Bildirim gösterilemedi:', err);
    return false;
  }
}

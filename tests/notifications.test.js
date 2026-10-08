import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission, checkUpcomingReminders } from '../src/notifications.js';
import { normalize, installmentAmountFor } from '../src/state.js';

describe('notifications.js unit tests', () => {
  it('handles non-browser/node environment safely', async () => {
    expect(isNotificationSupported()).toBe(false);
    expect(getNotificationPermission()).toBe('unsupported');
    const granted = await requestNotificationPermission();
    expect(granted).toBe(false);

    const notified = await checkUpcomingReminders({ recurring: [], installments: [] });
    expect(notified).toBe(false);
  });
});

describe('checkUpcomingReminders takvim kuralları', () => {
  let calls;
  const freshStore = () => {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    };
  };
  const origNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const setNavigator = (nav) => Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true, writable: true });
  const cleanup = () => {
    delete globalThis.window;
    delete globalThis.Notification;
    delete globalThis.localStorage;
    if (origNavigator) Object.defineProperty(globalThis, 'navigator', origNavigator);
    else delete globalThis.navigator;
  };

  beforeEach(() => {
    calls = [];
    class FakeN {
      static permission = 'granted';
      constructor(title, opts) { calls.push({ title, ...opts }); }
    }
    globalThis.window = { Notification: FakeN };
    globalThis.Notification = FakeN;
    freshStore();
    setNavigator({}); // Service Worker yok: new Notification yolu
  });
  afterEach(cleanup);

  const mtv = { name: 'MTV', type: 'expense', amount: 4000, categoryId: 'gider-konut', day: 15, frequency: 'yearly', month: 3, active: true };
  const kart = { name: 'Kart', totalAmount: 3000, totalInstallments: 3, startPeriod: '2025-01', dueDay: 15, categoryId: 'gider-diger', active: true };
  const rec = (over) => ({ name: 'Kalem', type: 'expense', amount: 100, categoryId: 'gider-diger', day: 1, frequency: 'monthly', active: true, ...over });

  it('yıllık kalem yalnızca kendi ayında, biten taksit hiç bildirilmez', async () => {
    const state = normalize({ recurring: [mtv], installments: [kart] });
    expect(await checkUpcomingReminders(state, new Date(2026, 9, 15, 12))).toBe(false);
    expect(calls).toHaveLength(0);
    expect(await checkUpcomingReminders(state, new Date(2026, 2, 15, 12))).toBe(true);
    expect(calls[0].body).toContain('MTV');
    expect(calls[0].title).toBe('Bütçe Defteri: Yaklaşan Ödeme');
  });

  it('haftalık kalem day, day+7, ... günlerinde bildirir', async () => {
    const state = normalize({ recurring: [rec({ name: 'Haftalık', day: 3, frequency: 'weekly' })], installments: [] });
    for (const d of [3, 10, 17, 24, 31]) {
      freshStore();
      expect(await checkUpcomingReminders(state, new Date(2026, 9, d, 12))).toBe(true);
    }
    // 4'te bugün/yarın = 4,5; 11'de 11,12: ikisi de haftalık günlerde değil
    for (const d of [4, 11]) {
      freshStore();
      expect(await checkUpcomingReminders(state, new Date(2026, 9, d, 12))).toBe(false);
    }
  });

  it('bugün/yarın birlikte kontrol edilir: 2 Mart\'ta yarın (3) bildirilir', async () => {
    const state = normalize({ recurring: [rec({ name: 'Yarinci', day: 3 }), rec({ name: 'Bugunku', day: 2 })], installments: [] });
    expect(await checkUpcomingReminders(state, new Date(2026, 2, 2, 12))).toBe(true);
    expect(calls[0].body).toContain('Bugunku');
    expect(calls[0].body).toContain('Yarinci');
    expect(calls[0].body).toContain('Toplam: ₺200');
  });

  it('ay sonunda ertesi gün gerçek takvimle hesaplanır (31 Ekim -> 1 Kasım)', async () => {
    const state = normalize({ recurring: [rec({ name: 'AySonrasi', day: 1 })], installments: [] });
    expect(await checkUpcomingReminders(state, new Date(2026, 9, 31, 12))).toBe(true);
    expect(calls[0].body).toContain('AySonrasi');
  });

  it('tekillik yerel tarihe göre: aynı gün ikinci çağrı false, ertesi gün tekrar gösterir', async () => {
    const state = normalize({ recurring: [rec({ name: 'Gunluk', day: 15 }), rec({ name: 'Ertesi', day: 16 })], installments: [] });
    expect(await checkUpcomingReminders(state, new Date(2026, 9, 15, 0, 30))).toBe(true);
    expect(localStorage.getItem('butceDefteri.lastNotificationDate')).toBe('2026-10-15');
    expect(await checkUpcomingReminders(state, new Date(2026, 9, 15, 23, 30))).toBe(false);
    expect(await checkUpcomingReminders(state, new Date(2026, 9, 16, 0, 10))).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it('son taksit tutarı installmentAmountFor ile aynıdır', async () => {
    const ins = { ...kart, name: 'Tv', totalAmount: 1000, startPeriod: '2026-08', dueDay: 10 };
    const state = normalize({ recurring: [], installments: [ins] });
    const stored = state.installments[0];
    const last = installmentAmountFor(stored, 3);
    expect(last).toBe(333.34);
    expect(await checkUpcomingReminders(state, new Date(2026, 9, 10, 12))).toBe(true);
    expect(calls[0].body).toContain(`₺${last.toLocaleString('tr-TR')}`);
  });

  it('ikon BASE_URL ile verilir, bildirim gösterilemezse anahtar yazılmaz', async () => {
    const state = normalize({ recurring: [rec({ day: 5 })], installments: [] });
    await checkUpcomingReminders(state, new Date(2026, 9, 5, 12));
    expect(calls[0].icon).toBe(`${import.meta.env.BASE_URL}icons/icon-192.png`);

    cleanup();
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
    class Boom { static permission = 'granted'; constructor() { throw new Error('x'); } }
    globalThis.window = { Notification: Boom };
    globalThis.Notification = Boom;
    expect(await checkUpcomingReminders(state, new Date(2026, 9, 5, 12))).toBe(false);
    expect(store.size).toBe(0);
  });

  describe('Service Worker yolu ve fallback', () => {
    const state = () => normalize({ recurring: [rec({ day: 5 })], installments: [] });
    const day = new Date(2026, 9, 5, 12);
    const KEY = 'butceDefteri.lastNotificationDate';
    const swWith = (showNotification) => setNavigator({ serviceWorker: { ready: Promise.resolve({ showNotification }) } });
    const boom = () => {
      class Boom { static permission = 'granted'; constructor() { throw new Error('x'); } }
      globalThis.window = { Notification: Boom };
      globalThis.Notification = Boom;
    };

    it('SW varsa showNotification çağrılır, true döner, anahtar yazılır', async () => {
      const sw = [];
      swWith(async (title, opts) => { sw.push({ title, ...opts }); });
      expect(await checkUpcomingReminders(state(), day)).toBe(true);
      expect(sw).toHaveLength(1);
      expect(sw[0].title).toBe('Bütçe Defteri: Yaklaşan Ödeme');
      expect(calls).toHaveLength(0);
      expect(localStorage.getItem(KEY)).toBe('2026-10-05');
    });

    it('SW yok ve new Notification fırlatıyorsa false, anahtar yazılmaz', async () => {
      boom();
      expect(await checkUpcomingReminders(state(), day)).toBe(false);
      expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('SW showNotification reddederse new Notification fallback denenir', async () => {
      swWith(() => Promise.reject(new Error('sw')));
      expect(await checkUpcomingReminders(state(), day)).toBe(true);
      expect(calls).toHaveLength(1);
      expect(localStorage.getItem(KEY)).toBe('2026-10-05');
    });

    it('ikisi de başarısızsa anahtar yazılmaz, sonraki çağrı tekrar dener', async () => {
      const showNotification = vi.fn(() => Promise.reject(new Error('sw')));
      swWith(showNotification);
      boom();
      expect(await checkUpcomingReminders(state(), day)).toBe(false);
      expect(localStorage.getItem(KEY)).toBeNull();
      expect(await checkUpcomingReminders(state(), day)).toBe(false);
      expect(showNotification).toHaveBeenCalledTimes(2);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hasPin, setPin, verifyPin, removePin, pinLockRemainingMs } from '../src/pin.js';
import { authenticateBiometric } from '../src/biometrics.js';

const PIN_KEY = 'butceDefteri.pinHash';

function legacyHash(pin) {
  let hash = 0;
  for (let i = 0; i < pin.length; i += 1) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

describe('PIN', () => {
  let store;
  beforeEach(() => {
    store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
  });
  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.localStorage;
  });

  it('doğru PIN kabul edilir, yanlış reddedilir', async () => {
    expect(await setPin('1905')).toBe(true);
    expect(hasPin()).toBe(true);
    expect(await verifyPin('1905')).toBe(true);
    expect(await verifyPin('1234')).toBe(false);
  });

  it('4 haneli olmayan PIN reddedilir', async () => {
    for (const bad of ['12', 'abcd', '12345']) {
      expect(await setPin(bad)).toBe(false);
    }
    expect(hasPin()).toBe(false);
  });

  it('kayıtlı değer pbkdf2 formatındadır', async () => {
    await setPin('1905');
    const saved = store.get(PIN_KEY);
    expect(saved.startsWith('pbkdf2$')).toBe(true);
    expect(saved).not.toContain('1905');
  });

  it('5 yanlış denemeden sonra kilitlenir ve 30 sn sonra açılır', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    await setPin('1905');
    for (let i = 0; i < 5; i += 1) expect(await verifyPin('0000')).toBe(false);
    expect(pinLockRemainingMs()).toBeGreaterThan(0);
    expect(await verifyPin('1905')).toBe(false);
    vi.setSystemTime(new Date('2026-01-01T00:00:31Z'));
    expect(pinLockRemainingMs()).toBe(0);
    expect(await verifyPin('1905')).toBe(true);
  });

  it('eski 32-bit hash doğrulanır ve yeni formata taşınır', async () => {
    store.set(PIN_KEY, legacyHash('1905'));
    expect(await verifyPin('1905')).toBe(true);
    expect(store.get(PIN_KEY).startsWith('pbkdf2$')).toBe(true);
    expect(await verifyPin('1905')).toBe(true);
  });

  it('removePin sonrası PIN yok sayılır', async () => {
    await setPin('1905');
    expect(removePin()).toBe(true);
    expect(hasPin()).toBe(false);
    expect(await verifyPin('1905')).toBe(false);
  });
});

describe('biyometrik', () => {
  it('bioCredId yokken credentials.get çağrılmadan false döner', async () => {
    const get = vi.fn();
    const store = new Map([['butceDefteri.bioEnabled', 'true']]);
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem() {}, removeItem() {} };
    vi.stubGlobal('navigator', { credentials: { get } });
    expect(await authenticateBiometric()).toBe(false);
    expect(get).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    delete globalThis.localStorage;
  });
});

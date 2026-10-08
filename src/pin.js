// src/pin.js
// PIN yönetimi: PBKDF2 + tuz, deneme sınırı ve artan kilit süresi.
// Not: Tüm veri tarayıcıda olduğu için kilit yalnızca uygulama içinde geçerlidir;
// depolamaya erişen biri sayaçları silebilir. 4 haneli PIN 10.000 olasılıkta kalır.

const PIN_STORAGE_KEY = 'butceDefteri.pinHash';
const PIN_FAILS_KEY = 'butceDefteri.pinFails';
const PIN_LOCK_KEY = 'butceDefteri.pinLockUntil';

const PBKDF2_ITERATIONS = 200000;
const FAILS_PER_LOCK = 5;
const BASE_LOCK_MS = 30 * 1000;
const MAX_LOCK_MS = 15 * 60 * 1000;

function getStorage() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
  } catch {}
  if (!globalThis._memStorage) {
    const store = new Map();
    globalThis._memStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
  }
  return globalThis._memStorage;
}

function toBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(str) {
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function derive(pin, salt, iterations) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) return null;
  const key = await subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function legacyHash(pin) {
  let hash = 0;
  for (let i = 0; i < pin.length; i += 1) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function readNumber(key) {
  try {
    const n = Number(getStorage().getItem(key));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function resetAttempts() {
  const s = getStorage();
  s.removeItem(PIN_FAILS_KEY);
  s.removeItem(PIN_LOCK_KEY);
}

export function hasPin() {
  try {
    return Boolean(getStorage().getItem(PIN_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function pinLockRemainingMs() {
  return Math.max(0, readNumber(PIN_LOCK_KEY) - Date.now());
}

export async function setPin(pin) {
  try {
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return false;
    if (!(globalThis.crypto && globalThis.crypto.subtle)) return false;
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(pin, salt, PBKDF2_ITERATIONS);
    if (!hash) return false;
    const s = getStorage();
    s.setItem(PIN_STORAGE_KEY, `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`);
    resetAttempts();
    return true;
  } catch {
    return false;
  }
}

function registerFailure() {
  const s = getStorage();
  const fails = readNumber(PIN_FAILS_KEY) + 1;
  s.setItem(PIN_FAILS_KEY, String(fails));
  if (fails % FAILS_PER_LOCK === 0) {
    const level = fails / FAILS_PER_LOCK - 1;
    const lockMs = Math.min(BASE_LOCK_MS * 2 ** level, MAX_LOCK_MS);
    s.setItem(PIN_LOCK_KEY, String(Date.now() + lockMs));
  }
}

export async function verifyPin(pin) {
  try {
    const saved = getStorage().getItem(PIN_STORAGE_KEY);
    if (!saved) return false;
    if (pinLockRemainingMs() > 0) return false;
    if (typeof pin !== 'string') return false;

    let ok = false;
    if (/^-?\d+$/.test(saved)) {
      // Eski 32-bit hash: eşleşirse yeni formata taşı
      ok = legacyHash(pin) === saved;
      if (ok) await setPin(pin);
    } else {
      // WebCrypto yoksa (güvenli olmayan bağlam, ör. http://yerel-ip) doğrulama yapılamaz;
      // bu bir yanlış PIN değil, o yüzden deneme sayılmaz.
      if (!(globalThis.crypto && globalThis.crypto.subtle)) return false;
      const [scheme, iterRaw, saltB64, hashB64] = saved.split('$');
      const iterations = Number(iterRaw);
      if (scheme === 'pbkdf2' && Number.isInteger(iterations) && iterations > 0 && saltB64 && hashB64) {
        const computed = await derive(pin, fromBase64(saltB64), iterations);
        ok = Boolean(computed) && safeEqual(computed, fromBase64(hashB64));
      }
    }

    if (ok) {
      resetAttempts();
      return true;
    }
    registerFailure();
    return false;
  } catch {
    return false;
  }
}

export function removePin() {
  try {
    const s = getStorage();
    s.removeItem(PIN_STORAGE_KEY);
    resetAttempts();
    return true;
  } catch {
    return false;
  }
}

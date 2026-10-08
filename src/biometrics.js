// src/biometrics.js
// WebAuthn / Biyometrik Kilit (Face ID, Touch ID, Windows Hello)
// Cihaz seviyesinde güvenli ve hızlı biyometrik kilit açma desteği
// Not: Sunucu olmadığı için assertion imzası doğrulanmaz; bu cihaz içi bir kısayoldur.

const BIO_STORAGE_KEY = 'butceDefteri.bioEnabled';
const BIO_CRED_KEY = 'butceDefteri.bioCredId';

function base64UrlToBuffer(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function getBioCredId() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(BIO_CRED_KEY) || null;
  } catch {
    return null;
  }
}

export async function isBiometricSupported() {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') {
    return false;
  }
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricEnabled() {
  try {
    if (typeof localStorage === 'undefined') return false;
    // Credential ID yoksa (eski kayıt) biyometri kullanılamaz; ayar yeniden açılıp kaydedilmeli.
    return localStorage.getItem(BIO_STORAGE_KEY) === 'true' && Boolean(localStorage.getItem(BIO_CRED_KEY));
  } catch {
    return false;
  }
}

export function setBiometricEnabled(enabled) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (enabled) {
      localStorage.setItem(BIO_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(BIO_STORAGE_KEY);
      localStorage.removeItem(BIO_CRED_KEY);
    }
  } catch {
    // Depolama erişim hatası
  }
}

export async function registerBiometric() {
  if (!(await isBiometricSupported())) return false;
  try {
    const challenge = new Uint8Array(32);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(challenge);
    }

    const userId = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(userId);
    }

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Bütçe Defteri' },
        user: {
          id: userId,
          name: 'user@butcedefteri.local',
          displayName: 'Bütçe Defteri Kullanıcısı',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false,
        },
        timeout: 60000,
      },
    });

    if (credential && typeof credential.id === 'string' && credential.id) {
      setBiometricEnabled(true);
      try {
        localStorage.setItem(BIO_CRED_KEY, credential.id);
      } catch {
        setBiometricEnabled(false);
        return false;
      }
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Biyometrik kayıt iptal edildi veya desteklenmiyor:', err);
    return false;
  }
}

export async function authenticateBiometric() {
  if (!isBiometricEnabled()) return false;
  const credId = getBioCredId();
  if (!credId) return false;
  if (typeof navigator === 'undefined' || !navigator.credentials) return false;

  try {
    const challenge = new Uint8Array(32);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(challenge);
    }

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: 'public-key', id: base64UrlToBuffer(credId) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });

    return Boolean(assertion) && assertion.id === credId;
  } catch (err) {
    console.warn('Biyometrik doğrulama başarısız veya iptal edildi:', err);
    return false;
  }
}

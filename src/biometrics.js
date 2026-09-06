// src/biometrics.js
// WebAuthn / Biyometrik Kilit (Face ID, Touch ID, Windows Hello)
// Cihaz seviyesinde güvenli ve hızlı biyometrik kilit açma desteği

const BIO_STORAGE_KEY = 'butceDefteri.bioEnabled';

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
    return localStorage.getItem(BIO_STORAGE_KEY) === 'true';
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
          userVerification: 'preferred',
          requireResidentKey: false,
        },
        timeout: 60000,
      },
    });

    if (credential) {
      setBiometricEnabled(true);
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
  if (typeof navigator === 'undefined' || !navigator.credentials) return false;

  try {
    const challenge = new Uint8Array(32);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(challenge);
    }

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        userVerification: 'preferred',
        timeout: 60000,
      },
    });

    return Boolean(assertion);
  } catch (err) {
    console.warn('Biyometrik doğrulama başarısız veya iptal edildi:', err);
    return false;
  }
}

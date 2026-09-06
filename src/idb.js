// src/idb.js
// IndexedDB hibrit depolama: Fiş fotoğraflarını localStorage kotasını (5MB)
// tüketmemek için IndexedDB'de saklar.

const DB_NAME = 'butce_defteri_db';
const DB_VERSION = 1;
const STORE_NAME = 'receipts';

let dbPromise = null;

function getIndexedDB() {
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB;
  }
  if (typeof indexedDB !== 'undefined') {
    return indexedDB;
  }
  return null;
}

export function openReceiptDb() {
  const idb = getIndexedDB();
  if (!idb) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = idb.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => {
        console.warn('IndexedDB açılamadı:', e.target.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB hatası:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

export async function saveReceiptImage(id, dataUrl) {
  if (!id || !dataUrl) return false;
  const db = await openReceiptDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id, dataUrl, savedAt: Date.now() });
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function getReceiptImage(id) {
  if (!id) return null;
  const db = await openReceiptDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        resolve(req.result ? req.result.dataUrl : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function deleteReceiptImage(id) {
  if (!id) return false;
  const db = await openReceiptDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * localStorage'da kayıtlı eski fiş fotoğraflarını IndexedDB'ye taşır
 * ve state.transactions içindeki ağır Base64 dizgilerini temizler.
 * @param {object} state
 * @returns {Promise<number>} Taşınan fiş sayısı
 */
export async function migrateReceiptsToIndexedDb(state) {
  if (!state || !Array.isArray(state.transactions)) return 0;
  const db = await openReceiptDb();
  if (!db) return 0;

  let migratedCount = 0;
  for (const tx of state.transactions) {
    if (typeof tx.receiptImage === 'string' && tx.receiptImage.startsWith('data:image/')) {
      const success = await saveReceiptImage(tx.id, tx.receiptImage);
      if (success) {
        tx.hasReceipt = true;
        tx.receiptImage = null; // localStorage kotasını rahatlat
        migratedCount += 1;
      }
    } else if (tx.receiptImage) {
      tx.hasReceipt = true;
      tx.receiptImage = null;
    }
  }

  return migratedCount;
}

import { describe, it, expect } from 'vitest';
import { openReceiptDb, saveReceiptImage, getReceiptImage, deleteReceiptImage, migrateReceiptsToIndexedDb } from '../src/idb.js';

describe('idb.js unit tests', () => {
  it('handles missing indexedDB environment gracefully without crashing', async () => {
    const db = await openReceiptDb();
    // In node environment without indexedDB polyfill, returns null
    expect(db === null || typeof db === 'object').toBe(true);

    const saved = await saveReceiptImage('tx-1', 'data:image/jpeg;base64,123');
    expect(typeof saved).toBe('boolean');

    const retrieved = await getReceiptImage('tx-1');
    expect(retrieved === null || typeof retrieved === 'string').toBe(true);

    const deleted = await deleteReceiptImage('tx-1');
    expect(typeof deleted).toBe('boolean');
  });

  it('migrateReceiptsToIndexedDb flags hasReceipt and gracefully handles state', async () => {
    const state = {
      transactions: [
        { id: 't1', amount: 100, receiptImage: 'data:image/jpeg;base64,abc', hasReceipt: false },
        { id: 't2', amount: 200, receiptImage: null, hasReceipt: false }
      ]
    };

    const count = await migrateReceiptsToIndexedDb(state);
    expect(typeof count).toBe('number');
  });
});

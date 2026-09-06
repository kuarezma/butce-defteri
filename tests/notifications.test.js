import { describe, it, expect } from 'vitest';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission, checkUpcomingReminders } from '../src/notifications.js';

describe('notifications.js unit tests', () => {
  it('handles non-browser/node environment safely', async () => {
    expect(isNotificationSupported()).toBe(false);
    expect(getNotificationPermission()).toBe('unsupported');
    const granted = await requestNotificationPermission();
    expect(granted).toBe(false);

    const notified = checkUpcomingReminders({ recurring: [], installments: [] }, '2026-09');
    expect(notified).toBe(false);
  });
});

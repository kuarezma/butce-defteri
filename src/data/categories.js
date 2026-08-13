/**
 * Kategori tanımları — tek kaynak. `slot`, dataviz paletindeki sabit sırayı
 * işaret eder (bkz. src/palette.js); renk asla dinamik üretilmez.
 *
 * Kategori `id`'leri kalıcıdır — işlemler bu id'ye referans verir. Bir
 * kategoriyi silmek yerine `active: false` yapın; geçmiş işlemler kopmasın.
 */

export const CATEGORIES = [
  // --- Gelir ---
  { id: 'gelir-maas', type: 'income', name: 'Maaş', icon: '💼', active: true, bucket: 'income' },
  { id: 'gelir-ek', type: 'income', name: 'Ek Gelir', icon: '➕', active: true, bucket: 'income' },
  { id: 'gelir-yatirim', type: 'income', name: 'Yatırım Geliri', icon: '📈', active: true, bucket: 'income' },
  { id: 'gelir-diger', type: 'income', name: 'Diğer Gelir', icon: '🔹', active: true, bucket: 'income' },

  // --- Gider ---
  { id: 'gider-konut', type: 'expense', name: 'Kira / Konut', icon: '🏠', active: true, bucket: 'needs' },
  { id: 'gider-market', type: 'expense', name: 'Market', icon: '🛒', active: true, bucket: 'needs' },
  { id: 'gider-fatura', type: 'expense', name: 'Fatura / Abonelik', icon: '🧾', active: true, bucket: 'needs' },
  { id: 'gider-ulasim', type: 'expense', name: 'Ulaşım', icon: '🚗', active: true, bucket: 'needs' },
  { id: 'gider-saglik', type: 'expense', name: 'Sağlık', icon: '🩺', active: true, bucket: 'needs' },
  { id: 'gider-egitim', type: 'expense', name: 'Eğitim', icon: '📚', active: true, bucket: 'needs' },
  { id: 'gider-giyim', type: 'expense', name: 'Giyim', icon: '👕', active: true, bucket: 'wants' },
  { id: 'gider-eglence', type: 'expense', name: 'Eğlence', icon: '🎬', active: true, bucket: 'wants' },
  { id: 'gider-borc', type: 'expense', name: 'Borç / Kredi', icon: '💳', active: true, bucket: 'needs' },
  { id: 'gider-diger', type: 'expense', name: 'Diğer Gider', icon: '🔸', active: true, bucket: 'wants' },
];

export function categoryById(id, customCategories = []) {
  if (!id) return null;
  if (Array.isArray(customCategories)) {
    const match = customCategories.find((c) => c.id === id);
    if (match) return match;
  }
  return CATEGORIES.find((c) => c.id === id) || null;
}

export function categoriesByType(type, customCategories = []) {
  const defaults = CATEGORIES.filter((c) => c.type === type && c.active);
  const customs = Array.isArray(customCategories) ? customCategories.filter((c) => c.type === type && c.active) : [];
  return [...defaults, ...customs];
}

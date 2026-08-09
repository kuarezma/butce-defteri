/**
 * Kategori tanımları — tek kaynak. `slot`, dataviz paletindeki sabit sırayı
 * işaret eder (bkz. src/palette.js); renk asla dinamik üretilmez.
 *
 * Kategori `id`'leri kalıcıdır — işlemler bu id'ye referans verir. Bir
 * kategoriyi silmek yerine `active: false` yapın; geçmiş işlemler kopmasın.
 */

export const CATEGORIES = [
  // --- Gelir ---
  { id: 'gelir-maas', type: 'income', name: 'Maaş', icon: '💼', active: true },
  { id: 'gelir-ek', type: 'income', name: 'Ek Gelir', icon: '➕', active: true },
  { id: 'gelir-yatirim', type: 'income', name: 'Yatırım Geliri', icon: '📈', active: true },
  { id: 'gelir-diger', type: 'income', name: 'Diğer Gelir', icon: '🔹', active: true },

  // --- Gider ---
  { id: 'gider-konut', type: 'expense', name: 'Kira / Konut', icon: '🏠', active: true },
  { id: 'gider-market', type: 'expense', name: 'Market', icon: '🛒', active: true },
  { id: 'gider-fatura', type: 'expense', name: 'Fatura / Abonelik', icon: '🧾', active: true },
  { id: 'gider-ulasim', type: 'expense', name: 'Ulaşım', icon: '🚗', active: true },
  { id: 'gider-saglik', type: 'expense', name: 'Sağlık', icon: '🩺', active: true },
  { id: 'gider-egitim', type: 'expense', name: 'Eğitim', icon: '📚', active: true },
  { id: 'gider-giyim', type: 'expense', name: 'Giyim', icon: '👕', active: true },
  { id: 'gider-eglence', type: 'expense', name: 'Eğlence', icon: '🎬', active: true },
  { id: 'gider-borc', type: 'expense', name: 'Borç / Kredi', icon: '💳', active: true },
  { id: 'gider-diger', type: 'expense', name: 'Diğer Gider', icon: '🔸', active: true },
];

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

export function categoriesByType(type) {
  return CATEGORIES.filter((c) => c.type === type && c.active);
}

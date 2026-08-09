/**
 * Sabit renk sırası — dataviz iskeletinin referans paleti. Slot sırası CVD
 * güvenliğinin kendisi; asla döngüsel/otomatik üretilmez.
 * (bkz. dataviz skill § color-formula, palette.md)
 */
export const SERIES = {
  blue: { light: '#2a78d6', dark: '#3987e5' }, // slot 1 — Gelir
  orange: { light: '#eb6834', dark: '#d95926' }, // slot 2 — Gider
  aqua: { light: '#1baf7a', dark: '#199e70' },
  yellow: { light: '#eda100', dark: '#c98500' },
  magenta: { light: '#e87ba4', dark: '#d55181' },
  green: { light: '#008300', dark: '#008300' },
  violet: { light: '#4a3aa7', dark: '#9085e9' },
  red: { light: '#e34948', dark: '#e66767' },
};

export const STATUS = {
  good: { light: '#0ca30c', dark: '#0ca30c' },
  warning: { light: '#fab219', dark: '#fab219' },
  serious: { light: '#ec835a', dark: '#ec835a' },
  critical: { light: '#d03b3b', dark: '#d03b3b' },
};

/** Kategori bar grafiğinde en fazla bu kadar dilim tekil renk taşır; kalanı "Diğer"e katlanır. */
export const CATEGORY_CHART_CAP = 6;

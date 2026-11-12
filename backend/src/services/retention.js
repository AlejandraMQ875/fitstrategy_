import { CONFIG } from '../config.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** Retención = 0.5 + 0.3*Satisfacción + 0.1*Servicios - 0.2*Promoción (todo normalizado 0-1). */
export function computeRetention({ satisfaction, servicesCount, advertising }) {
  const s = clamp01(satisfaction / 100);
  const svc = clamp01(servicesCount / 7);
  const promo = clamp01(advertising / CONFIG.AD_MAX);
  return Math.max(0.3, Math.min(0.95, 0.5 + 0.3 * s + 0.1 * svc - 0.2 * promo));
}

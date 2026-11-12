import { CONFIG } from '../config.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/**
 * FIGE = 0.30*Rentabilidad + 0.25*Mercado + 0.20*Satisfacción + 0.15*Retención + 0.10*Innovación (0-100)
 * Rentabilidad: utilidad neta acumulada / Bs 800.000, escalada a 0-1 en el rango [-0.5, 2.0].
 * Mercado: socios / socios del líder.  Innovación: servicios, convenios ganados y sucursales.
 */
export function computeRanking(gyms) {
  const W = CONFIG.FIGE_W;
  const maxMembers = Math.max(1, ...gyms.map((g) => g.members));
  const rows = gyms.map((g) => {
    const profit = clamp01((g.cumNetIncome / CONFIG.START.cash + 0.5) / 2.5);
    const market = g.members / maxMembers;
    const sat = clamp01(g.satisfaction / 100);
    const ret = clamp01(g.retention);
    const innovation = clamp01(0.5 * (g.services.length / 7) + 0.3 * Math.min(1, g.collabsWon / 6) + 0.2 * Math.min(1, (g.branches - 1) / 2));
    const fige = 100 * (W.profit * profit + W.market * market + W.satisfaction * sat + W.retention * ret + W.innovation * innovation);
    return {
      gymId: g.id, fige: Math.round(fige * 100) / 100,
      breakdown: { profit, market, satisfaction: sat, retention: ret, innovation },
      cumNetIncome: g.cumNetIncome, retention: g.retention, satisfaction: g.satisfaction
    };
  });
  // Desempate: rentabilidad -> retención -> satisfacción -> posición compartida
  const cmp = (a, b) => b.fige - a.fige || b.cumNetIncome - a.cumNetIncome || b.retention - a.retention || b.satisfaction - a.satisfaction;
  rows.sort(cmp);
  let rank = 0;
  rows.forEach((r, i) => {
    if (i === 0 || cmp(rows[i - 1], r) !== 0) rank = i + 1;
    r.rank = rank;
  });
  return rows.map(({ cumNetIncome, retention, satisfaction, ...r }) => r);
}

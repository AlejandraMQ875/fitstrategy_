import { CONFIG } from '../config.js';
import { SERVICES, COLLABS } from '../catalog.js';
import { isOccupied, conflicts } from './collaboration.js';

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export const assetsValue = (g, services = g.services) =>
  g.machineLevel * CONFIG.MACHINE_COST +
  (g.spaceLevel - 1) * CONFIG.SPACE_COST +
  (g.lockerLevel - 1) * CONFIG.LOCKER_COST +
  (g.branches - 1) * CONFIG.BRANCH_COST +
  services.reduce((s, k) => s + (SERVICES.find((x) => x.key === k)?.costImpl ?? 0), 0);

export const equity = (g) => g.cash + assetsValue(g) - g.debt;
export const maxLoan = (g) => Math.max(0, Math.floor(CONFIG.LOAN_MULT * equity(g) - g.debt));

const reqMet = (req, lv) =>
  (!req.space || lv.space >= req.space) && (!req.machines || lv.machines >= req.machines) && (!req.lockers || lv.lockers >= req.lockers);

export const defaultDecision = (g) => ({
  price: g.price, machineUpgrade: 0, spaceUpgrade: false, lockerUpgrade: false, services: [],
  hire: { instructors: 0, specialists: 0, receptionists: 0, cleaners: 0 },
  advertising: 0, loan: 0, repay: 0, openBranch: false, bids: []
});

/**
 * Limpia y valida una decisión. `errors` = reglas incumplidas (el guardado se rechaza);
 * `notes` = ajustes automáticos (recortes de rango).
 */
export function sanitizeDecision(raw, g, { roundNumber, collabs }) {
  const errors = [], notes = [];
  const r = raw || {};
  const d = defaultDecision(g);
  const adj = (label, from, to) => { if (from !== to) notes.push(`${label} ajustado a ${to}`); return to; };

  d.price = adj('Precio', num(r.price, g.price), clamp(Math.round(num(r.price, g.price)), CONFIG.PRICE_MIN, CONFIG.PRICE_MAX));
  const mu = clamp(Math.round(num(r.machineUpgrade)), 0, CONFIG.MACHINE_MAX_PER_ROUND);
  d.machineUpgrade = Math.min(mu, CONFIG.MACHINE_MAX_LEVEL - g.machineLevel);
  if (d.machineUpgrade !== Math.round(num(r.machineUpgrade))) notes.push(`Mejora de máquinas ajustada a ${d.machineUpgrade}`);
  d.spaceUpgrade = !!r.spaceUpgrade && g.spaceLevel < CONFIG.SPACE_MAX_LEVEL;
  d.lockerUpgrade = !!r.lockerUpgrade && g.lockerLevel < CONFIG.LOCKER_MAX_LEVEL;
  d.advertising = clamp(Math.round(num(r.advertising)), 0, CONFIG.AD_MAX);

  for (const k of Object.keys(d.hire)) {
    const min = CONFIG.STAFF_MIN[k] - g[k], max = CONFIG.STAFF_MAX - g[k];
    d.hire[k] = clamp(Math.round(num(r.hire?.[k])), min, max);
  }

  const lv = {
    space: g.spaceLevel + (d.spaceUpgrade ? 1 : 0),
    machines: g.machineLevel + d.machineUpgrade,
    lockers: g.lockerLevel + (d.lockerUpgrade ? 1 : 0)
  };
  for (const key of new Set(r.services || [])) {
    const s = SERVICES.find((x) => x.key === key);
    if (!s) continue;
    if (g.services.includes(key)) continue;
    if (!reqMet(s.requirement, lv)) { errors.push(`${s.name}: no cumples el requisito (${JSON.stringify(s.requirement)})`); continue; }
    d.services.push(key);
  }

  d.openBranch = !!r.openBranch;
  if (d.openBranch) {
    if (g.branches >= CONFIG.BRANCH_MAX) { errors.push('Ya alcanzaste el máximo de sucursales'); d.openBranch = false; }
    else if (g.reputation < CONFIG.BRANCH_MIN_REP || g.cash < CONFIG.BRANCH_MIN_CASH) {
      errors.push(`Sucursal: requiere reputación ≥ ${CONFIG.BRANCH_MIN_REP} y caja ≥ Bs ${CONFIG.BRANCH_MIN_CASH.toLocaleString('es-BO')}`);
      d.openBranch = false;
    }
  }

  const ml = maxLoan(g);
  d.loan = Math.min(Math.max(0, Math.round(num(r.loan))), ml);
  if (d.loan !== Math.round(num(r.loan))) notes.push(`Préstamo ajustado a Bs ${d.loan}`);
  d.repay = Math.min(Math.max(0, Math.round(num(r.repay))), Math.round(g.debt));
  if (d.repay !== Math.round(num(r.repay))) notes.push(`Pago de deuda ajustado a Bs ${d.repay}`);

  // Pujas
  const held = collabs.filter((c) => c.expiresAtRound >= roundNumber && c.holders.some((h) => h.gymId === g.id)).map((c) => c.key);
  const seen = new Set();
  const bids = [];
  for (const b of r.bids || []) {
    const c = collabs.find((x) => x.key === b.collabKey);
    if (!c || seen.has(c.key)) continue;
    seen.add(c.key);
    const amount = Math.round(num(b.amount, c.cost));
    if (isOccupied(c, roundNumber)) { errors.push(`${c.name}: ya está ocupada`); continue; }
    if (amount < c.cost || amount > 2 * c.cost) { errors.push(`${c.name}: la oferta debe estar entre ${c.cost} y ${2 * c.cost}`); continue; }
    bids.push({ collabKey: c.key, amount });
  }
  const all = [...held, ...bids.map((b) => b.collabKey)];
  const catOf = (k) => COLLABS.find((c) => c.key === k).category;
  if (all.filter((k) => catOf(k) === 'A').length > CONFIG.MAX_CONV_A) errors.push(`Máximo ${CONFIG.MAX_CONV_A} convenios (Cat. A) por gimnasio`);
  if (all.filter((k) => catOf(k) === 'B').length > CONFIG.MAX_CONV_B) errors.push(`Máximo ${CONFIG.MAX_CONV_B} marca deportiva (Cat. B) por gimnasio`);
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++)
    if (conflicts(all[i], all[j])) errors.push(`${all[i]} y ${all[j]} son competidores directos`);
  d.bids = errors.length ? [] : bids;
  return { decision: d, errors, notes };
}

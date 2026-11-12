import { CONFIG } from '../config.js';
import { SEGMENTS, SERVICES } from '../catalog.js';
import { segmentProbabilities } from './softmax.js';
import { computeRetention } from './retention.js';
import { resolveBids, activeFor } from './collaboration.js';
import { computeFinance } from './finance.js';
import { computeRanking } from './ranking.js';
import { sanitizeDecision, defaultDecision } from './validation.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** Aplica la decisión (ya validada) y devuelve estado nuevo + inversión + préstamo/pago. */
function applyDecision(g, d, roundNumber) {
  const n = { ...g, services: [...g.services] };
  let capex = 0;
  n.price = d.price;
  n.machineLevel += d.machineUpgrade; capex += d.machineUpgrade * CONFIG.MACHINE_COST;
  if (d.spaceUpgrade) { n.spaceLevel += 1; capex += CONFIG.SPACE_COST; }
  if (d.lockerUpgrade) { n.lockerLevel += 1; capex += CONFIG.LOCKER_COST; }
  for (const k of d.services) { n.services.push(k); capex += SERVICES.find((s) => s.key === k).costImpl; }
  for (const k of Object.keys(d.hire)) n[k] += d.hire[k];
  if (d.openBranch) { n.branches += 1; capex += CONFIG.BRANCH_COST; }
  return { n, capex, newServices: d.services };
}

/** Capacidad efectiva de socios: min(máquinas, instructores, vestidores, espacio). */
export function capacityOf(g) {
  const C = CONFIG;
  const hourly = Math.min(
    C.CAP_MACHINE_PER_LEVEL * g.machineLevel,
    C.CAP_INSTRUCTOR * g.instructors + C.CAP_SPECIALIST * g.specialists,
    C.CAP_LOCKER_PER_LEVEL * g.lockerLevel,
    C.CAP_SPACE_PER_LEVEL * g.spaceLevel
  );
  const drag = Math.max(0.5, 1 - C.SERVICE_CAP_DRAG * g.services.length);
  return { hourly, members: hourly * drag * C.MEMBERS_PER_CAP_UNIT * (1 + C.BRANCH_CAP_BONUS * (g.branches - 1)) };
}

/**
 * Procesa una ronda para TODOS los gimnasios en conjunto.
 * Entrada: { roundNumber, gyms[], decisions{gymId: decisión cruda|undefined}, collabs[] }
 * Salida:  { gyms (estado nuevo), collabs, results[], ranking[], outcomes[] }
 */
export function simulateRound({ roundNumber, gyms, decisions, collabs }) {
  const C = CONFIG;
  const seasonMult = 1 + C.SEASON[roundNumber - 1].factor;
  const reputation = Object.fromEntries(gyms.map((g) => [g.id, g.reputation]));

  // 1) Decisiones -> estado intermedio
  const prep = gyms.map((g) => {
    const raw = decisions[g.id];
    const { decision, errors, notes } = sanitizeDecision(raw, g, { roundNumber, collabs });
    const d = errors.length ? { ...decision, services: decision.services, bids: [] } : decision;
    const { n, capex } = applyDecision(g, d, roundNumber);
    const loan = d.loan, repay = d.repay;
    return { g, d, n, capex, loan, repay, notes: [...notes, ...errors.map((e) => `Ignorado: ${e}`)], submitted: !!raw };
  });

  // 2) Pujas de colaboraciones (en conjunto)
  const allBids = prep.flatMap((p) => p.d.bids.map((b) => ({ ...b, gymId: p.g.id })));
  const { collabs: collabsNext, outcomes } = resolveBids({ collabs, bids: allBids, reputation, roundNumber });

  // 3) Atributos y demanda Softmax por segmento
  const attrs = prep.map((p) => {
    const act = activeFor(p.g.id, collabsNext, roundNumber);
    p.active = act;
    return {
      price: p.d.price,
      services: p.n.services.length / 7,
      machines: p.n.machineLevel / 10,
      reputation: p.n.reputation / 100,
      location: clamp(0.5 + C.BRANCH_LOC_BONUS * (p.n.branches - 1), 0, 1),
      collab: act.reduce((s, a) => s + a.holder.factor, 0) / 3
    };
  });
  const demandBySeg = prep.map(() => ({}));
  for (const seg of SEGMENTS) {
    const probs = segmentProbabilities(attrs, seg.weights);
    prep.forEach((p, i) => {
      let bonus = 1;
      for (const k of p.n.services) bonus *= 1 + (SERVICES.find((s) => s.key === k).effect[seg.key] ?? 0);
      for (const a of p.active) bonus *= 1 + (a.collab.effect[seg.key] ?? 0) * a.holder.factor;
      bonus = Math.min(bonus, C.SEGMENT_BONUS_CAP);
      const promo = 1 + C.AD_DEMAND_BOOST * Math.sqrt(p.d.advertising / C.AD_MAX);
      demandBySeg[i][seg.key] = C.POPULATION * seg.share * seasonMult * probs[i] * bonus * promo;
    });
  }

  // 4) Capacidad, satisfacción, retención, socios, reputación
  const stage = prep.map((p, i) => {
    const n = p.n;
    const demand = Object.values(demandBySeg[i]).reduce((a, b) => a + b, 0);
    const cap = capacityOf(n);
    const util = demand / cap.members;
    const collabSat = p.active.reduce((s, a) => s + (a.collab.effect.satisfaction ?? 0) * a.holder.factor, 0);
    const collabRep = p.active.filter((a) => a.holder.startRound === roundNumber).reduce((s, a) => s + (a.collab.effect.reputation ?? 0) * a.holder.factor, 0);
    const needRecep = Math.ceil(n.members / C.RECEP_PER_MEMBERS), needClean = Math.ceil(n.members / C.CLEAN_PER_MEMBERS);
    const shortage = Math.max(0, needRecep - n.receptionists) + Math.max(0, needClean - n.cleaners);
    const target = 70
      + C.SAT_PER_SERVICE * n.services.length
      + collabSat
      + Math.min(3, n.specialists)
      - (util > 1 ? Math.min(25, (util - 1) * 30) : 0)
      - (p.d.price > 220 ? Math.min(15, (p.d.price - 220) / 12) : 0)
      + (p.d.price < 150 ? Math.min(5, (150 - p.d.price) / 10) : 0)
      - C.STAFF_SHORT_PENALTY * shortage;
    const satisfaction = clamp(0.5 * g0(p).satisfaction + 0.5 * target, 0, 100);
    const retention = computeRetention({ satisfaction, servicesCount: n.services.length, advertising: p.d.advertising });
    const retained = n.members * retention;
    const raw = retained + Math.max(0, demand - retained) * C.CAPTURE_RATE;
    const members = Math.round(Math.min(cap.members, raw));
    const rep = clamp(0.85 * n.reputation + 0.15 * satisfaction + collabRep, 0, 100);
    return { demand, cap, util, satisfaction, retention, members, rep };
  });

  // 5) Finanzas
  const newGyms = [], results = [];
  prep.forEach((p, i) => {
    const s = stage[i];
    const g = p.g, n = { ...p.n };
    const debtAfter = g.debt + p.loan - p.repay;
    const fin = computeFinance({
      g: n, members: s.members, price: p.d.price, advertising: p.d.advertising, activeCollabs: p.active,
      capex: p.capex, loan: p.loan, repay: p.repay, cashStart: g.cash, debtAfter, roundNumber
    });
    let cashEnd = fin.cashEndRaw, debt = debtAfter, rep = s.rep, emergency = 0;
    if (cashEnd < 0) { emergency = -cashEnd; debt += emergency; cashEnd = 0; rep = Math.max(0, rep - C.EMERGENCY_REP_PENALTY); }
    const won = outcomes.filter((o) => o.gymId === g.id && (o.outcome === 'won' || o.outcome === 'shared')).length;
    const updated = {
      ...n, cash: Math.round(cashEnd), debt: Math.round(debt), members: s.members, satisfaction: s.satisfaction,
      retention: s.retention, reputation: rep, price: p.d.price,
      cumNetIncome: g.cumNetIncome + fin.netIncome, lastNetIncome: fin.netIncome, collabsWon: g.collabsWon + won
    };
    newGyms.push(updated);
    results.push({
      gymId: g.id, membersStart: g.members, membersEnd: s.members, cashStart: g.cash, cashEnd: updated.cash,
      revenue: fin.totalRevenue, costs: fin.fixedTotal + fin.variableTotal, ebitda: fin.ebitda, netIncome: fin.netIncome,
      detail: {
        ...fin, emergencyCredit: emergency, demandBySegment: demandBySeg[i], demandTotal: s.demand,
        capacityHourly: s.cap.hourly, capacityMembers: s.cap.members, utilization: s.util,
        satisfaction: s.satisfaction, retention: s.retention, reputation: rep, price: p.d.price,
        activeCollabs: p.active.map((a) => ({ key: a.collab.key, name: a.collab.name, factor: a.holder.factor, amount: a.holder.amount })),
        notes: p.notes, submitted: p.submitted, decision: p.d
      }
    });
  });

  const ranking = computeRanking(newGyms);
  return { gyms: newGyms, collabs: collabsNext, results, ranking, outcomes };
}
const g0 = (p) => p.g;

/** Vista previa de costos (la usa el formulario antes de enviar). */
export function previewDecision(raw, g, collabs, roundNumber) {
  const { decision, errors, notes } = sanitizeDecision(raw, g, { roundNumber, collabs });
  const { n, capex } = applyDecision(g, decision, roundNumber);
  const staff = Object.keys(CONFIG.SALARY).reduce((s, k) => s + n[k] * CONFIG.SALARY[k], 0);
  const servicesRun = n.services.reduce((s, k) => s + SERVICES.find((x) => x.key === k).costPerRound, 0);
  const bidsCost = (decision.bids || []).reduce((s, b) => s + b.amount, 0);
  const monthly = CONFIG.RENT * n.branches + staff + servicesRun + decision.advertising + bidsCost
    + CONFIG.MAINT_BASE + CONFIG.MAINT_RATE * n.machineLevel * CONFIG.MACHINE_COST;
  const cashAfter = g.cash - capex + decision.loan - decision.repay;
  return { errors, notes, capex, staff, servicesRun, bidsCost, advertising: decision.advertising, estimatedFixed: monthly, cashAfterInvestments: cashAfter, capacityMembers: capacityOf(n).members };
}

export { defaultDecision };

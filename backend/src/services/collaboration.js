import { CONFLICTS } from '../catalog.js';

export const isOccupied = (c, roundNumber) => c.holders.length > 0 && c.expiresAtRound >= roundNumber;

/** Colaboraciones activas de un gimnasio en la ronda dada: [{collab, holder}] */
export function activeFor(gymId, collabs, roundNumber) {
  const out = [];
  for (const c of collabs) {
    if (c.expiresAtRound < roundNumber) continue;
    const holder = c.holders.find((h) => h.gymId === gymId && h.startRound <= roundNumber);
    if (holder) out.push({ collab: c, holder });
  }
  return out;
}

export function conflicts(keyA, keyB) {
  return CONFLICTS.some(([a, b]) => (a === keyA && b === keyB) || (a === keyB && b === keyA));
}

/**
 * Resuelve las pujas de una ronda.
 * - 1 solo postor: paga el costo base.
 * - 2+: gana la oferta más alta; empate -> mayor reputación; persiste -> 50% del beneficio para cada uno.
 * Devuelve { collabs (nuevo estado), outcomes: [{gymId, collabKey, amount, outcome, paid}] }
 */
export function resolveBids({ collabs, bids, reputation, roundNumber }) {
  const next = collabs.map((c) => ({
    ...c,
    holders: c.expiresAtRound >= roundNumber ? c.holders.map((h) => ({ ...h })) : []
  }));
  const outcomes = [];
  const byCollab = new Map();
  for (const b of bids) {
    if (!byCollab.has(b.collabKey)) byCollab.set(b.collabKey, []);
    byCollab.get(b.collabKey).push(b);
  }
  for (const [key, list] of byCollab) {
    const c = next.find((x) => x.key === key);
    if (!c || isOccupied(c, roundNumber)) {
      list.forEach((b) => outcomes.push({ ...b, outcome: 'rejected', paid: 0 }));
      continue;
    }
    let winners;
    if (list.length === 1) {
      winners = [{ ...list[0], amount: c.cost, factor: 1 }]; // único postor: costo base
    } else {
      const maxAmount = Math.max(...list.map((b) => b.amount));
      let top = list.filter((b) => b.amount === maxAmount);
      if (top.length > 1) {
        const maxRep = Math.max(...top.map((b) => reputation[b.gymId] ?? 0));
        top = top.filter((b) => (reputation[b.gymId] ?? 0) === maxRep);
      }
      winners = top.map((b) => ({ ...b, factor: top.length > 1 ? 0.5 : 1 }));
    }
    c.holders = winners.map((w) => ({ gymId: w.gymId, factor: w.factor, amount: w.amount, startRound: roundNumber }));
    c.expiresAtRound = roundNumber + c.duration - 1;
    for (const b of list) {
      const w = winners.find((x) => x.gymId === b.gymId);
      outcomes.push({
        gymId: b.gymId, collabKey: key, amount: w ? w.amount : b.amount,
        outcome: w ? (w.factor < 1 ? 'shared' : 'won') : 'lost', paid: w ? w.amount : 0
      });
    }
  }
  return { collabs: next, outcomes };
}

import { prisma } from '../db.js';
import { CONFIG } from '../config.js';
import { simulateRound, previewDecision } from './simulator.js';
import { sanitizeDecision, maxLoan, equity } from './validation.js';
import { emit, emitAdmin } from '../socket.js';
import { seed } from '../seed.js';

export class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}

const gymState = (row) => ({
  id: row.id, name: row.name, color: row.color, zone: row.zone, cash: row.cash, debt: row.debt, reputation: row.reputation,
  satisfaction: row.satisfaction, retention: row.retention, members: row.members, price: row.price,
  machineLevel: row.machineLevel, instructors: row.instructors, specialists: row.specialists,
  receptionists: row.receptionists, cleaners: row.cleaners, lockerLevel: row.lockerLevel, spaceLevel: row.spaceLevel,
  branches: row.branches, cumNetIncome: row.cumNetIncome, lastNetIncome: row.lastNetIncome, collabsWon: row.collabsWon,
  services: (row.services || []).map((gs) => gs.service.key)
});
const collabState = (r) => ({
  id: r.id, key: r.key, name: r.name, sector: r.sector, category: r.category, cost: r.cost, duration: r.duration,
  effect: JSON.parse(r.effectJson), holders: JSON.parse(r.holdersJson), expiresAtRound: r.expiresAtRound
});

export const loadGyms = async () =>
  (await prisma.gym.findMany({ include: { services: { include: { service: true } } }, orderBy: { id: 'asc' } })).map(gymState);
export const loadGym = async (id) => {
  const row = await prisma.gym.findUnique({ where: { id }, include: { services: { include: { service: true } } } });
  return row ? gymState(row) : null;
};
export const loadCollabs = async () => (await prisma.collaboration.findMany({ orderBy: { id: 'asc' } })).map(collabState);

export const log = (type, message, roundNumber = null) => prisma.eventLog.create({ data: { type, message, roundNumber } });

export const getCurrentRound = () => prisma.round.findFirst({ where: { status: { not: 'closed' } }, orderBy: { number: 'asc' } });
export const roundDto = (r) => r && ({ id: r.id, number: r.number, month: r.month, seasonalFactor: r.seasonalFactor, status: r.status, durationMin: r.durationMin, openedAt: r.openedAt, endsAt: r.endsAt });

export async function openRound(durationMin = 10) {
  const round = await getCurrentRound();
  if (!round) throw new HttpError(400, 'El juego ya terminó (6 rondas procesadas)');
  if (round.status !== 'pending') throw new HttpError(400, `La ronda ${round.number} ya está ${round.status}`);
  const now = new Date();
  const updated = await prisma.round.update({
    where: { id: round.id },
    data: { status: 'open', durationMin, openedAt: now, endsAt: new Date(now.getTime() + durationMin * 60000) }
  });
  await log('round', `Ronda ${updated.number} (${updated.month}) abierta · ${durationMin} min`, updated.number);
  emit('round:opened', { roundNumber: updated.number, month: updated.month, seasonalFactor: updated.seasonalFactor, endsAt: updated.endsAt, durationMin });
  return roundDto(updated);
}

export async function saveDecision(user, roundId, payload) {
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round || round.status !== 'open') throw new HttpError(400, 'La ronda no está abierta para decisiones');
  const gym = await loadGym(user.gymId);
  const collabs = await loadCollabs();
  const { decision, errors, notes } = sanitizeDecision(payload, gym, { roundNumber: round.number, collabs });
  if (errors.length) throw new HttpError(400, 'Decisión inválida', { errors });
  await prisma.decision.upsert({
    where: { roundId_gymId: { roundId, gymId: gym.id } },
    update: { payload: JSON.stringify(decision) },
    create: { roundId, gymId: gym.id, payload: JSON.stringify(decision) }
  });
  await log('decision', `${gym.name}: decisión enviada`, round.number);
  emitAdmin('decision:saved', { gymId: gym.id, playerName: gym.name, at: new Date() });
  return { decision, notes };
}

export async function previewFor(user, payload) {
  const round = await getCurrentRound();
  if (!round) throw new HttpError(400, 'No hay ronda activa');
  return previewDecision(payload, await loadGym(user.gymId), await loadCollabs(), round.number);
}

export async function adminStatus() {
  const round = await getCurrentRound();
  const gyms = await prisma.gym.findMany({ orderBy: { id: 'asc' } });
  const decisions = round ? await prisma.decision.findMany({ where: { roundId: round.id } }) : [];
  const logs = await prisma.eventLog.findMany({ orderBy: { id: 'desc' }, take: 80 });
  return {
    round: roundDto(round),
    gyms: gyms.map((g) => ({ id: g.id, name: g.name, color: g.color, submitted: decisions.some((d) => d.gymId === g.id), cash: g.cash, members: g.members })),
    log: logs
  };
}

export async function processRound({ force = false } = {}) {
  const round = await getCurrentRound();
  if (!round || round.status !== 'open') throw new HttpError(400, 'No hay una ronda abierta para procesar');
  const gyms = await loadGyms();
  const decRows = await prisma.decision.findMany({ where: { roundId: round.id } });
  const missing = gyms.filter((g) => !decRows.some((d) => d.gymId === g.id)).map((g) => ({ id: g.id, name: g.name }));
  if (missing.length && !force)
    throw new HttpError(409, `Faltan ${missing.length} gimnasios. ¿Procesar de todos modos?`, { missing });

  await prisma.round.update({ where: { id: round.id }, data: { status: 'processing' } });
  emit('round:processing', { roundNumber: round.number });
  try {
    const collabs = await loadCollabs();
    const decisions = Object.fromEntries(decRows.map((d) => [d.gymId, JSON.parse(d.payload)]));
    const out = simulateRound({ roundNumber: round.number, gyms, decisions, collabs });
    const services = await prisma.service.findMany();
    const before = Object.fromEntries(gyms.map((g) => [g.id, g]));

    await prisma.$transaction(async (tx) => {
      for (const g of out.gyms) {
        await tx.gym.update({
          where: { id: g.id },
          data: {
            cash: g.cash, debt: g.debt, reputation: g.reputation, satisfaction: g.satisfaction, retention: g.retention,
            members: g.members, price: g.price, machineLevel: g.machineLevel, instructors: g.instructors,
            specialists: g.specialists, receptionists: g.receptionists, cleaners: g.cleaners, lockerLevel: g.lockerLevel,
            spaceLevel: g.spaceLevel, branches: g.branches, cumNetIncome: g.cumNetIncome, lastNetIncome: g.lastNetIncome,
            collabsWon: g.collabsWon
          }
        });
        for (const key of g.services.filter((k) => !before[g.id].services.includes(k)))
          await tx.gymService.create({ data: { gymId: g.id, serviceId: services.find((s) => s.key === key).id, activatedAtRound: round.number } });
      }
      for (const c of out.collabs)
        await tx.collaboration.update({ where: { id: c.id }, data: { holdersJson: JSON.stringify(c.holders), expiresAtRound: c.expiresAtRound } });
      for (const o of out.outcomes) {
        const c = out.collabs.find((x) => x.key === o.collabKey);
        await tx.bid.create({ data: { roundId: round.id, gymId: o.gymId, collaborationId: c.id, amount: o.amount, outcome: o.outcome } });
      }
      for (const r of out.results)
        await tx.result.create({ data: { roundId: round.id, gymId: r.gymId, revenue: r.revenue, costs: r.costs, ebitda: r.ebitda, netIncome: r.netIncome, cashEnd: r.cashEnd, membersEnd: r.membersEnd, detailJson: JSON.stringify(r.detail) } });
      for (const k of out.ranking)
        await tx.rankingSnapshot.create({ data: { roundId: round.id, gymId: k.gymId, fige: k.fige, rank: k.rank, breakdownJson: JSON.stringify(k.breakdown) } });
      await tx.round.update({ where: { id: round.id }, data: { status: 'closed', processedAt: new Date() } });
    });

    await log('round', `Ronda ${round.number} procesada${missing.length ? ` (sin decisión: ${missing.map((m) => m.name).join(', ')})` : ''}`, round.number);
    const results = await getResults(round.id), ranking = await getRanking(round.id);
    emit('round:closed', { roundNumber: round.number, results, ranking, outcomes: await bidOutcomes(round.id) });
    emit('ranking:updated', { ranking });
    if (round.number >= CONFIG.ROUNDS) { await log('game', 'Juego finalizado', round.number); emit('game:finished', { ranking }); }
    return { roundNumber: round.number, results, ranking };
  } catch (e) {
    await prisma.round.update({ where: { id: round.id }, data: { status: 'open' } });
    throw e;
  }
}

export async function bidOutcomes(roundId) {
  const rows = await prisma.bid.findMany({ where: { roundId }, include: { collaboration: true, gym: true } });
  return rows.map((b) => ({ gymId: b.gymId, gymName: b.gym.name, collabKey: b.collaboration.key, collabName: b.collaboration.name, amount: b.amount, outcome: b.outcome }));
}

export async function getResults(roundId) {
  const rows = await prisma.result.findMany({ where: { roundId }, include: { gym: true }, orderBy: { gymId: 'asc' } });
  return rows.map((r) => ({ gymId: r.gymId, gymName: r.gym.name, color: r.gym.color, revenue: r.revenue, costs: r.costs, ebitda: r.ebitda, netIncome: r.netIncome, cashEnd: r.cashEnd, membersEnd: r.membersEnd, detail: JSON.parse(r.detailJson) }));
}

export async function getRanking(roundId) {
  const rows = await prisma.rankingSnapshot.findMany({ where: { roundId }, include: { gym: true }, orderBy: [{ rank: 'asc' }, { gymId: 'asc' }] });
  return rows.map((r) => ({ gymId: r.gymId, gymName: r.gym.name, color: r.gym.color, fige: r.fige, rank: r.rank, breakdown: JSON.parse(r.breakdownJson) }));
}

export async function latestClosedRound() {
  return prisma.round.findFirst({ where: { status: 'closed' }, orderBy: { number: 'desc' } });
}

export async function rankingHistory() {
  const rounds = await prisma.round.findMany({ where: { status: 'closed' }, orderBy: { number: 'asc' } });
  const out = [];
  for (const r of rounds) out.push({ roundNumber: r.number, month: r.month, ranking: await getRanking(r.id) });
  return out;
}

export async function marketView() {
  const gyms = await loadGyms();
  const collabs = await loadCollabs();
  const round = await getCurrentRound();
  const n = round?.number ?? CONFIG.ROUNDS;
  return {
    gyms: gyms.map((g) => ({ id: g.id, name: g.name, color: g.color, price: g.price, members: g.members, reputation: g.reputation, services: g.services, branches: g.branches, machineLevel: g.machineLevel })),
    collabs: collabs.map((c) => {
      const occupied = c.holders.length > 0 && c.expiresAtRound >= n;
      return { ...c, status: occupied ? 'occupied' : 'available', holderGymIds: occupied ? c.holders.map((h) => h.gymId) : [] };
    })
  };
}

export async function catalog() {
  const services = await prisma.service.findMany({ orderBy: { id: 'asc' } });
  return services.map((s) => ({ key: s.key, name: s.name, costImpl: s.costImpl, costPerRound: s.costPerRound, requirement: JSON.parse(s.requirementJson), effect: JSON.parse(s.effectJson) }));
}

export async function gymView(gymId) {
  const g = await loadGym(gymId);
  return { ...g, equity: equity(g), maxLoan: maxLoan(g) };
}

export async function resetGame() {
  await seed();
  emit('game:reset', {});
}

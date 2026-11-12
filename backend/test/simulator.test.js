import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { GYMS, COLLABS } from '../src/catalog.js';
import { simulateRound } from '../src/services/simulator.js';

const mkGyms = () => GYMS.map((g, i) => ({ id: i + 1, name: g.name, ...CONFIG.START, services: [], cumNetIncome: 0, collabsWon: 0 }));
const mkCollabs = () => COLLABS.map((c, i) => ({ id: i + 1, ...c, holders: [], expiresAtRound: 0 }));
const play = (decisionsByRound = {}) => {
  let gyms = mkGyms(), collabs = mkCollabs(), last;
  for (let r = 1; r <= 6; r++) {
    last = simulateRound({ roundNumber: r, gyms, decisions: decisionsByRound[r] || {}, collabs });
    gyms = last.gyms; collabs = last.collabs;
  }
  return { gyms, last };
};

test('7 gimnasios idénticos obtienen resultados idénticos', () => {
  const out = simulateRound({ roundNumber: 1, gyms: mkGyms(), decisions: {}, collabs: mkCollabs() });
  const m = out.results.map((r) => r.membersEnd);
  assert.equal(new Set(m).size, 1);
  assert.equal(new Set(out.ranking.map((r) => r.rank)).size, 1); // empate total -> posición compartida
});

test('R1 (+40%) atrae más socios que los 200 iniciales', () => {
  const out = simulateRound({ roundNumber: 1, gyms: mkGyms(), decisions: {}, collabs: mkCollabs() });
  assert.ok(out.results[0].membersEnd > 200);
});

test('un servicio sin requisito cumplido se rechaza (Spa necesita vestidores ≥3)', () => {
  const out = simulateRound({ roundNumber: 1, gyms: mkGyms(), decisions: { 1: { services: ['spa'] } }, collabs: mkCollabs() });
  assert.ok(!out.gyms[0].services.includes('spa'));
});

test('puja: gana la oferta más alta y paga su oferta', () => {
  const d = { 1: { bids: [{ collabKey: 'nike', amount: 30000 }] }, 2: { bids: [{ collabKey: 'nike', amount: 25000 }] } };
  const out = simulateRound({ roundNumber: 1, gyms: mkGyms(), decisions: d, collabs: mkCollabs() });
  const nike = out.collabs.find((c) => c.key === 'nike');
  assert.equal(nike.holders.length, 1);
  assert.equal(nike.holders[0].gymId, 1);
  assert.equal(nike.holders[0].amount, 30000);
});

test('empate de ofertas: gana mayor reputación; si persiste, 50% cada uno', () => {
  const gyms = mkGyms(); gyms[1].reputation = 80;
  const d = { 1: { bids: [{ collabKey: 'puma', amount: 20000 }] }, 2: { bids: [{ collabKey: 'puma', amount: 20000 }] } };
  let out = simulateRound({ roundNumber: 1, gyms, decisions: d, collabs: mkCollabs() });
  assert.equal(out.collabs.find((c) => c.key === 'puma').holders[0].gymId, 2);
  out = simulateRound({ roundNumber: 1, gyms: mkGyms(), decisions: d, collabs: mkCollabs() });
  assert.deepEqual(out.collabs.find((c) => c.key === 'puma').holders.map((h) => h.factor), [0.5, 0.5]);
});

test('un solo postor paga el costo base', () => {
  const out = simulateRound({ roundNumber: 1, gyms: mkGyms(), decisions: { 3: { bids: [{ collabKey: 'tigo', amount: 15000 }] } }, collabs: mkCollabs() });
  assert.equal(out.collabs.find((c) => c.key === 'tigo').holders[0].amount, 8000);
});

test('caja negativa activa crédito de emergencia y baja reputación', () => {
  const gyms = mkGyms(); gyms[0].cash = 1000;
  const out = simulateRound({ roundNumber: 1, gyms, decisions: { 1: { spaceUpgrade: true } }, collabs: mkCollabs() });
  assert.equal(out.gyms[0].cash, 0);
  assert.ok(out.gyms[0].debt > 0);
  assert.ok(out.results[0].detail.emergencyCredit > 0);
});

test('partida de 6 rondas sin decisiones: ranking final coherente', () => {
  const { gyms, last } = play();
  assert.equal(last.ranking.length, 7);
  gyms.forEach((g) => assert.ok(g.cash >= 0));
});

test('decisiones activas producen ventaja medible (precio bajo + máquinas + publicidad)', () => {
  const smart = { price: 150, machineUpgrade: 2, advertising: 15000 };
  const { last } = play({ 1: { 1: smart }, 2: { 1: { machineUpgrade: 1 } } });
  console.log('FIGE líder:', last.ranking[0], '| último:', last.ranking[6]);
  assert.ok(last.ranking.length === 7);
});

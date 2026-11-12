import { Router } from 'express';
import { requireAuth, requirePlayer } from '../middleware/auth.js';
import * as G from '../services/gameService.js';
import { prisma } from '../db.js';
import { CONFIG } from '../config.js';

const r = Router();
r.use(requireAuth);

r.get('/gym/me', requirePlayer, async (req, res) => res.json(await G.gymView(req.user.gymId)));

r.get('/round/current', async (req, res) => {
  const round = await G.getCurrentRound();
  const last = await G.latestClosedRound();
  const rounds = await prisma.round.findMany({ orderBy: { number: 'asc' } });
  let submitted = false;
  if (round && req.user.gymId)
    submitted = !!(await prisma.decision.findUnique({ where: { roundId_gymId: { roundId: round.id, gymId: req.user.gymId } } }));
  res.json({
    round: G.roundDto(round), lastClosedRoundId: last?.id ?? null, lastClosedNumber: last?.number ?? 0,
    finished: !round, totalRounds: CONFIG.ROUNDS, submitted, serverTime: new Date(),
    rounds: rounds.map((x) => ({ id: x.id, number: x.number, month: x.month, seasonalFactor: x.seasonalFactor, status: x.status }))
  });
});

r.get('/round/:id/results', async (req, res) => {
  const round = await prisma.round.findUnique({ where: { id: Number(req.params.id) } });
  if (!round) return res.status(404).json({ error: 'Ronda inexistente' });
  if (round.status !== 'closed') return res.status(403).json({ error: 'Los resultados se publican al cerrar la ronda' });
  res.json({ round: G.roundDto(round), results: await G.getResults(round.id), outcomes: await G.bidOutcomes(round.id) });
});

r.get('/ranking/history', async (_req, res) => res.json(await G.rankingHistory()));
r.get('/ranking/:roundId', async (req, res) => {
  let id = Number(req.params.roundId);
  if (req.params.roundId === 'latest' || !id) id = (await G.latestClosedRound())?.id;
  res.json(id ? await G.getRanking(id) : []);
});

r.get('/market', async (_req, res) => res.json(await G.marketView()));
r.get('/catalog', async (_req, res) => res.json({ services: await G.catalog(), ...(await G.marketView()) }));
export default r;

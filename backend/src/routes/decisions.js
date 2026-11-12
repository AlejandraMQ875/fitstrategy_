import { Router } from 'express';
import { requireAuth, requirePlayer } from '../middleware/auth.js';
import * as G from '../services/gameService.js';
import { prisma } from '../db.js';

const r = Router();
r.use(requireAuth, requirePlayer);

r.post('/preview', async (req, res) => res.json(await G.previewFor(req.user, req.body)));

r.get('/:roundId/me', async (req, res) => {
  const d = await prisma.decision.findUnique({ where: { roundId_gymId: { roundId: Number(req.params.roundId), gymId: req.user.gymId } } });
  res.json(d ? JSON.parse(d.payload) : null);
});

// Idempotente: reenviar sobrescribe la decisión hasta que el admin procese
r.post('/:roundId', async (req, res) => {
  const { decision, notes } = await G.saveDecision(req.user, Number(req.params.roundId), req.body);
  res.json({ ok: true, decision, notes });
});
export default r;

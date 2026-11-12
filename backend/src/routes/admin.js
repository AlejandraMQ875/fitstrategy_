import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import * as G from '../services/gameService.js';
import { prisma } from '../db.js';

const r = Router();
r.use(requireAuth, requireAdmin);

r.get('/status', async (_req, res) => res.json(await G.adminStatus()));
r.post('/open-round', async (req, res) => res.json(await G.openRound(Number(req.body?.durationMin) || 10)));
r.post('/next-round', async (req, res) => res.json(await G.openRound(Number(req.body?.durationMin) || 10)));
r.post('/process-round', async (req, res) => res.json(await G.processRound({ force: !!req.body?.force })));
r.post('/reset-game', async (_req, res) => { await G.resetGame(); res.json({ ok: true }); });

// Reporte final descargable: ?format=json|csv
r.get('/report', async (req, res) => {
  const rounds = await prisma.round.findMany({ where: { status: 'closed' }, orderBy: { number: 'asc' } });
  const rows = [];
  for (const rd of rounds) {
    const results = await G.getResults(rd.id), ranking = await G.getRanking(rd.id);
    for (const x of results) {
      const k = ranking.find((q) => q.gymId === x.gymId);
      rows.push({ ronda: rd.number, mes: rd.month, gimnasio: x.gymName, socios: x.membersEnd, ingresos: Math.round(x.revenue), costos: Math.round(x.costs), ebitda: Math.round(x.ebitda), utilidad_neta: Math.round(x.netIncome), caja: x.cashEnd, satisfaccion: +x.detail.satisfaction.toFixed(1), retencion: +(x.detail.retention * 100).toFixed(1), reputacion: +x.detail.reputation.toFixed(1), fige: k?.fige, posicion: k?.rank });
    }
  }
  if (req.query.format === 'csv') {
    const head = Object.keys(rows[0] || { ronda: 0 });
    const csv = [head.join(','), ...rows.map((x) => head.map((h) => JSON.stringify(x[h] ?? '')).join(','))].join('\n');
    res.type('text/csv').attachment('fitstrategy-reporte.csv').send(csv);
  } else res.attachment('fitstrategy-reporte.json').json({ generado: new Date(), filas: rows });
});
export default r;

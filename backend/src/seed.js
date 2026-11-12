import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './db.js';
import { CONFIG } from './config.js';
import { GYMS, SERVICES, COLLABS } from './catalog.js';

export async function seed() {
  // Limpieza completa (orden por dependencias)
  for (const m of ['rankingSnapshot', 'result', 'bid', 'decision', 'gymService', 'user', 'eventLog', 'round', 'collaboration', 'service', 'gym'])
    await prisma[m].deleteMany();

  const players = process.env.PLAYER_PASSWORD || 'jugador123';
  const admin = process.env.ADMIN_PASSWORD || 'admin123';

  for (const g of GYMS) {
    const gym = await prisma.gym.create({ data: { name: g.name, color: g.color, ...CONFIG.START } }); // condiciones IDÉNTICAS
    await prisma.user.create({ data: { username: g.username, passwordHash: await bcrypt.hash(players, 10), role: 'player', gymId: gym.id } });
  }
  await prisma.user.create({ data: { username: 'admin', passwordHash: await bcrypt.hash(admin, 10), role: 'admin' } });

  for (const s of CONFIG.SEASON)
    await prisma.round.create({ data: { number: s.n, month: s.month, seasonalFactor: s.factor, status: 'pending' } });
  for (const s of SERVICES)
    await prisma.service.create({ data: { key: s.key, name: s.name, costImpl: s.costImpl, costPerRound: s.costPerRound, requirementJson: JSON.stringify(s.requirement), effectJson: JSON.stringify(s.effect) } });
  for (const c of COLLABS)
    await prisma.collaboration.create({ data: { key: c.key, name: c.name, sector: c.sector, category: c.category, cost: c.cost, duration: c.duration, effectJson: JSON.stringify(c.effect) } });
  await prisma.eventLog.create({ data: { type: 'reset', message: 'Partida inicializada' } });
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed().then(() => { console.log('Seed listo: 7 gimnasios, 1 admin, 6 rondas, 7 servicios, 14 colaboraciones'); return prisma.$disconnect(); })
    .catch((e) => { console.error(e); process.exit(1); });
}

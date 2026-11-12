import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { sign } from '../middleware/auth.js';

const r = Router();
r.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = await prisma.user.findUnique({ where: { username: String(username || '').trim().toLowerCase() }, include: { gym: true } });
  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash)))
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  res.json({
    token: sign(user),
    user: { id: user.id, username: user.username, role: user.role },
    gym: user.gym ? { id: user.gym.id, name: user.gym.name, color: user.gym.color } : null
  });
});
export default r;

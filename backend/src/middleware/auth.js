import jwt from 'jsonwebtoken';

export const SECRET = process.env.JWT_SECRET || 'dev-secret';
export const sign = (u) => jwt.sign({ id: u.id, role: u.role, gymId: u.gymId ?? null, username: u.username }, SECRET, { expiresIn: '12h' });
export const verify = (t) => jwt.verify(t, SECRET);

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  try { req.user = verify(h.replace('Bearer ', '')); next(); }
  catch { res.status(401).json({ error: 'Sesión inválida o vencida' }); }
}
export const requireAdmin = (req, res, next) =>
  req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Solo el administrador' });
export const requirePlayer = (req, res, next) =>
  req.user?.role === 'player' && req.user.gymId ? next() : res.status(403).json({ error: 'Solo jugadores' });

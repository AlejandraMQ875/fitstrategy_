import 'express-async-errors';
import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { initSocket, setForceHandler } from './socket.js';
import { HttpError, processRound } from './services/gameService.js';
import auth from './routes/auth.js';
import game from './routes/game.js';
import decisions from './routes/decisions.js';
import admin from './routes/admin.js';

const app = express();
const origin = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(cors({ origin, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api/decision', decisions);
app.use('/api/admin', admin);
app.use('/api', game);

// Opcional: servir el frontend compilado (despliegue todo en un servicio)
const staticDir = process.env.STATIC_DIR && path.resolve(process.env.STATIC_DIR);
if (staticDir && fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get('*', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
}

// Manejo central de errores (express-async-errors propaga los rechazos de rutas async)
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const server = http.createServer(app);
initSocket(server, origin);
setForceHandler(() => processRound({ force: true }));

const port = Number(process.env.PORT) || 4000;
server.listen(port, () => console.log(`FITSTRATEGY API en http://localhost:${port}`));

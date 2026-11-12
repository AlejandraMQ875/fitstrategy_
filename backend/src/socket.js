import { Server } from 'socket.io';
import { verify } from './middleware/auth.js';

let io = null;
let onForceProcess = null;
export const setForceHandler = (fn) => { onForceProcess = fn; };
export const emit = (event, payload) => io?.emit(event, payload);
export const emitAdmin = (event, payload) => io?.to('admin').emit(event, payload);

export function initSocket(httpServer, origin) {
  io = new Server(httpServer, { cors: { origin, credentials: true } });
  io.use((socket, next) => {
    try { socket.data.user = verify(socket.handshake.auth?.token); next(); }
    catch { next(new Error('unauthorized')); }
  });
  io.on('connection', (socket) => {
    const u = socket.data.user;
    socket.join(u.role === 'admin' ? 'admin' : 'players');
    if (u.role === 'admin') {
      // El admin fuerza el procesamiento aunque falten jugadores
      socket.on('admin:force-process', async () => {
        try { await onForceProcess?.(); } catch (e) { socket.emit('admin:error', { error: e.message }); }
      });
    }
  });
  return io;
}

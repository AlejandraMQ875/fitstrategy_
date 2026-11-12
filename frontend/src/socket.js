import { io } from 'socket.io-client';

let socket = null;
export function connectSocket(token) {
  disconnectSocket();
  socket = io(import.meta.env.VITE_API_URL || window.location.origin, { auth: { token }, transports: ['websocket', 'polling'] });
  return socket;
}
export const getSocket = () => socket;
export function disconnectSocket() { socket?.disconnect(); socket = null; }

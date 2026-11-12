import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, getSession } from './api.js';
import { connectSocket, disconnectSocket } from './socket.js';

const Ctx = createContext(null);
export const useGame = () => useContext(Ctx);

export function GameProvider({ children }) {
  const [session, setSession] = useState(getSession());
  const [game, setGame] = useState(null);       // /round/current
  const [version, setVersion] = useState(0);    // sube con cada evento: las páginas vuelven a pedir datos
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const toast = useCallback((text, kind = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const refresh = useCallback(async () => {
    if (!getSession()) return;
    try { setGame(await api.get('/round/current')); } catch (e) { if (e.status === 401) logout(); }
  }, []);

  const login = async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    localStorage.setItem('fs_session', JSON.stringify(data));
    setSession(data);
  };
  const logout = () => { localStorage.removeItem('fs_session'); disconnectSocket(); setSession(null); setGame(null); };

  useEffect(() => {
    if (!session) return;
    refresh();
    const s = connectSocket(session.token);
    const bump = () => { refresh(); setVersion((v) => v + 1); };
    s.on('round:opened', (p) => { toast(`Ronda ${p.roundNumber} abierta (${p.month})`, 'ok'); bump(); });
    s.on('round:processing', () => { toast('El administrador está procesando la ronda…'); bump(); });
    s.on('round:closed', (p) => { toast(`Ronda ${p.roundNumber} cerrada: resultados disponibles`, 'ok'); bump(); });
    s.on('ranking:updated', bump);
    s.on('game:finished', () => { toast('¡Juego terminado! Mira el ranking final', 'ok'); bump(); });
    s.on('game:reset', () => { toast('La partida fue reiniciada'); bump(); });
    s.on('decision:saved', (p) => { if (session.user.role === 'admin') toast(`${p.playerName}: decisión enviada`); bump(); });
    s.on('admin:error', (p) => toast(p.error, 'error'));
    s.on('connect_error', () => toast('Sin conexión en tiempo real. Reintentando…', 'error'));
    return () => disconnectSocket();
  }, [session?.token]);

  return (
    <Ctx.Provider value={{ session, game, version, login, logout, refresh, toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-md px-4 py-3 shadow text-white max-w-sm ${t.kind === 'error' ? 'bg-red-600' : t.kind === 'ok' ? 'bg-emerald-700' : 'bg-ink'}`}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

import React, { useEffect, useState } from 'react';
import { api, download } from '../api.js';
import { useGame } from '../GameContext.jsx';
import { getSocket } from '../socket.js';
import Countdown from '../components/Countdown.jsx';
import Ranking from './Ranking.jsx';
import Results from './Results.jsx';

export default function AdminPanel() {
  const { game, version, logout, toast, refresh } = useGame();
  const [status, setStatus] = useState(null);
  const [duration, setDuration] = useState(10);
  const [tab, setTab] = useState('control');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/admin/status').then(setStatus).catch(() => {});
  useEffect(() => { load(); }, [version]);

  const round = status?.round;
  const submitted = status?.gyms.filter((g) => g.submitted).length ?? 0;

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); if (okMsg) toast(okMsg, 'ok'); await load(); refresh(); }
    catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const open = () => run(() => api.post('/admin/open-round', { durationMin: duration }));
  const process = async () => {
    setBusy(true);
    try { await api.post('/admin/process-round', { force: false }); await load(); refresh(); }
    catch (e) {
      if (e.status === 409 && window.confirm(`${e.message}\n\nFaltan: ${e.data.missing.map((m) => m.name).join(', ')}`)) {
        try { await api.post('/admin/process-round', { force: true }); await load(); refresh(); } catch (e2) { toast(e2.message, 'error'); }
      } else if (e.status !== 409) toast(e.message, 'error');
    } finally { setBusy(false); }
  };
  const reset = () => { if (window.confirm('Esto borra TODA la partida y vuelve a las condiciones iniciales. ¿Continuar?')) run(() => api.post('/admin/reset-game'), 'Partida reiniciada'); };

  const nextLabel = round?.status === 'pending' ? (round.number === 1 ? 'Abrir ronda 1' : `Siguiente ronda (R${round.number})`) : null;

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-chalk">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold leading-none">FITSTRATEGY · Administración</h1>
            <p className="text-sm text-chalk/70">{game?.finished ? 'Juego terminado' : round ? `Ronda ${round.number} · ${round.month} · estado: ${round.status}` : '…'}</p>
          </div>
          <div className="ml-auto flex items-center gap-4">{round?.status === 'open' && <Countdown endsAt={round.endsAt} />}<button className="btn btn-ghost !text-ink" onClick={logout}>Salir</button></div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1" role="tablist">
          {[['control', 'Control'], ['ranking', 'Ranking en vivo'], ['results', 'Resultados por ronda']].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`px-4 py-2 font-semibold border-b-4 ${tab === k ? 'border-bib text-white' : 'border-transparent text-chalk/60 hover:text-white'}`}>{l}</button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'ranking' && <Ranking />}
        {tab === 'results' && <Results adminView />}
        {tab === 'control' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <section className="card lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold">Ronda actual</h2>
              <div className="flex flex-wrap items-end gap-3">
                {nextLabel && (
                  <>
                    <div><label className="label" htmlFor="dur">Duración</label>
                      <select id="dur" className="input w-auto" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>{[5, 10, 15].map((m) => <option key={m} value={m}>{m} min</option>)}</select></div>
                    <button className="btn btn-primary" disabled={busy} onClick={open}>{nextLabel}</button>
                  </>
                )}
                {round?.status === 'open' && <button className="btn btn-dark" disabled={busy} onClick={process}>Procesar ronda {round.number}</button>}
                {round?.status === 'open' && <button className="btn btn-ghost" disabled={busy} onClick={() => getSocket()?.emit('admin:force-process')}>Forzar procesamiento</button>}
                {game?.finished && <p className="font-semibold">Las 6 rondas están cerradas.</p>}
              </div>
              {round?.status === 'open' && <p className="text-sm text-steel">{submitted} de 7 decisiones enviadas. Los jugadores pueden actualizar su decisión hasta que proceses.</p>}

              <ul className="grid sm:grid-cols-2 gap-2">
                {status?.gyms.map((g) => (
                  <li key={g.id} className="flex items-center justify-between border border-line rounded-md px-3 py-2 bg-white">
                    <span><span className="inline-block w-3 h-3 rounded-full mr-2" style={{ background: g.color }} />{g.name}</span>
                    <span className={`text-sm font-semibold ${g.submitted ? 'text-emerald-700' : 'text-steel'}`}>{round?.status === 'open' ? (g.submitted ? 'Decisión enviada' : 'Pendiente') : `${g.members} socios`}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-3 pt-2 border-t border-line">
                <button className="btn btn-ghost" onClick={() => download('/admin/report?format=csv', 'fitstrategy-reporte.csv')}>Descargar reporte CSV</button>
                <button className="btn btn-ghost" onClick={() => download('/admin/report?format=json', 'fitstrategy-reporte.json')}>Descargar reporte JSON</button>
                <button className="btn btn-danger ml-auto" disabled={busy} onClick={reset}>Reiniciar partida</button>
              </div>
            </section>

            <section className="card">
              <h2 className="text-2xl font-bold mb-2">Registro de eventos</h2>
              <ul className="text-sm space-y-2 max-h-[28rem] overflow-y-auto">
                {status?.log.map((l) => (
                  <li key={l.id}><span className="num text-steel">{new Date(l.at).toLocaleTimeString('es-BO')}</span> {l.roundNumber ? `R${l.roundNumber} · ` : ''}{l.message}</li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

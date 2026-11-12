import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useGame } from '../GameContext.jsx';
import { bs, emptyDraft } from '../util.js';
import Decisions from './Decisions.jsx';
import Results from './Results.jsx';
import Ranking from './Ranking.jsx';
import GymCard from '../components/GymCard.jsx';
import ServiceTree from '../components/ServiceTree.jsx';
import CollaborationBid from '../components/CollaborationBid.jsx';
import Countdown from '../components/Countdown.jsx';

export default function GymDashboard() {
  const { session, game, version, logout, refresh } = useGame();
  const [tab, setTab] = useState('decisions');
  const [gym, setGym] = useState(null);
  const [cat, setCat] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());

  const round = game?.round;
  const canEdit = round?.status === 'open';
  const hasResults = (game?.lastClosedNumber ?? 0) > 0;

  useEffect(() => {
    api.get('/gym/me').then(setGym).catch(() => {});
    api.get('/catalog').then(setCat).catch(() => {});
  }, [version]);

  // Al abrirse una ronda: recupera la decisión ya enviada o parte de los valores actuales
  useEffect(() => {
    if (!gym || !round) return;
    if (round.status !== 'open') return;
    api.get(`/decision/${round.id}/me`).then((d) => setDraft(d ? { ...emptyDraft(gym.price), ...d } : emptyDraft(gym.price))).catch(() => {});
  }, [round?.id, round?.status, gym?.id]);

  const tabs = [
    ['decisions', 'Decisiones'], ...(hasResults ? [['results', 'Resultados']] : []), ['ranking', 'Ranking'],
    ['market', 'Mercado'], ['collabs', 'Colaboraciones'], ['services', 'Servicios']
  ];

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-chalk">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center gap-x-8 gap-y-2">
          <div>
            <h1 className="text-4xl font-bold leading-none" style={{ color: session.gym.color === '#2E86AB' ? '#8CC8E6' : undefined }}>{session.gym.name}</h1>
            <p className="text-sm text-chalk/70">
              {game?.finished ? 'Juego terminado' : round ? `Ronda ${round.number} de 6 · ${round.month} · ${round.status === 'open' ? 'abierta' : round.status === 'processing' ? 'procesando' : 'esperando al administrador'}` : 'Cargando…'}
            </p>
          </div>
          {gym && (
            <dl className="flex gap-6 text-sm">
              {[['Caja', bs(gym.cash)], ['Socios', gym.members], ['Reputación', gym.reputation.toFixed(0)], ['Mensualidad', bs(gym.price)]].map(([l, v]) => (
                <div key={l}><dt className="text-chalk/60">{l}</dt><dd className="num font-semibold text-lg">{v}</dd></div>
              ))}
            </dl>
          )}
          <div className="ml-auto flex items-center gap-4">
            {canEdit && <Countdown endsAt={round.endsAt} />}
            <button className="btn btn-ghost !text-ink" onClick={logout}>Salir</button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto" role="tablist">
          {tabs.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`px-4 py-2 font-semibold whitespace-nowrap border-b-4 ${tab === k ? 'border-bib text-white' : 'border-transparent text-chalk/60 hover:text-white'}`}>{l}</button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {!canEdit && !game?.finished && tab !== 'ranking' && tab !== 'results' && (
          <p className="mb-4 rounded-md bg-bib/30 px-4 py-3 text-sm">Las decisiones se habilitan cuando el administrador abre la ronda. Mientras tanto puedes revisar el mercado, las colaboraciones y los servicios.</p>
        )}
        {gym && tab === 'decisions' && <Decisions gym={gym} game={game} draft={draft} setDraft={setDraft} canEdit={canEdit} onSubmitted={refresh} />}
        {tab === 'results' && <Results myGymId={session.gym.id} />}
        {tab === 'ranking' && <Ranking myGymId={session.gym.id} />}
        {tab === 'market' && cat && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cat.gyms.map((g) => (
              <GymCard key={g.id} gym={g} mine={g.id === session.gym.id}
                collabHeld={cat.collabs.filter((c) => c.holderGymIds.includes(g.id)).map((c) => c.name)} />
            ))}
          </div>
        )}
        {tab === 'collabs' && cat && gym && <CollaborationBid collabs={cat.collabs} gyms={cat.gyms} myGymId={gym.id} draft={draft} setDraft={setDraft} canEdit={canEdit} />}
        {tab === 'services' && cat && gym && <ServiceTree gym={gym} services={cat.services} draft={draft} setDraft={setDraft} canEdit={canEdit} />}
      </main>
    </div>
  );
}

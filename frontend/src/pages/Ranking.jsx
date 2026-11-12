import React, { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api.js';
import { useGame } from '../GameContext.jsx';
import RankingTable from '../components/RankingTable.jsx';

export default function Ranking({ myGymId }) {
  const { game, version } = useGame();
  const [history, setHistory] = useState([]);
  useEffect(() => { api.get('/ranking/history').then(setHistory).catch(() => {}); }, [version]);

  const latest = history[history.length - 1]?.ranking ?? [];
  const names = latest.map((r) => ({ id: r.gymId, name: r.gymName, color: r.color }));
  const chart = history.map((h) => ({ ronda: `R${h.roundNumber}`, ...Object.fromEntries(h.ranking.map((r) => [r.gymName, r.fige])) }));
  const podium = game?.finished ? latest.slice(0, 3) : [];

  return (
    <div className="space-y-6">
      {podium.length > 0 && (
        <section className="card bg-ink text-chalk">
          <h2 className="text-3xl font-bold mb-3">Podio final</h2>
          <ol className="grid sm:grid-cols-3 gap-3">
            {podium.map((p) => (
              <li key={p.gymId} className="rounded-md p-4 bg-white/10 border-t-4" style={{ borderColor: p.color }}>
                <p className="font-display text-5xl">{p.rank}</p><p className="text-xl font-semibold">{p.gymName}</p><p className="num text-chalk/70">FIGE {p.fige.toFixed(1)}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section className="card"><h2 className="text-2xl font-bold mb-2">Ranking FIGE{history.length ? ` · tras R${history[history.length - 1].roundNumber}` : ''}</h2><RankingTable ranking={latest} myGymId={myGymId} /></section>
      {chart.length > 0 && (
        <section className="card">
          <h2 className="text-2xl font-bold mb-2">Evolución del FIGE</h2>
          <div className="h-72"><ResponsiveContainer><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#D9DED6" /><XAxis dataKey="ronda" /><YAxis domain={['auto', 'auto']} /><Tooltip /><Legend />
            {names.map((n) => <Line key={n.id} type="monotone" dataKey={n.name} stroke={n.color} strokeWidth={n.id === myGymId ? 4 : 2} dot={false} />)}
          </LineChart></ResponsiveContainer></div>
        </section>
      )}
    </div>
  );
}

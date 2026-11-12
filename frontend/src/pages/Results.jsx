import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useGame } from '../GameContext.jsx';
import SegmentChart from '../components/SegmentChart.jsx';
import { bs, pct } from '../util.js';

const OUTCOME = { won: 'Ganaste', shared: 'Compartida al 50%', lost: 'Perdiste la puja', rejected: 'Rechazada' };

export default function Results({ myGymId, adminView = false }) {
  const { game, version } = useGame();
  const closed = (game?.rounds || []).filter((r) => r.status === 'closed');
  const [roundId, setRoundId] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => { if (closed.length) setRoundId(closed[closed.length - 1].id); }, [closed.length]);
  useEffect(() => { if (roundId) api.get(`/round/${roundId}/results`).then(setData).catch(() => setData(null)); }, [roundId, version]);

  if (!closed.length) return <p className="text-steel">Los resultados se publican cuando el administrador procesa la ronda.</p>;
  const mine = data?.results.find((r) => r.gymId === myGymId);
  const d = mine?.detail;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label htmlFor="rsel" className="label mb-0">Ronda</label>
        <select id="rsel" className="input w-auto" value={roundId ?? ''} onChange={(e) => setRoundId(Number(e.target.value))}>
          {closed.map((r) => <option key={r.id} value={r.id}>R{r.number} · {r.month}</option>)}
        </select>
      </div>

      {mine && !adminView && (
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-2xl font-bold mb-2">Tu estado de resultados</h2>
            <dl className="text-sm space-y-1">
              {[['Ingresos', mine.revenue], ['  Mensualidades', d.revenue.memberships], ['  Pases diarios', d.revenue.dayPasses], ['  Servicios premium', d.revenue.premium], ['  Convenios', d.revenue.convenios], ['Costos fijos', -d.fixedTotal], ['Costos variables', -d.variableTotal], ['EBITDA', mine.ebitda], ['Depreciación', -d.depreciation], ['Intereses', -d.interest], ['Utilidad neta', mine.netIncome], ['Inversiones', -d.capex], ['Caja final', mine.cashEnd]].map(([l, v]) => (
                <div key={l} className={`flex justify-between ${l.startsWith(' ') ? 'text-steel' : 'font-medium'}`}><dt className="whitespace-pre">{l}</dt><dd className="num">{bs(v)}</dd></div>
              ))}
            </dl>
            {d.emergencyCredit > 0 && <p className="mt-2 text-red-700 text-sm">Crédito de emergencia: {bs(d.emergencyCredit)} (reputación −5)</p>}
          </div>
          <div className="card">
            <h2 className="text-2xl font-bold mb-2">Demanda por segmento</h2>
            <SegmentChart demand={d.demandBySegment} />
            <p className="text-sm text-steel mt-2 num">Socios {mine.membersEnd} · Capacidad {Math.round(d.capacityMembers)} · Satisfacción {d.satisfaction.toFixed(0)} · Retención {pct(d.retention)} · Reputación {d.reputation.toFixed(0)}</p>
            {d.notes?.length > 0 && <ul className="list-disc pl-5 text-sm mt-2">{d.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
            {data.outcomes.filter((o) => o.gymId === myGymId).map((o) => <p key={o.collabKey} className="text-sm mt-1">{o.collabName}: <strong>{OUTCOME[o.outcome]}</strong> ({bs(o.amount)})</p>)}
          </div>
        </section>
      )}

      <section className="card overflow-x-auto">
        <h2 className="text-2xl font-bold mb-2">Todos los gimnasios</h2>
        <table className="w-full text-sm text-left">
          <thead className="text-steel"><tr><th className="py-1">Gimnasio</th><th className="text-right">Socios</th><th className="text-right">Ingresos</th><th className="text-right">Costos</th><th className="text-right">EBITDA</th><th className="text-right">Utilidad neta</th><th className="text-right">Caja</th></tr></thead>
          <tbody>{data?.results.map((r) => (
            <tr key={r.gymId} className={`border-t border-line ${r.gymId === myGymId ? 'bg-bib/20 font-semibold' : ''}`}>
              <td className="py-1">{r.gymName}</td><td className="num text-right">{r.membersEnd}</td><td className="num text-right">{bs(r.revenue)}</td><td className="num text-right">{bs(r.costs)}</td><td className="num text-right">{bs(r.ebitda)}</td><td className="num text-right">{bs(r.netIncome)}</td><td className="num text-right">{bs(r.cashEnd)}</td>
            </tr>))}</tbody>
        </table>
      </section>
    </div>
  );
}

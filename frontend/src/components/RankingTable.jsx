import React from 'react';

const PARTS = [['profit', 'Rentabilidad'], ['market', 'Mercado'], ['satisfaction', 'Satisfacción'], ['retention', 'Retención'], ['innovation', 'Innovación']];

export default function RankingTable({ ranking, myGymId }) {
  if (!ranking?.length) return <p className="text-steel">El ranking aparece al cerrar la primera ronda.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="text-sm text-steel">
          <tr><th className="py-2 pr-3">Pos.</th><th className="pr-3">Gimnasio</th><th className="pr-3 text-right">FIGE</th>{PARTS.map(([k, l]) => <th key={k} className="pr-3 hidden lg:table-cell">{l}</th>)}</tr>
        </thead>
        <tbody>
          {ranking.map((r) => (
            <tr key={r.gymId} className={`border-t border-line ${r.gymId === myGymId ? 'bg-bib/20 font-semibold' : ''}`}>
              <td className="py-2 pr-3 num">{r.rank}</td>
              <td className="pr-3"><span className="inline-block w-3 h-3 rounded-full mr-2 align-middle" style={{ background: r.color }} />{r.gymName}</td>
              <td className="pr-3 text-right num">{r.fige.toFixed(1)}</td>
              {PARTS.map(([k]) => (
                <td key={k} className="pr-3 hidden lg:table-cell w-28">
                  <div className="h-2 bg-chalk rounded"><div className="h-2 rounded bg-court" style={{ width: `${Math.round((r.breakdown[k] || 0) * 100)}%` }} /></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

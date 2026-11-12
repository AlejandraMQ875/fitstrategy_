import React, { useState } from 'react';
import { bs, effectText } from '../util.js';

export default function CollaborationBid({ collabs, gyms, myGymId, draft, setDraft, canEdit }) {
  const [tab, setTab] = useState('A');
  const [offers, setOffers] = useState({});
  const bidOf = (key) => draft.bids.find((b) => b.collabKey === key);
  const gymName = (id) => gyms.find((g) => g.id === id)?.name ?? '—';

  const place = (c) => {
    const amount = Math.round(Number(offers[c.key] ?? c.cost));
    if (amount < c.cost || amount > 2 * c.cost) return alert(`La oferta debe estar entre ${bs(c.cost)} y ${bs(2 * c.cost)}`);
    setDraft((d) => ({ ...d, bids: [...d.bids.filter((b) => b.collabKey !== c.key), { collabKey: c.key, amount }] }));
  };
  const withdraw = (key) => setDraft((d) => ({ ...d, bids: d.bids.filter((b) => b.collabKey !== key) }));

  return (
    <div>
      <div className="flex gap-2 mb-4" role="tablist">
        {[['A', 'Convenios (10)'], ['B', 'Marcas deportivas (4)']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`btn ${tab === k ? 'btn-dark' : 'btn-ghost'}`}>{l}</button>
        ))}
      </div>
      <p className="text-sm text-steel mb-3">Máximo 2 convenios y 1 marca deportiva por gimnasio. Cada colaboración es exclusiva: con 2 o más ofertas gana la más alta (pujas ocultas); con un solo postor pagas el costo base.</p>
      <div className="grid md:grid-cols-2 gap-3">
        {collabs.filter((c) => c.category === tab).map((c) => {
          const mine = bidOf(c.key);
          const occupied = c.status === 'occupied';
          const heldByMe = occupied && c.holderGymIds.includes(myGymId);
          return (
            <article key={c.key} className="card">
              <div className="flex justify-between items-start gap-2">
                <h3 className="text-xl font-bold leading-tight">{c.name}</h3>
                <span className={`text-sm font-semibold whitespace-nowrap ${heldByMe ? 'text-emerald-700' : occupied ? 'text-steel' : mine ? 'text-court' : 'text-emerald-700'}`}>
                  {heldByMe ? 'Es tuya' : occupied ? `Ocupada por ${c.holderGymIds.map(gymName).join(' / ')}` : mine ? 'En puja' : 'Disponible'}
                </span>
              </div>
              <p className="text-sm text-steel">{c.sector}</p>
              <p className="text-sm mt-1">{effectText(c.effect)}</p>
              <p className="text-sm num mt-1">Costo base {bs(c.cost)} por ronda · {c.duration} {c.duration === 1 ? 'ronda' : 'rondas'}</p>
              {!occupied && (
                <div className="mt-3 flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="label" htmlFor={`o-${c.key}`}>Tu oferta (hasta {bs(2 * c.cost)})</label>
                    <input id={`o-${c.key}`} type="number" className="input num" min={c.cost} max={2 * c.cost} step={500}
                      value={offers[c.key] ?? mine?.amount ?? c.cost} onChange={(e) => setOffers({ ...offers, [c.key]: e.target.value })} disabled={!canEdit} />
                  </div>
                  <button className="btn btn-primary" onClick={() => place(c)} disabled={!canEdit}>Pujar</button>
                  {mine && <button className="btn btn-ghost" onClick={() => withdraw(c.key)} disabled={!canEdit}>Retirar</button>}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

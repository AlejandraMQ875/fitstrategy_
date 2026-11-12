import React from 'react';
import { bs, effectText, REQ_LABEL } from '../util.js';

export default function ServiceTree({ gym, services, draft, setDraft, canEdit }) {
  // Los niveles incluyen las mejoras que ya están en la decisión actual
  const lv = {
    space: gym.spaceLevel + (draft.spaceUpgrade ? 1 : 0),
    machines: gym.machineLevel + draft.machineUpgrade,
    lockers: gym.lockerLevel + (draft.lockerUpgrade ? 1 : 0)
  };
  const met = (req) => Object.entries(req).every(([k, v]) => lv[k] >= v);
  const toggle = (key) => setDraft((d) => ({ ...d, services: d.services.includes(key) ? d.services.filter((k) => k !== key) : [...d.services, key] }));

  return (
    <div className="grid md:grid-cols-2 gap-3">
      {services.map((s) => {
        const active = gym.services.includes(s.key), queued = draft.services.includes(s.key), ok = met(s.requirement);
        const reqs = Object.entries(s.requirement).map(([k, v]) => `${REQ_LABEL[k]} nivel ${v}`).join(', ') || 'Sin requisitos';
        return (
          <article key={s.key} className={`card ${active ? 'border-emerald-600' : !ok ? 'opacity-70' : ''}`}>
            <div className="flex justify-between items-start">
              <h3 className="text-2xl font-bold">{s.name}</h3>
              <span className={`text-sm font-semibold ${active ? 'text-emerald-700' : ok ? 'text-court' : 'text-steel'}`}>{active ? 'Activo' : ok ? 'Disponible' : 'Bloqueado'}</span>
            </div>
            <p className="text-sm text-steel">{reqs}</p>
            <p className="text-sm mt-1">{effectText(s.effect)}</p>
            <p className="text-sm mt-1 num">Implementar {bs(s.costImpl)} · {bs(s.costPerRound)} por ronda</p>
            {!active && (
              <button className={`btn mt-3 ${queued ? 'btn-dark' : 'btn-ghost'}`} disabled={!ok || !canEdit} onClick={() => toggle(s.key)}>
                {queued ? 'Quitar de la decisión' : 'Agregar a la decisión'}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

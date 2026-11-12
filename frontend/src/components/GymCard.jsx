import React from 'react';
import { bs } from '../util.js';

export default function GymCard({ gym, mine, collabHeld = [] }) {
  return (
    <article className={`card border-l-4 ${mine ? 'ring-2 ring-bib' : ''}`} style={{ borderLeftColor: gym.color }}>
      <h3 className="text-2xl font-bold">{gym.name}{mine && <span className="ml-2 text-sm font-sans font-medium text-steel">(tu gimnasio)</span>}</h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-steel">Mensualidad</dt><dd className="num text-right font-semibold">{bs(gym.price)}</dd>
        <dt className="text-steel">Socios</dt><dd className="num text-right">{gym.members}</dd>
        <dt className="text-steel">Reputación</dt><dd className="num text-right">{gym.reputation.toFixed(0)}</dd>
        <dt className="text-steel">Máquinas / sucursales</dt><dd className="num text-right">nivel {gym.machineLevel} / {gym.branches}</dd>
      </dl>
      <p className="mt-2 text-sm"><span className="text-steel">Servicios: </span>{gym.services.length ? gym.services.join(', ') : 'ninguno'}</p>
      <p className="text-sm"><span className="text-steel">Colaboraciones: </span>{collabHeld.length ? collabHeld.join(', ') : 'ninguna'}</p>
    </article>
  );
}

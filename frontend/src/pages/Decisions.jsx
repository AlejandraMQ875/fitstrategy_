import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { bs } from '../util.js';

const Field = ({ id, label, hint, children }) => (
  <div><label className="label" htmlFor={id}>{label}</label>{children}{hint && <p className="text-xs text-steel mt-1">{hint}</p>}</div>
);

export default function Decisions({ gym, game, draft, setDraft, canEdit, onSubmitted }) {
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const hire = (k, v) => setDraft((d) => ({ ...d, hire: { ...d.hire, [k]: Number(v) } }));

  useEffect(() => {
    if (!canEdit) return;
    const id = setTimeout(() => api.post('/decision/preview', draft).then(setPreview).catch(() => {}), 400);
    return () => clearTimeout(id);
  }, [draft, canEdit]);

  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post(`/decision/${game.round.id}`, draft);
      setMsg({ ok: true, text: 'Decisión enviada. Puedes actualizarla hasta que el administrador procese la ronda.', notes: r.notes });
      onSubmitted?.();
    } catch (e) { setMsg({ ok: false, text: e.message, notes: e.data?.errors }); }
    finally { setBusy(false); }
  };

  const num = (id, key, props = {}) => (
    <input id={id} type="number" className="input num" value={draft[key]} disabled={!canEdit} onChange={(e) => set({ [key]: Number(e.target.value) })} {...props} />
  );

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <section className="card space-y-4">
          <h2 className="text-2xl font-bold">Precio y marketing</h2>
          <Field id="price" label={`Mensualidad: ${bs(draft.price)}`} hint="Entre Bs 100 y Bs 600. Los jóvenes son muy sensibles al precio.">
            <input id="price" type="range" min="100" max="600" step="5" className="w-full" value={draft.price} disabled={!canEdit} onChange={(e) => set({ price: Number(e.target.value) })} />
          </Field>
          <Field id="ad" label="Publicidad (Bs 0 – 50.000)" hint="Atrae socios nuevos, pero baja un poco la retención.">{num('ad', 'advertising', { min: 0, max: 50000, step: 1000 })}</Field>
        </section>

        <section className="card space-y-4">
          <h2 className="text-2xl font-bold">Infraestructura</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field id="mach" label={`Mejora de máquinas (Bs 20.000 por nivel)`} hint={`Nivel actual ${gym.machineLevel}/10`}>
              <select id="mach" className="input" value={draft.machineUpgrade} disabled={!canEdit} onChange={(e) => set({ machineUpgrade: Number(e.target.value) })}>
                <option value={0}>Sin cambios</option><option value={1}>+1 nivel</option><option value={2}>+2 niveles</option>
              </select>
            </Field>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={draft.spaceUpgrade} disabled={!canEdit || gym.spaceLevel >= 5} onChange={(e) => set({ spaceUpgrade: e.target.checked })} />
              <span>Ampliar espacio (Bs 150.000)<br /><span className="text-steel">Nivel {gym.spaceLevel}/5</span></span></label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={draft.lockerUpgrade} disabled={!canEdit || gym.lockerLevel >= 5} onChange={(e) => set({ lockerUpgrade: e.target.checked })} />
              <span>Remodelar vestidores (Bs 40.000)<br /><span className="text-steel">Nivel {gym.lockerLevel}/5</span></span></label>
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={draft.openBranch} disabled={!canEdit} onChange={(e) => set({ openBranch: e.target.checked })} />
            <span>Abrir sucursal (Bs 300.000)<br /><span className="text-steel">Requiere reputación ≥ 75 y caja ≥ Bs 400.000. Sucursales: {gym.branches}</span></span></label>
        </section>

        <section className="card space-y-4">
          <h2 className="text-2xl font-bold">Personal</h2>
          <p className="text-sm text-steel">Suma o resta personas (negativo para despedir). Hoy: {gym.instructors} instructores, {gym.specialists} especialistas, {gym.receptionists} recepcionistas, {gym.cleaners} limpieza.</p>
          <div className="grid sm:grid-cols-4 gap-4">
            {[['instructors', 'Instructores (Bs 4.000)'], ['specialists', 'Especialistas (Bs 6.000)'], ['receptionists', 'Recepción (Bs 2.500)'], ['cleaners', 'Limpieza (Bs 2.000)']].map(([k, l]) => (
              <Field key={k} id={`h-${k}`} label={l}><input id={`h-${k}`} type="number" className="input num" value={draft.hire[k]} disabled={!canEdit} onChange={(e) => hire(k, e.target.value)} /></Field>
            ))}
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="text-2xl font-bold">Financiamiento</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="loan" label="Préstamo (interés 3% por ronda)" hint={`Disponible hasta ${bs(gym.maxLoan)}`}>{num('loan', 'loan', { min: 0, max: gym.maxLoan, step: 5000 })}</Field>
            <Field id="repay" label="Pago de deuda" hint={`Deuda actual ${bs(gym.debt)}`}>{num('repay', 'repay', { min: 0, max: gym.debt, step: 5000 })}</Field>
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 self-start">
        <section className="card">
          <h2 className="text-2xl font-bold mb-2">Vista previa</h2>
          {preview ? (
            <dl className="text-sm space-y-1">
              {[['Inversión de esta ronda', preview.capex], ['Personal (mensual)', preview.staff], ['Servicios activos', preview.servicesRun], ['Pujas ofertadas', preview.bidsCost], ['Publicidad', preview.advertising], ['Costos fijos estimados', preview.estimatedFixed], ['Caja tras inversiones', preview.cashAfterInvestments]].map(([l, v]) => (
                <div key={l} className="flex justify-between"><dt className="text-steel">{l}</dt><dd className={`num ${l.startsWith('Caja') && v < 0 ? 'text-red-600 font-semibold' : ''}`}>{bs(v)}</dd></div>
              ))}
              <div className="flex justify-between"><dt className="text-steel">Capacidad de socios</dt><dd className="num">{Math.round(preview.capacityMembers)}</dd></div>
              {preview.cashAfterInvestments < 0 && <p className="text-red-600 pt-2">Caja negativa: se activará crédito de emergencia y perderás 5 de reputación.</p>}
            </dl>
          ) : <p className="text-sm text-steel">{canEdit ? 'Calculando…' : 'Disponible cuando la ronda esté abierta.'}</p>}
        </section>
        <button className="btn btn-primary w-full" disabled={!canEdit || busy} onClick={submit}>{game?.submitted ? 'Actualizar decisión' : 'Enviar decisión'}</button>
        {msg && (
          <div role="status" className={`text-sm rounded-md p-3 ${msg.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
            <p>{msg.text}</p>
            {msg.notes?.length > 0 && <ul className="list-disc pl-5 mt-1">{msg.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
          </div>
        )}
        <p className="text-xs text-steel">Servicios en la decisión: {draft.services.length || 'ninguno'} · Pujas: {draft.bids.length || 'ninguna'}</p>
      </aside>
    </div>
  );
}

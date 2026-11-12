import React, { useState } from 'react';
import { useGame } from '../GameContext.jsx';

export default function Login() {
  const { login } = useGame();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(username.trim().toLowerCase(), password); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      <section className="bg-ink text-chalk p-8 md:p-14 flex flex-col justify-end">
        <h1 className="font-display text-6xl md:text-8xl font-bold leading-none">FITSTRATEGY</h1>
        <p className="mt-6 text-xl max-w-md text-chalk/80">No gana el que más socios tiene, sino el que forja un negocio que perdura.</p>
        <p className="mt-10 text-sm text-chalk/60">Seis rondas, siete gimnasios, un ranking FIGE.</p>
      </section>
      <section className="p-8 md:p-14 flex items-center">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="text-3xl font-bold">Ingresar</h2>
          <div>
            <label className="label" htmlFor="u">Usuario</label>
            <input id="u" className="input" value={username} onChange={(e) => setU(e.target.value)} autoComplete="username" required />
          </div>
          <div>
            <label className="label" htmlFor="p">Contraseña</label>
            <input id="p" type="password" className="input" value={password} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required />
          </div>
          {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </section>
    </main>
  );
}

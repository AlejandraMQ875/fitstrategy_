import React, { useEffect, useState } from 'react';

export default function Countdown({ endsAt, className = '' }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(endsAt) - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!endsAt) return null;
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0');
  return <span className={`num font-display text-3xl ${left === 0 ? 'text-red-600' : ''} ${className}`} role="timer">{mm}:{ss}</span>;
}

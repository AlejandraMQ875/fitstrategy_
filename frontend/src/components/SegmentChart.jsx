import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SEGMENT_NAMES } from '../util.js';

export default function SegmentChart({ demand }) {
  const data = Object.entries(demand || {}).map(([k, v]) => ({ segmento: SEGMENT_NAMES[k], demanda: Math.round(v) }));
  return (
    <div className="h-56" aria-label="Demanda por segmento">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D9DED6" />
          <XAxis dataKey="segmento" /><YAxis /><Tooltip />
          <Bar dataKey="demanda" fill="#2F6BFF" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

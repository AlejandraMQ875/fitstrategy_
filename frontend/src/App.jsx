import React from 'react';
import { useGame } from './GameContext.jsx';
import Login from './pages/Login.jsx';
import GymDashboard from './pages/GymDashboard.jsx';
import AdminPanel from './pages/AdminPanel.jsx';

export default function App() {
  const { session } = useGame();
  if (!session) return <Login />;
  return session.user.role === 'admin' ? <AdminPanel /> : <GymDashboard />;
}

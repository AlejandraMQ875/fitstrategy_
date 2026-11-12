export const GYMS = [
  { name: 'Body Xtreme', color: '#E4572E', username: 'bodyxtreme' },
  { name: 'Spazio', color: '#2E86AB', username: 'spazio' },
  { name: 'Energym', color: '#F2B705', username: 'energym' },
  { name: 'UFC Gym', color: '#B3202A', username: 'ufcgym' },
  { name: 'Smash Fitness', color: '#7B4FD1', username: 'smash' },
  { name: 'Essential Gym', color: '#2A9D8F', username: 'essential' },
  { name: 'Megatlon', color: '#F77F00', username: 'megatlon' }
];

export const SEGMENTS = [
  { key: 'jovenes', name: 'Jóvenes', share: 0.35, weights: { price: 1.8, services: 0.8, machines: 0.5, reputation: 0.6, location: 0.7, collab: 0.9 } },
  { key: 'adultos', name: 'Adultos', share: 0.25, weights: { price: 0.8, services: 1.6, machines: 0.6, reputation: 0.8, location: 1.2, collab: 0.7 } },
  { key: 'atletas', name: 'Atletas', share: 0.25, weights: { price: 0.6, services: 0.5, machines: 1.8, reputation: 0.9, location: 0.6, collab: 1.3 } },
  { key: 'corporativos', name: 'Corporativos', share: 0.15, weights: { price: 1.0, services: 0.6, machines: 0.4, reputation: 0.7, location: 1.5, collab: 0.5 } }
];

// requirement: space | machines | lockers (niveles mínimos)
export const SERVICES = [
  { key: 'spinning', name: 'Spinning', costImpl: 60000, costPerRound: 8000, requirement: { space: 2 }, effect: { jovenes: 0.15, atletas: 0.10 } },
  { key: 'aerobicos', name: 'Aeróbicos', costImpl: 50000, costPerRound: 7000, requirement: { space: 2 }, effect: { adultos: 0.20, jovenes: 0.10 } },
  { key: 'yoga', name: 'Yoga', costImpl: 45000, costPerRound: 6000, requirement: { space: 2 }, effect: { adultos: 0.15 } },
  { key: 'crossfit', name: 'CrossFit', costImpl: 80000, costPerRound: 10000, requirement: { machines: 6 }, effect: { atletas: 0.20, jovenes: 0.10 } },
  { key: 'sauna', name: 'Sauna', costImpl: 120000, costPerRound: 12000, requirement: { lockers: 2 }, effect: { adultos: 0.25 } },
  { key: 'spa', name: 'Spa', costImpl: 200000, costPerRound: 18000, requirement: { lockers: 3 }, effect: { adultos: 0.30 } },
  { key: 'nutricionista', name: 'Nutricionista', costImpl: 70000, costPerRound: 10000, requirement: {}, effect: { atletas: 0.20, adultos: 0.10 } }
];

// effect: porcentajes por segmento + satisfaction / reputation (puntos)
export const COLLABS = [
  { key: 'tigo', name: 'Tigo', sector: 'Telecomunicaciones', category: 'A', cost: 8000, duration: 2, effect: { jovenes: 0.15, satisfaction: 5 } },
  { key: 'farmacorp', name: 'Farmacorp', sector: 'Farmacia', category: 'A', cost: 6000, duration: 1, effect: { adultos: 0.10, satisfaction: 5 } },
  { key: 'pil', name: 'Pil Andina', sector: 'Lácteos', category: 'A', cost: 5000, duration: 1, effect: { atletas: 0.10, satisfaction: 5 } },
  { key: 'mercantil', name: 'Banco Mercantil Santa Cruz', sector: 'Banca', category: 'A', cost: 12000, duration: 2, effect: { corporativos: 0.20 } },
  { key: 'umsa', name: 'UMSA', sector: 'Universidad', category: 'A', cost: 5000, duration: 2, effect: { jovenes: 0.20 } },
  { key: 'emi', name: 'Escuela Militar de Ingeniería (EMI)', sector: 'Universidad', category: 'A', cost: 5000, duration: 2, effect: { jovenes: 0.15, atletas: 0.10 } },
  { key: 'bolivar', name: 'Club Bolívar', sector: 'Fútbol', category: 'A', cost: 15000, duration: 1, effect: { atletas: 0.25, reputation: 10 } },
  { key: 'ucb', name: 'Universidad Católica', sector: 'Universidad', category: 'A', cost: 5000, duration: 2, effect: { jovenes: 0.15, adultos: 0.05 } },
  { key: 'cinecenter', name: 'Cine Center', sector: 'Entretenimiento', category: 'A', cost: 7000, duration: 1, effect: { jovenes: 0.15, satisfaction: 5 } },
  { key: 'olivos', name: 'Clínica Los Olivos', sector: 'Salud', category: 'A', cost: 10000, duration: 2, effect: { adultos: 0.15, atletas: 0.10 } },
  { key: 'nike', name: 'Nike', sector: 'Marca deportiva', category: 'B', cost: 20000, duration: 2, effect: { atletas: 0.20, reputation: 15, satisfaction: 5 } },
  { key: 'adidas', name: 'Adidas', sector: 'Marca deportiva', category: 'B', cost: 18000, duration: 2, effect: { atletas: 0.15, jovenes: 0.10, reputation: 10 } },
  { key: 'marathon', name: 'Marathon', sector: 'Marca deportiva', category: 'B', cost: 12000, duration: 1, effect: { jovenes: 0.15, adultos: 0.10, satisfaction: 5 } },
  { key: 'puma', name: 'Puma', sector: 'Marca deportiva', category: 'B', cost: 15000, duration: 1, effect: { jovenes: 0.15, atletas: 0.10 } }
];

// Pares de convenios que compiten directamente (no pueden convivir en un mismo gimnasio)
export const CONFLICTS = [['umsa', 'emi'], ['umsa', 'ucb'], ['emi', 'ucb'], ['farmacorp', 'olivos']];

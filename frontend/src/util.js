export const bs = (n) => `Bs ${Math.round(n ?? 0).toLocaleString('es-BO')}`;
export const pct = (n, d = 0) => `${(n * 100).toFixed(d)}%`;
export const SEGMENT_NAMES = { jovenes: 'Jóvenes', adultos: 'Adultos', atletas: 'Atletas', corporativos: 'Corporativos' };
export const REQ_LABEL = { space: 'Espacio', machines: 'Máquinas', lockers: 'Vestidores' };
export const emptyDraft = (price = 190) => ({
  price, machineUpgrade: 0, spaceUpgrade: false, lockerUpgrade: false, services: [],
  hire: { instructors: 0, specialists: 0, receptionists: 0, cleaners: 0 },
  advertising: 0, loan: 0, repay: 0, openBranch: false, bids: []
});
export const effectText = (e) =>
  Object.entries(e).map(([k, v]) => k === 'satisfaction' ? `satisfacción +${v}` : k === 'reputation' ? `reputación +${v}` : `${SEGMENT_NAMES[k]} +${Math.round(v * 100)}%`).join(' · ');

// Parámetros del juego. Todo lo "calibrable" vive aquí.
export const CONFIG = {
  ROUNDS: 6,
  START: {
    cash: 800000, debt: 0, members: 200, reputation: 70, satisfaction: 70, retention: 0.7,
    price: 190, machineLevel: 5, instructors: 2, specialists: 0, receptionists: 1, cleaners: 1,
    lockerLevel: 1, spaceLevel: 1, branches: 1, zone: 'Zona Sur'
  },
  SEASON: [
    { n: 1, month: 'Enero', factor: 0.4 },
    { n: 2, month: 'Febrero', factor: 0.2 },
    { n: 3, month: 'Marzo', factor: 0 },
    { n: 4, month: 'Abril', factor: 0 },
    { n: 5, month: 'Mayo', factor: 0.15 },
    { n: 6, month: 'Junio', factor: -0.2 }
  ],
  // Decisiones
  PRICE_MIN: 100, PRICE_MAX: 600, PRICE_REF: 190,
  MACHINE_COST: 20000, MACHINE_MAX_PER_ROUND: 2, MACHINE_MAX_LEVEL: 10,
  SPACE_COST: 150000, SPACE_MAX_LEVEL: 5,
  LOCKER_COST: 40000, LOCKER_MAX_LEVEL: 5,
  AD_MAX: 50000,
  BRANCH_COST: 300000, BRANCH_MIN_REP: 75, BRANCH_MIN_CASH: 400000, BRANCH_MAX: 3,
  LOAN_MULT: 1.2, INTEREST: 0.03,
  SALARY: { instructors: 4000, specialists: 6000, receptionists: 2500, cleaners: 2000 },
  STAFF_MIN: { instructors: 1, specialists: 0, receptionists: 1, cleaners: 1 },
  STAFF_MAX: 12,
  MAX_CONV_A: 2, MAX_CONV_B: 1,
  // Capacidad (personas/hora por nivel o por persona)
  CAP_MACHINE_PER_LEVEL: 8, CAP_INSTRUCTOR: 20, CAP_SPECIALIST: 25,
  CAP_LOCKER_PER_LEVEL: 30, CAP_SPACE_PER_LEVEL: 50,
  MEMBERS_PER_CAP_UNIT: 10,          // socios que soporta cada unidad de capacidad/hora
  SERVICE_CAP_DRAG: 0.02,            // cada servicio activo consume 2% de capacidad
  BRANCH_CAP_BONUS: 0.7, BRANCH_LOC_BONUS: 0.15,
  // Demanda
  POPULATION: 4000,
  NO_GO_UTILITY: Math.log(13),       // utilidad de "no ir a ningún gimnasio"
  REF: { services: 0, machines: 0.5, reputation: 0.7, location: 0.5, collab: 0 },
  CAPTURE_RATE: 0.8,                 // fracción de la brecha de demanda que se convierte en socios nuevos
  AD_DEMAND_BOOST: 0.25,
  SEGMENT_BONUS_CAP: 1.6,
  // Finanzas
  RENT: 15000, MAINT_BASE: 5000, MAINT_RATE: 0.01, DEPRECIATION: 0.025,
  ENERGY_PER_100_VISITS: 300, VISITS_PER_MEMBER: 8,
  SUPPLY_PER_PREMIUM_USER: 200,
  DAY_PASS_RATE: 0.3, DAY_PASS_PRICE: 35,
  SAUNA_USE: 0.15, SAUNA_FEE: 300, SPA_USE: 0.10, SPA_FEE: 450,
  CONVENIO_INCOME_RATE: 0.4,         // ingreso fijo por convenio = 40% del costo base
  // Satisfacción
  SAT_PER_SERVICE: 2.5,
  RECEP_PER_MEMBERS: 300, CLEAN_PER_MEMBERS: 250, STAFF_SHORT_PENALTY: 4,
  EMERGENCY_REP_PENALTY: 5,
  FIGE_W: { profit: 0.3, market: 0.25, satisfaction: 0.2, retention: 0.15, innovation: 0.1 }
};

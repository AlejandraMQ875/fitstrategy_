import { CONFIG } from '../config.js';
import { SERVICES } from '../catalog.js';

/**
 * Estado de resultados de una ronda.
 * EBITDA = Ingresos - CostosVariables - CostosFijos
 * UtilidadNeta = EBITDA - Depreciación(2.5% máquinas) - Intereses(3% deuda)
 * Caja final = Caja inicial + UtilidadNeta - Inversiones + Préstamos - PagoDeuda
 */
export function computeFinance({ g, members, price, advertising, activeCollabs, capex, loan, repay, cashStart, debtAfter, roundNumber }) {
  const C = CONFIG;
  const has = (k) => g.services.includes(k);
  const visits = members * C.VISITS_PER_MEMBER;
  const dayPasses = Math.round(members * C.DAY_PASS_RATE);
  const saunaUsers = has('sauna') ? Math.round(members * C.SAUNA_USE) : 0;
  const spaUsers = has('spa') ? Math.round(members * C.SPA_USE) : 0;

  const revenue = {
    memberships: members * price,
    dayPasses: dayPasses * C.DAY_PASS_PRICE,
    premium: saunaUsers * C.SAUNA_FEE + spaUsers * C.SPA_FEE,
    convenios: activeCollabs.reduce((s, a) => s + a.collab.cost * C.CONVENIO_INCOME_RATE * a.holder.factor, 0)
  };
  const totalRevenue = Object.values(revenue).reduce((a, b) => a + b, 0);

  const machineValue = g.machineLevel * C.MACHINE_COST;
  const fixed = {
    rent: C.RENT * g.branches,
    staff: Object.keys(C.SALARY).reduce((s, k) => s + g[k] * C.SALARY[k], 0),
    maintenance: C.MAINT_BASE + C.MAINT_RATE * machineValue,
    services: g.services.reduce((s, k) => s + SERVICES.find((x) => x.key === k).costPerRound, 0),
    collaborations: activeCollabs.reduce((s, a) => s + a.holder.amount, 0),
    advertising
  };
  const variable = {
    energy: (visits + dayPasses) / 100 * C.ENERGY_PER_100_VISITS,
    supplies: (saunaUsers + spaUsers) * C.SUPPLY_PER_PREMIUM_USER
  };
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const fixedTotal = sum(fixed), variableTotal = sum(variable);
  const ebitda = totalRevenue - variableTotal - fixedTotal;
  const depreciation = C.DEPRECIATION * machineValue;
  const interest = C.INTEREST * debtAfter;
  const netIncome = ebitda - depreciation - interest;
  const cashEndRaw = cashStart + netIncome - capex + loan - repay;
  return {
    revenue, totalRevenue, fixed, fixedTotal, variable, variableTotal,
    ebitda, depreciation, interest, netIncome, capex, loan, repay, cashEndRaw,
    visits, dayPasses, saunaUsers, spaUsers
  };
}

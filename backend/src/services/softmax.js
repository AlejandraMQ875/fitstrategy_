import { CONFIG } from '../config.js';

/**
 * Probabilidad de elección por segmento (modelo logit multinomial con opción "no ir").
 * A_i,s = b1*(190-P_i)/190 + b2*(S_i-S0) + b3*(M_i-M0) + b4*(R_i-R0) + b5*(U_i-U0) + b6*(C_i-C0)
 * P_i,s = exp(A_i,s) / (sum_j exp(A_j,s) + exp(A_no_ir))
 * Los atributos se miden respecto al estado inicial (REF) para que todos arranquen con A=0.
 */
export function utility(attrs, w) {
  const R = CONFIG.REF;
  return (
    w.price * (CONFIG.PRICE_REF - attrs.price) / CONFIG.PRICE_REF +
    w.services * (attrs.services - R.services) +
    w.machines * (attrs.machines - R.machines) +
    w.reputation * (attrs.reputation - R.reputation) +
    w.location * (attrs.location - R.location) +
    w.collab * (attrs.collab - R.collab)
  );
}

export function segmentProbabilities(attrList, weights, noGo = CONFIG.NO_GO_UTILITY) {
  const exps = attrList.map((a) => Math.exp(utility(a, weights)));
  const denom = exps.reduce((s, v) => s + v, 0) + Math.exp(noGo);
  return exps.map((e) => e / denom);
}

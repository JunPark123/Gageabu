// Example thresholds, not a confirmed product rule. Percent means budget USED.
export const DEFAULT_THRESHOLDS = Object.freeze({ concernedAt: 60, cryingAt: 90 });

export function budgetPercent(spent, budget) {
  if (!Number.isFinite(spent) || !Number.isFinite(budget) || spent < 0 || budget <= 0) return null;
  const percent = (spent / budget) * 100;
  return Number.isFinite(percent) ? percent : null;
}

export function budgetView(percent, thresholds = DEFAULT_THRESHOLDS) {
  const { concernedAt, cryingAt } = thresholds;
  if (!Number.isFinite(concernedAt) || !Number.isFinite(cryingAt) ||
      concernedAt < 0 || concernedAt >= cryingAt) {
    throw new RangeError('Thresholds must satisfy 0 <= concernedAt < cryingAt.');
  }
  if (!Number.isFinite(percent) || percent < 0) {
    return { raw: null, position: 0, state: null };
  }
  return {
    raw: percent,
    position: Math.min(100, percent),
    state: percent >= cryingAt ? 'crying' : percent >= concernedAt ? 'concerned' : 'happy',
  };
}

export const ACCT_DEFAULT_PARAMETERS = Object.freeze({
  alpha: 0.08,
  beta: 0.45,
  gamma: 0.47,
});

export const ACCT_PARAMETER_RANGES = Object.freeze({
  alpha: Object.freeze({ min: 0, max: 1, step: 0.01 }),
  beta: Object.freeze({ min: 0, max: 1, step: 0.01 }),
  gamma: Object.freeze({ min: 0, max: 1, step: 0.01 }),
});

export function getRangePercent(value, range) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "0%";
  const ratio = (numericValue - range.min) / (range.max - range.min);
  return `${(Math.max(0, Math.min(1, ratio)) * 100).toFixed(2)}%`;
}


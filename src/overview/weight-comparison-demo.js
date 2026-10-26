export function createDemoWeightStrategies(seed = 1) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const strategies = [];

  // Stratified random samples keep all twelve demo points separate in the chart.
  for (const [alphaCenter, count] of [[12, 4], [32, 4], [52, 3], [74, 1]]) {
    for (let index = 0; index < count; index += 1) {
      const alpha = alphaCenter + Math.floor(random() * 5) - 2;
      const remaining = 100 - alpha;
      const betaCenter = count === 1 ? remaining / 2 : 10 + (remaining - 20) * index / (count - 1);
      const beta = Math.round(betaCenter) + Math.floor(random() * 5) - 2;
      strategies.push(Object.freeze({
        id: `S${strategies.length + 1}`,
        alpha: alpha / 100,
        beta: beta / 100,
        gamma: (remaining - beta) / 100,
        accuracy: Math.round((84 + random() * 11) * 100) / 100,
        simulated: true,
      }));
    }
  }
  return Object.freeze(strategies);
}

export const DEMO_WEIGHT_STRATEGIES = createDemoWeightStrategies();

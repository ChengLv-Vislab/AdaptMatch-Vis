import { ACCT_DEFAULT_PARAMETERS } from "./acct-config.js";

let statistics = null;
const statisticsPromises = new Map();

export function fetchACCTStatistics(dataPath) {
  if (!statisticsPromises.has(dataPath)) {
    const promise = fetch(`${dataPath}/acct_class_statistics.json`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load ACCT statistics: ${response.status}`);
        }
        return response.json();
      })
      .catch((error) => {
        statisticsPromises.delete(dataPath);
        throw error;
      });
    statisticsPromises.set(dataPath, promise);
  }
  return statisticsPromises.get(dataPath);
}

export function activateACCTStatistics(data) {
  statistics = data;
}

export async function loadACCTStatistics(dataPath) {
  const data = await fetchACCTStatistics(dataPath);
  activateACCTStatistics(data);
  return data;
}

export function getACCTModelWeights(modelName) {
  const weights = statistics?.models?.[modelName]?.weights;
  const values = ["alpha", "beta", "gamma"].map((key) => Number(weights?.[key]));
  const sum = values.reduce((total, value) => total + value, 0);
  if (values.some((value) => !Number.isFinite(value) || value < 0) || Math.abs(sum - 1) > 1e-5) {
    return { ...ACCT_DEFAULT_PARAMETERS };
  }
  return { alpha: values[0] / sum, beta: values[1] / sum, gamma: values[2] / sum };
}

export function getACCTClassStatistics(modelName, classIndex) {
  const modelStatistics = statistics?.models?.[modelName];
  const readValue = (key) => modelStatistics?.[key]?.[classIndex] == null
    ? NaN : Number(modelStatistics[key][classIndex]);

  return {
    S_c: readValue("S_c"),
    U_c: readValue("U_c"),
    B_c: readValue("B_c"),
    sampleCount: Number(modelStatistics?.candidate_count?.[classIndex]),
  };
}

export function getACCTThresholdComponents(data, weights) {
  return [
    {
      key: "confidence",
      name: "α·S",
      sub: "c",
      value: weights.alpha * data.S_c,
      detail: `α = ${weights.alpha}; S_c = ${data.S_c} (mean predicted confidence); N_c = ${data.sampleCount}`,
    },
    {
      key: "uncertainty",
      name: "β·U",
      sub: "c",
      value: weights.beta * data.U_c,
      detail: `β = ${weights.beta}; U_c = ${data.U_c} (mean normalized entropy); N_c = ${data.sampleCount}`,
    },
    {
      key: "balance",
      name: "γ·B",
      sub: "c",
      value: weights.gamma * data.B_c,
      detail: `γ = ${weights.gamma}; B_c = ${data.B_c} (class candidate count / maximum class count); N_c = ${data.sampleCount}`,
    },
  ].map((component) => ({ ...component, rawValue: component.value }));
}

export function parseAccuracyData(csvText) {
  return csvText.trim().split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
    const values = line.split(',').map(Number);
    if (values.length !== 12 || values.some((value) => !Number.isFinite(value))) {
      throw new Error('Invalid accuracy CSV row');
    }
    return { epoch: values[0], accuracy: values[1] / 100, classAccuracies: values.slice(2).map((value) => value / 100) };
  });
}

export async function fetchAccuracyData(dataPath) {
  const response = await fetch(`${dataPath}/accuracy_results.csv`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load accuracy data: HTTP ${response.status}`);
  return parseAccuracyData(await response.text());
}


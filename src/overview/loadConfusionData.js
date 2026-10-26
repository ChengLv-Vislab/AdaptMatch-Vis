export function parseConfusionData(csvText, numClasses = 10) {
  return csvText.trim().split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
    const values = line.split(',').map(Number);
    if (values.length !== 1 + numClasses * numClasses || values.some((value) => !Number.isInteger(value))) {
      throw new Error('Invalid confusion CSV row');
    }
    return { epoch: values[0], matrix: Array.from({ length: numClasses }, (_, row) =>
      values.slice(1 + row * numClasses, 1 + (row + 1) * numClasses)) };
  });
}

export async function fetchConfusionData(dataPath) {
  const response = await fetch(`${dataPath}/confusion_matrices.csv`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load confusion data: HTTP ${response.status}`);
  return parseConfusionData(await response.text());
}


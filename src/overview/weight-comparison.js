export const WEIGHT_AXES = ["alpha", "beta", "gamma"];

// One ranking rule for both the default run and the comparison view. Ties use
// numeric configuration IDs, never test accuracy or the old recommended flag.
export function rankWeightConfigurations(configurations) {
  return configurations.filter((configuration) => configuration.simulated === false
    && Number.isFinite(configuration.accuracy) && configuration.accuracy >= 0
    && configuration.accuracy <= 100)
    .sort((a, b) => b.accuracy - a.accuracy
      || a.id.localeCompare(b.id, 'en', { numeric: true }));
}

export const ACCURACY_PURPLE_PALETTE = [
  "#f5f2f9",
  "#e8e2f1",
  "#d5cbe6",
  "#b6a6d3",
  "#917cbd",
];

function hexToRgb(hex) {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}

function rgbToHex(channels) {
  return "#" + channels.map((channel) =>
    Math.round(channel).toString(16).padStart(2, "0")).join("");
}

export function accuracyColorStyle(accuracy, minimum, maximum) {
  const ratio = Number.isFinite(accuracy) && maximum > minimum
    ? Math.max(0, Math.min(1, (accuracy - minimum) / (maximum - minimum)))
    : 0.5;
  const position = ratio * (ACCURACY_PURPLE_PALETTE.length - 1);
  const index = Math.min(ACCURACY_PURPLE_PALETTE.length - 2, Math.floor(position));
  const fraction = position - index;
  const start = hexToRgb(ACCURACY_PURPLE_PALETTE[index]);
  const end = hexToRgb(ACCURACY_PURPLE_PALETTE[index + 1]);
  const channels = start.map((value, axis) => value + (end[axis] - value) * fraction);
  const fill = rgbToHex(channels);
  return {
    fill,
    stroke: rgbToHex(channels.map((value, axis) =>
      value * 0.72 + [64, 36, 87][axis] * 0.28)),
    // Labels sit outside the colored markers, on the white plot background.
    label: "#000000",
  };
}

export function prepareWeightStrategies(strategies) {
  return strategies.reduce((result, strategy, index) => {
    if (strategy.simulated !== false) return result;
    const rawWeights = WEIGHT_AXES.map((key) =>
      strategy[key] == null ? NaN : Number(strategy[key]));
    const sum = rawWeights.reduce((total, value) => total + value, 0);
    const accuracy = strategy.accuracy == null ? NaN : Number(strategy.accuracy);
    if (
      rawWeights.some((value) => !Number.isFinite(value) || value < 0) ||
      !Number.isFinite(sum) || sum <= 0 ||
      !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100
    ) return result;

    result.push({
      ...strategy,
      id: strategy.id || `S${index + 1}`,
      // Display numbering is stable in catalog order; model IDs remain intact.
      displayId: `Cfg-${result.length + 1}`,
      accuracy,
      rawWeights,
      weights: rawWeights.map((value) => value / sum),
    });
    return result;
  }, []);
}

export function projectSimplex(weights, vertices) {
  return {
    x: weights.reduce((total, value, axis) => total + value * vertices[axis].x, 0),
    y: weights.reduce((total, value, axis) => total + value * vertices[axis].y, 0),
  };
}

export function getWeightGuideCoordinates(weights, vertices) {
  const [alpha, beta, gamma] = weights;
  return {
    point: projectSimplex(weights, vertices),
    alpha: projectSimplex([alpha, 1 - alpha, 0], vertices),
    beta: projectSimplex([0, beta, 1 - beta], vertices),
    gamma: projectSimplex([1 - gamma, 0, gamma], vertices),
  };
}

export function accuracyRadius(accuracy, maximumRadius) {
  return maximumRadius * Math.sqrt(accuracy / 100);
}

export const TERNARY_ASPECT_RATIO = 1.7;
const ternaryTopInset = 26;
const ternaryBottomInset = 32;
const ternarySideInset = 52;
const ternaryExpansion = 12;

export function getWeightComparisonPanelWidth(plotHeight, rankings = []) {
  const triangleHeight = Math.max(12, plotHeight - ternaryTopInset - ternaryBottomInset);
  const triangleWidth = triangleHeight * TERNARY_ASPECT_RATIO;
  const radius = Math.min(19, triangleHeight * 2 / Math.sqrt(3) / 25);
  const rankingWidth = Math.max(146, ...rankings.map(box => box.width));
  const rankingBottom = Math.max(plotHeight < 340 ? 127 : 177,
    ...rankings.map(box => box.y + box.height));
  // Rankings occupy the two white corners, not the data region. At their
  // bottom edge, leave clearance for the sloping edge, markers and tick text.
  const cornerWidth = 2 * (rankingWidth + radius + 40)
    + TERNARY_ASPECT_RATIO * Math.max(0, rankingBottom - ternaryTopInset);
  return Math.max(triangleWidth + ternarySideInset * 2, cornerWidth) + 24;
}

export function getTernaryLayout(width, height) {
  const top = ternaryTopInset - ternaryExpansion;
  // Fit the largest triangle with one fixed aspect ratio. Neither a width
  // constraint nor a tall screen is allowed to stretch the simplex.
  const baseTriangleHeight = Math.min(height - ternaryTopInset - ternaryBottomInset,
    (width - ternarySideInset * 2) / TERNARY_ASPECT_RATIO);
  const triangleHeight = Math.max(12, baseTriangleHeight + ternaryExpansion);
  const triangleWidth = triangleHeight * TERNARY_ASPECT_RATIO;
  const vertices = [
    { x: width / 2, y: top },
    { x: (width - triangleWidth) / 2, y: top + triangleHeight },
    { x: (width + triangleWidth) / 2, y: top + triangleHeight },
  ];
  return {
    top, triangleHeight, triangleWidth, vertices,
    maximumRadius: Math.min(19, triangleWidth / 25,
      triangleHeight * 2 / Math.sqrt(3) / 25)
  };
}

export function fitConfigurationRadius(points, maximumRadius) {
  let fitted = maximumRadius;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      const factor = Math.sqrt(points[i].accuracy / 100) + Math.sqrt(points[j].accuracy / 100);
      // Identical coordinates cannot be separated without falsifying weights.
      // For distinct real points use one common radius scale, preserving areas.
      if (distance > 3 && factor > 0) fitted = Math.min(fitted, (distance - 3) / factor);
    }
  }
  return fitted;
}

export function getTernaryAnnotations(layout, width, rankings = []) {
  const { vertices, maximumRadius } = layout;
  const tickOffset = Math.max(12, maximumRadius + 6);
  const baseTickOffset = Math.max(18, maximumRadius + 8);
  const gammaTickOffset = 10;
  const gammaTickY = -2;
  const alphaPoint = projectSimplex([0.7, 0.3, 0], vertices);
  const betaPoint = projectSimplex([0, 0.7, 0.3], vertices);
  const gammaPoint = projectSimplex([0.7, 0, 0.3], vertices);
  const alpha = { x: alphaPoint.x - tickOffset - 4, y: alphaPoint.y + 5, anchor: 'end' };
  const beta = { x: betaPoint.x, y: betaPoint.y + baseTickOffset + 2, anchor: 'middle' };
  const gamma = { x: gammaPoint.x + gammaTickOffset + 3, y: gammaPoint.y + gammaTickY, anchor: 'start' };
  const obstacles = [...rankings];
  for (const ratio of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    const left = projectSimplex([ratio, 1 - ratio, 0], vertices);
    const base = projectSimplex([0, ratio, 1 - ratio], vertices);
    const right = projectSimplex([1 - ratio, 0, ratio], vertices);
    obstacles.push(
      { x: left.x - tickOffset - 24, y: left.y - 10, width: 24, height: 18 },
      { x: base.x - 12, y: base.y + baseTickOffset - 13, width: 24, height: 18 },
      { x: right.x + gammaTickOffset, y: right.y + gammaTickY - 14, width: 24, height: 18 });
  }
  for (const point of [alpha, beta, gamma]) {
    obstacles.push({
      x: point.x - (point.anchor === 'end' ? 14 : point.anchor === 'middle' ? 8 : 1),
      y: point.y - 17, width: 16, height: 21
    });
  }
  return { alpha, beta, gamma, tickOffset, baseTickOffset, gammaTickOffset, gammaTickY, obstacles };
}

const overlap = (a, b, gap = 2) => a.x < b.x + b.width + gap
  && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap
  && a.y + a.height + gap > b.y;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

// Keep the measured points in their exact barycentric positions. Only their
// black labels are displaced, with leaders, when configurations are close.
export function placeConfigurationLabels(points, width, height, obstacles = []) {
  const occupied = [...obstacles, ...points.map((point) => ({
    x: point.x - point.radius - 0.5, y: point.y - point.radius - 0.5,
    width: point.radius * 2 + 1, height: point.radius * 2 + 1,
  }))];
  const nearestBoxDistance = (point, box) => Math.hypot(
    point.x - clamp(point.x, box.x, box.x + box.width),
    point.y - clamp(point.y, box.y, box.y + box.height));
  const directions = [-90, 90, 0, 180, -45, -135, 45, 135,
  -75, -105, -60, -120, -30, -150, 30, 150, 60, 120, 75, 105, -15, 15, -165, 165];
  const candidateBox = (point, gap, angle) => {
    const labelWidth = point.displayId.length * 6.2 + 2;
    const labelHeight = 14;
    const radians = angle * Math.PI / 180;
    const dx = Math.cos(radians), dy = Math.sin(radians);
    return {
      x: clamp(point.x + dx * (point.radius + gap)
        + (Math.abs(dx) > 0.01 ? Math.sign(dx) * labelWidth / 2 : 0)
        - labelWidth / 2, 4, width - labelWidth - 4),
      y: clamp(point.y + dy * (point.radius + gap)
        + (Math.abs(dy) > 0.01 ? Math.sign(dy) * labelHeight / 2 : 0)
        - labelHeight / 2, 4, height - labelHeight - 4),
      width: labelWidth, height: labelHeight,
    };
  };
  const withLabel = (point, box) => {
    const leaderX = clamp(point.x, box.x, box.x + box.width);
    const leaderY = clamp(point.y, box.y, box.y + box.height);
    const distance = Math.hypot(leaderX - point.x, leaderY - point.y) || 1;
    return {
      ...point, label: {
        ...box,
        centerX: box.x + box.width / 2, centerY: box.y + box.height / 2,
        leaderX, leaderY,
        leaderStartX: point.x + (leaderX - point.x) * point.radius / distance,
        leaderStartY: point.y + (leaderY - point.y) * point.radius / distance,
      }
    };
  };
  // Reserve nearby slots for the tightest data clusters first, then break
  // ties by remaining annotation clearance. Restore catalog order afterwards.
  const order = points.map((point, index) => ({
    point, index,
    availableSlots: [3, 4, 6].flatMap(gap => directions.map(angle => candidateBox(point, gap, angle)))
      .filter(box => !occupied.some(other => overlap(box, other))).length,
    separation: Math.min(Infinity, ...points.filter(other => other !== point)
      .map(other => Math.hypot(other.x - point.x, other.y - point.y)))
  }))
    .sort((a, b) => a.separation - b.separation || a.availableSlots - b.availableSlots || a.index - b.index);
  const placed = [];
  for (const { point, index } of order) {
    // Match the 12px Arial label with a small safety margin, without reserving
    // excessive whitespace around a dense cluster of configurations.
    const labelWidth = point.displayId.length * 6.2 + 2;
    const labelHeight = 14;
    const candidates = [];
    for (const gap of [3, 4, 6, 8, 12, 18, 24, 32, 40, 52, 68, 84, 108, 140, 180]) {
      for (const angle of directions) {
        const candidate = candidateBox(point, gap, angle);
        if (!occupied.some((other) => overlap(candidate, other))) {
          candidates.push(candidate);
        }
      }
    }
    candidates.sort((a, b) => nearestBoxDistance(point, a) - nearestBoxDistance(point, b)
      || Math.hypot(a.x + labelWidth / 2 - point.x, a.y + labelHeight / 2 - point.y)
      - Math.hypot(b.x + labelWidth / 2 - point.x, b.y + labelHeight / 2 - point.y));
    let box = candidates[0];
    // A short view can have a nearby free slot between the sampled angles.
    // Search that local space before accepting a long cross-plot leader.
    if (!box || nearestBoxDistance(point, box) - point.radius > 4) {
      for (let y = Math.max(4, point.y - 64 - labelHeight / 2);
        y <= Math.min(height - labelHeight - 4, point.y + 64 - labelHeight / 2); y += 2) {
        for (let x = Math.max(4, point.x - 64 - labelWidth / 2);
          x <= Math.min(width - labelWidth - 4, point.x + 64 - labelWidth / 2); x += 2) {
          const candidate = { x, y, width: labelWidth, height: labelHeight };
          if ((!box || nearestBoxDistance(point, candidate) < nearestBoxDistance(point, box))
            && !occupied.some(other => overlap(candidate, other))) box = candidate;
        }
      }
    }
    // Search free plot space if a dense cluster has occupied the radial slots.
    if (!box) {
      const candidates = [];
      for (let y = 4; y + labelHeight <= height - 4; y += 4) {
        for (let x = 4; x + labelWidth <= width - 4; x += 4) {
          const candidate = { x, y, width: labelWidth, height: labelHeight };
          if (!occupied.some((other) => overlap(candidate, other))) candidates.push(candidate);
        }
      }
      candidates.sort((a, b) => Math.hypot(a.x + labelWidth / 2 - point.x, a.y + labelHeight / 2 - point.y)
        - Math.hypot(b.x + labelWidth / 2 - point.x, b.y + labelHeight / 2 - point.y));
      box = candidates[0];
    }
    if (!box) { placed[index] = { ...point, label: null }; continue; }
    occupied.push(box);
    placed[index] = withLabel(point, box);
  }
  return placed;
}

export function configurationTooltip(strategy) {
  const weights = strategy.rawWeights || strategy.weights;
  const items = [
    { label: 'Accuracy', value: `${strategy.accuracy.toFixed(2)}%` },
    { label: 'Best epoch', value: strategy.bestEpoch == null ? 'Not recorded' : String(strategy.bestEpoch) },
    { label: 'α · Confidence', value: weights[0].toFixed(2) },
    { label: 'β · Uncertainty', value: weights[1].toFixed(2) },
    { label: 'γ · Class balance', value: weights[2].toFixed(2) },
  ];
  if (strategy.recommended) items.push({ label: 'Recommended', value: 'Yes' });
  return { key: `configuration-${strategy.id}`, title: strategy.displayId, items };
}

export function positionComparisonTooltip(anchor, size, viewport) {
  const padding = 8;
  let x = anchor.x + 12;
  if (x + size.width > viewport.width - padding) x = anchor.x - size.width - 12;
  return {
    x: clamp(x, padding, Math.max(padding, viewport.width - size.width - padding)),
    y: clamp(anchor.y - 24, padding, Math.max(padding, viewport.height - size.height - padding)),
  };
}

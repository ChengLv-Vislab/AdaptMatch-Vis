// The liquid level is a fixed, linear 0–1 scale, never a per-node autoscale.
// Numeric labels retain the original value; only the visible fill is bounded.
export function liquidLevel(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;
}

export function liquidWavePath(value, radius, phase = 0) {
  const fraction = liquidLevel(value);
  if (fraction === null) return null;
  const level = radius * (1 - 2 * fraction);
  const amplitude = Math.min(radius * 0.075,
    radius * fraction * 0.36, radius * (1 - fraction) * 0.36);
  const points = Array.from({ length: 65 }, (_, index) => {
    const x = -radius + 2 * radius * index / 64;
    const y = level + amplitude * Math.sin(index / 64 * Math.PI * 2 + phase);
    return `${x.toFixed(3)},${y.toFixed(3)}`;
  });
  return `M${points.join(' L')} L${radius},${radius} L${-radius},${radius} Z`;
}

export function getACCTPanelWidth(svgWidth) {
  return Math.min(400, Math.max(260, svgWidth * 0.105));
}

export function getACCTChainLayout(width, height, controlsBottom = 196) {
  const designWidth = 380;
  const inset = 6;
  const radius = 33;
  const captionHeight = 44;
  const badgeHeight = 54;
  const minimumGap = 12;
  const bottomInset = 24;
  const top = Math.max(66, controlsBottom + 18);
  const availableHeight = Math.max(1, height - top - bottomInset);
  const rowHeight = radius * 2 + captionHeight;
  const minimumHeight = badgeHeight * 2 + rowHeight * 3 + minimumGap * 4;
  // Use the full remaining height for node positions, but scale every glyph
  // uniformly so liquid gauges remain circles, not vertically stretched ovals.
  const scale = Math.max(0.1, Math.min(1, (width - inset * 2) / designWidth,
    availableHeight / minimumHeight));
  const contentHeight = availableHeight / scale;
  const gap = (contentHeight - badgeHeight * 2 - rowHeight * 3) / 4;
  const firstRow = badgeHeight + gap + radius;
  const rows = [firstRow, firstRow + rowHeight + gap, firstRow + rowHeight * 2 + gap * 2];
  return {
    scale,
    left: inset + Math.max(0, (width - inset * 2 - designWidth * scale) / 2),
    top,
    // Move the threshold a little farther into the reserved output gap;
    // keep the summation and waterballs fixed so their spacing is preserved.
    threshold: { x: -12, y: rows[1], radius: 32 },
    sum: { x: 76, y: rows[1], radius: 24 },
    branchX: 38,
    resultX: 167,
    statisticX: 255,
    weightX: 343,
    radius,
    captionHeight,
    rows,
    adopt: { x: 134, y: badgeHeight / 2, width: 210, height: badgeHeight },
    discard: { x: 134, y: contentHeight - badgeHeight / 2, width: 210, height: badgeHeight },
  };
}

const formatValue = (value, digits = 3) => Number.isFinite(value) ? value.toFixed(digits) : '—';
const ink = '#243958';
// Input and decision branches share a screen-space width, even though only
// the branches are inside the responsive diagram's scaled SVG group.
const decisionLinkWidth = 2;
let graphSerial = 0;

function text(group, className, x, y, value, size, color = ink) {
  return group.append('text').attr('class', className)
    .attr('x', x).attr('y', y).attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle').attr('font-size', size)
    .attr('fill', color).text(value);
}

// Long cubic turns soften both changes of direction, like the model's
// feature links. Their vertical tangents join the unchanged clear lane;
// horizontal end tangents meet the output and destination without elbows.
function bezierDecisionRoute(start, end, laneX, startReach, endReach) {
  const direction = end.y >= start.y ? 1 : -1;
  const distance = Math.abs(end.y - start.y);
  const startTurn = Math.min(startReach, distance * 0.32);
  const endTurn = Math.min(endReach, distance * 0.32);
  const entryY = start.y + direction * startTurn;
  const exitY = end.y - direction * endTurn;
  const laneHeight = exitY - entryY;
  return `M${start.x},${start.y} C${laneX},${start.y} ${laneX},${entryY - direction * startTurn * 0.65} ${laneX},${entryY}`
    + ` C${laneX},${entryY + laneHeight / 3} ${laneX},${entryY + laneHeight * 2 / 3} ${laneX},${exitY}`
    + ` C${laneX},${end.y - direction * endTurn * 0.35} ${laneX},${end.y} ${end.x},${end.y}`;
}

function waterball(group, defs, graphId, options) {
  const { key, kind, x, y, radius, value, label, accessibleLabel } = options;
  const level = liquidLevel(value);
  const ball = group.append('g')
    .attr('class', `acct-waterball acct-${kind}-node`)
    .attr('transform', `translate(${x},${y})`)
    .attr('data-component', key).attr('data-value', Number.isFinite(value) ? value : '')
    .attr('data-fill-level', level === null ? '' : level)
    .attr('data-scale-min', 0).attr('data-scale-max', 1)
    .attr('role', 'img').attr('aria-label', `${accessibleLabel}: ${formatValue(value)}`);
  if (kind === 'component') {
    ball.attr('data-component-value', Number.isFinite(value) ? value : '')
      .attr('data-component-raw-value', Number.isFinite(value) ? value : '');
  }
  const innerRadius = radius - 3;
  const clipId = `${graphId}-${kind}-${key}`;
  // A fresh ID per redraw prevents clipping against a previous checkpoint.
  defs.append('clipPath').attr('id', clipId).attr('clipPathUnits', 'userSpaceOnUse')
    .append('circle').attr('r', innerRadius).attr('cx', 0).attr('cy', 0);
  ball.append('circle').attr('class', 'acct-waterball-outline')
    .attr('r', radius).attr('fill', 'white').attr('stroke', '#f4a900').attr('stroke-width', 1.15);
  if (level !== null) {
    const liquid = ball.append('g').attr('class', 'acct-liquid')
      .attr('clip-path', `url(#${clipId})`);
    liquid.append('path').attr('class', 'acct-liquid-back')
      .attr('d', liquidWavePath(value, innerRadius, Math.PI / 2))
      .attr('fill', '#fbd17c');
    liquid.append('path').attr('class', 'acct-liquid-front')
      .attr('d', liquidWavePath(value, innerRadius, -Math.PI / 2))
      .attr('fill', '#ffb414');
  }
  text(ball, 'acct-waterball-value', 0, radius+17,
    formatValue(value, kind === 'weight' ? 2 : 3), 22, '#141414');
  if (label) {
    text(ball, 'acct-waterball-label', 0, 2*radius + 18, label,
      kind === 'weight' ? 26 : 18, '#141414');
  }
  return ball;
}

export function drawACCTDecisionGraph(group, options) {
  const { width, height, data, weights, components, threshold, decision, origin,
    controlsBottom, titleX = 16 } = options;
  const layout = getACCTChainLayout(width, height, controlsBottom);
  const graphId = `acct-liquid-${++graphSerial}`;
  group.attr('data-acct-layout', 'liquid-decision-chain')
    .attr('data-weight-scale-min', 0).attr('data-weight-scale-max', 1)
    .attr('font-family', 'Arial, sans-serif');
  const defs = group.append('defs');
  const arrowId = `${graphId}-sum-arrow`;
  defs.append('marker').attr('id', arrowId).attr('viewBox', '0 -4 8 8')
    .attr('refX', 7).attr('refY', 0).attr('markerWidth', 5).attr('markerHeight', 5)
    .attr('orient', 'auto').append('path').attr('d', 'M0,-4L8,0L0,4Z').attr('fill', '#8b8b8b');

  // Leave room for the HTML Reset button at the far right of this header.
  const safeTitleX = Math.max(12, Math.min(titleX, width - 240));
  const titleSize = Math.min(22, (width - safeTitleX - 82) / 8.6);
  text(group, 'acct-title acct-chain-title', safeTitleX, 26, 'ACCT Adjustment', titleSize, '#000')
    .attr('text-anchor', 'start').attr('font-weight', 700)
    .attr('style', `--acct-title-font-size: ${titleSize}px`);

  const graph = group.append('g').attr('class', 'acct-chain-body')
    .attr('transform', `translate(${layout.left},${layout.top}) scale(${layout.scale})`);
  const { threshold: tau, sum, radius, resultX, statisticX, weightX } = layout;
  // Every connector stays behind every glyph and caption, even after redraws.
  const links = graph.append('g').attr('class', 'acct-chain-links').attr('aria-hidden', 'true');
  const nodes = graph.append('g').attr('class', 'acct-chain-nodes');

  // Connect the selected model output to this class's threshold, not to a
  // hard-coded probability or a statistic from another class/checkpoint.
  if (origin) {
    const target = {
      x: layout.left + (tau.x - tau.radius) * layout.scale,
      y: layout.top + tau.y * layout.scale
    };
    // Ease out horizontally from the selected output into its clear lane.
    // Keep that lane fixed beside the output labels as tau moves left, and
    // stop the final smooth turn at the threshold's left edge.
    const laneX = target.x - Math.max(12, 16 * layout.scale);
    group.insert('path', '.acct-chain-body').attr('class', 'curve-link curve-link-input')
      .attr('data-route', 'output-clearance')
      .attr('d', bezierDecisionRoute(origin, target, laneX, 64 * layout.scale, 56 * layout.scale))
      .attr('fill', 'none').attr('stroke', decision === 'KEEP' ? '#258146' : decision === 'DROP' ? '#c53243' : '#999')
      .attr('stroke-width', decisionLinkWidth).attr('vector-effect', 'non-scaling-stroke')
      .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
    group.append('circle').attr('class', 'acct-origin-node')
      .attr('cx', origin.x).attr('cy', origin.y).attr('r', 3)
      .attr('fill', decision === 'KEEP' ? '#258146' : decision === 'DROP' ? '#c53243' : '#999');
  }

  for (const [key, label, active, box, color] of [
    ['keep', 'Adopt', decision === 'KEEP', layout.adopt, '#008d3e'],
    ['drop', 'Discard', decision === 'DROP', layout.discard, '#b42332'],
  ]) {
    const offset = tau.radius * Math.SQRT1_2;
    const startX = tau.x + offset;
    const direction = key === 'keep' ? -1 : 1;
    const startY = tau.y + direction * offset;
    const spineX = layout.branchX;
    // Broad cubic corner transitions stay outside the threshold captions.
    // The middle lane remains to their right and to the left of Σ.
    links.append('path').attr('class', `curve-link curve-link-${key}`)
      .attr('data-active', active)
      .attr('d', bezierDecisionRoute({ x: startX, y: startY }, box, spineX, 56, 64))
      .attr('fill', 'none').attr('stroke', active ? color : '#8c9aaa')
      .attr('stroke-width', decisionLinkWidth).attr('vector-effect', 'non-scaling-stroke')
      .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
    const badge = nodes.append('g').attr('class', `acct-decision acct-decision-${key}`)
      .attr('data-active', active).attr('role', 'img')
      .attr('aria-label', `${label}: ${active ? 'selected' : 'not selected'}`);
    badge.append('rect').attr('x', box.x).attr('y', box.y - box.height / 2)
      .attr('width', box.width).attr('height', box.height).attr('rx', 6)
      .attr('fill', active ? (key === 'drop' ? '#fde6e8' : '#cce6b7') : '#edf0f3')
      .attr('fill-opacity', 1)
      .attr('stroke', active ? color : '#8c9aaa').attr('stroke-width', active ? 2.2 : 1.4);
    text(badge, 'acct-chain-decision-label', box.x + box.width / 2, box.y, label, 28,
      active ? color : '#6b7280').attr('font-weight', 700);
  }

  nodes.append('circle').attr('class', 'threshold-node')
    .attr('data-threshold-value', Number.isFinite(threshold) ? threshold : '')
    .attr('cx', tau.x).attr('cy', tau.y).attr('r', tau.radius)
    .attr('fill', '#ffdc60').attr('stroke', ink).attr('stroke-width', 1.8);
  text(nodes, 'acct-chain-threshold-value', tau.x, tau.y, formatValue(threshold), 22, '#111').attr('font-weight', 700);
  text(
    nodes,
    'acct-chain-threshold-symbol',
    tau.x,
    tau.y + tau.radius + 16,
    'τ',
    30,
    '#111'
  )
    .attr('font-weight', 700)
    .append('tspan')
    .attr('baseline-shift', '-20%')
    .attr('font-size', 21)
    .attr('font-weight', 700)
    .text('c');

  text(
    nodes,
    'acct-chain-threshold-label',
    tau.x,
    tau.y + tau.radius + 43,
    'Threshold',
    18,
    '#111'
  )
  .attr('font-weight', 600);

  links.append('line').attr('class', 'acct-sum-threshold-link')
    .attr('x1', tau.x + tau.radius).attr('x2', sum.x - sum.radius)
    .attr('y1', sum.y).attr('y2', sum.y).attr('stroke', '#8b8b8b')
    .attr('stroke-width', 1.5).attr('stroke-dasharray', '6,5');
  nodes.append('circle').attr('class', 'acct-sum-node')
    .attr('cx', sum.x).attr('cy', sum.y).attr('r', sum.radius)
    .attr('fill', 'white').attr('stroke', ink).attr('stroke-width', 1.6);
  text(nodes, 'acct-sum-symbol', sum.x, sum.y + 1, 'Σ', 32, '#111');

  const rows = [
    { key: 'confidence', statistic: data.S_c, label: 'Confidence', weight: weights.alpha, symbol: 'α', factor: 'S_c' },
    { key: 'uncertainty', statistic: data.U_c, label: 'Uncertainty', weight: weights.beta, symbol: 'β', factor: 'U_c' },
    { key: 'balance', statistic: data.B_c, label: 'Class balance', weight: weights.gamma, symbol: 'γ', factor: 'B_c' },
  ];
  rows.forEach((row, index) => {
    const y = layout.rows[index];
    const component = components.find((item) => item.key === row.key);
    const result = component ? component.value : NaN;
    const resultLeft = resultX - radius;
    const endX = index === 1 ? sum.x + sum.radius : sum.x;
    const endY = index === 0 ? sum.y - sum.radius : index === 2 ? sum.y + sum.radius : sum.y;
    links.append('path').attr('class', `acct-component-sum-link acct-${row.key}-sum-link`)
      .attr('d', index === 1 ? `M${resultLeft},${y} H${endX}` : `M${resultLeft},${y} H${endX} V${endY}`)
      .attr('fill', 'none').attr('stroke', '#8b8b8b').attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,5').attr('marker-end', `url(#${arrowId})`);
    waterball(nodes, defs, graphId, {
      key: row.key, kind: 'component', x: resultX, y, radius,
      value: result, label: '', accessibleLabel: `${row.symbol} × ${row.factor}`
    });
    text(nodes, 'acct-formula-equals', (resultX + statisticX) / 2, y, '=', 30, '#b0acac').attr('font-weight', 700);
    waterball(nodes, defs, graphId, {
      key: row.key, kind: 'statistic', x: statisticX, y, radius,
      value: row.statistic, label: row.label, accessibleLabel: row.label
    });
    text(nodes, 'acct-formula-times', (statisticX + weightX) / 2, y, '×', 28, '#b0acac').attr('font-weight', 700);
    waterball(nodes, defs, graphId, {
      key: row.key, kind: 'weight', x: weightX, y, radius,
      value: row.weight, label: row.symbol, accessibleLabel: row.symbol
    });
  });
}

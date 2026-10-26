/* global d3 */

import { svgStore, vSpaceAroundGapStore } from '../stores.js';
import { overviewConfig } from '../config.js';
import { getNodeRenderOffset } from './draw-utils.js';

// Configs
const layerColorScales = overviewConfig.layerColorScales;
const nodeLength = overviewConfig.nodeLength;
const intermediateColor = overviewConfig.intermediateColor;
const svgPaddings = overviewConfig.svgPaddings;
let legendSequence = 0;

// Shared variables
let svg = undefined;
svgStore.subscribe( value => {svg = value;} )

let vSpaceAroundGap = undefined;
vSpaceAroundGapStore.subscribe( value => {vSpaceAroundGap = value;} )

/**
 * Move one layer horizontally
 * @param {object} arg Multiple arguments {
 *   layerIndex: current layer index
 *   targetX: destination x
 *   disable: make this layer unresponsible
 *   delay: animation delay
 *   opacity: change the current layer's opacity
 *   specialIndex: avoid manipulating `specialIndex`th node
 *   onEndFunc: call this function when animation finishes
 *   transitionName: animation ID
 * }
 */
export const moveLayerX = (arg) => {
  let layerIndex = arg.layerIndex;
  let targetX = arg.targetX;
  let disable = arg.disable;
  let delay = arg.delay;
  let opacity = arg.opacity;
  let specialIndex = arg.specialIndex;
  let onEndFunc = arg.onEndFunc;
  let transitionName = arg.transitionName === undefined ? 'move' : arg.transitionName;
  let duration = arg.duration === undefined ? 500 : arg.duration;

  // Move the selected layer
  let curLayer = svg.select(`g#cnn-layer-group-${layerIndex}`);
  curLayer.selectAll('g.node-group').each((d, i, g) => {
    const renderOffset = getNodeRenderOffset(d);
    const nodeGroup = d3.select(g[i]);

    nodeGroup
      .style('cursor', disable && i !== specialIndex ? 'default' : 'pointer')
      .style('pointer-events', disable && i !== specialIndex ? 'none' : 'all')
      .select('image')
      .transition(transitionName)
      .ease(d3.easeCubicInOut)
      .delay(delay)
      .duration(duration)
      .attr('x', targetX + renderOffset);
    
    nodeGroup
      .select('rect.bounding')
      .transition(transitionName)
      .ease(d3.easeCubicInOut)
      .delay(delay)
      .duration(duration)
      .attr('x', targetX + renderOffset);

    // Output nodes use bars and text rather than feature-map images.  Move
    // those native elements through the same layer transition so the output
    // and its attached ACCT analysis remain one visual chain.
    nodeGroup
      .selectAll('rect.output-rect, text.output-text, text.annotation-text')
      .transition(transitionName)
      .ease(d3.easeCubicInOut)
      .delay(delay)
      .duration(duration)
      .attr('x', targetX);
    
    if (opacity !== undefined && i !== specialIndex) {
      d3.select(g[i])
        .select('image')
        .style('opacity', opacity);
    }
  });
  
  // Also move the layer labels
  svg.selectAll(`g#layer-label-${layerIndex}`)
    .transition(transitionName)
    .ease(d3.easeCubicInOut)
    .delay(delay)
    .duration(duration)
    .attr('transform', () => {
      let x = targetX + nodeLength / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 + 5;
      return `translate(${x}, ${y})`;
    })
    .on('end', onEndFunc);

  svg.selectAll(`g#layer-detailed-label-${layerIndex}`)
    .transition(transitionName)
    .ease(d3.easeCubicInOut)
    .delay(delay)
    .duration(duration)
    .attr('transform', () => {
      let x = targetX + nodeLength / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 - 6;
      return `translate(${x}, ${y})`;
    })
    .on('end', onEndFunc);

  // Move both the SVG chain and the original HTML weight controls with Output
  // so a layer expansion does not separate the sliders from their title.
  const isOutputLayer = !curLayer.select('g.node-output').empty();
  if (isOutputLayer) {
    const acctGroup = d3.select('#cnn-svg').select('g.acctcontain');
    const baseX = Number(acctGroup.attr('data-base-x'));
    const outputX = Number(acctGroup.attr('data-output-x'));

    if (!acctGroup.empty() && Number.isFinite(baseX) && Number.isFinite(outputX)) {
      const deltaX = targetX - outputX;
      acctGroup
        .transition(transitionName)
        .ease(d3.easeCubicInOut)
        .delay(delay)
        .duration(duration)
        .attr('transform', `translate(${baseX + deltaX}, 0)`);
      const sliderGroup = document.querySelector('.slider-group');
      if (sliderGroup) {
        sliderGroup.style.transitionProperty = 'transform';
        sliderGroup.style.transitionDuration = `${duration}ms`;
        sliderGroup.style.transitionDelay = `${delay || 0}ms`;
        sliderGroup.style.transitionTimingFunction = 'cubic-bezier(0.645,0.045,0.355,1)';
        sliderGroup.style.transform = `translateX(${deltaX}px)`;
      }
    }
  }
}

/**
 * Append a gradient definition to `group`
 * @param {string} gradientID CSS ID for the gradient def
 * @param {[{offset: number, color: string, opacity: number}]} stops Gradient stops
 * @param {element} group Element to append def to
 */
export const addOverlayGradient = (gradientID, stops, group) => {
  if (group === undefined) {
    group = svg;
  }

  // Create a gradient
  let defs = group.append("defs")
    .attr('class', 'overlay-gradient');

  let gradient = defs.append("linearGradient")
    .attr("id", gradientID)
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "100%")
    .attr("y2", "100%");
  
  stops.forEach(s => {
    gradient.append('stop')
      .attr('offset', s.offset)
      .attr('stop-color', s.color)
      .attr('stop-opacity', s.opacity);
  })
}

/**
 * Draw the legend for intermediate layer
 * @param {object} arg 
 * {
 *   legendHeight: height of the legend rectangle
 *   curLayerIndex: the index of selected layer
 *   range: colormap range
 *   group: group to append the legend
 *   minMax: {min: min value, max: max value}
 *   width: width of the legend
 *   x: x position of the legend
 *   y: y position of the legend
 *   isInput: if the legend is for the input layer (special handle black to
 *      white color scale)
 *   colorScale: d3 color scale
 *   colorForValue: optional function that maps a raw data value to its exact
 *      rendered color
 *   gradientAppendingName: name of the appending gradient
 *   gradientGap: gap to make the color lighter
 * }
 */
export const drawIntermediateLayerLegend = (arg) => {
  let legendHeight = arg.legendHeight,
    curLayerIndex = arg.curLayerIndex,
    range = arg.range,
    group = arg.group,
    minMax = arg.minMax,
    width = arg.width,
    x = arg.x,
    y = arg.y,
    isInput = arg.isInput,
    colorScale = arg.colorScale,
    colorForValue = arg.colorForValue,
    gradientAppendingName = arg.gradientAppendingName,
    gradientGap = arg.gradientGap,
    legendTitle = arg.legendTitle;
  
  if (colorScale === undefined) { colorScale = layerColorScales.conv; }
  if (gradientGap === undefined) { gradientGap = 0; }
  
  // Every legend owns its gradient, including the Input Channel ramp. The
  // overview no longer defines the old global `inputGradient` reference.
  const safeRange = Number.isFinite(range) && range !== 0 ? range : 1;
  const minimum = isInput ? 0 : minMax.min;
  const maximum = isInput ? range : minMax.max;
  const gradientID = `${gradientAppendingName || (isInput
    ? 'input-channel-gradient'
    : 'intermediate-legend-gradient')}-${++legendSequence}`;
  const gradientName = `url(#${gradientID})`;
  let normalizedColor = v => colorScale(v * (1 - 2 * gradientGap) + gradientGap);
  const valueColor = isInput
    ? value => layerColorScales.input[0](1 - value / safeRange)
    : typeof colorForValue === 'function'
      ? colorForValue
      : value => normalizedColor((value + safeRange / 2) / safeRange);
  const extent = maximum - minimum;
  const stopCount = 20;
  const stops = Array.from({length: stopCount + 1}, (_, index) => {
    const offset = index / stopCount;
    const value = minimum + extent * offset;
    return {offset, color: valueColor(value), opacity: 1};
  });
  addOverlayGradient(gradientID, stops, group);

  const ownerSVG = group.node().ownerSVGElement;
  const compact = arg.compact === true;
  const tickFontSize = compact ? 9 : ownerSVG.clientWidth >= 2100 ? 14 : 11;
  const titleFontSize = compact ? 12 : tickFontSize + 1;
  // Compact legends sit in the footer. Keep their short tick marks attached to
  // the color ramp so each value has an unambiguous visual anchor.
  const axisGap = compact ? 0 : 5;

  let legendScale = d3.scaleLinear()
    .range([0, width])
    .domain([minimum, maximum]);

  let legendAxis = d3.axisBottom()
    .scale(legendScale)
    .tickFormat(d3.format(isInput ? 'd' : '.2f'))
    .tickSize(compact ? 2 : 3)
    .tickSizeOuter(0)
    .tickPadding(compact ? 2 : 3)
    .tickValues(isInput
      ? [0, range]
      : Array.from(new Set([
          minMax.min,
          ...(minMax.min < 0 && minMax.max > 0 ? [0] : []),
          minMax.max
        ])));
  
  let intermediateLegend = group.append('g')
    .attr('class', `intermediate-legend intermediate-legend-${curLayerIndex - 1}`)
    .attr('data-legend-title', arg.legendName || legendTitle || '')
    .style('pointer-events', 'none')
    .attr('transform', `translate(${x}, ${y})`);

  intermediateLegend.append('rect')
    .attr('class', 'legend-color-bar')
    .attr('width', width)
    .attr('height', legendHeight)
    .style('fill', gradientName)
    .style('stroke', '#d0d0d0')
    .style('stroke-width', 0.5);
  
  let legendGroup = intermediateLegend.append('g')
    .attr('class', 'legend-ticks')
    .attr('transform', `translate(0, ${legendHeight + axisGap})`)
    .call(legendAxis);

  // Short ticks sit below the ramp. No axis line runs across the colors.
  legendGroup.select('.domain').remove();
  
  legendGroup.selectAll('text')
    .style('font-size', `${tickFontSize}px`)
    .style('fill', '#555')
    .attr('text-anchor', value => value === minimum ? 'start'
      : value === maximum ? 'end' : 'middle');
  
  legendGroup.selectAll('path, line')
    .style('stroke', intermediateColor);

  // Add legend title if provided
  if (legendTitle) {
    intermediateLegend.append('text')
      .attr('class', 'legend-title')
      .attr('x', width / 2)
      .attr('y', compact ? -6 : -8)
      .attr('text-anchor', 'middle')
      .style('font-size', `${titleFontSize}px`)
      .style('font-weight', '500')
      .style('fill', '#333')
      .text(legendTitle);
  }

  // A white margin separates the complete legend from faded background edges.
  const bounds = intermediateLegend.node().getBBox();
  const horizontalPadding = compact ? 4 : 8;
  const verticalPadding = compact ? 2 : 6;
  intermediateLegend.append('rect')
    .attr('class', 'legend-background')
    .attr('x', bounds.x - horizontalPadding)
    .attr('y', bounds.y - verticalPadding)
    .attr('width', bounds.width + horizontalPadding * 2)
    .attr('height', bounds.height + verticalPadding * 2)
    .style('fill', '#fff')
    .lower();

  return intermediateLegend;
}

/** Place the full rendered legend, including its title and ticks, in the footer. */
export const positionIntermediateLegendInFooter = (legend, x, bottomPadding = 12) => {
  const ownerSVG = legend.node().ownerSVGElement;
  const svgHeight = ownerSVG.getBoundingClientRect().height;
  const bounds = legend.node().getBBox();
  const y = svgHeight - bottomPadding - bounds.y - bounds.height;
  legend.attr('transform', `translate(${x}, ${y})`);
};

/**
 * Draw an very neat arrow!
 * @param {object} arg 
 * {
 *   group: element to append this arrow to
 *   sx: source x
 *   sy: source y
 *   tx: target x
 *   ty: target y
 *   dr: radius of curve (I'm using a circle)
 *   hFlip: the direction to choose the circle (there are always two ways)
 * }
 */
export const drawArrow = (arg) => {
  let group = arg.group,
    sx = arg.sx,
    sy = arg.sy,
    tx = arg.tx,
    ty = arg.ty,
    dr = arg.dr,
    hFlip = arg.hFlip,
    marker = arg.marker === undefined ? 'marker' : arg.marker;

  /* Cool graphics trick -> merge translate and scale together
  translateX = (1 - scaleX) * tx,
  translateY = (1 - scaleY) * ty;
  */
  
  let arrow = group.append('g')
    .attr('class', 'arrow-group');

  arrow.append('path')
    .attr("d", `M${sx},${sy}A${dr},${dr} 0 0,${hFlip ? 0 : 1} ${tx},${ty}`)
    .attr('marker-end', `url(#${marker})`)
    .style('stroke', 'gray')
    .style('fill', 'none');
}

/* global d3 */
import { ACTIVE_CLASS_NAMES } from './overview/datasets.js';

const layerColorScales = {
  input: [d3.interpolateGreys, d3.interpolateGreys, d3.interpolateGreys],
  conv: d3.interpolateRdBu,
  layer_out: d3.interpolateRdBu,
  block_out: d3.interpolateRdBu,
  relu: d3.interpolateRdBu,
  norm: d3.interpolateRdBu,
  pool: d3.interpolateRdBu,
  fc: d3.interpolateGreys,
  weight: d3.interpolateBrBG,
  logit: d3.interpolateOranges,
};

const nodeLength = 40;

export const overviewConfig = {
  nodeLength,
  plusSymbolRadius: nodeLength / 5,
  numLayers: 17,
  edgeOpacity: 0.8,
  edgeInitColor: "rgb(230, 230, 230)",
  edgeHoverColor: "rgb(130, 130, 130)",
  edgeHoverOuting: false,
  edgeStrokeWidth: 0.7,
  intermediateColor: "gray",
  layerColorScales,
  svgPaddings: { top: 20, bottom: 20, left: 10, right: 10 },
  kernelRectLength: 8 / 3,
  gapRatio: 2,
  overlayRectOffset: 12,
  classLists: ACTIVE_CLASS_NAMES,
};

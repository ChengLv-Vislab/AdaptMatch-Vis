/* global d3, SmoothScroll */

import {
  svgStore,
  vSpaceAroundGapStore,
  hSpaceAroundGapStore,
  cnnStore,
  nodeCoordinateStore,
  selectedScaleLevelStore,
  cnnLayerRangesStore,
  detailedModeStore,
  cnnLayerMinMaxStore,
  modelColorDomainStore,
  hoverInfoStore,
  selectedImageStore,
  model_nameStore,
  alphaStore,
  betaStore,
  gammaStore,
} from "../stores.js";
import {
  getExtent,
  getLinkData,
  getNodeRenderOffset,
  getNodeRenderSize,
} from "./draw-utils.js";
import { overviewConfig } from "../config.js";
import { get } from "svelte/store";

import { getACCTClassStatistics, getACCTThresholdComponents } from "./acct-statistics.js";
import { drawACCTDecisionGraph, getACCTPanelWidth } from "./acct-decision-graph.js";
import { formatColorValue, gradCAMColor, normalizeColorValue } from "../utils/gradcam.js";


// Configs
const layerColorScales = overviewConfig.layerColorScales;
const nodeLength = overviewConfig.nodeLength;
const numLayers = overviewConfig.numLayers;
const edgeOpacity = overviewConfig.edgeOpacity;
const edgeInitColor = overviewConfig.edgeInitColor;
const edgeStrokeWidth = overviewConfig.edgeStrokeWidth;
const svgPaddings = overviewConfig.svgPaddings;
const gapRatio = overviewConfig.gapRatio;
const classLists = overviewConfig.classLists;
const formater = d3.format(".4f");
const GRAD_CAM_Y = 92;
const outputImageCache = new WeakMap();

// Shared variables
let svg = undefined;
svgStore.subscribe((value) => {
  svg = value;
});

let vSpaceAroundGap = undefined;
vSpaceAroundGapStore.subscribe((value) => {
  vSpaceAroundGap = value;
});

let hSpaceAroundGap = undefined;
hSpaceAroundGapStore.subscribe((value) => {
  hSpaceAroundGap = value;
});

let cnn = undefined;
cnnStore.subscribe((value) => {
  cnn = value;
});

let nodeCoordinate = undefined;
nodeCoordinateStore.subscribe((value) => {
  nodeCoordinate = value;
});

let selectedScaleLevel = undefined;
selectedScaleLevelStore.subscribe((value) => {
  selectedScaleLevel = value;
});

let cnnLayerRanges = undefined;
cnnLayerRangesStore.subscribe((value) => {
  cnnLayerRanges = value;
});

let cnnLayerMinMax = undefined;
cnnLayerMinMaxStore.subscribe((value) => {
  cnnLayerMinMax = value;
});

let modelColorDomain;
modelColorDomainStore.subscribe((value) => {
  modelColorDomain = value;
});

let detailedMode = undefined;
detailedModeStore.subscribe((value) => {
  detailedMode = value;
});

// ACCT threshold parameters
let alpha = undefined;
alphaStore.subscribe((value) => {
  alpha = value;
});

let beta = undefined;
betaStore.subscribe((value) => {
  beta = value;
});

let gamma = undefined;
gammaStore.subscribe((value) => {
  gamma = value;
});

// ACCT data and selection
let ACCTdata = [];
let ACCTselected = null;

/**
 * Use bounded d3 data to draw one canvas
 * @param {object} d d3 data
 * @param {index} i d3 data index
 * @param {[object]} g d3 group
 * @param {number} range color range map (max - min)
 */
export const drawOutput = (d, i, g, range) => {
  let image = g[i];
  let colorScale = layerColorScales[d.type];

  if (d.type === "input") {
    colorScale = colorScale[d.index];
  }

  const colorDomain = modelColorDomain || { min: -range / 2, max: range / 2 };
  const cached = outputImageCache.get(d);
  const useCachedImage = cached && cached.output === d.output &&
    cached.type === d.type && cached.index === d.index && cached.range === range &&
    cached.min === colorDomain.min && cached.max === colorDomain.max;
  if (useCachedImage) {
    d3.select(image)
      .attr('xlink:href', cached.url)
      .attr('data-spatial-resolution', cached.resolution)
      .attr('data-color-min', d.type === 'input' || d.type === 'fc' ? null : colorDomain.min)
      .attr('data-color-max', d.type === 'input' || d.type === 'fc' ? null : colorDomain.max)
      .style('image-rendering', 'pixelated');
    return;
  }
  const featureColor = (value) => d3.rgb(colorScale(
    normalizeColorValue(value, colorDomain.min, colorDomain.max)
  ));

  // Set up a second convas in order to resize image
  let imageLength = d.output.length === undefined ? 1 : d.output.length;
  let bufferCanvas = document.createElement("canvas");
  let bufferContext = bufferCanvas.getContext("2d");
  bufferCanvas.width = imageLength;
  bufferCanvas.height = imageLength;
  bufferContext.imageSmoothingEnabled = false;

  // Fill image pixel array
  let imageSingle = bufferContext.getImageData(0, 0, imageLength, imageLength);
  let imageSingleArray = imageSingle.data;

  if (imageLength === 1) {
    const value = typeof d.output === "number" ? d.output : d.output[0][0];
    const color = d.type === "input" || d.type === "fc"
      ? d3.rgb(colorScale(value)) : featureColor(value);
    imageSingleArray[0] = color.r;
    imageSingleArray[1] = color.g;
    imageSingleArray[2] = color.b;
    imageSingleArray[3] = 255;
  } else {
    for (let i = 0; i < imageSingleArray.length; i += 4) {
      let pixeIndex = Math.floor(i / 4);
      let row = Math.floor(pixeIndex / imageLength);
      let column = pixeIndex % imageLength;
      let color = undefined;
      if (d.type === "input" || d.type === "fc") {
        color = d3.rgb(colorScale(1 - d.output[row][column]));
      } else {
        color = featureColor(d.output[row][column]);
      }

      imageSingleArray[i] = color.r;
      imageSingleArray[i + 1] = color.g;
      imageSingleArray[i + 2] = color.b;
      imageSingleArray[i + 3] = 255;
    }
  }

  // canvas.toDataURL() only exports image in 96 DPI, so we can hack it to have
  // higher DPI by rescaling the image using canvas magic
  let largeCanvas = document.createElement("canvas");
  largeCanvas.width = nodeLength * 3;
  largeCanvas.height = nodeLength * 3;
  let largeCanvasContext = largeCanvas.getContext("2d");
  largeCanvasContext.imageSmoothingEnabled = false;

  // Use drawImage to resize the original pixel array, and put the new image
  // (canvas) into corresponding canvas
  bufferContext.putImageData(imageSingle, 0, 0);
  largeCanvasContext.drawImage(
    bufferCanvas,
    0,
    0,
    imageLength,
    imageLength,
    0,
    0,
    nodeLength * 3,
    nodeLength * 3
  );

  let imageDataURL = largeCanvas.toDataURL();
  // Re-spacing a detail diagram changes only geometry. Reuse the exact
  // bitmap while its tensor, range, and color domain remain identical.
  outputImageCache.set(d, { output: d.output, type: d.type, index: d.index,
    range, min: colorDomain.min, max: colorDomain.max, url: imageDataURL,
    resolution: `${imageLength}x${imageLength}` });
  d3.select(image)
    .attr("xlink:href", imageDataURL)
    .attr("data-spatial-resolution", `${imageLength}x${imageLength}`)
    .attr("data-color-min", d.type === "input" || d.type === "fc" ? null : colorDomain.min)
    .attr("data-color-max", d.type === "input" || d.type === "fc" ? null : colorDomain.max)
    .style("image-rendering", "pixelated");

  // Destory the buffer canvas
  bufferCanvas.remove();
  largeCanvas.remove();
};

function drawGradCAM(layerGroup, left) {
  layerGroup.selectAll(".gradcam-node-image, .gradcam-color-legend").remove();
  const cam = cnn.gradcam;
  if (!cam) return;

  layerGroup.append("image")
    .attr("class", "gradcam-node-image")
    .attr("width", nodeLength)
    .attr("height", nodeLength)
    .attr("x", left)
    .attr("y", GRAD_CAM_Y)
    .attr("xlink:href", cam.imageUrl)
    .attr("data-model-name", cam.modelName)
    .attr("data-target-class", cam.target)
    .attr("data-color-min", cam.min)
    .attr("data-color-max", cam.max);

  const legend = layerGroup.append("g")
    .attr("class", "gradcam-color-legend")
    .attr("data-model-name", cam.modelName)
    .attr("data-color-min", cam.min)
    .attr("data-color-max", cam.max)
    .style("pointer-events", "none");
  const gradient = legend.append("defs").append("linearGradient")
    .attr("id", "gradcam-color-gradient")
    .attr("x1", "0%").attr("x2", "0%")
    .attr("y1", "100%").attr("y2", "0%");
  for (let i = 0; i <= 20; i++) {
    const [r, g, b] = gradCAMColor(i / 20);
    gradient.append("stop")
      .attr("offset", `${i * 5}%`)
      .attr("stop-color", d3.rgb(r, g, b).toString());
  }

  const barX = left - 20;
  legend.append("rect")
    .attr("class", "gradcam-color-bar")
    .attr("x", barX).attr("y", GRAD_CAM_Y)
    .attr("width", 8).attr("height", nodeLength)
    .attr("fill", "url(#gradcam-color-gradient)")
    .attr("stroke", "#bbb").attr("stroke-width", 0.5);
  [{ value: cam.max, y: GRAD_CAM_Y, type: "max" },
    { value: cam.min, y: GRAD_CAM_Y + nodeLength, type: "min" }]
    .forEach(({ value, y, type }) => {
      legend.append("text")
        .attr("class", `gradcam-scale-${type}`)
        .attr("x", barX - 5).attr("y", y)
        .attr("text-anchor", "end")
        .style("dominant-baseline", "middle")
        .style("font-size", "12px")
        .style("fill", "#4a4a4a")
        .text(formatColorValue(value));
    });
  legend.append("title").text(
    `Grad-CAM · ${cam.modelName} · ${classLists[cam.target]}: ${formatColorValue(cam.min)} to ${formatColorValue(cam.max)}`
  );
}

/**
 * Draw bar chart to encode the output value
 * @param {object} d d3 data
 * @param {index} i d3 data index
 * @param {[object]} g d3 group
 * @param {function} scale map value to length
 */
const drawOutputScore = (d, i, g, scale) => {
  let group = d3.select(g[i]);

  // Update the score rectangle width
  group
    .select("rect.output-rect")
    .transition("output")
    .delay(500)
    .duration(800)
    .ease(d3.easeCubicIn)
    .attr("width", scale(d.output));

  // Update the probability text annotation
  d3.select(`#output-prob-${i}`)
    .transition("output")
    .delay(500)
    .duration(800)
    .tween("text", function () {
      const textNode = this;
      const oldValue = parseFloat(textNode.textContent.match(/\d+\.\d+/)?.[0] || d.output);
      const newValue = d.output;
      const interpolator = d3.interpolate(oldValue, newValue);
      return function (t) {
        textNode.textContent = `(${d3.format(".4f")(interpolator(t))})`;
      };
    });
};

export const drawCustomImage = (image, inputLayer) => {
  let imageWidth = image.width;
  // Set up a second convas in order to resize image
  let imageLength = inputLayer[0].output.length;
  let bufferCanvas = document.createElement("canvas");
  let bufferContext = bufferCanvas.getContext("2d");
  bufferCanvas.width = imageLength;
  bufferCanvas.height = imageLength;

  // Fill image pixel array
  let imageSingle = bufferContext.getImageData(0, 0, imageLength, imageLength);
  let imageSingleArray = imageSingle.data;

  for (let i = 0; i < imageSingleArray.length; i += 4) {
    let pixeIndex = Math.floor(i / 4);
    let row = Math.floor(pixeIndex / imageLength);
    let column = pixeIndex % imageLength;

    let red = inputLayer[0].output[row][column];
    let green = inputLayer[1].output[row][column];
    let blue = inputLayer[2].output[row][column];

    imageSingleArray[i] = red * 255;
    imageSingleArray[i + 1] = green * 255;
    imageSingleArray[i + 2] = blue * 255;
    imageSingleArray[i + 3] = 255;
  }

  // canvas.toDataURL() only exports image in 96 DPI, so we can hack it to have
  // higher DPI by rescaling the image using canvas magic
  let largeCanvas = document.createElement("canvas");
  largeCanvas.width = imageWidth * 3;
  largeCanvas.height = imageWidth * 3;
  let largeCanvasContext = largeCanvas.getContext("2d");

  // Use drawImage to resize the original pixel array, and put the new image
  // (canvas) into corresponding canvas
  bufferContext.putImageData(imageSingle, 0, 0);
  largeCanvasContext.drawImage(
    bufferCanvas,
    0,
    0,
    imageLength,
    imageLength,
    0,
    0,
    imageWidth * 3,
    imageWidth * 3
  );

  let imageDataURL = largeCanvas.toDataURL();
  image.src = imageDataURL;

  // Destory the buffer canvas
  bufferCanvas.remove();
  largeCanvas.remove();
};

/**
 * Map internal layer names to display names
 * @param {string} layerName - The internal layer name
 * @returns {string} display name
 */
const getDisplayName = (layerName) => {
  let displayName;
  if (layerName === "input") {
    displayName = "Input";
  } else if (layerName === "norm") {
    displayName = "Norm";
  } else if (layerName === "pool" || layerName.includes("max_pool")) {
    displayName = "Pool";
  } else if (layerName === "output") {
    displayName = "Output";
  } else if (layerName.includes("conv")) {
    displayName = "Conv";
  } else if (layerName.includes("relu")) {
    displayName = "Relu";
  } else if (layerName.includes("block")) {
    // Convert block_1_layer_2_out to layer1.2
    const parts = layerName.split("_");
    if (parts.length >= 4) {
      const blockNum = parts[1];
      const layerNum = parts[3];
      displayName = `Layer${blockNum}.${layerNum}`;
    } else {
      displayName = layerName.replace("block_", "").replace("_", "");
    }
  } else {
    displayName = layerName;
  }
  return displayName;
};

/**
 * Draw the overview
 * @param {number} width Width of the cnn group
 * @param {number} height Height of the cnn group
 * @param {object} cnnGroup Group to appen cnn elements to
 * @param {function} nodeMouseOverHandler Callback func for mouseOver
 * @param {function} nodeMouseLeaveHandler Callback func for mouseLeave
 * @param {function} nodeClickHandler Callback func for click
 */
export const drawCNN = (
  width,
  height,
  cnnGroup,
  nodeMouseOverHandler,
  nodeMouseLeaveHandler,
  nodeClickHandler
) => {
  nodeCoordinate = [];
  const model_name = get(model_nameStore);
  // These labels are owned by the main SVG rather than cnnGroup. Recreate
  // them with the nodes so a resize cannot leave old labels over ACCT.
  svg.selectAll("g.layer-label, g.layer-detailed-label").remove();

  // 清空并初始化 ACCT 数据
  ACCTdata = [];
  ACCTselected = null;

  // Reserve a separate lane for all nine liquid gauges and the decision
  // branch. Size the CNN gaps from its actual layers so Output never sits
  // underneath the ACCT diagram, including on high-DPI displays.
  const layerGapFactors = cnn.map((layer) => {
    const first = layer[0];
    if (first.layerName === "output" || first.type === "conv" ||
      first.layerName.includes("layer_1")) return gapRatio;
    if (["norm", "relu", "pool"].includes(first.type)) return 0.5;
    return 1;
  });
  const modelWidth = width - getACCTPanelWidth(width + svgPaddings.left + svgPaddings.right) - 92;
  hSpaceAroundGap = Math.max(2, (modelWidth - nodeLength * cnn.length) /
    layerGapFactors.reduce((sum, factor) => sum + factor, 0));
  hSpaceAroundGapStore.set(hSpaceAroundGap);
  let leftAccuumulatedSpace = 0;

  // Iterate through the cnn to draw nodes in each layer
  for (let l = 0; l < cnn.length; l++) {
    let curLayer = cnn[l];
    let isOutput = curLayer[0].layerName === "output";

    nodeCoordinate.push([]);

    // Compute the x coordinate of the whole layer
    // Output layer and conv layer has long gaps
    if (
      isOutput ||
      curLayer[0].type === "conv" ||
      curLayer[0].layerName.includes("layer_1")
    ) {
      leftAccuumulatedSpace += hSpaceAroundGap * gapRatio;
    } else if (
      curLayer[0].type === "norm" ||
      curLayer[0].type === "relu" ||
      curLayer[0].type === "pool"
    ) {
      leftAccuumulatedSpace += hSpaceAroundGap * 0.5;
    } else {
      leftAccuumulatedSpace += hSpaceAroundGap;
    }

    // All nodes share the same x coordiante (left in div style)
    let left = leftAccuumulatedSpace;

    let layerGroup = cnnGroup
      .append("g")
      .attr("class", "cnn-layer-group")
      .attr("id", `cnn-layer-group-${l}`);

    vSpaceAroundGap =
      (height - nodeLength * curLayer.length) / (curLayer.length + 1);
    vSpaceAroundGapStore.set(vSpaceAroundGap);

    let nodeGroups = layerGroup
      .selectAll("g.node-group")
      .data(curLayer, (d) => d.index)
      .enter()
      .append("g")
      .attr("class", "node-group")
      .style("cursor", "pointer")
      .style("pointer-events", "all")
      .on("click", nodeClickHandler)
      .on("mouseover", nodeMouseOverHandler)
      .on("mouseleave", nodeMouseLeaveHandler)
      .classed("node-output", isOutput)
      .attr("id", (d, i) => {
        // Compute the coordinate
        // Not using transform on the group object because of a decade old
        // bug on webkit (safari)
        // https://bugs.webkit.org/show_bug.cgi?id=23113
        let top = i * nodeLength + (i + 1) * vSpaceAroundGap;
        top += svgPaddings.top;
        // Reserve a clear label band above every visual node. The extra
        // offset changes only layout; the activation-map glyphs themselves
        // retain their original size and appearance.
        if (curLayer[0].layerName === "input") {
          top += 60;
        } else {
          top += 22;
        }
        nodeCoordinate[l].push({
          x: left,
          y: top,
          size: getNodeRenderSize(d),
        });
        return `layer-${l}-node-${i}`;
      });

    // Overwrite the mouseover and mouseleave function for output nodes to show
    // hover info in the UI
    layerGroup
      .selectAll("g.node-output")
      .on("mouseover", (d, i, g) => {
        nodeMouseOverHandler(d, i, g);
        hoverInfoStore.set({
          show: true,
          text: `Output value: ${formater(d.output)}`,
        });
      })
      .on("mouseleave", (d, i, g) => {
        nodeMouseLeaveHandler(d, i, g);
        hoverInfoStore.set({
          show: false,
          text: `Output value: ${formater(d.output)}`,
        });
      });

    // Special handling for the input layer
    if (curLayer[0].layerName === "input") {
      // Embed original input channels
      nodeGroups
        .filter((d, i) => i < 3)
        .append("image")
        .attr("class", "node-image")
        .attr("width", (d) => getNodeRenderSize(d))
        .attr("height", (d) => getNodeRenderSize(d))
        .attr("x", (d) => left + getNodeRenderOffset(d))
        .attr("y", (d, i) =>
          nodeCoordinate[l][i].y + getNodeRenderOffset(d));

      drawGradCAM(layerGroup, left);

      // Add bounding boxes
      nodeGroups
        .append("rect")
        .attr("class", "bounding")
        .attr("width", (d) => getNodeRenderSize(d))
        .attr("height", (d) => getNodeRenderSize(d))
        .attr("x", (d) => left + getNodeRenderOffset(d))
        .attr("y", (d, i) =>
          nodeCoordinate[l][i].y + getNodeRenderOffset(d))
        .style("fill", "none")
        .style("stroke", "gray")
        .style("stroke-width", 1)
        .classed("hidden", true);

    } else if (curLayer[0].layerName !== "output") {
      // Embed raster image in these groups
      nodeGroups
        .append("image")
        .attr("class", "node-image")
        .attr("width", (d) => getNodeRenderSize(d))
        .attr("height", (d) => getNodeRenderSize(d))
        .attr("x", (d) => left + getNodeRenderOffset(d))
        .attr("y", (d, i) =>
          nodeCoordinate[l][i].y + getNodeRenderOffset(d));

      // Add a rectangle to show the border
      nodeGroups
        .append("rect")
        .attr("class", "bounding")
        .attr("width", (d) => getNodeRenderSize(d))
        .attr("height", (d) => getNodeRenderSize(d))
        .attr("x", (d) => left + getNodeRenderOffset(d))
        .attr("y", (d, i) =>
          nodeCoordinate[l][i].y + getNodeRenderOffset(d))
        .style("fill", "none")
        .style("stroke", "gray")
        .style("stroke-width", 1)
        .classed("hidden", true);

    } else {
      nodeGroups
        .append("rect")
        .attr("class", "output-rect")
        .attr("x", left)
        .attr("y", (d, i) => nodeCoordinate[l][i].y + nodeLength / 2 + 12)
        .attr("height", nodeLength / 4)
        .attr("width", 0)
        .style("fill", "gray");

      nodeGroups
        .append("text")
        .attr("class", "output-text")
        .attr("x", left)
        .attr("y", (d, i) => nodeCoordinate[l][i].y + nodeLength / 2)
        .style("dominant-baseline", "middle")
        .style("font-size", "12px")
        .style("fill", "black")
        .style("opacity", 1)
        .text((d, i) => classLists[i]);

      // Add annotation text to tell readers the exact output probability
      nodeGroups
        .append("text")
        .attr("class", "annotation-text")
        .attr("id", (d, i) => `output-prob-${i}`)
        .attr("x", left)
        .attr("y", (d, i) => nodeCoordinate[l][i].y + 8)
        .text((d, i) => {
          const classProb = d.output;
          const classStatistics = getACCTClassStatistics(model_name, i);

          ACCTdata.push({
            id: i,
            prob: classProb,
            ...classStatistics,
          });
          return `(${d3.format(".4f")(d.output)})`;
        });

      // ******************************************************************
      // 选出 prob 最大的那个
      ACCTselected = ACCTdata.reduce((a, b) => (a.prob > b.prob ? a : b));

      // 绘制 ACCT 可视化
      drawACCT(ACCTdata);
      // ******************************************************************
    }

    leftAccuumulatedSpace += nodeLength;
  }

  // Share the nodeCoordinate
  nodeCoordinateStore.set(nodeCoordinate);

  // Compute the scale of the output score width (mapping the the node
  // width to the max output score)
  let outputRectScale = d3
    .scaleLinear()
    .domain(cnnLayerRanges.output)
    .range([0, nodeLength]);

  // Draw the canvas
  for (let l = 0; l < cnn.length; l++) {
    let range = cnnLayerRanges[selectedScaleLevel][l];
    svg
      .select(`g#cnn-layer-group-${l}`)
      .selectAll("image.node-image")
      .each((d, i, g) => drawOutput(d, i, g, range));
  }

  svg
    .selectAll("g.node-output")
    .each((d, i, g) => drawOutputScore(d, i, g, outputRectScale));

  // Add layer label
  let layerNames = cnn.map((d) => {
    if (d[0].layerName === "output") {
      return {
        name: d[0].layerName,
        dimension: `(${d.length})`,
      };
    } else {
      return {
        name: d[0].layerName,
        dimension: `(${d[0].output.length},${d[0].output.length},${d.length})`,
      };
    }
  });

  let svgHeight =
    Number(d3.select("#cnn-svg").style("height").replace("px", "")) + 400;
  let scroll = new SmoothScroll('a[href*="#"]', { offset: -svgHeight });


  const names = layerNames.map(({ name, dimension }) => ({
    name: getDisplayName(name),
    dimension,
  }));

  let detailedLabels = svg
    .selectAll("g.layer-detailed-label")
    .data(names)
    .enter()
    .append("g")
    .attr("class", "layer-detailed-label")
    .attr("id", (d, i) => `layer-detailed-label-${i}`)
    .classed("hidden", !detailedMode)
    .attr("transform", (d, i) => {
      let x = nodeCoordinate[i][0].x + nodeLength / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 - 6;
      return `translate(${x}, ${y})`;
    })
    .style("cursor", (d) =>
      d.name.toLowerCase().includes("output") ? "default" : "help"
    )
    .on("click", (d) => {
      let target = "";
      const normalizedName = d.name.toLowerCase();
      if (normalizedName.includes("conv")) {
        target = "convolution";
      }
      if (normalizedName.includes("relu")) {
        target = "relu";
      }
      if (normalizedName.includes("pool")) {
        target = "pooling";
      }
      if (normalizedName.includes("input")) {
        target = "input";
      }

      // Scroll to a article element
      let anchor = document.querySelector(`#article-${target}`);
      scroll.animateScroll(anchor);
    });

  detailedLabels
    .append("text")
    .style("opacity", 1)
    .style("dominant-baseline", "hanging")
    .style("text-anchor", "middle")
    .each(function (d) {
      const textElement = d3.select(this).attr("transform", "translate(0,-11)");

      // 层名称
      textElement.append("tspan")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("font-style", "normal")
        .style("fill", "black")
        .attr("x", 0)
        .attr("y", 2)
        .text(d.name);

      // 维度信息
      textElement.append("tspan")
        .style("font-size", "8px")
        .style("font-weight", "normal")
        .attr("x", 0)
        .attr("y", 29)
        .text(d.dimension);

      // 格式标签 [H,W,C] 或 (Number of categories)
      textElement.append("tspan")
        .style("font-size", "8px")
        .style("font-weight", "normal")
        .style("font-style", "italic")
        .attr("x", 0)
        .attr("y", 43)
        .text(() => {
          // Output层显示 (Number of categories)
          if (d.name.includes("output")) {
            return "(Number of categories)";
          }
          // 其他层显示 [H,W,C]
          return "[H,W,C]";
        });
    });

  let labels = svg
    .selectAll("g.layer-label")
    .data(names)
    .enter()
    .append("g")
    .attr("class", "layer-label")
    .attr("id", (d, i) => `layer-label-${i}`)
    .classed("hidden", detailedMode)
    .attr("transform", (d, i) => {
      let x = nodeCoordinate[i][0].x + nodeLength / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 + 5;
      return `translate(${x}, ${y})`;
    })
    .style("cursor", (d) => (d.name.includes("output") ? "default" : "help"))
    .on("click", (d) => {
      let target = "";
      if (d.name.includes("conv")) {
        target = "convolution";
      }
      if (d.name.includes("relu")) {
        target = "relu";
      }
      if (d.name.includes("pool")) {
        target = "pooling";
      }
      if (d.name.includes("input")) {
        target = "input";
      }

      // Scroll to a article element
      let anchor = document.querySelector(`#article-${target}`);
      scroll.animateScroll(anchor);
    });

  labels.append("title").text("Move to article section");

  labels
    .append("text")
    .style("dominant-baseline", "middle")
    .style("opacity", 1)
    .text((d) => {
      if (d.name.includes("conv")) {
        return "conv";
      }
      if (d.name.includes("relu")) {
        return "relu";
      }
      if (d.name.includes("max_pool")) {
        return "max_pool";
      }
      return d.name;
    });

  // Add edges between nodes
  let linkGen = d3
    .linkHorizontal()
    .x((d) => d.x)
    .y((d) => d.y);

  let linkData = getLinkData(nodeCoordinate, cnn);

  let edgeGroup = cnnGroup.append("g").attr("class", "edge-group");

  edgeGroup
    .selectAll("path.edge")
    .data(linkData)
    .enter()
    .append("path")
    .attr(
      "class",
      (d) =>
        `edge edge-${d.targetLayerIndex} edge-${d.targetLayerIndex}-${d.targetNodeIndex}`
    )
    .attr(
      "id",
      (d) =>
        `edge-${d.targetLayerIndex}-${d.targetNodeIndex}-${d.sourceNodeIndex}`
    )
    .attr("d", (d) => linkGen({ source: d.source, target: d.target }))
    .style("fill", "none")
    .style("stroke-width", edgeStrokeWidth)
    .style("opacity", edgeOpacity)
    .style("stroke", edgeInitColor);

  // Add input channel annotations
  let inputAnnotation = cnnGroup.append("g").attr("class", "input-annotation");

  // Keep the label directly below the fixed-position Grad-CAM glyph.
  inputAnnotation
    .append("text")
    .attr("x", nodeCoordinate[0][0].x + nodeLength / 2)
    .attr("y", GRAD_CAM_Y + nodeLength + 4)
    .attr("class", "annotation-text")
    .style("dominant-baseline", "hanging")
    .style("text-anchor", "middle")
    .style("fill", "#666")
    .style("font-size", "12px")
    .text("Grad CAM");

  // Red Channel label for first input node
  let redChannel = inputAnnotation
    .append("text")
    .attr("x", nodeCoordinate[0][0].x + nodeLength / 2)
    .attr("y", nodeCoordinate[0][0].y + nodeLength + 5)
    .attr("class", "annotation-text")
    .style("dominant-baseline", "hanging")
    .style("text-anchor", "middle");

  redChannel
    .append("tspan")
    .style("dominant-baseline", "hanging")
    .style("fill", "#C95E67")
    .text("Red");

  redChannel
    .append("tspan")
    .style("dominant-baseline", "hanging")
    .text(" Channel");

  // Green Channel label for second input node
  let greenChannel = inputAnnotation
    .append("text")
    .attr("x", nodeCoordinate[0][1].x + nodeLength / 2)
    .attr("y", nodeCoordinate[0][1].y + nodeLength + 5)
    .attr("class", "annotation-text")
    .style("dominant-baseline", "hanging")
    .style("text-anchor", "middle");

  greenChannel
    .append("tspan")
    .style("dominant-baseline", "hanging")
    .style("fill", "#3DB665")
    .text("Green");

  greenChannel
    .append("tspan")
    .style("dominant-baseline", "hanging")
    .text(" Channel");

  // Blue Channel label for third input node
  let blueChannel = inputAnnotation
    .append("text")
    .attr("x", nodeCoordinate[0][2].x + nodeLength / 2)
    .attr("y", nodeCoordinate[0][2].y + nodeLength + 5)
    .attr("class", "annotation-text")
    .style("dominant-baseline", "hanging")
    .style("text-anchor", "middle");

  blueChannel
    .append("tspan")
    .style("dominant-baseline", "hanging")
    .style("fill", "#3F7FBC")
    .text("Blue");

  blueChannel
    .append("tspan")
    .style("dominant-baseline", "hanging")
    .text(" Channel");
};

/**
 * Update canvas values when user changes input image
 */
export const updateCNN = () => {
  // Compute the scale of the output score width (mapping the the node
  // width to the max output score)
  let outputRectScale = d3
    .scaleLinear()
    .domain(cnnLayerRanges.output)
    .range([0, nodeLength]);

  // Rebind the cnn data to layer groups layer by layer
  for (let l = 0; l < cnn.length; l++) {
    let curLayer = cnn[l];
    let range = cnnLayerRanges[selectedScaleLevel][l];
    let layerGroup = svg.select(`g#cnn-layer-group-${l}`);

    let nodeGroups = layerGroup.selectAll("g.node-group").data(curLayer);

    const model_name = get(model_nameStore);

    if (l < cnn.length - 1) {
      if (curLayer[0].layerName === "input") {
        drawGradCAM(layerGroup, nodeCoordinate[l][0].x);
      }
      // Redraw the canvas and output node
      nodeGroups
        .transition("disappear")
        .duration(300)
        .ease(d3.easeCubicOut)
        .style("opacity", 0)
        .on("end", function () {
          d3.select(this)
            .select("image.node-image")
            .each((d, i, g) => drawOutput(d, i, g, range));
          d3.select(this)
            .transition("appear")
            .duration(700)
            .ease(d3.easeCubicIn)
            .style("opacity", 1);
        });
    } else {
      // Clear old ACCTdata
      ACCTdata = [];

      nodeGroups.each((d, i, g) => {
        drawOutputScore(d, i, g, outputRectScale);

        const classProb = d.output;
        const classStatistics = getACCTClassStatistics(model_name, i);

        // Regenerate ACCTdata with new probabilities
        ACCTdata.push({
          id: i,
          prob: classProb,
          ...classStatistics,
        });
      });

      // Select the class with highest probability
      ACCTselected = ACCTdata.reduce((a, b) => (a.prob > b.prob ? a : b));

      // Redraw ACCT visualization with new data
      drawACCT(ACCTdata);
    }
  }

};

/**
 * Update the ranges for current CNN layers
 */
export const updateCNNLayerRanges = () => {
  // Iterate through all nodes to find a output ranges for each layer
  let cnnLayerRangesLocal = [1];
  let curRange = undefined;

  // Also track the min/max of each layer (avoid computing during intermediate
  // layer)
  cnnLayerMinMax = [];

  for (let l = 0; l < cnn.length - 1; l++) {
    let curLayer = cnn[l];

    // Compute the min max
    let outputExtents = curLayer.map((l) => getExtent(l.output));
    let aggregatedExtent = outputExtents.reduce((acc, cur) => {
      return [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])];
    });
    cnnLayerMinMax.push({ min: aggregatedExtent[0], max: aggregatedExtent[1] });

    // conv layer refreshes curRange counting
    if (curLayer[0].type === "conv" || curLayer[0].type === "fc") {
      aggregatedExtent = aggregatedExtent.map(Math.abs);
      // Plus 0.1 to offset the rounding error (avoid black color)
      curRange =
        2 * (0.1 + Math.round(Math.max(...aggregatedExtent) * 1000) / 1000);
    }

    if (curRange !== undefined) {
      cnnLayerRangesLocal.push(curRange);
    }
  }

  // Finally, add the output layer range
  cnnLayerRangesLocal.push(1);
  cnnLayerMinMax.push({ min: 0, max: 1 });

  // Support different levels of scales (1) lcoal, (2) component, (3) global
  let cnnLayerRangesComponent = [1];
  let numOfComponent = (numLayers - 2) / 5;
  for (let i = 0; i < numOfComponent; i++) {
    let curArray = cnnLayerRangesLocal.slice(1 + 5 * i, 1 + 5 * i + 5);
    let maxRange = Math.max(...curArray);
    for (let j = 0; j < 5; j++) {
      cnnLayerRangesComponent.push(maxRange);
    }
  }
  cnnLayerRangesComponent.push(1);

  let cnnLayerRangesGlobal = [1];
  let maxRange = Math.max(
    ...cnnLayerRangesLocal.slice(1, cnnLayerRangesLocal.length - 1)
  );
  for (let i = 0; i < numLayers - 2; i++) {
    cnnLayerRangesGlobal.push(maxRange);
  }
  cnnLayerRangesGlobal.push(1);

  // Update the ranges dictionary
  cnnLayerRanges.local = cnnLayerRangesLocal;
  cnnLayerRanges.module = cnnLayerRangesComponent;
  cnnLayerRanges.global = cnnLayerRangesGlobal;
  cnnLayerRanges.output = [0, d3.max(cnn[cnn.length - 1].map((d) => d.output))];

  cnnLayerRangesStore.set(cnnLayerRanges);
  cnnLayerMinMaxStore.set(cnnLayerMinMax);

  const featureExtents = cnnLayerMinMax.slice(1, -1);
  modelColorDomainStore.set({
    min: Math.min(...featureExtents.map(({ min }) => min)),
    max: Math.max(...featureExtents.map(({ max }) => max)),
    modelName: cnn.gradcam?.modelName || get(model_nameStore),
    imageName: get(selectedImageStore),
  });
};

function getThresholdComponents(d) {
  return getACCTThresholdComponents(d, { alpha, beta, gamma });
}

function getThreshold(d) {
  return getThresholdComponents(d).reduce(
    (sum, component) => sum + component.value,
    0,
  );
}

function getACCTDecision(d, threshold) {
  return Number.isFinite(threshold) ? (d.prob >= threshold ? "KEEP" : "DROP") : "UNKNOWN";
}

export function drawACCT(data) {
  d3.select("#cnn-svg").selectAll(".acctcontain").remove();
  if (!ACCTselected || data.length === 0) return;
  const target = d3.select("#cnn-svg");
  const svgWidth = Number(target.style("width").replace("px", ""));
  const svgHeight = Number(target.style("height").replace("px", ""));
  const panelWidth = getACCTPanelWidth(svgWidth);
  const xPosition = svgWidth - panelWidth;
  const controls = document.querySelector('.slider-group');
  const controlsBottom = controls ? controls.offsetTop + controls.offsetHeight : 196;
  const titleX = controls ? controls.offsetLeft - xPosition : 16;
  const selectedOutput = nodeCoordinate?.[nodeCoordinate.length - 1]?.[ACCTselected.id];
  const maximumProbability = d3.max(data, (item) => item.prob) || 1;
  const outputRight = selectedOutput
    ? svgPaddings.left + selectedOutput.x + nodeLength * ACCTselected.prob / maximumProbability
    : null;
  const threshold = getThreshold(ACCTselected);
  const decision = getACCTDecision(ACCTselected, threshold);
  const group = target.append("g").attr("class", "acctcontain")
    .attr("data-base-x", xPosition).attr("data-output-x", selectedOutput?.x ?? "")
    .attr("data-panel-width", panelWidth)
    .attr("transform", `translate(${xPosition},0)`)
    .attr("data-s-c", ACCTselected.S_c).attr("data-u-c", ACCTselected.U_c)
    .attr("data-b-c", ACCTselected.B_c).attr("data-alpha", alpha)
    .attr("data-beta", beta).attr("data-gamma", gamma)
    .attr("data-class-index", ACCTselected.id)
    .attr("data-sample-count", ACCTselected.sampleCount)
    .attr("data-acct-formula", "alpha*S_c + beta*U_c + gamma*B_c")
    .attr("data-acct-threshold", Number.isFinite(threshold) ? threshold : "")
    .attr("data-acct-decision", decision);
  drawACCTDecisionGraph(group, {
    width: panelWidth, height: svgHeight, data: ACCTselected, controlsBottom, titleX,
    weights: { alpha, beta, gamma },
    components: getThresholdComponents(ACCTselected), threshold, decision,
    origin: selectedOutput ? {
      x: outputRight - xPosition,
      y: selectedOutput.y + nodeLength / 2 + 12 + nodeLength / 8,
    } : null,
  });
}

export function updateThresholds() {
  drawACCT(ACCTdata);
}

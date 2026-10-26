<script>
  import { onMount, onDestroy } from 'svelte';
  import {
    cnnStore, svgStore, vSpaceAroundGapStore, hSpaceAroundGapStore,
    nodeCoordinateStore, selectedScaleLevelStore, cnnLayerRangesStore,
    needRedrawStore, cnnLayerMinMaxStore, modelColorDomainStore,
    shouldIntermediateAnimateStore, isInSoftmaxStore, softmaxDetailViewStore,
    hoverInfoStore, allowsSoftmaxAnimationStore, modalStore,
    intermediateLayerPositionStore, model_nameStore, selectedImageStore, customImageStore,
    alphaStore, betaStore, gammaStore, trainingDataPathStore, availableModelsStore,
    modelLoadingStore, runLoadingStore, runErrorStore, imageOptionsStore, imageRootStore,
    datasetSelectionDisabledStore, imagePreviewRootStore, imageVersionStore
  } from '../stores.js';
  import ConvolutionView from '../detail-view/Convolutionview.svelte';
  import ActivationView from '../detail-view/Activationview.svelte';
  import NormalizationView from '../detail-view/Normalizationview.svelte';
  import PoolView from '../detail-view/Poolview.svelte';
  import SoftmaxView from '../detail-view/Softmaxview.svelte';
  import Modal from './Modal.svelte'
  import { demoImageURL } from './datasets.js';
  import ImageSelector from './ImageSelector.svelte'
  import ImageUploader from './ImageUploader.svelte'
  import LossPopup from './LossPopup.svelte';
  import Plot from "./Plot.svelte"
  import { initializeRunCatalog, updateSelectedEpoch } from './run-context.js';

  import { loadACCTStatistics, getACCTModelWeights } from './acct-statistics.js';
  import { ACCT_PARAMETER_RANGES, getRangePercent } from './acct-config.js';

  import { loadTrainedModel, constructCNN } from '../utils/cnn-tf.js';
  import { formatColorValue } from '../utils/gradcam.js';
  import { overviewConfig } from '../config.js';

  import { addOverlayRect, drawConv1 } from './intermediate-draw.js';

  import {
    moveLayerX, addOverlayGradient
  } from './intermediate-utils.js';

  import { getExtent } from './draw-utils.js';

  import {
    drawFlatten, softmaxDetailViewMouseOverHandler, softmaxDetailViewMouseLeaveHandler
  } from './flatten-draw.js';

  import {
    drawOutput, drawCNN, updateCNN, updateCNNLayerRanges, drawCustomImage, updateThresholds
  } from './overview-draw.js';

  let overviewComponent;
  let selectedScaleLevel = 'local';
  selectedScaleLevelStore.set(selectedScaleLevel);
  let previousSelectedScaleLevel = selectedScaleLevel;
  let wholeSvg = undefined;
  let svg = undefined;
  let model_name = 'model_best';
  model_nameStore.set(model_name);
  let previousModelKey = '';
  let loadedModelKey = '';
  let overviewReady = false;
  let overviewRequest = 0;
  let isModelLoading = true;
  let showLossPopup = false;
  let acctResizeObserver;
  let acctResizeFrame;
  onDestroy(() => {
    intermediateRelayoutToken++;
    acctResizeObserver?.disconnect();
    if (acctResizeFrame !== undefined) cancelAnimationFrame(acctResizeFrame);
  });
  $: weightControls = [
    { name: 'alpha', symbol: 'α', value: $alphaStore },
    { name: 'beta', symbol: 'β', value: $betaStore },
    { name: 'gamma', symbol: 'γ', value: $gammaStore },
  ].map(control => ({ ...control, range: ACCT_PARAMETER_RANGES[control.name],
    percent: getRangePercent(control.value, ACCT_PARAMETER_RANGES[control.name]) }));
  function setCheckpointACCTWeights() {
    const weights = getACCTModelWeights(model_name);
    alphaStore.set(weights.alpha);
    betaStore.set(weights.beta);
    gammaStore.set(weights.gamma);
  }

  function changeACCTWeight(name, event) {
    if (isModelLoading || $runLoadingStore || $runErrorStore || disableControl) return;
    const range = ACCT_PARAMETER_RANGES[name];
    const store = { alpha: alphaStore, beta: betaStore, gamma: gammaStore }[name];
    const value = Number(event.currentTarget.value);
    if (!range || !store || !Number.isFinite(value)) return;
    // Explore the recorded class statistics without modifying training results.
    store.set(Math.max(range.min, Math.min(range.max, value)));
    updateThresholds();
  }

  function resetACCTWeights() {
    if (isModelLoading || $runLoadingStore || $runErrorStore || disableControl) return;
    setCheckpointACCTWeights();
    updateThresholds();
  }

  $: model_name = $model_nameStore || 'model_best';
  $: modelLoadingStore.set(isModelLoading);
  $: model_name, $trainingDataPathStore, model_nameChanged();
  $: selectedScaleLevel, selectedScaleLevelChanged();

  const model_nameChanged = () => {
    // 当模型名称改变时， 重新加载模型
    const modelKey = `${$trainingDataPathStore}|${model_name}`;
    if (overviewReady && modelKey !== previousModelKey) {
      previousModelKey = modelKey;
      const selectedModelName = model_name;
      const dataPath = $trainingDataPathStore;
      const request = ++overviewRequest;
      updateSelectedEpoch(selectedModelName);
      isModelLoading = true;
      runErrorStore.set('');
      modelColorDomainStore.set(null);

      loadTrainedModel(`${dataPath}/${selectedModelName}.onnx?v=${Date.now()}`).then(async (newModel) => {
        if (request !== overviewRequest) { if (newModel.release) await newModel.release(); return; }
        let nextCNN;
        try {
          nextCNN = await constructCNN(selectedImage === 'custom' ? customImageURL : demoImageURL($imageRootStore, selectedImage, $imageVersionStore), newModel, selectedModelName, dataPath);
        } catch (error) {
          if (newModel.release) await newModel.release();
          throw error;
        }
        if (request !== overviewRequest) { if (newModel.release) await newModel.release(); return; }
        const previousModel = model;
        model = newModel;
        cnn = nextCNN;
        loadedModelKey = modelKey;
        setCheckpointACCTWeights();
        if (previousModel && previousModel.release) await previousModel.release();

        // Ignore the flatten layer for now
        let flatten = cnn[cnn.length - 2];
        cnn.splice(cnn.length - 2, 1);
        cnn.flatten = flatten;
        cnnStore.set(cnn);

        updateCNNLayerRanges();

        // Clear and redraw the CNN visualization
        svg.select('g.cnn-group').remove();
        let cnnGroup = svg.append('g').attr('class', 'cnn-group');
        drawCNN(width, height, cnnGroup, nodeMouseOverHandler,
          nodeMouseLeaveHandler, nodeClickHandler);
      }).catch((error) => {
        console.error('Failed to load the selected checkpoint:', error);
        if (request === overviewRequest) runErrorStore.set(`Unable to load ${selectedModelName}: ${error.message}`);
      }).finally(() => {
        if (request === overviewRequest) isModelLoading = false;
      });
    }
  }

  // Configs
  const layerColorScales = overviewConfig.layerColorScales;
  const featureColorGradient = `linear-gradient(to right, ${Array.from(
    { length: 21 }, (_, i) => `${layerColorScales.conv(i / 20)} ${i * 5}%`
  ).join(', ')})`;
  const nodeLength = overviewConfig.nodeLength;
  const plusSymbolRadius = overviewConfig.plusSymbolRadius;
  const edgeOpacity = overviewConfig.edgeOpacity;
  const edgeInitColor = overviewConfig.edgeInitColor;
  const edgeHoverColor = overviewConfig.edgeHoverColor;
  const edgeHoverOuting = overviewConfig.edgeHoverOuting;
  const edgeStrokeWidth = overviewConfig.edgeStrokeWidth;
  const intermediateColor = overviewConfig.intermediateColor;
  const kernelRectLength = overviewConfig.kernelRectLength;
  const svgPaddings = overviewConfig.svgPaddings;
  const gapRatio = overviewConfig.gapRatio;
  const overlayRectOffset = overviewConfig.overlayRectOffset;
  const classLists = overviewConfig.classLists;

  // Shared properties


  let needRedraw = [undefined, undefined];
  needRedrawStore.subscribe( value => {needRedraw = value;} );

  let nodeCoordinate = undefined;
  nodeCoordinateStore.subscribe( value => {nodeCoordinate = value;} )

  let cnnLayerRanges = undefined;
  cnnLayerRangesStore.subscribe( value => {cnnLayerRanges = value;} )

  let cnnLayerMinMax = undefined;
  cnnLayerMinMaxStore.subscribe( value => {cnnLayerMinMax = value;} )

  let shouldIntermediateAnimate = undefined;
  shouldIntermediateAnimateStore.subscribe(value => {
    shouldIntermediateAnimate = value;
  })

  let vSpaceAroundGap = undefined;
  vSpaceAroundGapStore.subscribe( value => {vSpaceAroundGap = value;} )

  let hSpaceAroundGap = undefined;
  hSpaceAroundGapStore.subscribe( value => {hSpaceAroundGap = value;} )

  let isInSoftmax = undefined;
  isInSoftmaxStore.subscribe( value => {isInSoftmax = value;} )

  let softmaxDetailViewInfo = undefined;
  softmaxDetailViewStore.subscribe( value => {
    softmaxDetailViewInfo = value;
  } )

  let modalInfo = undefined;
  modalStore.subscribe( value => {modalInfo = value;} )

  let hoverInfo = undefined;
  hoverInfoStore.subscribe( value => {hoverInfo = value;} )

  let intermediateLayerPosition = undefined;
  intermediateLayerPositionStore.subscribe ( value => {intermediateLayerPosition = value;} )

  let width = undefined;
  let height = undefined;
  let model = undefined;
  let selectedNode = {layerName: '', index: -1, data: null};
  let isInIntermediateView = false;
  let intermediateFooterReserved = false;
  let intermediateRelayoutToken = 0;
  let isInActPoolDetailView = false;
  let actPoolDetailViewNodeIndex = -1;
  let actPoolDetailViewLayerIndex = -1;
  let detailedViewNum = undefined;
  let disableControl = false;
  $: datasetSelectionDisabledStore.set(disableControl);

  // Wait to load
  let cnn = undefined;

  let detailedViewAbsCoords = {
    1 : [600, 270, 490, 290],
    2: [500, 270, 490, 290],
    3 : [700, 270, 490, 290],
    4: [600, 270, 490, 290],
    5: [650, 270, 490, 290],
    6 : [775, 270, 490, 290],
    7 : [100, 270, 490, 290],
    8 : [60, 270, 490, 290],
    9 : [200, 270, 490, 290],
    10 : [300, 270, 490, 290],
  }

  const layerIndexDict = {
    'input': 0,
    'conv_1': 1,
    'block_1_layer_1_out': 2,
    'block_1_layer_2_out': 3,
    'block_1_layer_3_out': 4,
    'block_1_layer_4_out': 5,
    'block_2_layer_1_out': 6,
    'block_2_layer_2_out': 7,
    'block_2_layer_3_out': 8,
    'block_2_layer_4_out': 9,
    'block_3_layer_1_out': 10,
    'block_3_layer_2_out': 11,
    'block_3_layer_3_out': 12,
    'block_3_layer_4_out': 13,
    'norm': 14, 
    'relu': 15,
    'pool': 16, 
    'output': 17
  }
  


  // Display Image 
  $: imageOptions = $imageOptionsStore;
  let selectedImage = 'airplane.png';
  selectedImageStore.subscribe(value => selectedImage = value);
  selectedImageStore.set('airplane.png');

  let customImage = false;
  customImageStore.subscribe(value => {
    customImage = value;
  });

  let nodeData;
  let selectedNodeIndex = -1;
  let isExitedFromDetailedView = true;
  let isExitedFromCollapse = true;
  let customImageURL = null;

  // Helper functions
  const selectedScaleLevelChanged = () => {
    if (svg !== undefined) {
      if (selectedScaleLevel != previousSelectedScaleLevel){
        // We can simply redraw all nodes using the new color scale, or we can
        // make it faster by only redraw certian nodes
        let updatingLayerIndexDict = {
          local: {
            module: [1, 2, 8, 9, 10],
            global: [1, 2, 3, 4, 5, 8, 9, 10]
          },
          module: {
            local: [1, 2, 8, 9, 10],
            global: [1, 2, 3, 4, 5, 8, 9, 10]
          },
          global: {
            local: [1, 2, 3, 4, 5, 8, 9, 10],
            module: [1, 2, 3, 4, 5]
          }
        };

        let updatingLayerIndex = updatingLayerIndexDict[
          previousSelectedScaleLevel][selectedScaleLevel];

        updatingLayerIndex.forEach(l => {
          let range = cnnLayerRanges[selectedScaleLevel][l];
          svg.select(`#cnn-layer-group-${l}`)
            .selectAll('.node-image')
            .each((d, i, g) => drawOutput(d, i, g, range));
        });

      }
      previousSelectedScaleLevel = selectedScaleLevel;
      selectedScaleLevelStore.set(selectedScaleLevel);
    }
  }

  

  const intermediateNodeMouseOverHandler = (d, i, g) => {
    if (detailedViewNum !== undefined) { return; }
    svg.select(`rect#underneath-gateway-${d.index}`)
      .style('opacity', 1);
  }

  const intermediateNodeMouseLeaveHandler = (d, i, g) => {
    if (detailedViewNum !== undefined) { return; }
    svg.select(`rect#underneath-gateway-${d.index}`)
      .style('opacity', 0);
  }

  const intermediateNodeClicked = (d, i, g, selectedI, curLayerIndex) => {
    d3.event.stopPropagation();
    isExitedFromCollapse = false;
    // Use this event to trigger the detailed view
    if (detailedViewNum === d.index) {
      selectedNodeIndex = -1; 
      // User clicks this node again -> rewind
      detailedViewNum = undefined;
      svg.select(`rect#underneath-gateway-${d.index}`)
        .style('opacity', 0);
    } 
    // We need to show a new detailed view (two cases: if we need to close the
    // old detailed view or not)
    else {
      selectedNodeIndex = d.index;
      let colorScale = layerColorScales.conv;

      // Compute the color range
      let rangePre = cnnLayerRanges[selectedScaleLevel][curLayerIndex - 1];
      let rangeCur = cnnLayerRanges[selectedScaleLevel][curLayerIndex];
      let range = Math.max(rangePre, rangeCur);

      // User triggers a different detailed view
      if (detailedViewNum !== undefined) {
        // Change the underneath highlight
        svg.select(`rect#underneath-gateway-${detailedViewNum}`)
          .style('opacity', 0);
        svg.select(`rect#underneath-gateway-${d.index}`)
          .style('opacity', 1);
      }
      
      detailedViewNum = d.index;

      // Send the currently used color range to detailed view
      nodeData.colorRange = range;
      nodeData.inputIsInputLayer = curLayerIndex <= 1;
    }
  }

  // The order of the if/else statements in this function is very critical
  const emptySpaceClicked = () => {
    // If detail view -> rewind to intermediate view
    if (detailedViewNum !== undefined) {
      selectedNodeIndex = -1; 
      // User clicks this node again -> rewind
      svg.select(`rect#underneath-gateway-${detailedViewNum}`)
        .style('opacity', 0);
      detailedViewNum = undefined;
    }

    // If softmax view -> rewind to flatten layer view
    else if (isInSoftmax) {
      svg.select('.softmax-symbol')
        .dispatch('click');
    }

    // If intermediate view -> rewind to overview
    else if (isInIntermediateView) {
      let curLayerIndex = layerIndexDict[selectedNode.layerName];
      quitIntermediateView(curLayerIndex, selectedNode.domG, selectedNode.domI);
      d3.select(selectedNode.domG[selectedNode.domI])
        .dispatch('mouseleave');
    }

    // If pool/act detail view -> rewind to overview
    else if (isInActPoolDetailView) {
      quitActPoolDetailView();
    }
  }

  const prepareToEnterIntermediateView = (d, g, i, curLayerIndex) => {
    isInIntermediateView = true;
    // Hide the input annotation
    svg.select('.input-annotation')
      .classed('hidden', true);

    // Highlight the previous layer and this node
    svg.select(`g#cnn-layer-group-${curLayerIndex - 1}`)
      .selectAll('rect.bounding')
      .style('stroke-width', 2);
    
    d3.select(g[i])
      .select('rect.bounding')
      .style('stroke-width', 2);
    
    disableControl = true;
    
    // Allow infinite animation loop
    shouldIntermediateAnimateStore.set(true);

    // Highlight the labels
    svg.selectAll(`g#layer-label-${curLayerIndex - 1},
      g#layer-detailed-label-${curLayerIndex - 1},
      g#layer-label-${curLayerIndex},
      g#layer-detailed-label-${curLayerIndex}`)
      .style('font-weight', '800');
    
    d3.select('#cnn-svg').on('click', function() {
      if (d3.event.target.closest('.intermediate-node')) {
        return; // Intermediate Node 内部点击，不退出
      }
      emptySpaceClicked();
    });
  }

  const quitActPoolDetailView = () => {
    isInActPoolDetailView = false;
    actPoolDetailViewNodeIndex = -1;

    let layerIndex = layerIndexDict[selectedNode.layerName];
    let nodeIndex = selectedNode.index;
    svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
      .select('rect.bounding')
      .classed('hidden', true);

    selectedNode.data.inputLinks.forEach(link => {
      let layerIndex = layerIndexDict[link.source.layerName];
      let nodeIndex = link.source.index;
      svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
        .select('rect.bounding')
        .classed('hidden', true);
    })

    // Clean up the underneath rects
    svg.select('g.underneath')
      .selectAll('rect')
      .remove();

    // Show all edges
    let unimportantEdges = svg.select('g.edge-group')
      .selectAll('.edge')
      .filter(d => {
        return d.targetLayerIndex !== actPoolDetailViewLayerIndex;
      })
      .style('visibility', null);
    
    // Recover control UI
    disableControl = false;

    // Also dehighlight the edge
    let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
    edgeGroup.selectAll(`path.edge-${layerIndex}-${nodeIndex}`)
      .transition()
      .ease(d3.easeCubicOut)
      .duration(200)
      .style('stroke', edgeInitColor)
      .style('stroke-width', edgeStrokeWidth)
      .style('opacity', edgeOpacity);

    // Remove the overlay rect
    svg.selectAll('g.intermediate-layer-overlay, g.intermediate-layer-annotation')
      .transition('remove')
      .duration(500)
      .ease(d3.easeCubicInOut)
      .style('opacity', 0)
      .on('end', (d, i, g) => {
        svg.selectAll('g.intermediate-layer-overlay, g.intermediate-layer-annotation').remove();
        svg.selectAll('defs.overlay-gradient').remove();
        svg.select('.input-annotation').classed('hidden', false);
      });

    // Turn the fade out nodes back
    svg.select(`g#cnn-layer-group-${layerIndex}`)
      .selectAll('g.node-group')
      .each((sd, si, sg) => {
        d3.select(sg[si])
          .style('pointer-events', 'all');
    });

    svg.select(`g#cnn-layer-group-${layerIndex - 1}`)
      .selectAll('g.node-group')
      .each((sd, si, sg) => {
        // Recover the old events
        d3.select(sg[si])
          .style('pointer-events', 'all')
          .on('mouseover', nodeMouseOverHandler)
          .on('mouseleave', nodeMouseLeaveHandler)
          .on('click', nodeClickHandler);
    });

    // Deselect the node
    selectedNode.layerName = '';
    selectedNode.index = -1;
    selectedNode.data = null;

    actPoolDetailViewLayerIndex = -1;
  }

  const actPoolDetailViewPreNodeMouseOverHandler = (d, i, g) => {
    // Highlight the edges
    let layerIndex = layerIndexDict[d.layerName];
    let nodeIndex = d.index;
    let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
    
    edgeGroup.selectAll(`path.edge-${actPoolDetailViewLayerIndex}-${nodeIndex}`)
      .raise()
      .transition()
      .ease(d3.easeCubicInOut)
      .duration(400)
      .style('stroke', edgeHoverColor)
      .style('stroke-width', '1')
      .style('opacity', 1);
    
    // Highlight its border
    d3.select(g[i]).select('rect.bounding')
      .classed('hidden', false);
    
    // Highlight node's pair
    let associatedLayerIndex = layerIndex - 1;
    if (layerIndex === actPoolDetailViewLayerIndex - 1) {
      associatedLayerIndex = layerIndex + 1;
    }

    svg.select(`g#layer-${associatedLayerIndex}-node-${nodeIndex}`)
      .select('rect.bounding')
      .classed('hidden', false);
  }

  const actPoolDetailViewPreNodeMouseLeaveHandler = (d, i, g) => {
    // De-highlight the edges
    let layerIndex = layerIndexDict[d.layerName];
    let nodeIndex = d.index;
    let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');

    edgeGroup.selectAll(`path.edge-${actPoolDetailViewLayerIndex}-${nodeIndex}`)
      .transition()
      .ease(d3.easeCubicOut)
      .duration(200)
      .style('stroke', edgeInitColor)
      .style('stroke-width', edgeStrokeWidth)
      .style('opacity', edgeOpacity);
    
    // De-highlight its border
    d3.select(g[i]).select('rect.bounding')
      .classed('hidden', true);
    
    // De-highlight node's pair
    let associatedLayerIndex = layerIndex - 1;
    if (layerIndex === actPoolDetailViewLayerIndex - 1) {
      associatedLayerIndex = layerIndex + 1;
    }

    svg.select(`g#layer-${associatedLayerIndex}-node-${nodeIndex}`)
      .select('rect.bounding')
      .classed('hidden', true);
  }

  const actPoolDetailViewPreNodeClickHandler = (d, i, g) => {
    let layerIndex = layerIndexDict[d.layerName];
    let nodeIndex = d.index;

    // Click the pre-layer node in detail view has the same effect as clicking
    // the cur-layer node, which is to open a new detail view window
    svg.select(`g#layer-${layerIndex + 1}-node-${nodeIndex}`)
      .node()
      .dispatchEvent(new Event('click'));
  }

  const enterDetailView = (curLayerIndex, i) => {
    isInActPoolDetailView = true;
    actPoolDetailViewNodeIndex = i;
    actPoolDetailViewLayerIndex = curLayerIndex;

    // Hide all edges
    let unimportantEdges = svg.select('g.edge-group')
      .selectAll('.edge')
      .filter(d => {
        return d.targetLayerIndex !== curLayerIndex;
      })
      .style('visibility', 'hidden');
    
    // Disable UI
    disableControl = true;
    
    // Hide input annotaitons
    svg.select('.input-annotation')
      .classed('hidden', true);

    // Add overlay rects
    let leftX = nodeCoordinate[curLayerIndex - 1][i].x;
    // +5 to cover the detailed mode long label
    
    let rightStart = nodeCoordinate[curLayerIndex][i].x + nodeLength + 5;

    // Compute the left and right overlay rect width
    let rightWidth = width - rightStart - overlayRectOffset / 2;
    let leftWidth = leftX - nodeCoordinate[0][0].x;

    // The overlay rects should be symmetric
    if (rightWidth > leftWidth) {
      let stops = [{offset: '0%', color: 'rgb(255, 255, 255)', opacity: 0.85},
        {offset: '50%', color: 'rgb(255, 255, 255)', opacity: 0.9},
        {offset: '100%', color: 'rgb(255, 255, 255)', opacity: 1}];
      addOverlayGradient('overlay-gradient-right', stops);

      let leftEndOpacity = 0.85 + (0.95 - 0.85) * (leftWidth / rightWidth);
      stops = [{offset: '0%', color: 'rgb(255, 255, 255)', opacity: leftEndOpacity},
        {offset: '100%', color: 'rgb(255, 255, 255)', opacity: 0.85}];
      addOverlayGradient('overlay-gradient-left', stops);
    } else {
      let stops = [{offset: '0%', color: 'rgb(255, 255, 255)', opacity: 1},
        {offset: '50%', color: 'rgb(255, 255, 255)', opacity: 0.9},
        {offset: '100%', color: 'rgb(255, 255, 255)', opacity: 0.85}];
      addOverlayGradient('overlay-gradient-left', stops);

      let rightEndOpacity = 0.85 + (0.95 - 0.85) * (rightWidth / leftWidth);
      stops = [{offset: '0%', color: 'rgb(255, 255, 255)', opacity: 0.85},
        {offset: '100%', color: 'rgb(255, 255, 255)', opacity: rightEndOpacity}];
      addOverlayGradient('overlay-gradient-right', stops);
    }
    
    addOverlayRect('overlay-gradient-right',
      rightStart + overlayRectOffset / 2 + 0.5,
      0, rightWidth, height + svgPaddings.top);
    
    addOverlayRect('overlay-gradient-left',
      nodeCoordinate[0][0].x - overlayRectOffset / 2,
      0, leftWidth, height + svgPaddings.top);

    svg.selectAll('rect.overlay')
      .on('click', emptySpaceClicked);
    
    // Add underneath rectangles
    let underGroup = svg.select('g.underneath');
    let padding = 7;
    for (let n = 0; n < cnn[curLayerIndex - 1].length; n++) {
      underGroup.append('rect')
        .attr('class', 'underneath-gateway')
        .attr('id', `underneath-gateway-${n}`)
        .attr('x', nodeCoordinate[curLayerIndex - 1][n].x - padding)
        .attr('y', nodeCoordinate[curLayerIndex - 1][n].y - padding)
        .attr('width', (2 * nodeLength + hSpaceAroundGap) + 2 * padding)
        .attr('height', nodeLength + 2 * padding)
        .attr('rx', 10)
        .style('fill', 'rgba(160, 160, 160, 0.3)')
        .style('opacity', 0);
      
      // Update the event functions for these two layers
      svg.select(`g#layer-${curLayerIndex - 1}-node-${n}`)
        .style('pointer-events', 'all')
        .style('cursor', 'pointer')
        .on('mouseover', actPoolDetailViewPreNodeMouseOverHandler)
        .on('mouseleave', actPoolDetailViewPreNodeMouseLeaveHandler)
        .on('click', actPoolDetailViewPreNodeClickHandler);
    }
    underGroup.lower();

    // Highlight the selcted pair
    underGroup.select(`#underneath-gateway-${i}`)
      .style('opacity', 1);
  }

  const quitIntermediateView = (curLayerIndex, g, i) => {
    intermediateRelayoutToken++;
    // If it is the softmax detail view, quit that view first
    if (isInSoftmax) {
      svg.select('.logit-layer').remove();
      svg.select('.logit-layer-lower').remove();
      svg.selectAll('.plus-symbol-clone').remove();

      // Instead of removing the paths, we hide them, so it is faster to load in
      // the future
      svg.select('.underneath')
        .selectAll('.logit-lower')
        .style('opacity', 0);

      softmaxDetailViewStore.set({
          show: false,
          logits: []
      })

      allowsSoftmaxAnimationStore.set(false);
    }
    isInSoftmaxStore.set(false);
    isInIntermediateView = false;

    // Recover control panel UI
    disableControl = false;

    // Recover the input layer node's event
    for (let n = 0; n < cnn[curLayerIndex - 1].length; n++) {

      svg.select(`g#layer-${curLayerIndex - 1}-node-${n}`)
        .on('mouseover', nodeMouseOverHandler)
        .on('mouseleave', nodeMouseLeaveHandler)
        .on('click', nodeClickHandler);
    }
    

    // Clean up the underneath rects
    svg.select('g.underneath')
      .selectAll('rect')
      .remove();
    detailedViewNum = undefined;

    // Highlight the previous layer and this node
    svg.select(`g#cnn-layer-group-${curLayerIndex - 1}`)
      .selectAll('rect.bounding')
      .style('stroke-width', 1);
    
    d3.select(g[i])
      .select('rect.bounding')
      .style('stroke-width', 1);

    // Highlight the labels
    svg.selectAll(`g#layer-label-${curLayerIndex - 1},
      g#layer-detailed-label-${curLayerIndex - 1},
      g#layer-label-${curLayerIndex},
      g#layer-detailed-label-${curLayerIndex}`)
      .style('font-weight', 'normal');

    // Also unclick the node
    // Record the current clicked node
    selectedNode.layerName = '';
    selectedNode.index = -1;
    selectedNode.data = null;
    isExitedFromCollapse = true;

    // Remove the intermediate layer
    let intermediateLayer = svg.select('g.intermediate-layer');

    // Kill the infinite animation loop
    shouldIntermediateAnimateStore.set(false);

    intermediateLayer.transition('remove')
      .duration(500)
      .ease(d3.easeCubicInOut)
      .style('opacity', 0)
      .on('end', (d, i, g) => { d3.select(g[i]).remove()});
    
    // Remove the output node overlay mask
    svg.selectAll('.overlay-group').remove();
    
    // Remove the overlay rect
    svg.selectAll('g.intermediate-layer-overlay, g.intermediate-layer-annotation')
      .transition('remove')
      .duration(500)
      .ease(d3.easeCubicInOut)
      .style('opacity', 0)
      .on('end', (d, i, g) => {
        svg.selectAll('g.intermediate-layer-overlay, g.intermediate-layer-annotation').remove();
        svg.selectAll('defs.overlay-gradient').remove();
      });
    
    // Recover the layer if we have drdrawn it
    if (needRedraw[0] !== undefined) {
      let redrawRange = cnnLayerRanges[selectedScaleLevel][needRedraw[0]];
      if (needRedraw[1] !== undefined) {
        svg.select(`g#layer-${needRedraw[0]}-node-${needRedraw[1]}`)
          .select('image.node-image')
          .each((d, i, g) => drawOutput(d, i, g, redrawRange));
      } else {
        svg.select(`g#cnn-layer-group-${needRedraw[0]}`)
          .selectAll('image.node-image')
          .each((d, i, g) => drawOutput(d, i, g, redrawRange));
      }
    }
    
    // Move all layers to their original place
    for (let i = 0; i < nodeCoordinate.length; i++) {
      moveLayerX({layerIndex: i, targetX: nodeCoordinate[i][0].x,
        disable:false, delay:500, opacity: 1});
    }

    const lastLayerIndex = nodeCoordinate.length - 1;
    moveLayerX({layerIndex: lastLayerIndex,
      targetX: nodeCoordinate[lastLayerIndex][0].x, opacity: 1,
      disable:false, delay:500, onEndFunc: () => {
        // Show all edges on the last moving animation end
        svg.select('g.edge-group')
          .style('visibility', 'visible');

        // Recover the input annotation
        svg.select('.input-annotation')
          .classed('hidden', false);
        if (intermediateFooterReserved) {
          intermediateFooterReserved = false;
          svg.select('g.cnn-group').remove();
          const restoredGroup = svg.append('g').attr('class', 'cnn-group');
          drawCNN(width, height, restoredGroup, nodeMouseOverHandler,
            nodeMouseLeaveHandler, nodeClickHandler);
        }
      }});
    
    svg.select(`g#cnn-layer-group-${curLayerIndex - 1}`)
    .selectAll('g.node-group')
    .each((sd, si, sg) => {
      // Recover the old events
      d3.select(sg[si])
        .style('pointer-events', 'all')
        .on('mouseover', nodeMouseOverHandler)
        .on('mouseleave', nodeMouseLeaveHandler)
        .on('click', nodeClickHandler);
    });
    svg.select(`g#cnn-layer-group-${curLayerIndex}`)
    .selectAll('g.node-group')
    .each((sd, si, sg) => {
      d3.select(sg[si])
        .style('pointer-events', 'all')
        .on('mouseover', nodeMouseOverHandler)
        .on('mouseleave', nodeMouseLeaveHandler)
        .on('click', nodeClickHandler);
  });
  }




  const nodeClickHandler = (d, i, g) => {
    d3.event.stopPropagation();
    let nodeIndex = d.index;

    // Record the current clicked node
    selectedNode.layerName = d.layerName;
    selectedNode.index = d.index;
    selectedNode.data = d;
    selectedNode.domI = i;
    selectedNode.domG = g;
    
    // Record data for detailed view.
    if (d.type === 'conv' || d.type === 'relu' || d.type === 'pool' || d.type === 'norm') {
      let data = [];
      for (let j = 0; j < d.inputLinks.length; j++) {
          data.push({
            input: d.inputLinks[j].source.output,
            kernel: d.inputLinks[j].weight,
            output: d.inputLinks[j].dest.output,
          })
      }
      if (d.type === 'conv') {
        const kernelExtents = d.inputLinks.map(link => getExtent(link.weight));
        const kernelExtent = kernelExtents.reduce((acc, cur) => [
          Math.min(acc[0], cur[0]),
          Math.max(acc[1], cur[1])
        ]);
        data.kernelMinMax = {
          min: kernelExtent[0],
          max: kernelExtent[1]
        };
        data.kernelRange =
          2 * (Math.round(Math.max(...kernelExtent.map(Math.abs)) * 1000) / 1000);
      }
      let curLayerIndex = layerIndexDict[d.layerName];
      data.colorRange = cnnLayerRanges[selectedScaleLevel][curLayerIndex];
      data.isInputInputLayer = curLayerIndex <= 1;
      data.mean = d.inputLinks[0].mean;
      data.variance = d.inputLinks[0].variance;
      data.gamma = d.inputLinks[0].gamma;
      data.beta = d.inputLinks[0].beta;
      data.epsilon = d.inputLinks[0].epsilon;
      nodeData = data;
    }


    let curLayerIndex = layerIndexDict[d.layerName];

    if ((d.layerName.includes("_out") || d.type === 'norm') && isInIntermediateView) {
      quitIntermediateView(curLayerIndex, g, i);
    }
    
    if (d.type === 'relu' || d.type === 'pool' || d.type === 'norm') {
      isExitedFromDetailedView = false;
      if (!isInActPoolDetailView) {
        // Enter the act pool detail view
        enterDetailView(curLayerIndex, d.index);
      } else {
        if (d.index === actPoolDetailViewNodeIndex) {
          // Quit the act pool detail view
          quitActPoolDetailView();
        } else {
          // Switch the detail view input to the new clicked pair

          // Remove the previous selection effect
          svg.select(`g#layer-${curLayerIndex}-node-${actPoolDetailViewNodeIndex}`)
            .select('rect.bounding')
            .classed('hidden', true);

          svg.select(`g#layer-${curLayerIndex - 1}-node-${actPoolDetailViewNodeIndex}`)
            .select('rect.bounding')
            .classed('hidden', true);
          
          let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
      
          edgeGroup.selectAll(`path.edge-${curLayerIndex}-${actPoolDetailViewNodeIndex}`)
            .transition()
            .ease(d3.easeCubicOut)
            .duration(200)
            .style('stroke', edgeInitColor)
            .style('stroke-width', edgeStrokeWidth)
            .style('opacity', edgeOpacity);
          
          let underGroup = svg.select('g.underneath');
          underGroup.select(`#underneath-gateway-${actPoolDetailViewNodeIndex}`)
            .style('opacity', 0);
        
          // Add selection effect on the new selected pair
          svg.select(`g#layer-${curLayerIndex}-node-${nodeIndex}`)
            .select('rect.bounding')
            .classed('hidden', false);

          svg.select(`g#layer-${curLayerIndex - 1}-node-${nodeIndex}`)
            .select('rect.bounding')
            .classed('hidden', false);

          edgeGroup.selectAll(`path.edge-${curLayerIndex}-${nodeIndex}`)
            .raise()
            .transition()
            .ease(d3.easeCubicInOut)
            .duration(400)
            .style('stroke', edgeHoverColor)
            .style('stroke-width', '1')
            .style('opacity', 1);

          underGroup.select(`#underneath-gateway-${nodeIndex}`)
            .style('opacity', 1);

          actPoolDetailViewNodeIndex = nodeIndex;
        }
      }
    }

    // Enter the second view (layer-view) when user clicks a conv node
    if ((d.type === 'conv' || d.layerName === 'output') && !isInIntermediateView) {
      // Keep the original legend locations in a clear footer within the same
      // canvas. Only neuron spacing changes while a detail diagram is open.
      const footerReserve = d.layerName === 'conv_1' ? 70 : 60;
      const canvasBounds = wholeSvg.node().getBoundingClientRect();
      width = canvasBounds.width - svgPaddings.left - svgPaddings.right;
      height = canvasBounds.height - svgPaddings.top - svgPaddings.bottom;
      intermediateFooterReserved = true;
      svg.select('g.cnn-group').remove();
      const detailGroup = svg.append('g').attr('class', 'cnn-group');
      drawCNN(width, height - footerReserve, detailGroup, nodeMouseOverHandler,
        nodeMouseLeaveHandler, nodeClickHandler);
      g = svg.select(`#cnn-layer-group-${curLayerIndex}`).selectAll('g.node-group').nodes();
      i = nodeIndex;
      selectedNode.domG = g;
      selectedNode.domI = i;
      prepareToEnterIntermediateView(d, g, nodeIndex, curLayerIndex);
      if (d.layerName === 'conv_1') {
        drawConv1(curLayerIndex, d, nodeIndex, width, height,
          intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
          intermediateNodeClicked);
      }
      else if (d.layerName === 'output') {
        drawFlatten(curLayerIndex, d, nodeIndex, width, height);
      }
    }
    // Quit the layerview
    else if ((d.type === 'conv' || d.layerName === 'output') && isInIntermediateView) {
        quitIntermediateView(curLayerIndex, g, i);
    }
}

  const nodeMouseOverHandler = (d, i, g) => {
    if (isInIntermediateView) { return; }

    // Highlight the edges
    let layerIndex = layerIndexDict[d.layerName];
    let nodeIndex = d.index;
    let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
    
    edgeGroup.selectAll(`path.edge-${layerIndex}-${nodeIndex}`)
      .raise()
      .transition()
      .ease(d3.easeCubicInOut)
      .duration(400)
      .style('stroke', edgeHoverColor)
      .style('stroke-width', '1')
      .style('opacity', 1);
    
    // Highlight its border
    d3.select(g[i]).select('rect.bounding')
      .classed('hidden', false);
    
    // Highlight source's border
    if (d.inputLinks.length === 1) {
      let link = d.inputLinks[0];
      let layerIndex = layerIndexDict[link.source.layerName];
      let nodeIndex = link.source.index;
      svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
        .select('rect.bounding')
        .classed('hidden', false);
    } else {
      svg.select(`g#cnn-layer-group-${layerIndex - 1}`)
        .selectAll('g.node-group')
        .selectAll('rect.bounding')
        .classed('hidden', false);
    }

    // Highlight the output text
    if (d.layerName === 'output') {
      d3.select(g[i])
        .select('.output-text')
        .style('opacity', 0.8)
        .style('text-decoration', 'underline');
    }
  }

  const nodeMouseLeaveHandler = (d, i, g) => {
    if (isInIntermediateView) { return; }
    
    // Keep the highlight if user has clicked
    if (isInActPoolDetailView || (
      d.layerName !== selectedNode.layerName ||
      d.index !== selectedNode.index)){
      let layerIndex = layerIndexDict[d.layerName];
      let nodeIndex = d.index;
      let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
      
      edgeGroup.selectAll(`path.edge-${layerIndex}-${nodeIndex}`)
        .transition()
        .ease(d3.easeCubicOut)
        .duration(200)
        .style('stroke', edgeInitColor)
        .style('stroke-width', edgeStrokeWidth)
        .style('opacity', edgeOpacity);

      d3.select(g[i]).select('rect.bounding').classed('hidden', true);

      if (d.inputLinks.length === 1) {
        let link = d.inputLinks[0];
        let layerIndex = layerIndexDict[link.source.layerName];
        let nodeIndex = link.source.index;
        svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
          .select('rect.bounding')
          .classed('hidden', true);
      } else {
        svg.select(`g#cnn-layer-group-${layerIndex - 1}`)
          .selectAll('g.node-group')
          .selectAll('rect.bounding')
          .classed('hidden', d => d.layerName !== selectedNode.layerName ||
            d.index !== selectedNode.index);
      }

      // Dehighlight the output text
      if (d.layerName === 'output') {
        d3.select(g[i])
          .select('.output-text')
          .style('fill', 'black')
          .style('opacity', 1)
          .style('text-decoration', 'none');
      }

    }
  }

  const relayoutIntermediateView = async (nextWidth, nextHeight) => {
    const data = selectedNode.data;
    const nodeIndex = selectedNode.index;
    const layerIndex = layerIndexDict[selectedNode.layerName];
    if (!data) return;
    const token = ++intermediateRelayoutToken;
    const reopenSoftmax = data.layerName === 'output' && $allowsSoftmaxAnimationStore;
    const formulaWasVisible = softmaxDetailViewInfo.show || (!isInSoftmax && reopenSoftmax);
    width = nextWidth;
    height = nextHeight;

    shouldIntermediateAnimateStore.set(false);
    allowsSoftmaxAnimationStore.set(false);
    svg.selectAll('g.intermediate-layer, g.intermediate-layer-overlay, g.intermediate-layer-annotation')
      .each((d, i, groups) => {
        const group = d3.select(groups[i]);
        group.selectAll('*').interrupt('move').interrupt('softmax')
          .interrupt('softmax-edge').interrupt();
        group.interrupt('move').interrupt('softmax').interrupt().remove();
      });
    svg.selectAll('defs.overlay-gradient').remove();
    svg.select('g.underneath').selectAll('*').remove();
    isInSoftmaxStore.set(false);
    softmaxDetailViewStore.set({ show: false, logits: [] });

    svg.select('g.cnn-group').remove();
    const resizedGroup = svg.append('g').attr('class', 'cnn-group');
    const footerReserve = data.layerName === 'conv_1' ? 70 : 60;
    drawCNN(width, height - footerReserve, resizedGroup, nodeMouseOverHandler,
      nodeMouseLeaveHandler, nodeClickHandler);
    const groups = svg.select(`#cnn-layer-group-${layerIndex}`).selectAll('g.node-group').nodes();
    selectedNode.domG = groups;
    selectedNode.domI = nodeIndex;
    prepareToEnterIntermediateView(data, groups, nodeIndex, layerIndex);
    if (data.layerName === 'conv_1') {
      drawConv1(layerIndex, data, nodeIndex, width, height,
        intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
        intermediateNodeClicked);
    } else {
      drawFlatten(layerIndex, data, nodeIndex, width, height);
    }

    if (reopenSoftmax) {
      // Finish the 500 ms layer movement before restoring the Softmax stage.
      await new Promise(resolve => setTimeout(resolve, 550));
      if (token !== intermediateRelayoutToken || !isInIntermediateView ||
        selectedNode.data !== data) return;
      svg.select('.softmax-symbol')
        .attr('data-detail-hidden', formulaWasVisible ? null : 'true')
        .dispatch('click');
    }
  };

  onMount(async () => {
    try {
      // Create SVG
      wholeSvg = d3.select(overviewComponent)
        .select('#cnn-svg');
      svg = wholeSvg.append('g')
        .attr('class', 'main-svg')
        .attr('transform', `translate(${svgPaddings.left}, 0)`);
      svgStore.set(svg);

      width = Number(wholeSvg.style('width').replace('px', '')) -
        svgPaddings.left - svgPaddings.right;
      height = Number(wholeSvg.style('height').replace('px', '')) -
        svgPaddings.top - svgPaddings.bottom;


      let cnnGroup = svg.append('g')
        .attr('class', 'cnn-group');

      let underGroup = svg.append('g')
        .attr('class', 'underneath');

      let svgYMid = +wholeSvg.style('height').replace('px', '') / 2;
      detailedViewAbsCoords = {
        1 : [600, 100 + svgYMid - 220 / 2, 490, 290],
        2: [500, 100 + svgYMid - 220 / 2, 490, 290],
        3 : [700, 100 + svgYMid - 220 / 2, 490, 290],
        4: [600, 100 + svgYMid - 220 / 2, 490, 290],
        5: [650, 100 + svgYMid - 220 / 2, 490, 290],
        6 : [850, 100 + svgYMid - 220 / 2, 490, 290],
        7 : [100, 100 + svgYMid - 220 / 2, 490, 290],
        8 : [60, 100 + svgYMid - 220 / 2, 490, 290],
        9 : [200, 100 + svgYMid - 220 / 2, 490, 290],
        10 : [300, 100 + svgYMid - 220 / 2, 490, 290],
      }

      // Define global arrow marker end
      svg.append("defs")
        .append("marker")
        .attr("id", 'marker')
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 6)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .style('stroke-width', 1.2)
        .style('fill', 'gray')
        .style('stroke', 'gray')
        .attr("d", "M0,-5L10,0L0,5");

      // Alternative arrow head style for non-interactive annotation
      svg.append("defs")
        .append("marker")
        .attr("id", 'marker-alt')
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 6)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .style('fill', 'none')
        .style('stroke', 'gray')
        .style('stroke-width', 2)
        .attr("d", "M-5,-10L10,0L-5,10");

      
      await initializeRunCatalog();
      const dataPath = $trainingDataPathStore;
      model_name = $model_nameStore;
      updateSelectedEpoch(model_name);
      previousModelKey = `${dataPath}|${model_name}`;
      // Keep configuration switching usable even if this first ONNX load fails.
      overviewReady = true;
      // Add timestamp to bypass browser cache
      const cacheBuster = Date.now();
      model = await loadTrainedModel(`${dataPath}/${model_name}.onnx?v=${cacheBuster}`);
      await loadACCTStatistics(dataPath);
      setCheckpointACCTWeights();
      
      cnn = await constructCNN(demoImageURL($imageRootStore, selectedImage, $imageVersionStore), model, model_name, dataPath);
      loadedModelKey = `${dataPath}|${model_name}`;
      
      cnnStore.set(cnn);

      // Ignore the flatten layer for now
      let flatten = cnn[cnn.length - 2];
      cnn.splice(cnn.length - 2, 1);
      cnn.flatten = flatten;
     
      updateCNNLayerRanges();     
      // Create and draw the CNN view
      drawCNN(width, height, cnnGroup, nodeMouseOverHandler,
        nodeMouseLeaveHandler, nodeClickHandler);
      acctResizeObserver = new ResizeObserver(() => {
        if (isModelLoading || $runLoadingStore) return;
        if (acctResizeFrame !== undefined) cancelAnimationFrame(acctResizeFrame);
        acctResizeFrame = requestAnimationFrame(() => {
          acctResizeFrame = undefined;
          if (isModelLoading || $runLoadingStore) return;
          const canvasBounds = wholeSvg.node().getBoundingClientRect();
          const nextWidth = canvasBounds.width - svgPaddings.left - svgPaddings.right;
          const nextHeight = canvasBounds.height - svgPaddings.top - svgPaddings.bottom;
          if (Math.abs(nextWidth - width) > 0.5 || Math.abs(nextHeight - height) > 0.5) {
            if (isInIntermediateView) {
              relayoutIntermediateView(nextWidth, nextHeight);
              return;
            }
            if (disableControl) return;
            // Keep Output and its ACCT connector in the same coordinate system
            // when the overview changes size; weights and model data stay intact.
            width = nextWidth;
            height = nextHeight;
            svg.select('g.cnn-group').remove();
            const resizedGroup = svg.append('g').attr('class', 'cnn-group');
            drawCNN(width, height, resizedGroup, nodeMouseOverHandler,
              nodeMouseLeaveHandler, nodeClickHandler);
          } else if (!disableControl) {
            updateThresholds();
          }
        });
      });
      acctResizeObserver.observe(wholeSvg.node());
      acctResizeObserver.observe(overviewComponent.querySelector('.slider-group'));
      overviewReady = true;
    } catch (error) {
      console.error('Failed to initialize the model overview:', error);
      runErrorStore.set(error.message);
    } finally {
      isModelLoading = false;
    }
  })

  // Add new state for image selection modal
  let showImageSelectionModal = false;
  let showUploadModal = false;

  const selectExistingImageClicked = () => {
    showImageSelectionModal = true;
  }

  const uploadNewImageClicked = () => {
    showUploadModal = true;
  }

  const handleImageSelection = async (event) => {
    const imageName = event.detail.imageName;
    showImageSelectionModal = false;
    
    // Directly execute the image change logic
    customImage = false;
    customImageStore.set(customImage);

    if (imageName !== selectedImage) {
      selectedImage = imageName;
      selectedImageStore.set(imageName);
      isModelLoading = true;
      modelColorDomainStore.set(null);

      try {
        cnn = await constructCNN(demoImageURL($imageRootStore, selectedImage, $imageVersionStore), model, model_name);

        let flatten = cnn[cnn.length - 2];
        cnn.splice(cnn.length - 2, 1);
        cnn.flatten = flatten;
        cnnStore.set(cnn);

        updateCNNLayerRanges();
        updateCNN();
      } catch (error) {
        console.error('Failed to load the selected image:', error);
      } finally {
        isModelLoading = false;
      }
    }
  }

  const handleImageSelectionCanceled = () => {
    showImageSelectionModal = false;
  }

  const handleUploadModalCanceled = () => {
    showUploadModal = false;
  }

  const getImageDisplayName = (imageName) => {
    const imageOption = imageOptions.find(img => img.file === imageName);
    return imageOption ? imageOption.class : imageName;
  }

  const handleModalCanceled = (event) => {
    // User cancels the modal without a successful image, so we restore the
    // previous selected image as input
    selectedImage = event.detail.preImage;
  }

  // Handle Image Logistic
  const handleCustomImage = async (event) => {
    // User gives a valid image URL
    customImageURL = event.detail.url;
    isModelLoading = true;
    modelColorDomainStore.set(null);

    try {
      cnn = await constructCNN(customImageURL, model, model_name);

      let flatten = cnn[cnn.length - 2];
      cnn.splice(cnn.length - 2, 1);
      cnn.flatten = flatten;
      cnnStore.set(cnn);

      let customImageSlot = d3.select(overviewComponent)
        .select('.custom-image').node();
      drawCustomImage(customImageSlot, cnn[0]);

      updateCNNLayerRanges();
      updateCNN();
    } catch (error) {
      console.error('Failed to load the uploaded image:', error);
    } finally {
      isModelLoading = false;
    }
  }

  function handleExitFromDetiledConvView(event) {
    if (event.detail.text) {
      detailedViewNum = undefined;
      svg.select(`rect#underneath-gateway-${selectedNodeIndex}`)
        .style('opacity', 0);
      selectedNodeIndex = -1; 
    }
  }

  function handleExitFromDetiledPoolView(event) {
    if (event.detail.text) {
      quitActPoolDetailView();
      isExitedFromDetailedView = true;
    }
  }

  function handleExitFromDetiledActivationView(event) {
    if (event.detail.text) {
      quitActPoolDetailView();
      isExitedFromDetailedView = true;
    }
  }

  function handleExitFromDetiledNormalizationView(event) {
    if (event.detail.text) {
      quitActPoolDetailView();
      isExitedFromDetailedView = true;
    }
  }

  function handleExitFromDetiledSoftmaxView(event) {
    softmaxDetailViewInfo.show = false;
    softmaxDetailViewStore.set(softmaxDetailViewInfo);
  }

</script>

<style>
  .overview {
    padding: 0;
    height: 100%;
    width: 100%;
    display: flex;
    position: relative;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    border-right: 2px solid #c0c0c0;
    border-left: 2px solid #c0c0c0;
  }

  .overview-header {
    width: 100%;
    padding: 6px 6px 0px 8px;
    border-bottom: 2px solid #c0c0c0;
    margin-bottom: 5px;
  }

  .header-controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .header-left-controls {
    display: flex;
    align-items: center;
    gap: 15px;
    flex-wrap: wrap;
    flex: 1;
  }

  .header-right-controls {
    display: flex;
    align-items: center;
    gap: 15px;
    flex: 1;
    justify-content: flex-end;
    padding-right: 20px;
    box-sizing: border-box;
  }

  .model-color-legend {
    flex: 0 0 auto;
    margin-right: clamp(20px, 1vw, 40px);
    display: flex;
    flex-direction: column;
    gap: 2px;
    color: #4a4a4a;
    font-size: 12px;
    line-height: 14px;
    font-variant-numeric: tabular-nums;
  }

  .model-color-legend-title {
    text-align: center;
    font-weight: 500;
  }

  .model-color-legend-scale {
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  .model-color-bar {
    width: clamp(100px, 5vw, 200px);
    height: 10px;
    border: 0.5px solid #bbb;
  }

  .overview-title {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin: 0;
    letter-spacing: 0.5px;
    text-align: center;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .overview-title-cluster {
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .header-dimension-note {
    position: absolute;
    right: calc(100% + 80px);
    top: 50%;
    transform: translateY(-25%);
    width: max-content;
    color: #000000;
    font-size: 14px;
    font-style: italic;
    line-height: 1.2;
    white-space: nowrap;
  }

  .image-selection-buttons {
    display: flex;
    gap: 10px;
  }

  .current-image-display {
    display: flex;
    align-items: center;
    margin-top: -4px;
  }

  .current-image-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 5px;
    background: #ffffff;
    border-radius: 6px;
    border: 1px solid #ddd;
  }

  .current-image-thumb {
    width: 32px;
    height: 32px;
    object-fit: cover;
    border-radius: 4px;
  }

  .current-image-name {
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }

  .cnn {
    width: 100%;
    padding: 0;
    background: #ffffff;
    display: flex;
    position: relative;
  }

  .loss-button {
    flex: 0 0 56px;
    width: 56px;
    height: 28px;
    padding: 0 4px;
    border: 1px solid #a8bbc8;
    border-radius: 4px;
    background: #fff;
    color: #000;
    font-size: 16px;
    font-family: inherit;
    font-weight: 600;
    line-height: 26px;
    cursor: pointer;
  }

  .loss-button:hover { background: #e8f1f7; border-color: #527d98; }
  .loss-button:focus-visible { outline: 2px solid #246a9a; outline-offset: 2px; }

  .cnn.model-loading :global(.gradcam-color-legend),
  .cnn.model-loading :global(.gradcam-node-image) {
    visibility: hidden;
  }

  .cnn.model-loading > svg, .cnn.model-error > svg {
    visibility: hidden;
    pointer-events: none;
  }

  .model-status {
    position: absolute;
    top: 45%;
    left: 20%;
    right: 20%;
    text-align: center;
    color: #285b7a;
    font-size: 16px;
  }

  svg {
    margin: 0 auto;
    min-height: 575px;
    max-height: 580px;
    width: 100vw;
  }
  

  .is-very-small {
    font-size: 12px;
  }


  :global(canvas) {
    image-rendering: crisp-edges;
  }

  :global(.layer-label), :global(.layer-detailed-label), :global(.layer-intermediate-label) {
    font-size: 12px;
    opacity: 0.8;
    text-anchor: middle;
  }

  :global(.colorLegend) {
    font-size: 10px;
  }

  :global(.legend) {
    transition: opacity 400ms ease-in-out;
  }

  :global(.legend > rect) {
    opacity: 1;
  }

  :global(.legend text), :global(.legend line), :global(.legend path) {
    opacity: 0.7;
  }

  :global(.hidden) {
    opacity: 0;
    pointer-events: none;
  }

  :global(.very-strong) {
    stroke-width: 3px;
  }

  :global(.bounding), :global(.edge), :global(.edge-group),
  :global(foreignObject), :global(.bounding-flatten),
  :global(.underneath-gateway), :global(.input-annotation) {
    transition: opacity 300ms ease-in-out;
  }

  :global(rect.bounding) {
    transition: stroke-width 800ms ease-in-out, opacity 300ms ease-in-out;
  }

  :global(.annotation-text) {
    pointer-events: none;
    font-size: 10px;
    font-style: italic;
    fill: gray;
  }

  .field.is-grouped .control .label.is-small {
    font-size: 0.75rem;
    font-weight: 500;
    color: #4a4a4a;
    margin-bottom: 0;
    margin-right: 0.5rem;
    white-space: nowrap;
    display: flex;
    align-items: center;
    height: 2rem;
  }

  .header-right-controls .field.is-grouped.is-grouped-centered {
    flex: 0 0 auto;
    align-items: center;
    height: 30px;
    margin: 0;
  }

  .header-right-controls .field.is-grouped .control {
    display: flex;
    align-items: center;
    height: 30px;
  }

  .header-right-controls .field.is-grouped .control .label.is-small {
    height: 30px;
  }

  .header-right-controls .select,
  .header-right-controls .select select#epoch-select {
    width: 165px;
    height: 28px;
    min-height: 28px;
  }

  .header-right-controls .select select#epoch-select {
    padding: 3px 26px 3px 27px;
    font-size: 15px !important;
    line-height: 20px;
  }

  .header-right-controls .control.has-icons-left .icon.is-left {
    width: 27px;
    height: 28px;
    font-size: 10px;
  }


  /* Change the cursor style on the detailed view input and output matrices */
  :global(rect.square) {
    cursor: crosshair;
  }

  :global(.animation-control-button) {
    font-family: FontAwesome;
    opacity: 0.8;
    cursor: pointer;
  }



  :global(#explainer) .cnn .slider-group {
    --acct-track-width: 100% !important;
    --acct-track-height: 5px !important;
    --acct-thumb-size: 10px !important;
    position: absolute;
    top: 52px;
    right: 16px;
    width: clamp(228px, calc(10.5vw - 32px), 368px);
    max-width: calc(100% - 32px);
    display: flex;
    flex-direction: column;
    gap: 6px !important;
    font-size: 16px;
    will-change: transform;
  }

  :global(#explainer) .cnn .acct-reset {
    position: absolute;
    top: -40px;
    right: 0;
    width: 56px;
    height: 32px;
    padding: 0;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #fff;
    color: #243958;
    font-family: inherit;
    font-size: 14px !important;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
  }

  .acct-reset:hover:not(:disabled) {
    background: #edf3fc;
    border-color: #87a9d9;
  }

  .acct-reset:focus-visible {
    outline: 2px solid #0075ff;
    outline-offset: 2px;
  }

  .acct-reset:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .slider-control {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) 48px;
    align-items: center;
    gap: 8px;
    flex: 0 0 42px;
    width: 100%;
    height: 42px;
    padding: 0;
  }

  .slider-group .slider-name {
    font-size: 20px !important;
    line-height: 1;
    color: #000;
    text-align: center;
    font-weight: 600;
  }

  .slider-label-range {
    display: grid;
    grid-template-columns: 14px minmax(0, 1fr) 14px;
    gap: 6px;
    align-items: center;
    min-width: 0;
  }

  .slider-group .slider-min, .slider-group .slider-max {
    font-size: 14px !important;
    line-height: 1;
    color: #000;
    text-align: center;
  }

  .slider-group .slider-value-display {
    display: block;
    box-sizing: border-box;
    width: 48px;
    padding: 5px 2px;
    background: #f0f5fc;
    border: 1px solid #d9e3f0;
    border-radius: 6px;
    color: #243958;
    font-size: 17px !important;
    font-weight: 600;
    line-height: 18px;
    text-align: center;
    white-space: nowrap;
  }

  .small-slider {
    display: block;
    width: 100%;
    min-width: 0;
    height: var(--acct-track-height);
    margin: 0;
    padding: 0;
    -webkit-appearance: none;
    border-radius: 4px;
    outline: none;
    background: linear-gradient(to right, #0075ff 0%, #0075ff var(--fill-percent),
      #ddd var(--fill-percent), #ddd 100%);
  }

  :global(#explainer) .cnn .small-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: var(--acct-thumb-size) !important;
    height: var(--acct-thumb-size) !important;
    background: #0075ff;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }

  :global(#explainer) .cnn .small-slider::-moz-range-thumb {
    width: var(--acct-thumb-size) !important;
    height: var(--acct-thumb-size) !important;
    background: #0075ff;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }

  :global(#cnn-svg .acct-title.acct-chain-title) {
    font-size: var(--acct-title-font-size, 20px) !important;
  }

  /* Every computation view is centred within the model-structure region.
     The host itself ignores pointer events while the visible popup remains
     fully interactive, so an empty detail host never blocks the system. */
  #detailview {
    position: absolute !important;
    inset: 0 !important;
    z-index: 1000;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  #detailview :global(.container),
  #detailview :global(.box) {
    pointer-events: auto;
  }

  /* Pooling and Softmax expose a Bulma `.container` as their component root.
     Bulma otherwise expands that root to a desktop max-width, leaving the
     visible box aligned to its left edge even though the root is centred. */
  #detailview > :global(.container) {
    width: max-content;
    max-width: calc(25vw - 24px);
    margin: 0;
    justify-content: center;
  }

  #detailview > :global(.container.pooling-popup) {
    flex: 0 1 720px;
    width: 720px;
    max-width: calc(100% - 24px);
  }

  #detailview :global(.box) {
    max-height: calc(100% - 24px);
    overflow: auto;
    margin: 0;
  }

  :global(image.node-image) {
    image-rendering: crisp-edges;
    image-rendering: pixelated;
  }


  .button.is-small{
    height: 30px;
  }



</style>

<div class="overview"
  bind:this={overviewComponent}>

  <div class="overview-header">
    <div class="header-controls-row">
      <div class="header-left-controls">
        <div class="image-selection-buttons">
          <button class="button is-small is-primary"
            disabled={disableControl || isModelLoading || $runLoadingStore || !!$runErrorStore}
            on:click={selectExistingImageClicked}>
            <span class="icon">
              <i class="fas fa-images"></i>
            </span>
            <span>Select Image</span>
          </button>

          <button class="button is-small is-info"
            disabled={disableControl || isModelLoading || $runLoadingStore || !!$runErrorStore}
            on:click={uploadNewImageClicked}>
            <span class="icon">
              <i class="fas fa-upload"></i>
            </span>
            <span>Upload Image</span>
          </button>
        </div>

        <div class="current-image-display" class:hidden={!selectedImage}>
          {#if selectedImage && selectedImage !== 'custom'}
            <div class="current-image-info">
              <img src={demoImageURL($imagePreviewRootStore, selectedImage, $imageVersionStore)} alt={getImageDisplayName(selectedImage)} class="current-image-thumb">
              <span class="current-image-name">{getImageDisplayName(selectedImage)}</span>
            </div>
          {:else if selectedImage === 'custom' && customImageURL}
            <div class="current-image-info">
              <img src="{customImageURL}" alt="Uploaded input" class="current-image-thumb">
              <span class="current-image-name">Custom Image</span>
            </div>
          {/if}
        </div>
      </div>

      <div class="overview-title-cluster">
        <span class="header-dimension-note">
          Note: H, W, and C represent Height, Width, and Channel, respectively.
        </span>
        <h1 class="overview-title">WideResNet Model Analysis</h1>
      </div>

      <div class="header-right-controls">
        <div class="model-color-legend"
          role="img"
          aria-label="Feature value color scale for the current checkpoint"
          data-model-name={$modelColorDomainStore ? $modelColorDomainStore.modelName : ''}
          data-color-min={$modelColorDomainStore ? $modelColorDomainStore.min : ''}
          data-color-max={$modelColorDomainStore ? $modelColorDomainStore.max : ''}
          title={$modelColorDomainStore
            ? `Current checkpoint feature maps: ${formatColorValue($modelColorDomainStore.min)} to ${formatColorValue($modelColorDomainStore.max)}`
            : 'Loading current checkpoint feature maps'}>
          <span class="model-color-legend-title">Feature Value</span>
          <div class="model-color-legend-scale">
            <span class="model-scale-min">{formatColorValue($modelColorDomainStore && $modelColorDomainStore.min)}</span>
            <div class="model-color-bar" style="background: {featureColorGradient}"></div>
            <span class="model-scale-max">{formatColorValue($modelColorDomainStore && $modelColorDomainStore.max)}</span>
          </div>
        </div>
        <div class="field is-grouped is-grouped-centered">
          <div class="control">
            <label class="label is-small" for="epoch-select">Select Training Epoch</label>
          </div>
          <div class="control is-very-small has-icons-left">
            <span class="icon is-left">
              <i class="fas fa-clock"></i>
            </span>
            <div class="select">
              <select bind:value={$model_nameStore} id="epoch-select"
                disabled={disableControl || isModelLoading || $runLoadingStore}>
                {#each $availableModelsStore as checkpoint (checkpoint.name)}
                  <option value={checkpoint.name}>{checkpoint.label}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>
        <button type="button" class="loss-button" aria-haspopup="dialog"
          aria-expanded={showLossPopup}
          on:click={() => showLossPopup = true}>Loss</button>
      </div>
    </div>
  </div>

  <div class="cnn" class:model-loading={isModelLoading || $runLoadingStore}
    class:model-error={!!$runErrorStore} aria-busy={isModelLoading || $runLoadingStore}
    data-loaded-model={loadedModelKey} data-selected-run={$trainingDataPathStore}>
    {#if $runErrorStore}
      <div class="model-status" role="alert">The selected model could not be loaded. Choose another configuration or checkpoint to retry.</div>
    {:else if isModelLoading || $runLoadingStore}
      <div class="model-status" role="status">Loading the selected trained model and its data…</div>
    {/if}
    <svg id="cnn-svg" >
    </svg>
    <div class="slider-group">
      <button type="button" class="acct-reset"
        disabled={isModelLoading || $runLoadingStore || !!$runErrorStore || disableControl}
        on:click={resetACCTWeights}>Reset</button>
      {#each weightControls as control (control.name)}
        <div class="slider-control" style="--fill-percent: {control.percent};">
          <div class="slider-name">{control.symbol}</div>
          <label class="slider-label-range">
            <span class="slider-min">{control.range.min}</span>
            <input type="range" min={control.range.min} max={control.range.max}
              step={control.range.step} value={control.value}
              aria-label="ACCT {control.name} weight"
              disabled={isModelLoading || $runLoadingStore || !!$runErrorStore || disableControl}
              on:input={(event) => changeACCTWeight(control.name, event)} class="small-slider" />
            <span class="slider-max">{control.range.max}</span>
          </label>
          <span class="slider-value-display">{Number(control.value).toFixed(2)}</span>
        </div>
      {/each}
    </div>
  </div>

  <div id='detailview'>
    {#if selectedNode.data && selectedNode.data.type === 'conv' && selectedNodeIndex != -1}
      <ConvolutionView on:message={handleExitFromDetiledConvView} input={nodeData[selectedNodeIndex].input} 
                        kernel={nodeData[selectedNodeIndex].kernel}
                        kernelMinMax={nodeData.kernelMinMax}
                        kernelColorRange={nodeData.kernelRange}
                        inputChannelIndex={selectedNodeIndex}
                        dataRange={nodeData.colorRange}
                        colorScale={nodeData.inputIsInputLayer ?
                          layerColorScales.input[0] : layerColorScales.conv}
                        isInputInputLayer={nodeData.inputIsInputLayer}
                        isExited={isExitedFromCollapse}/>
    {:else if selectedNode.data && selectedNode.data.type === 'relu'}
      <ActivationView on:message={handleExitFromDetiledActivationView} 
      input={nodeData[0].input} 
      output={nodeData[0].output}
      dataRange={nodeData.colorRange}
      isExited={isExitedFromDetailedView}/>
    {:else if selectedNode.data && selectedNode.data.type === 'norm'}
      <NormalizationView on:message={handleExitFromDetiledNormalizationView}
      input={nodeData[0].input}
      output={nodeData[0].output}
      dataRange={nodeData.colorRange}
      mean={nodeData.mean}
      variance={nodeData.variance}
      gamma={nodeData.gamma}
      beta={nodeData.beta}
      epsilon={nodeData.epsilon}
      isExited={isExitedFromDetailedView}/>
    {:else if selectedNode.data && selectedNode.data.type === 'pool'}
      <PoolView on:message={handleExitFromDetiledPoolView} input={nodeData[0].input} 
                kernelLength={2}
                dataRange={nodeData.colorRange}
                isExited={isExitedFromDetailedView}/>
    {:else if softmaxDetailViewInfo.show}
      <SoftmaxView logits={softmaxDetailViewInfo.logits}
                   logitColors={softmaxDetailViewInfo.logitColors}
                   selectedI={softmaxDetailViewInfo.selectedI}
                   highlightI={softmaxDetailViewInfo.highlightI}
                   outputName={softmaxDetailViewInfo.outputName}
                   outputValue={softmaxDetailViewInfo.outputValue}
                   startAnimation={softmaxDetailViewInfo.startAnimation}
                   on:xClicked={handleExitFromDetiledSoftmaxView}
                   on:mouseOver={softmaxDetailViewMouseOverHandler}
                   on:mouseLeave={softmaxDetailViewMouseLeaveHandler}/>
    {/if}
  </div>
  {#if showLossPopup}
    <LossPopup on:close={() => showLossPopup = false} />
  {/if}
</div>


<Plot />

<Modal on:xClicked={handleModalCanceled}
  on:urlTyped={handleCustomImage}/>

<ImageSelector 
  bind:show={showImageSelectionModal}
  {imageOptions}
  imageRoot={$imagePreviewRootStore}
  imageVersion={$imageVersionStore}
  {selectedImage}
  on:imageSelected={handleImageSelection}
  on:canceled={handleImageSelectionCanceled}
/>

<ImageUploader
  bind:show={showUploadModal}
  on:imageUploaded={handleCustomImage}
  on:canceled={handleUploadModalCanceled}
/>

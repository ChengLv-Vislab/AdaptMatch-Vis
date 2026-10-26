<script>
  import { createEventDispatcher } from 'svelte';
  import { array1d, getMatrixSliceFromOutputHighlights,
    compute_input_multiplies_with_weight, getVisualizationSizeConstraint,
    generateOutputMappings, getMatrixSliceFromInputHighlights, gridData
  } from './DetailviewUtils.js';
  import Dataview from './Dataview.svelte';

  export let stride;
  export let dilation
  export let kernelLength;
  export let image;
  export let output;
  export let isPaused;
  export let dataRange;

  const dispatch = createEventDispatcher();
  const padding = 0;
  const poolingMathCellSize = 44;
  const poolingMathFontSize = 14;
  let padded_input_size;
  $: padded_input_size = image.length + padding * 2;

  // Dummy data for original state of component.
  let testInputMatrixSlice = [];
  for (let i = 0; i < kernelLength; i++) {
    testInputMatrixSlice.push([]);
    for (let j = 0; j < kernelLength; j++) {
      testInputMatrixSlice[i].push(0)
    }
  }
  testInputMatrixSlice = gridData(testInputMatrixSlice, poolingMathCellSize)
  let testOutputMatrixSlice = gridData([[0]], poolingMathCellSize);

  let inputHighlights = [];
  let outputHighlights = array1d(output.length * output.length, (i) => true);
  let interval;
  let counter;

  function startMaxPool(stride) {
    counter = 0;
    let outputMappings = generateOutputMappings(stride, output, kernelLength, padded_input_size, dilation);
    if (stride <= 0) return;
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      if (isPaused) return;
      const flat_animated = counter % (output.length * output.length);
      outputHighlights = array1d(output.length * output.length, (i) => false);
      const animatedH = Math.floor(flat_animated / output.length);
      const animatedW = flat_animated % output.length;
      outputHighlights[animatedH * output.length + animatedW] = true;
      inputHighlights = compute_input_multiplies_with_weight(animatedH, animatedW, padded_input_size, kernelLength, outputMappings, kernelLength)
      const inputMatrixSlice = getMatrixSliceFromInputHighlights(image, inputHighlights, kernelLength);
      testInputMatrixSlice = gridData(inputMatrixSlice, poolingMathCellSize);
      const outputMatrixSlice = getMatrixSliceFromOutputHighlights(output, outputHighlights);
      testOutputMatrixSlice = gridData(outputMatrixSlice, poolingMathCellSize);
      counter++;
    }, 250)
  }

  function handleMouseover(event) {
    let outputMappings = generateOutputMappings(stride, output, kernelLength, padded_input_size, dilation);
    outputHighlights = array1d(output.length * output.length, (i) => false);
    const animatedH = event.detail.hoverH;
    const animatedW = event.detail.hoverW;
    outputHighlights[animatedH * output.length + animatedW] = true;
    inputHighlights = compute_input_multiplies_with_weight(animatedH, animatedW, padded_input_size, kernelLength, outputMappings, kernelLength)
    const inputMatrixSlice = getMatrixSliceFromInputHighlights(image, inputHighlights, kernelLength);
    testInputMatrixSlice = gridData(inputMatrixSlice, poolingMathCellSize);
    const outputMatrixSlice = getMatrixSliceFromOutputHighlights(output, outputHighlights);
    testOutputMatrixSlice = gridData(outputMatrixSlice, poolingMathCellSize);
    isPaused = true;
    dispatch('message', {
      text: isPaused
    });
  }

  let testImage;
  let testOutput;
  $ : {
    startMaxPool(stride);
    testImage = gridData(image)
    testOutput = gridData(output)
  }
</script>

<style>
  .column {
    padding: 5px;
  }

  .matrix-heading {
    min-height: 58px;
    color: #3f3f3f;
    line-height: 1.15;
    text-align: center;
  }

  .matrix-heading-title {
    font-size: 18px;
    font-weight: 600;
  }

  .pooled-feature-title {
    white-space: nowrap;
  }

  .matrix-heading-shape {
    margin-top: 3px;
    font-size: 14px;
  }

  .matrix-heading-dimensions {
    margin-top: 2px;
    font-size: 14px;
    font-style: italic;
    color: #666;
  }

  .pooling-explanation {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .pooling-equation {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 90px;
    font-size: 14px;
    line-height: 1;
    white-space: nowrap;
  }

  .pooling-legend-note {
    background: rgba(240, 248, 255, 0.8);
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 8px 12px;
    margin-top: 8px;
    font-family: 'Segoe UI', sans-serif;
    color: #555;
    max-width: 300px;
    text-align: center;
  }

  .pooling-legend-note strong {
    color: #333;
  }
</style>

<div class="column has-text-centered">
  <div class="matrix-heading">
    <div class="matrix-heading-title">Input Feature Map</div>
    <div class="matrix-heading-shape">({testImage.length},{testImage[0].length},1)</div>
    <div class="matrix-heading-dimensions">[H,W,C]</div>
  </div>

  
  <Dataview on:message={handleMouseover} data={testImage} highlights={inputHighlights} outputLength={output.length}
      isKernelMath={false} constraint={getVisualizationSizeConstraint(image.length)} dataRange={dataRange} stride={stride}/>  
</div>
<div class="column has-text-centered">
  <div class="pooling-explanation">
    <div class="pooling-equation">
      max(
      <Dataview data={testInputMatrixSlice} highlights={outputHighlights} isKernelMath={true} 
        constraint={poolingMathCellSize} textFontSize={poolingMathFontSize} dataRange={dataRange}/>
      )
      =
      <Dataview data={testOutputMatrixSlice} highlights={outputHighlights} isKernelMath={true} 
        constraint={poolingMathCellSize} textFontSize={poolingMathFontSize} dataRange={dataRange}/>
    </div>
    <div class="pooling-legend-note">
      <small>
        <strong>Pooling:</strong> 
        Selects the maximum value from each 2×2 region. 
      </small>
    </div>
  </div> 
</div>
<div class="column has-text-centered">
  <div class="matrix-heading">
    <div class="matrix-heading-title pooled-feature-title">Pooled Feature Map</div>
    <div class="matrix-heading-shape">({testOutput.length},{testOutput[0].length},1)</div>
    <div class="matrix-heading-dimensions">[H,W,C]</div>
  </div>
  <Dataview on:message={handleMouseover} data={testOutput} highlights={outputHighlights} isKernelMath={false} 
      outputLength={output.length} constraint={getVisualizationSizeConstraint(output.length)} dataRange={dataRange} stride={stride}/>
</div>

<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import {
    array1d,
    getDataRange,
    getVisualizationSizeConstraint,
    gridData
  } from './DetailviewUtils.js';
  import Dataview from './Dataview.svelte';
  import KernelMathView from './KernelMathView.svelte';
  // image: nxn array -- prepadded.
  // kernel: mxm array.
  // stride: int
  export let stride;
  export let dilation
  export let kernel;
  export let kernelMinMax = undefined;
  export let kernelColorRange = undefined;
  export let image;
  export let output;
  export let isPaused;
  export let dataRange;
  export let colorScale;
  export let isInputInputLayer = false;
  export let inputChannelName = 'Red';

  const dispatch = createEventDispatcher();
  const mathConstraint = 32;
  const displayPrecision = 3;
  const legendPrecision = 2;

  let inputHighlights = [];
  let outputHighlights = array1d(output.length * output.length, (i) => true);
  let interval;
  let counter = 0;
  let testInputMatrixSlice = gridData(
    Array.from({ length: kernel.length }, () => Array(kernel.length).fill(0)),
    mathConstraint,
    displayPrecision
  );
  let testImage = gridData(image);
  let testOutput = gridData(output);
  let testKernel = gridData(kernel, mathConstraint, displayPrecision);
  let selectedConvolutionResult = 0;
  let selectedModelResult = 0;

  const roundTo = (value, precision) => {
    const scale = Math.pow(10, precision);
    return Math.round(value * scale) / scale;
  };

  const formatLegendValue = (value) => {
    const roundedValue = roundTo(Number(value), legendPrecision);
    const normalizedValue = Object.is(roundedValue, -0) ? 0 : roundedValue;
    return Number.isFinite(normalizedValue)
      ? normalizedValue.toFixed(legendPrecision)
      : '0.00';
  };

  const getPadding = () => {
    const effectiveKernelSize = (kernel.length - 1) * dilation + 1;
    const requiredInputSize = (output.length - 1) * stride + effectiveKernelSize;
    return Math.max(0, Math.floor((requiredInputSize - image.length) / 2));
  };

  const getConvolutionWindow = (outputRow, outputColumn) => {
    const padding = getPadding();
    return Array.from({ length: kernel.length }, (_, kernelRow) =>
      Array.from({ length: kernel[0].length }, (_, kernelColumn) => {
        const inputRow = outputRow * stride + kernelRow * dilation - padding;
        const inputColumn = outputColumn * stride + kernelColumn * dilation - padding;
        const isInsideInput = inputRow >= 0 && inputRow < image.length &&
          inputColumn >= 0 && inputColumn < image[0].length;
        return isInsideInput ? image[inputRow][inputColumn] : 0;
      })
    );
  };

  const getInputHighlights = (outputRow, outputColumn) => {
    const padding = getPadding();
    const highlights = array1d(image.length * image[0].length);
    for (let kernelRow = 0; kernelRow < kernel.length; kernelRow++) {
      for (let kernelColumn = 0; kernelColumn < kernel[0].length; kernelColumn++) {
        const inputRow = outputRow * stride + kernelRow * dilation - padding;
        const inputColumn = outputColumn * stride + kernelColumn * dilation - padding;
        if (inputRow >= 0 && inputRow < image.length &&
            inputColumn >= 0 && inputColumn < image[0].length) {
          highlights[inputRow * image[0].length + inputColumn] = true;
        }
      }
    }
    return highlights;
  };

  const dotProduct = (inputWindow, kernelWeights) => {
    let sum = 0;
    for (let row = 0; row < inputWindow.length; row++) {
      for (let column = 0; column < inputWindow[0].length; column++) {
        sum += inputWindow[row][column] * kernelWeights[row][column];
      }
    }
    return sum;
  };

  const updateFrame = (outputRow, outputColumn) => {
    const safeRow = Math.max(0, Math.min(outputRow, output.length - 1));
    const safeColumn = Math.max(0, Math.min(outputColumn, output[0].length - 1));
    outputHighlights = array1d(output.length * output[0].length, () => false);
    outputHighlights[safeRow * output[0].length + safeColumn] = true;
    inputHighlights = getInputHighlights(safeRow, safeColumn);

    const rawInputWindow = getConvolutionWindow(safeRow, safeColumn);
    const displayedInputWindow = rawInputWindow.map(row =>
      row.map(value => roundTo(value, displayPrecision))
    );
    const displayedKernel = kernel.map(row =>
      row.map(value => roundTo(value, displayPrecision))
    );

    testInputMatrixSlice = gridData(
      displayedInputWindow,
      mathConstraint,
      displayPrecision
    );
    selectedConvolutionResult = roundTo(
      dotProduct(displayedInputWindow, displayedKernel),
      displayPrecision
    );
    selectedModelResult = output[safeRow][safeColumn];
  };

  function startConvolution(stride) {
    if (stride <= 0) return;
    if (interval) clearInterval(interval);
    counter = 0;
    updateFrame(0, 0);
    counter = 1;
    interval = setInterval(() => {
      if (isPaused) return;
      const totalOutputCells = output.length * output[0].length;
      const flat_animated = counter % totalOutputCells;
      const animatedH = Math.floor(flat_animated / output[0].length);
      const animatedW = flat_animated % output[0].length;
      updateFrame(animatedH, animatedW);
      counter++;
    }, 400);
  }

  function handleMouseover(event) {
    updateFrame(event.detail.hoverH, event.detail.hoverW);
    isPaused = true;
    dispatch('message', {
      text: isPaused
    });
  }

  $ : {
    const displayedKernel = kernel.map(row =>
      row.map(value => roundTo(value, displayPrecision))
    );
    startConvolution(stride);
    testImage = gridData(image);
    testOutput = gridData(output);
    testKernel = gridData(displayedKernel, mathConstraint, displayPrecision);
  }

  $: localKernelRange = getDataRange(kernel);
  $: currentKernelRange = {
    range: Number.isFinite(Number(kernelColorRange)) && Number(kernelColorRange) > 0
      ? Number(kernelColorRange)
      : localKernelRange.range,
    min: kernelMinMax && Number.isFinite(Number(kernelMinMax.min))
      ? Number(kernelMinMax.min)
      : localKernelRange.min,
    max: kernelMinMax && Number.isFinite(Number(kernelMinMax.max))
      ? Number(kernelMinMax.max)
      : localKernelRange.max
  };
  $: kernelMinLabel = formatLegendValue(currentKernelRange.min);
  $: kernelMaxLabel = formatLegendValue(currentKernelRange.max);

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<style>
  .convolution-layout {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 12px;
  }

  .computation-row {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) auto minmax(160px, 1fr);
    align-items: start;
    column-gap: 22px;
    width: 100%;
  }

  .visual-panel,
  .calculation-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
  }

  .matrix-heading {
    min-height: 58px;
    color: #3f3f3f;
    line-height: 1.15;
    text-align: center;
    margin-top: 15px;
  }

  .matrix-heading-title {
    font-size: 18px;
    font-weight: 600;
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

  .calculation-panel {
    justify-content: flex-start;
  }

  .math-section {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .convolution-legend-note {
    box-sizing: border-box;
    width: 100%;
    background: rgba(240, 248, 255, 0.8);
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 8px 14px;
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 16px;
    color: #555;
    text-align: center;
    white-space: nowrap;
  }
</style>

<div class="convolution-layout">
  <div class="computation-row">
    <section class="visual-panel input-panel">
      <div class="matrix-heading">
        <div class="matrix-heading-title">Input {inputChannelName} Chanel</div>
        <div class="matrix-heading-shape">({image.length},{image[0].length},1)</div>
        <div class="matrix-heading-dimensions">[H,W,C]</div>
      </div>
      <Dataview on:message={handleMouseover} data={testImage} highlights={inputHighlights}
        outputLength={output.length} isKernelMath={false}
        constraint={getVisualizationSizeConstraint(image.length)} dataRange={dataRange}
        stride={stride} colorScale={colorScale} isInputLayer={isInputInputLayer}/>
    </section>

    <section class="calculation-panel">
      <div class="math-section"
        data-calculated-result={selectedConvolutionResult}
        data-model-result={selectedModelResult}>
        <KernelMathView data={testInputMatrixSlice} kernel={testKernel}
          constraint={mathConstraint} result={selectedConvolutionResult}
          dataRange={dataRange} kernelRange={currentKernelRange}
          colorScale={colorScale} isInputLayer={isInputInputLayer}
          displayPrecision={displayPrecision}/>
      </div>
    </section>

    <section class="visual-panel output-panel">
      <div class="matrix-heading">
        <div class="matrix-heading-title">Output Feature Map</div>
        <div class="matrix-heading-shape">({output.length},{output[0].length},1)</div>
        <div class="matrix-heading-dimensions">[H,W,C]</div>
      </div>
      <Dataview on:message={handleMouseover} data={testOutput} highlights={outputHighlights}
        isKernelMath={false} outputLength={output.length}
        constraint={getVisualizationSizeConstraint(output.length)}
        dataRange={dataRange} stride={stride}/>
    </section>
  </div>

  <div class="convolution-legend-note">
    <small>
      <strong>Convolution:</strong>
      Extracts features through element-wise multiplication and accumulation.
    </small>
  </div>
</div>

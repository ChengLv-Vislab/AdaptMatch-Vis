<script>
  import { createEventDispatcher, onDestroy } from "svelte";
  import {
    array1d,
    getMatrixSliceFromOutputHighlights,
    getVisualizationSizeConstraint,
    getMatrixSliceFromInputHighlights,
    gridData,
  } from "./DetailviewUtils.js";
  import Dataview from "./Dataview.svelte";
  import { singleRelu } from "../utils/cnn.js";

  export let image;
  export let output;
  export let isPaused;
  export let dataRange;

  const dispatch = createEventDispatcher();
  const mathConstraint = 32;

  let activatedOutput = singleRelu(image);
  let gridInputMatrixSlice = gridData([[0]]);
  let gridOutputMatrixSlice = gridData([[0]]);
  let gridImage = gridData(image);
  let gridOutput = gridData(activatedOutput);
  let inputHighlights = array1d(image.length * image.length, () => false);
  let outputHighlights = array1d(
    activatedOutput.length * activatedOutput.length,
    () => false,
  );
  let interval;
  let counter = 0;
  let selectedInputValue = 0;
  let selectedOutputValue = 0;

  $: activatedOutput = singleRelu(image);
  $: activatedOutputValues = activatedOutput.reduce(
    (values, row) => values.concat(row),
    [],
  );
  $: nodeOutputValues = Array.isArray(output)
    ? output.reduce((values, row) => values.concat(row), [])
    : activatedOutputValues;
  $: activatedOutputMin = Math.min(...activatedOutputValues);
  $: activatedOutputMax = Math.max(...activatedOutputValues);
  $: nodeOutputMin = Math.min(...nodeOutputValues);

  function selectCell(row, column) {
    const outputSize = activatedOutput.length;
    const inputSize = image.length;
    const selectedRow = Math.min(row, outputSize - 1, inputSize - 1);
    const selectedColumn = Math.min(column, outputSize - 1, inputSize - 1);

    selectedInputValue = image[selectedRow][selectedColumn];
    selectedOutputValue = activatedOutput[selectedRow][selectedColumn];

    outputHighlights = array1d(outputSize * outputSize, () => false);
    inputHighlights = array1d(inputSize * inputSize, () => undefined);
    outputHighlights[selectedRow * outputSize + selectedColumn] = true;
    inputHighlights[selectedRow * inputSize + selectedColumn] = true;

    const inputMatrixSlice = getMatrixSliceFromInputHighlights(
      image,
      inputHighlights,
      1,
    );
    const outputMatrixSlice = getMatrixSliceFromOutputHighlights(
      activatedOutput,
      outputHighlights,
    );
    gridInputMatrixSlice = gridData(inputMatrixSlice, mathConstraint, 2);
    gridOutputMatrixSlice = gridData(outputMatrixSlice, mathConstraint, 2);
  }

  function startAnimation() {
    counter = 0;
    if (interval) clearInterval(interval);
    selectCell(0, 0);
    interval = setInterval(() => {
      if (isPaused) return;
      const outputSize = activatedOutput.length;
      const flatAnimated = counter % (outputSize * outputSize);
      selectCell(
        Math.floor(flatAnimated / outputSize),
        flatAnimated % outputSize,
      );
      counter += 1;
    }, 250);
  }

  function handleMouseover(event) {
    selectCell(event.detail.hoverH, event.detail.hoverW);
    isPaused = true;
    dispatch("message", { text: isPaused });
  }

  $: if (image && activatedOutput) {
    gridImage = gridData(image);
    gridOutput = gridData(activatedOutput);
    startAnimation();
  }

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<div class="activation-layout" data-operation="relu">
  <div class="computation-row">
    <section class="visual-panel input-panel">
      <div class="matrix-heading">
        <div class="matrix-heading-title">Input Feature Map</div>
        <div class="matrix-heading-shape">
          ({image.length},{image[0].length},1)
        </div>
        <div class="matrix-heading-dimensions">[H, W, C]</div>
      </div>
      <Dataview
        on:message={handleMouseover}
        data={gridImage}
        highlights={inputHighlights}
        outputLength={activatedOutput.length}
        isKernelMath={false}
        constraint={getVisualizationSizeConstraint(image.length)}
        {dataRange}
        stride={1}
      />
    </section>

    <section class="calculation-panel">
      <div
        class="activation-formula"
        data-input-value={selectedInputValue}
        data-output-value={selectedOutputValue}
      >
        <div class="activation-equation-row expression">
          <span>Relu(x) = max(0,</span>
          <Dataview
            data={gridInputMatrixSlice}
            highlights={outputHighlights}
            isKernelMath={true}
            constraint={mathConstraint}
            {dataRange}
          />
          <span>)</span>
        </div>

        <div class="activation-equation-row result">
          <span>=</span>
          <Dataview
            data={gridOutputMatrixSlice}
            highlights={outputHighlights}
            isKernelMath={true}
            constraint={mathConstraint}
            {dataRange}
          />
        </div>
      </div>

      <div class="relu-note">
        <small>
          <strong>Relu:</strong>
          Sets negative values to zero while preserving non-negative values.
        </small>
      </div>
    </section>

    <section
      class="visual-panel output-panel"
      data-min-value={activatedOutputMin}
      data-max-value={activatedOutputMax}
      data-has-negative={activatedOutputMin < 0}
      data-node-output-min={nodeOutputMin}
      data-node-output-has-negative={nodeOutputMin < 0}
    >
      <div class="matrix-heading">
        <div class="matrix-heading-title">Activated Feature Map</div>
        <div class="matrix-heading-shape">
          ({activatedOutput.length},{activatedOutput[0].length},1)
        </div>
        <div class="matrix-heading-dimensions">[H, W, C]</div>
      </div>
      <Dataview
        on:message={handleMouseover}
        data={gridOutput}
        highlights={outputHighlights}
        isKernelMath={false}
        outputLength={activatedOutput.length}
        constraint={getVisualizationSizeConstraint(activatedOutput.length)}
        {dataRange}
        stride={1}
      />
    </section>
  </div>
</div>

<style>
  .activation-layout {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .computation-row {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) auto minmax(160px, 1fr);
    align-items: start;
    width: 100%;
  }

  .visual-panel,
  .calculation-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
  }

  .calculation-panel {
    margin-top: 20px;
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

  .activation-formula {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 90px;
    gap: 6px;
    color: #3f3f3f;
    font-size: 14px;
    font-weight: 400;
    line-height: 1;
    white-space: nowrap;
  }

  .activation-equation-row {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 32px;
    gap: 5px;
    line-height: 1;
    white-space: nowrap;
  }

  .activation-equation-row.result {
    gap: 7px;
  }

  .activation-formula :global(.grid) {
    margin-top: 0 !important;
  }
  .relu-note {
    box-sizing: border-box;
    width: 170px;
    max-width: 100%;
    background: rgba(240, 248, 255, 0.8);
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 8px 2px;
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 16px;
    color: #555;
    text-align: center;
  }

  @media (max-width: 850px) {
    .computation-row {
      column-gap: 12px;
    }
  }
</style>

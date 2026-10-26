<script>
  import { createEventDispatcher, onDestroy } from "svelte";
  import {
    array1d,
    getVisualizationSizeConstraint,
    gridData,
  } from "./DetailviewUtils.js";
  import Dataview from "./Dataview.svelte";

  export let image;
  export let output;
  export let isPaused;
  export let dataRange;
  export let mean = 0;
  export let variance = 1;
  export let gamma = 1;
  export let beta = 0;
  export let epsilon = 1e-5;

  const dispatch = createEventDispatcher();

  let gridImage = gridData(image);
  let gridOutput = gridData(output);
  let inputHighlights = array1d(image.length * image.length, () => false);
  let outputHighlights = array1d(output.length * output.length, () => false);
  let interval;
  let counter = 0;
  let selectedInputValue = 0;
  let selectedOutputValue = 0;
  let computedNormValue = 0;
  let normAbsoluteError = 0;

  $: meanValue = Number.isFinite(Number(mean)) ? Number(mean) : 0;
  $: varianceValue = Number.isFinite(Number(variance))
    ? Number(variance)
    : 1;
  $: gammaValue = Number.isFinite(Number(gamma)) ? Number(gamma) : 1;
  $: betaValue = Number.isFinite(Number(beta)) ? Number(beta) : 0;
  $: epsilonValue = Number.isFinite(Number(epsilon))
    ? Number(epsilon)
    : 1e-5;
  $: outputValues = output.reduce(
    (values, row) => values.concat(row),
    [],
  );
  $: outputMin = Math.min(...outputValues);
  $: outputMax = Math.max(...outputValues);
  $: inputBoxColor = getMathCellColor(selectedInputValue);
  $: outputBoxColor = getMathCellColor(selectedOutputValue);
  $: inputTextColor = getMathCellTextColor(selectedInputValue);
  $: outputTextColor = getMathCellTextColor(selectedOutputValue);
  $: formattedInputValue = formatNormCellValue(selectedInputValue);
  $: formattedOutputValue = formatNormCellValue(selectedOutputValue);
  $: valueBoxWidth = Math.max(
    104,
    Math.ceil(
      Math.max(formattedInputValue.length, formattedOutputValue.length) * 8.5 +
        26,
    ),
  );

  function getNormalizedColorValue(value) {
    const numericRange = Number(dataRange);
    const safeRange =
      Number.isFinite(numericRange) && numericRange !== 0 ? numericRange : 1;
    return (value + safeRange / 2) / safeRange;
  }

  function getMathCellColor(value) {
    const color = d3.rgb(d3.interpolateRdBu(getNormalizedColorValue(value)));
    return `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
  }

  function getMathCellTextColor(value) {
    const normalizedValue = getNormalizedColorValue(value);
    return normalizedValue < 0.2 || normalizedValue > 0.8 ? "#fff" : "#111";
  }

  function formatNormCellValue(value) {
    if (!Number.isFinite(value)) return "—";
    return value.toFixed(3).replace("-", "−");
  }

  function formatMathValue(value) {
    if (!Number.isFinite(value)) return "—";
    const absoluteValue = Math.abs(value);
    if (
      absoluteValue !== 0 &&
      (absoluteValue >= 10000 || absoluteValue < 0.001)
    ) {
      const superscripts = {
        "-": "⁻",
        "+": "⁺",
        "0": "⁰",
        "1": "¹",
        "2": "²",
        "3": "³",
        "4": "⁴",
        "5": "⁵",
        "6": "⁶",
        "7": "⁷",
        "8": "⁸",
        "9": "⁹",
      };
      const [coefficient, exponent] = value.toExponential(2).split("e");
      const superscriptExponent = exponent
        .split("")
        .map((character) => superscripts[character] || character)
        .join("");
      return `${Number(coefficient)}×10${superscriptExponent}`;
    }
    const decimals = absoluteValue >= 100 ? 2 : 3;
    return Number(value.toFixed(decimals)).toString();
  }

  function selectCell(row, column) {
    const outputSize = output.length;
    const inputSize = image.length;
    const selectedRow = Math.min(row, outputSize - 1, inputSize - 1);
    const selectedColumn = Math.min(column, outputSize - 1, inputSize - 1);

    selectedInputValue = image[selectedRow][selectedColumn];
    selectedOutputValue = output[selectedRow][selectedColumn];
    computedNormValue =
      gammaValue *
        ((selectedInputValue - meanValue) /
          Math.sqrt(varianceValue + epsilonValue)) +
      betaValue;
    normAbsoluteError = Math.abs(computedNormValue - selectedOutputValue);

    outputHighlights = array1d(outputSize * outputSize, () => false);
    inputHighlights = array1d(inputSize * inputSize, () => undefined);
    outputHighlights[selectedRow * outputSize + selectedColumn] = true;
    inputHighlights[selectedRow * inputSize + selectedColumn] = true;

  }

  function startAnimation() {
    counter = 0;
    if (interval) clearInterval(interval);
    selectCell(0, 0);
    interval = setInterval(() => {
      if (isPaused) return;
      const outputSize = output.length;
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

  $: if (image && output) {
    gridImage = gridData(image);
    gridOutput = gridData(output);
    startAnimation();
  }

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<div class="normalization-layout" data-operation="norm">
  <div class="computation-row normalization-row">
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
        outputLength={output.length}
        isKernelMath={false}
        constraint={getVisualizationSizeConstraint(image.length)}
        {dataRange}
        stride={1}
      />
    </section>

    <section class="calculation-panel">
      <div
        class="norm-formula"
        style="--norm-value-box-width: {valueBoxWidth}px;"
        data-input-value={selectedInputValue}
        data-output-value={selectedOutputValue}
        data-computed-value={computedNormValue}
        data-absolute-error={normAbsoluteError}
        data-mean={meanValue}
        data-variance={varianceValue}
        data-gamma={gammaValue}
        data-beta={betaValue}
        data-epsilon={epsilonValue}
      >
        <div class="norm-equation-row substitution">
          <span class="norm-function-label">Norm(x)</span>
          <span>=</span>
          <span>{formatMathValue(gammaValue)}</span>
          <span>·</span>
          <span class="math-fraction numeric">
            <span class="math-numerator">
              <span
                class="norm-value-box"
                style="background-color: {inputBoxColor}; color: {inputTextColor};"
              >
                {formattedInputValue}
              </span>
              <span class="norm-operator">{meanValue >= 0 ? "−" : "+"}</span>
              <span class="norm-number"
                >{formatMathValue(Math.abs(meanValue))}</span
              >
            </span>
            <span class="math-denominator">
              √({formatMathValue(varianceValue)} + {formatMathValue(
                epsilonValue,
              )})
            </span>
          </span>
          <span>{betaValue >= 0 ? "+" : "−"}</span>
          <span>{formatMathValue(Math.abs(betaValue))}</span>
        </div>

        <div class="norm-equation-row result">
          <span>=</span>
          <span
            class="norm-value-box"
            style="background-color: {outputBoxColor}; color: {outputTextColor};"
          >
            {formattedOutputValue}
          </span>
        </div>
      </div>

      <div class="normalization-note">
        <small>
          <strong>Norm:</strong>
          Normalizes feature values to stabilize the network.
        </small>
      </div>
    </section>

    <section
      class="visual-panel output-panel"
      data-min-value={outputMin}
      data-max-value={outputMax}
      data-has-negative={outputMin < 0}
    >
      <div class="matrix-heading">
        <div class="matrix-heading-title">Normalized Feature Map</div>
        <div class="matrix-heading-shape">
          ({output.length},{output[0].length},1)
        </div>
        <div class="matrix-heading-dimensions">[H, W, C]</div>
      </div>
      <Dataview
        on:message={handleMouseover}
        data={gridOutput}
        highlights={outputHighlights}
        isKernelMath={false}
        outputLength={output.length}
        constraint={getVisualizationSizeConstraint(output.length)}
        {dataRange}
        stride={1}
      />
    </section>
  </div>
</div>

<style>
  .normalization-layout {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .computation-row {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) minmax(380px, 400px) minmax(
        180px,
        1fr
      );
    align-items: start;
    width: 100%;
    column-gap: 0;
  }

  .normalization-row .matrix-heading-title {
    white-space: nowrap;
  }

  .visual-panel,
  .calculation-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
  }

  .calculation-panel {
    gap: 9px;
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

  .norm-formula {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    width: max-content;
    max-width: 100%;
    min-height: 112px;
    padding: 0;
    color: #333;
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 15px;
    font-weight: 400;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .norm-formula span {
    font-family: inherit;
    font-size: inherit;
    font-style: normal;
    font-weight: inherit;
    line-height: 1;
  }

  .norm-equation-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: max-content;
    max-width: 100%;
    font: inherit;
    line-height: 1;
    white-space: nowrap;
  }

  .norm-equation-row.substitution {
    display: grid;
    grid-template-columns: repeat(7, max-content);
    align-items: center;
    column-gap: 6px;
    min-height: 72px;
    margin-top: 25px;
    margin-left: -20px;
  }

  .norm-equation-row.result {
    margin-top: 5px;
  }

  .norm-function-label {
    font: inherit;
  }

  .math-fraction {
    display: inline-flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    min-width: 92px;
    font: inherit;
    line-height: 1;
    text-align: center;
  }

  .math-fraction.numeric {
    min-width: 190px;
  }

  .math-numerator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 46px;
    padding: 0 7px 5px;
    border-bottom: 1px solid #333;
    font: inherit;
    line-height: 1;
  }

  .math-denominator {
    display: flex;
    min-height: 24px;
    align-items: flex-start;
    justify-content: center;
    padding: 4px 6px 0;
    font: inherit;
    line-height: 1;
  }

  .norm-value-box {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--norm-value-box-width, 104px);
    min-width: 104px;
    height: 42px;
    flex: 0 0 var(--norm-value-box-width, 104px);
    padding: 0 11px;
    border: 1px solid #333;
    border-radius: 2px;
    font: inherit;
    line-height: 1;
    text-align: center;
  }

  .normalization-note {
    box-sizing: border-box;
    width: 390px;
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

  .normalization-note strong {
    color: #333;
  }

  @media (max-width: 850px) {
    .computation-row {
      column-gap: 12px;
    }

    .normalization-note {
      width: 250px;
    }
  }
</style>

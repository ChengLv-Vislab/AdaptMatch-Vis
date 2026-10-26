<script>
  import AccuracyLine from './AccuracyLine.svelte';
  import Confusion from './Confusion.svelte';
  import WeightConfigurationComparison from './WeightConfigurationComparison.svelte';
  import {
    lastEpochStore, weightConfigurationsStore, selectedWeightConfigurationStore,
    runLoadingStore, modelLoadingStore,
  } from '../stores.js';
  import { selectWeightConfiguration } from './run-context.js';

  let comparisonWidth = null;
  let metricHeight = 340;

  function fitMatrix(event) {
    metricHeight = event.detail.height;
  }

  function resizeComparison(event) {
    const width = event.detail.width;
    if (Number.isFinite(width) && width > 0
      && (comparisonWidth === null || Math.abs(width - comparisonWidth) > 0.5)) {
      comparisonWidth = width;
    }
  }

  async function select(event) {
    try { await selectWeightConfiguration(event.detail.id); }
    catch (error) { console.error('Unable to select configuration:', error); }
  }
</script>

<style>
  .charts {
    display: flex;
    min-height: 0;
    background: #ffffff;
  }

  #performance-container {
    width: 100%;
    /* Matrix cells, column labels and a small bottom gutter determine height. */
    height: var(--metric-row-height);
    display: flex;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    border: 2px solid #c0c0c0;
    box-sizing: border-box;
  }

  .metric-div {
    position: relative;
    height: 100%;
    overflow: hidden;
    min-width: 0;
    box-sizing: border-box;
    flex: 0 0 auto;
  }

  /* One shared heading style for SVG-backed and HTML-backed views alike. */
  .charts :global(.metric-view-title) {
    margin: 0;
    color: #111;
    font-family: Arial, sans-serif;
    font-size: 18px !important;
    font-weight: 700;
    line-height: 24px;
    text-align: left;
    overflow-wrap: break-word;
  }

  .charts :global(.metric-overlay-title) {
    position: absolute;
    top: 8px;
    left: 12px;
    right: 12px;
    z-index: 1;
    pointer-events: none;
  }

  #accuracy-area {
    flex: 1 1 0;
    min-width: 460px;
    border-right: 2px solid #c0c0c0;
  }

  #confusion-area {
    width: 465px;
    border-right: 2px solid #c0c0c0;
  }

  #weight-comparison-area {
    /* Reserve the triangle AND its annotations, taking the needed width from
       accuracy rather than shrinking fonts or flattening the data geometry. */
    width: var(--weight-comparison-width, 40%);
    max-width: calc(100% - 925px);
  }

  @media (max-width: 1560px) {
    #performance-container { height: auto; flex-wrap: wrap; }
    .metric-div { height: var(--metric-row-height); }
    #accuracy-area { flex: 1 1 460px; }
    #confusion-area { width: 465px; border-right: 0; }
    #weight-comparison-area {
      width: 100%;
      max-width: none;
      height: var(--metric-row-height);
      border-top: 2px solid #c0c0c0;
    }
  }
  @media (max-width: 940px) {
    #accuracy-area, #confusion-area { flex: 0 0 100%; width: 100%; min-width: 0; }
  }
</style>

<div class="charts" style="--metric-row-height: {metricHeight}px;">
  <div id="performance-container"
    style={comparisonWidth === null ? undefined : `--weight-comparison-width: ${comparisonWidth}px;`}>
    <div id="accuracy-area" class="metric-div">
      <AccuracyLine epoch={$lastEpochStore} />
    </div>
    <div id="confusion-area" class="metric-div">
      <Confusion on:fit={fitMatrix} />
    </div>
    <div id="weight-comparison-area" class="metric-div">
      <WeightConfigurationComparison strategies={$weightConfigurationsStore}
        selectedId={$selectedWeightConfigurationStore ? $selectedWeightConfigurationStore.id : null}
        disabled={$runLoadingStore || $modelLoadingStore} on:select={select} on:resize={resizeComparison} />
    </div>
  </div>
</div>

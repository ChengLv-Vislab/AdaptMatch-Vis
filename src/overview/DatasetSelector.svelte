<script>
  import {
    datasetsStore, selectedDatasetStore, runLoadingStore, modelLoadingStore,
    datasetSelectionDisabledStore,
  } from '../stores.js';
  import { selectDataset } from './run-context.js';

  let message = '';

  async function choose(event) {
    const menu = event.currentTarget;
    const id = menu.value;
    message = '';
    try {
      await selectDataset(id);
    } catch (error) {
      const dataset = $datasetsStore.find((item) => item.id === id);
      message = dataset && !dataset.available
        ? `${dataset.name} 的训练结果尚未导入，请完成训练并执行 deploy_frontend.py。`
        : error.message;
    } finally {
      // A failed or superseded switch must not leave the menu showing a
      // different dataset from the model, metrics and images on the page.
      menu.value = $selectedDatasetStore?.id || '';
    }
  }
</script>

<div class="dataset-menu">
  <select id="dataset-select" aria-label="Select dataset" title="Select dataset"
    value={$selectedDatasetStore?.id || ''}
    disabled={$runLoadingStore || $modelLoadingStore || $datasetSelectionDisabledStore}
    on:change={choose}>
    <option value="" disabled>Select dataset</option>
    {#each $datasetsStore as dataset (dataset.id)}
      <option value={dataset.id}>{dataset.name}</option>
    {/each}
  </select>
  {#if message}
    <div class="dataset-message" role="alert">
      <span>{message}</span>
      <button type="button" aria-label="Close dataset message" on:click={() => message = ''}>×</button>
    </div>
  {/if}
</div>

<style>
  .dataset-menu { position: relative; width: 148px; max-width: 100%; }
  select { width: 70%; margin-left: 15px; height: 28px; box-sizing: border-box; border: 1px solid #b9a7cf; border-radius: 4px; padding: 2px 8px; background: #faf9fc; color: #3e2d50; font: inherit; font-size: 13px; cursor: pointer; }
  select:focus-visible { outline: 2px solid #bda0e5; outline-offset: 2px; }
  select:disabled { opacity: .65; cursor: wait; }
  .dataset-message { position: absolute; z-index: 1000; top: 34px; left: 0; width: 340px; max-width: calc(100vw - 24px); box-sizing: border-box; padding: 10px 32px 10px 12px; border: 1px solid #ddc694; border-radius: 4px; background: #fffaf0; color: #745626; box-shadow: 0 3px 12px #0002; font-size: 12px; line-height: 1.6; }
  .dataset-message button { position: absolute; top: 4px; right: 7px; border: 0; padding: 0 3px; background: transparent; color: inherit; font-size: 20px; cursor: pointer; }
</style>

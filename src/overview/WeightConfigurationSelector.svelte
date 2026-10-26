<script>
  import {
    weightConfigurationsStore, selectedWeightConfigurationStore,
    runLoadingStore, modelLoadingStore, runErrorStore,
  } from '../stores.js';
  import { selectWeightConfiguration } from './run-context.js';
  export let disabled = false;

  async function select(event) {
    try { await selectWeightConfiguration(event.currentTarget.value); }
    catch (error) { console.error('Unable to change weight configuration:', error); }
  }
</script>

<div class="configuration-controls" aria-busy={$runLoadingStore || $modelLoadingStore}>
  <label for="weight-configuration-select">ACCT configuration</label>
  <select id="weight-configuration-select" aria-label="Select trained ACCT weight configuration"
    value={$selectedWeightConfigurationStore?.id || ''}
    disabled={disabled || $runLoadingStore || $modelLoadingStore} on:change={select}>
    {#each $weightConfigurationsStore as item (item.id)}
      <option value={item.id}>{item.id}{item.recommended ? ' (Recommended)' : ''} — α={item.alpha.toFixed(2)}, β={item.beta.toFixed(2)}, γ={item.gamma.toFixed(2)} — {item.accuracy.toFixed(2)}%</option>
    {/each}
  </select>
  {#if !$selectedWeightConfigurationStore?.legacy}
    <span class="configuration-note">Recommended weights: alpha=0.08, beta=0.45, gamma=0.47</span>
  {/if}
  {#if $selectedWeightConfigurationStore}
    <span class="configuration-note">{$selectedWeightConfigurationStore.numLabeled} labels · {$selectedWeightConfigurationStore.epochs} epochs · Best epoch: {$selectedWeightConfigurationStore.bestEpoch} · Validation: {$selectedWeightConfigurationStore.accuracy.toFixed(2)}%</span>
  {/if}
  {#if $runLoadingStore || $modelLoadingStore}<span class="configuration-note" role="status">Loading…</span>{/if}
  {#if $runErrorStore}<span class="configuration-error" role="alert">{$runErrorStore}</span>{/if}
</div>

<style>
  .configuration-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; padding: 4px 0 6px; font-size: 12px; }
  label { font-weight: 600; }
  select { max-width: 460px; height: 28px; border: 1px solid #b9a7cf; border-radius: 3px; padding: 2px 7px; background: white; color: #3e2d50; font-size: 12px; }
  .configuration-note { color: #665972; font-variant-numeric: tabular-nums; }
  .configuration-error { color: #a12832; }
</style>

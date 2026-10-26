<script>
  import { onMount, createEventDispatcher } from "svelte";
  import Loss from "./Loss.svelte";
  import { lastEpochStore } from '../stores.js';

  const dispatch = createEventDispatcher();
  let dialog;
  let closeButton;
  const close = () => dispatch("close");

  function handleKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      const controls = [...dialog.querySelectorAll('button, [tabindex="0"]')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  onMount(() => {
    const previousFocus = document.activeElement;
    closeButton.focus();
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="loss-modal">
  <button type="button" class="loss-backdrop" tabindex="-1" aria-label="Close loss chart" on:click={close}></button>
  <section class="loss-dialog" role="dialog" aria-modal="true"
    aria-labelledby="loss-popup-title" bind:this={dialog}>
    <header>
      <h2 id="loss-popup-title">Training Loss over Epochs</h2>
      <button type="button" class="loss-close" aria-label="Close loss chart" on:click={close} bind:this={closeButton}>×</button>
    </header>
    <div class="loss-chart-container"><Loss epoch={$lastEpochStore} showTitle={false} /></div>
  </section>
</div>

<style>
  .loss-modal { position: absolute; inset: 0; z-index: 1500; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }
  .loss-backdrop { position: absolute; inset: 0; width: 100%; height: 100%; background: rgba(34, 50, 63, 0.12); border: 0; padding: 0; }
  .loss-dialog { position: relative; display: flex; flex-direction: column; box-sizing: border-box; width: min(1140px, 100%); height: min(660px, 100%); min-height: 280px; padding: 14px 18px 12px; background: white; border: 1px solid #d3d9dd; border-radius: 8px; box-shadow: 0 8px 28px rgba(25, 41, 54, 0.16); }
  header { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  h2 { margin: 0; flex: 1; text-align: center; font-size: 18px; font-weight: 600; line-height: 1.4; }
  .loss-close { flex-shrink: 0; width: 28px; height: 28px; padding: 0; border: 0; background: transparent; color: #6e7b83; font-size: 25px; line-height: 1; cursor: pointer; }
  .loss-close:focus-visible { outline: 2px solid #246a9a; outline-offset: 2px; }
  .loss-chart-container { flex: 1; min-height: 0; width: 100%; }
  .loss-chart-container :global(.chart-axis .tick text) { font-size: 14px; }
  .loss-chart-container :global(.axis-title) { font-size: 16px; }
  .loss-chart-container :global(.loss-legend text) { font-size: 12px; }
</style>

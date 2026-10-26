<script>
  import { createEventDispatcher } from "svelte";
  import NormalizationviewAnimator from "./NormalizationviewAnimator.svelte";

  export let input;
  export let output;
  export let dataRange;
  export let isExited;
  export let mean = 0;
  export let variance = 1;
  export let gamma = 1;
  export let beta = 0;
  export let epsilon = 1e-5;

  const dispatch = createEventDispatcher();
  let isPaused = false;

  function handleClickPause() {
    isPaused = !isPaused;
  }

  function handlePauseFromInteraction(event) {
    isPaused = event.detail.text;
  }

  function handleClickX() {
    dispatch("message", { text: true });
  }
</script>

{#if !isExited}
  <div id="normalization-detailview-container">
    <div class="box">
      <div class="control-panel">
        <div class="title-text">Norm Computation</div>

        <div class="buttons">
          <button type="button"
            class="play-button control-button"
            on:click={handleClickPause}
            aria-label={isPaused ? 'Play animation' : 'Pause animation'}
            title={isPaused ? 'Play animation' : 'Pause animation'}
          >
            {@html isPaused
              ? '<i class="fas fa-play-circle play-icon"></i>'
              : '<i class="fas fa-pause-circle"></i>'}
          </button>

          <button type="button"
            class="delete-button control-button"
            on:click={handleClickX}
            aria-label="Close computation"
            title="Close"
          >
            <i class="fas control-icon fa-times-circle"></i>
          </button>
        </div>
      </div>

      <div class="animator-container">
        <NormalizationviewAnimator
          on:message={handlePauseFromInteraction}
          image={input}
          {output}
          {isPaused}
          {dataRange}
          {mean}
          {variance}
          {gamma}
          {beta}
          {epsilon}
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .control-panel {
    display: flex;
    position: relative;
    flex-direction: column;
    align-items: center;
    margin-bottom: 10px;
  }

  .buttons {
    cursor: pointer;
    position: absolute;
    top: 0;
    right: 0;
  }

  .control-button {
    color: gray;
    font-size: 15px;
    opacity: 0.4;
    cursor: pointer;
  }

  .control-button:not(:first-child) {
    margin-left: 5px;
  }

  .control-button:hover {
    opacity: 0.8;
  }

  .box {
    box-sizing: border-box;
    width: 100%;
    padding: 10px 18px 14px;
  }

  #normalization-detailview-container {
    display: block;
    width: 800px;
    max-width: calc(100vw - 24px);
  }

  .animator-container {
    width: 100%;
  }

  .title-text {
    font-size: 1.35em;
    font-weight: 600;
    line-height: 1.2;
    color: #4a4a4a;
  }
</style>

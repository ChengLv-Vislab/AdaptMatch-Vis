<script>
	import ConvolutionAnimator from './ConvolutionAnimator.svelte';
  import { singleConv } from '../utils/cnn.js';
  import { createEventDispatcher } from 'svelte';

  export let input;
  export let kernel;
  export let kernelMinMax = undefined;
  export let kernelColorRange = undefined;
  export let dataRange;
  export let colorScale = d3.interpolateRdBu;
  export let isInputInputLayer = false;
  export let inputChannelIndex = 0;
  export let isExited = false;

  const inputColorChannels = ['Red', 'Green', 'Blue'];
  $: inputChannelName = isInputInputLayer && inputColorChannels[inputChannelIndex]
    ? inputColorChannels[inputChannelIndex]
    : `Feature ${inputChannelIndex + 1}`;
  
  const dispatch = createEventDispatcher();
	let stride = 1;
  const dilation = 1;
  var isPaused = false;
  var outputFinal = singleConv(input, kernel, stride);
  $: if (stride > 0) {
    try { 
      outputFinal = singleConv(input, kernel, stride);
    } catch {

    }
  }
  
  function handleClickPause() {
    isPaused = !isPaused;
  }


  function handlePauseFromInteraction(event) {
    isPaused = event.detail.text;
  }

  function handleClickX() {
    isExited = true;
    dispatch('message', {
      text: isExited
    });
  }
</script>

<style>
  .control-pannel {
    display: flex;
    position: relative;
    flex-direction: column;
    align-items: center;
    margin-bottom: 10px;
  }

  .buttons {
    cursor: pointer;
    position: absolute;
    top: 0px;
    right: 0px;
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

  #detailview-container {
    display: block;
    width: 720px;
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

{#if !isExited}
  <div id="detailview-container">
    <div class="box">
      <div class="control-pannel">
        <div class="title-text">
          Convolution Computation
        </div>

        <div class="buttons">
          <button type="button" class="play-button control-button" on:click={handleClickPause}
            aria-label={isPaused ? 'Play animation' : 'Pause animation'}
            title={isPaused ? 'Play animation' : 'Pause animation'}>
            {@html isPaused ?
              '<i class="fas fa-play-circle play-icon"></i>' :
              '<i class="fas fa-pause-circle"></i>'}
          </button>

          <button type="button" class="delete-button control-button" on:click={handleClickX}
            aria-label="Close computation" title="Close">
            <i class="fas control-icon fa-times-circle"></i>
          </button>
        </div>
      </div>

      <div class="animator-container">
        <ConvolutionAnimator on:message={handlePauseFromInteraction} 
          kernel={kernel} image={input} output={outputFinal} 
          stride={stride} dilation={dilation} isPaused={isPaused}
          kernelMinMax={kernelMinMax} kernelColorRange={kernelColorRange}
          dataRange={dataRange} colorScale={colorScale}
          isInputInputLayer={isInputInputLayer}
          inputChannelName={inputChannelName} />
      </div>
    </div>
  </div>
{/if}

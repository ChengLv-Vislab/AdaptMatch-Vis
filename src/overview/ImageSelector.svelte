<script>
  import { createEventDispatcher } from 'svelte';
  import { demoImageURL } from './datasets.js';
  
  export let show = false;
  export let imageOptions = [];
  export let selectedImage = '';
  export let imageRoot = '/assets/img';
  export let imageVersion = '';
  
  const dispatch = createEventDispatcher();
  
  const closeModal = () => {
    dispatch('canceled');
  };
  
  const selectImage = (imageName) => {
    dispatch('imageSelected', { imageName });
  };

  const handleKeydown = (event) => {
    if (show && event.key === 'Escape') closeModal();
  };
  
</script>

<style>
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal-content {
    position: relative;
    z-index: 1;
    background: white;
    border-radius: 8px;
    padding: 20px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal-backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
  }
  
  .modal-title {
    font-size: 18px;
    font-weight: bold;
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
  }
  
  .close-button:hover {
    color: #333;
  }
  
  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 15px;
  }
  
  .image-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #ffffff;
    font-family: inherit;
    line-height: inherit;
    color: inherit;
    padding: 10px;
    border: 2px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .image-option:hover {
    border-color: #007bff;
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
  }
  
  .image-option.selected {
    border-color: #007bff;
    background-color: #ffffff;
  }
  
  .image-preview {
    width: 96px;
    height: 96px;
    object-fit: contain;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  
  .image-label {
    font-size: 12px;
    text-align: center;
    color: #666;
    word-break: break-word;
  }
  
  .modal-footer {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
</style>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="image-selector-title">
    <button type="button" class="modal-backdrop" tabindex="-1"
      aria-label="Close image selection" on:click={closeModal}></button>
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title" id="image-selector-title">Select an Image</h3>
        <button type="button" class="close-button" aria-label="Close image selection" on:click={closeModal}>&times;</button>
      </div>
      
      <div class="image-grid">
        {#each imageOptions as image}
          <button type="button"
            class="image-option" 
            class:selected={selectedImage === image.file}
            aria-label={`Select ${image.class}`}
            aria-pressed={selectedImage === image.file}
            on:click={() => selectImage(image.file)}
          >
            <img 
              src={demoImageURL(imageRoot, image.file, imageVersion)}
              alt={image.class}
              class="image-preview"
            >
            <span class="image-label">{image.class}</span>
          </button>
        {/each}
      </div>
      
      <div class="modal-footer">
        <button class="button" on:click={closeModal}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

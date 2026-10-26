<script>
  import { createEventDispatcher } from 'svelte';
  
  export let show = false;
  
  const dispatch = createEventDispatcher();
  
  let files;
  let showLoading = false;
  let errorInfo = {
    show: false,
    error: ''
  };
  let valiImg;
  
  const closeModal = () => {
    dispatch('canceled');
    resetState();
  };

  const handleKeydown = (event) => {
    if (show && event.key === 'Escape') closeModal();
  };
  
  const resetState = () => {
    files = null;
    showLoading = false;
    errorInfo.show = false;
    errorInfo.error = '';
  };
  
  const handleFileUpload = () => {
    if (!files || files.length === 0) {
      errorInfo.show = true;
      errorInfo.error = "Please select a file.";
      return;
    }
    
    showLoading = true;
    errorInfo.show = false;
    
    let reader = new FileReader();
    reader.onload = (event) => {
      valiImg.src = event.target.result;
    };
    reader.readAsDataURL(files[0]);
  };
  
  const errorCallback = () => {
    showLoading = false;
    errorInfo.show = true;
    errorInfo.error = "Not a valid image file.";
  };
  
  const loadCallback = () => {
    // Test if we can draw to canvas (CORS check)
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");
    
    canvas.width = valiImg.width;
    canvas.height = valiImg.height;
    context.drawImage(valiImg, 0, 0);
    
    try {
      context.getImageData(0, 0, valiImg.width, valiImg.height);
      // Success - dispatch the image
      showLoading = false;
      dispatch('imageUploaded', { url: valiImg.src });
      resetState();
    } catch(err) {
      showLoading = false;
      errorInfo.show = true;
      errorInfo.error = "Error processing the image.";
    }
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
    max-width: 500px;
    width: 90%;
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
  
  .upload-area {
    border: 2px dashed #ddd;
    border-radius: 8px;
    padding: 40px 20px;
    text-align: center;
    margin-bottom: 20px;
    background: #ffffff;
  }

  .upload-area:hover {
    border-color: #007bff;
    background: #ffffff;
  }
  
  .upload-icon {
    font-size: 48px;
    color: #ccc;
    margin-bottom: 10px;
  }
  
  .upload-text {
    color: #666;
    margin-bottom: 15px;
  }
  
  .file-input {
    display: none;
  }
  
  .upload-button {
    background: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .upload-button:hover {
    background: #0056b3;
  }
  
  .error-message {
    color: #dc3545;
    font-size: 14px;
    margin-bottom: 15px;
    padding: 10px;
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
  }
  
  .loading {
    text-align: center;
    color: #007bff;
    font-style: italic;
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 15px;
    border-top: 1px solid #eee;
  }
  
  .button {
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .button-primary {
    background: #28a745;
    color: white;
    border-color: #28a745;
  }
  
  .button-primary:hover {
    background: #218838;
  }
  
  .selected-file {
    margin-top: 10px;
    padding: 10px;
    background: #e9ecef;
    border-radius: 4px;
    font-size: 14px;
  }
</style>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="image-uploader-title">
    <button type="button" class="modal-backdrop" tabindex="-1"
      aria-label="Close upload dialog" on:click={closeModal}></button>
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title" id="image-uploader-title">Upload Image</h3>
        <button type="button" class="close-button" aria-label="Close upload dialog" on:click={closeModal}>&times;</button>
      </div>
      
      {#if errorInfo.show}
        <div class="error-message">
          {errorInfo.error}
        </div>
      {/if}
      
      {#if showLoading}
        <div class="loading">
          Processing image...
        </div>
      {:else}
        <div class="upload-area">
          <div class="upload-icon">
            <i class="fas fa-cloud-upload-alt"></i>
          </div>
          <div class="upload-text">
            Click to select an image file
          </div>
          <input 
            type="file" 
            class="file-input" 
            accept="image/*"
            bind:files
            id="file-upload"
          >
          <label for="file-upload" class="upload-button">
            Choose File
          </label>
        </div>
        
        {#if files && files.length > 0}
          <div class="selected-file">
            Selected: {files[0].name}
          </div>
        {/if}
      {/if}
      
      <div class="modal-footer">
        <button class="button" on:click={closeModal}>Cancel</button>
        {#if files && files.length > 0 && !showLoading}
          <button class="button button-primary" on:click={handleFileUpload}>
            Upload
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Hidden image for validation -->
<img 
  style="display: none"
  alt=""
  aria-hidden="true"
  bind:this={valiImg}
  on:error={errorCallback}
  on:load={loadCallback}
>

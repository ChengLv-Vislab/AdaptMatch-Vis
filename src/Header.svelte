<script>
  import DatasetSelector from './overview/DatasetSelector.svelte';
</script>

<style>
	#header {
		height: 40px;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		padding: 0 10px;
		align-items: center;
		background: rgb(30, 30, 30);
		box-sizing: border-box;
	}

  .dataset-switcher {
    min-width: 0;
    justify-self: start;
    width: 148px;
    max-width: 100%;
  }

	#logo {
		display: flex;
		align-items: center;
		justify-self: center;
	}

	#logo-text {
		font-size: 30px;
		color: white;
		font-family: 'none';
		margin-right: 10px;
	}

  @media (max-width: 520px) {
    #logo-text { font-size: 22px; margin-right: 0; }
  }

</style>

<div id="header">
  <div class="dataset-switcher">
    <DatasetSelector />
  </div>
  <div id="logo">
    <div id="logo-text">
	  AdaptMatch-Vis
    </div>

  </div>
</div>

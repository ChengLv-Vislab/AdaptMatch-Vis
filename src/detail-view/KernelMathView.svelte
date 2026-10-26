<script>
  import { afterUpdate, onMount } from 'svelte';

  export let data;
  export let kernel;
  export let constraint;
  export let dataRange;
  export let kernelRange;
  export let colorScale = d3.interpolateRdBu;
  export let kernelColorScale = d3.interpolateBrBG;
  export let resultColorScale = d3.interpolateRdBu;
  export let isInputLayer = false;
  export let result = undefined;
  export let displayPrecision = 3;

  let gridFinal;
  let oldData = data;
  let oldKernel = kernel;
  let oldResult = result;

  const formatNumber = (value) => {
    if (!Number.isFinite(Number(value))) return '0';
    return Number(Number(value).toFixed(displayPrecision)).toString();
  };

  const redraw = () => {
    const root = d3.select(gridFinal).select('#grid');
    root.selectAll('*').remove();

    const kernelSize = data.length;
    const valueFontSize = 14;
    const multiplicationFontSize = 11;
    const symbolFontSize = 14;
    const inputCellWidth = constraint * 1.45;
    const inputCellHeight = constraint * 0.7;
    const multiplicationGap = constraint * 0.46;
    const kernelCellHeight = inputCellHeight;
    const pairHeight = inputCellHeight + multiplicationGap + kernelCellHeight;
    const horizontalOperatorGap = constraint * 0.78;
    const termPitch = inputCellWidth + horizontalOperatorGap;
    const rowGap = constraint * 0.56;
    const rowPitch = pairHeight + rowGap;
    const baseWidth = kernelSize * termPitch;
    const horizontalPadding = constraint * 0.2;
    const mainGridHeight = (kernelSize - 1) * rowPitch + pairHeight;
    const hasResult = Number.isFinite(Number(result));
    const resultWidth = constraint * 2.05;
    const resultHeight = constraint * 1.02;
    const resultRowGap = constraint * 0.28;
    const equalsResultGap = constraint * 0.22;
    const resultGroupWidth = symbolFontSize + equalsResultGap + resultWidth;
    const svgWidth = baseWidth + horizontalPadding * 2 + 2;
    const svgHeight = mainGridHeight +
      (hasResult ? resultRowGap + resultHeight : 0) + 2;

    root.attr('width', `${svgWidth}px`).attr('height', `${svgHeight}px`);

    const inputRange = dataRange || 1;
    const weightRange = kernelRange && kernelRange.range ? kernelRange.range : 1;
    const cornerRadius = 4;

    const rows = root.selectAll('.row')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'row');

    const cells = rows.selectAll('.term')
      .data(d => d)
      .enter()
      .append('g')
      .attr('class', 'term');

    const cellX = d => horizontalPadding + d.col * termPitch;
    const cellY = d => d.row * rowPitch;

    cells.append('rect')
      .attr('class', 'input-value-cell')
      .attr('x', cellX)
      .attr('y', cellY)
      .attr('width', inputCellWidth)
      .attr('height', inputCellHeight)
      .attr('rx', cornerRadius)
      .attr('ry', cornerRadius)
      .style('opacity', 0.5)
      .style('fill', d => {
        let normalizedValue = d.text;
        if (isInputLayer) {
          normalizedValue = 1 - d.text;
        } else {
          normalizedValue = (d.text + inputRange / 2) / inputRange;
        }
        return colorScale(normalizedValue);
      })
      .style('stroke', 'black');

    cells.append('rect')
      .attr('class', 'kernel-value-cell')
      .attr('x', cellX)
      .attr('y', d => cellY(d) + inputCellHeight + multiplicationGap)
      .attr('width', inputCellWidth)
      .attr('height', kernelCellHeight)
      .attr('rx', cornerRadius)
      .attr('ry', cornerRadius)
      .style('opacity', 0.55)
      .style('fill', d => {
        const normalizedValue = (kernel[d.row][d.col].text + weightRange / 2) / weightRange;
        const gap = 0.2;
        return kernelColorScale(normalizedValue * (1 - 2 * gap) + gap);
      });

    cells.append('text')
      .attr('class', 'math-text input-value')
      .attr('data-value', d => d.text)
      .style('font-size', `${valueFontSize}px`)
      .attr('x', d => cellX(d) + inputCellWidth / 2)
      .attr('y', d => cellY(d) + inputCellHeight / 2)
      .attr('dy', '0.12em')
      .style('fill', d => {
        let normalizedValue = d.text;
        if (isInputLayer) {
          normalizedValue = 1 - d.text;
        } else {
          normalizedValue = (d.text + inputRange / 2) / inputRange;
        }
        if (normalizedValue < 0.2 || normalizedValue > 0.8) {
          return isInputLayer && normalizedValue < 0.2 ? 'black' : 'white';
        }
        return 'black';
      })
      .style('text-anchor', 'middle')
      .style('dominant-baseline', 'middle')
      .text(d => formatNumber(d.text));

    cells.append('text')
      .attr('class', 'math-text multiplication-symbol')
      .style('font-size', `${multiplicationFontSize}px`)
      .attr('font-weight', 600)
      .attr('x', d => cellX(d) + inputCellWidth / 2)
      .attr('y', d => cellY(d) + inputCellHeight + multiplicationGap / 2)
      .attr('dy', '0.16em')
      .style('fill', 'black')
      .style('text-anchor', 'middle')
      .style('dominant-baseline', 'middle')
      .text('×');

    cells.append('text')
      .attr('class', 'math-text kernel-value')
      .attr('data-value', d => kernel[d.row][d.col].text)
      .style('font-size', `${valueFontSize}px`)
      .attr('x', d => cellX(d) + inputCellWidth / 2)
      .attr('y', d => cellY(d) + inputCellHeight + multiplicationGap + kernelCellHeight / 2)
      .attr('dy', '0.12em')
      .style('fill', d => {
        const normalizedValue = (kernel[d.row][d.col].text + weightRange / 2) / weightRange;
        const gap = 0.2;
        const normalizedValueWithGap = normalizedValue * (1 - 2 * gap) + gap;
        return normalizedValueWithGap < 0.2 || normalizedValueWithGap > 0.8
          ? 'white'
          : 'black';
      })
      .style('text-anchor', 'middle')
      .style('dominant-baseline', 'middle')
      .text(d => formatNumber(kernel[d.row][d.col].text));

    cells.append('text')
      .attr('class', 'math-text addition-symbol')
      .style('font-size', `${symbolFontSize}px`)
      .attr('x', d => cellX(d) + inputCellWidth + horizontalOperatorGap / 2)
      .attr('y', d => cellY(d) + pairHeight / 2)
      .attr('dy', '0.16em')
      .style('text-anchor', 'middle')
      .style('dominant-baseline', 'middle')
      .text(d => d.row === kernelSize - 1 && d.col === kernelSize - 1 ? '' : '+');

    if (hasResult) {
      const resultGroupX = horizontalPadding + (baseWidth - resultGroupWidth) / 2;
      const equalsX = resultGroupX + symbolFontSize / 2;
      const resultX = resultGroupX + symbolFontSize + equalsResultGap;
      const resultY = mainGridHeight + resultRowGap;
      const resultLabel = formatNumber(result);
      const resultFontSize = 16;
      const resultNormalizedValue = Math.max(
        0,
        Math.min(1, (Number(result) + inputRange / 2) / inputRange)
      );

      root.append('text')
        .attr('class', 'math-text result-equals')
        .attr('x', equalsX)
        .attr('y', resultY + resultHeight / 2)
        .attr('dy', '0.16em')
        .style('font-size', `${symbolFontSize}px`)
        .style('font-weight', 600)
        .style('fill', '#202020')
        .style('text-anchor', 'middle')
        .style('dominant-baseline', 'middle')
        .text('=');

      root.append('rect')
        .attr('class', 'computation-result-cell')
        .attr('x', resultX)
        .attr('y', resultY)
        .attr('width', resultWidth)
        .attr('height', resultHeight)
        .attr('rx', cornerRadius)
        .attr('ry', cornerRadius)
        .style('fill', resultColorScale(resultNormalizedValue))
        .style('stroke', '#333')
        .style('stroke-width', 1.2);

      root.append('text')
        .attr('class', 'math-text computation-result')
        .attr('data-value', result)
        .attr('x', resultX + resultWidth / 2)
        .attr('y', resultY + resultHeight / 2)
        .style('font-size', `${resultFontSize}px`)
        .style('font-weight', 600)
        .style('fill', resultNormalizedValue < 0.16 || resultNormalizedValue > 0.84
          ? 'white'
          : '#202020')
        .style('text-anchor', 'middle')
        .style('dominant-baseline', 'middle')
        .text(resultLabel);
    }
  };

  afterUpdate(() => {
    if (data !== oldData || kernel !== oldKernel || result !== oldResult) {
      redraw();
      oldData = data;
      oldKernel = kernel;
      oldResult = result;
    }
  });

  onMount(redraw);
</script>

<div class="grid" bind:this={gridFinal}>
  <svg id="grid" width="100%" height="100%"></svg>
</div>

<style>
  .grid {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
</style>

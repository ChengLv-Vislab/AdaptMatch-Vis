<script>
  import { onMount, createEventDispatcher, tick } from "svelte";
  import {
    prepareWeightStrategies,
    rankWeightConfigurations,
    projectSimplex,
    accuracyRadius,
    accuracyColorStyle,
    getTernaryLayout,
    getWeightComparisonPanelWidth,
    getTernaryAnnotations,
    fitConfigurationRadius,
    placeConfigurationLabels,
    configurationTooltip,
    getWeightGuideCoordinates,
    positionComparisonTooltip,
    ACCURACY_PURPLE_PALETTE,
  } from "./weight-comparison.js";

  export let strategies = [];
  export let selectedId = null;
  export let disabled = false;
  const dispatch = createEventDispatcher();

  let plotContainer;
  let width = 740;
  let height = 580;
  let rankingObstacles = [];
  let tooltip = null;
  let hoveredStrategyId = null;
  let tooltipElement;
  let tooltipAnchor = { x: 0, y: 0 };
  let tooltipPosition = { x: 8, y: 8 };
  const tooltipId = "weight-configuration-tooltip";
  const symbols = ["α", "β", "γ"];
  const tickRatios = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const interpolate = (start, end, ratio) => ({
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  });

  $: configurations = prepareWeightStrategies(strategies);
  $: minimumAccuracy = configurations.length
    ? Math.min(...configurations.map((strategy) => strategy.accuracy))
    : 0;
  $: maximumAccuracy = configurations.length
    ? Math.max(...configurations.map((strategy) => strategy.accuracy))
    : 0;
  $: accuracyGradient =
    maximumAccuracy > minimumAccuracy
      ? `linear-gradient(to right, ${ACCURACY_PURPLE_PALETTE.join(", ")})`
      : `linear-gradient(to right, ${ACCURACY_PURPLE_PALETTE[2]}, ${ACCURACY_PURPLE_PALETTE[2]})`;
  $: ranked = rankWeightConfigurations(configurations);
  $: best = ranked.slice(0, Math.min(3, Math.ceil(ranked.length / 2)));
  $: worstCount = Math.min(3, Math.floor(ranked.length / 2));
  $: worst = worstCount > 0 ? ranked.slice(-worstCount).reverse() : [];
  $: activeId = configurations.some((strategy) => strategy.id === selectedId)
    ? selectedId
    : null;
  $: layout = getTernaryLayout(width, height);
  $: ({ vertices, maximumRadius } = layout);
  $: annotations = getTernaryAnnotations(layout, width, rankingObstacles);
  $: coordinates = configurations.map((strategy) => ({
    ...strategy,
    ...projectSimplex(strategy.weights, vertices),
  }));
  $: radiusScale = fitConfigurationRadius(coordinates, maximumRadius);
  $: positioned = coordinates.map((strategy) => ({
    ...strategy,
    radius: accuracyRadius(strategy.accuracy, radiusScale),
    colors: accuracyColorStyle(
      strategy.accuracy,
      minimumAccuracy,
      maximumAccuracy,
    ),
  }));
  $: plotted = placeConfigurationLabels(
    positioned,
    width,
    height,
    annotations.obstacles,
  ).sort((a, b) => Number(a.id === activeId) - Number(b.id === activeId));
  $: hoveredStrategy =
    plotted.find((strategy) => strategy.id === hoveredStrategyId) || null;
  $: weightGuide = hoveredStrategy
    ? getWeightGuideCoordinates(hoveredStrategy.weights, vertices)
    : null;
  $: if (
    disabled ||
    (tooltip &&
      tooltip.key.startsWith("configuration-") &&
      !configurations.some(
        (strategy) => `configuration-${strategy.id}` === tooltip.key,
      ))
  ) {
    hoveredStrategyId = null;
    hideTooltip();
  }

  function selectWithKeyboard(event, id) {
    if (event.key === "Escape") hideTooltip();
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(id);
    }
  }

  function select(id) {
    if (!disabled) dispatch("select", { id });
  }

  function describe(strategy) {
    return (
      `${strategy.displayId}: α=${strategy.rawWeights[0].toFixed(2)}, β=${strategy.rawWeights[1].toFixed(2)}, ` +
      `γ=${strategy.rawWeights[2].toFixed(2)}; best validation accuracy ${strategy.accuracy.toFixed(2)}%; best epoch ${strategy.bestEpoch}. ` +
      `Circle area is proportional to accuracy; darker purple means higher accuracy.${strategy.recommended ? " Recommended configuration." : ""}`
    );
  }

  function tooltipPortal(node) {
    // The metric views clip their contents. A body-level tooltip stays visible
    // beside the plot and is removed when its Svelte block is destroyed.
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }

  function updateTooltipPosition() {
    if (!tooltipElement) return;
    tooltipPosition = positionComparisonTooltip(
      tooltipAnchor,
      {
        width: tooltipElement.offsetWidth,
        height: tooltipElement.offsetHeight,
      },
      {
        width: document.documentElement.clientWidth,
        height: window.innerHeight,
      },
    );
  }

  async function showTooltip(event, details) {
    if (disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    tooltipAnchor =
      event.type === "focus"
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: event.clientX, y: event.clientY };
    tooltip = details;
    await tick();
    if (tooltip && tooltip.key === details.key && !disabled)
      updateTooltipPosition();
  }

  function moveTooltip(event) {
    if (!tooltip) return;
    tooltipAnchor = { x: event.clientX, y: event.clientY };
    updateTooltipPosition();
  }

  function hideTooltip() {
    tooltip = null;
  }

  function axisTooltip(symbol, label, explanation) {
    return {
      key: `axis-${symbol}`,
      title: label,
      items: [
        { label: "Weight", value: symbol },
        { label: "Meaning", value: explanation },
        { label: "Scale", value: "0–1" },
      ],
    };
  }

  onMount(() => {
    const measure = () => {
      const rect = plotContainer.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        width = rect.width;
        height = rect.height;
      }
      rankingObstacles = [
        ...plotContainer.parentElement.querySelectorAll(".ranking-panel"),
      ].map((panel) => {
        const bounds = panel.getBoundingClientRect();
        return {
          x: bounds.left - rect.left,
          y: bounds.top - rect.top,
          width: bounds.width,
          height: bounds.height,
        };
      });
      if (rect.width > 0 && rect.height > 0) {
        dispatch("resize", {
          width: getWeightComparisonPanelWidth(height, rankingObstacles),
        });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(plotContainer);
    observer.observe(plotContainer.parentElement);
    plotContainer.parentElement
      .querySelectorAll(".ranking-panel")
      .forEach((panel) => observer.observe(panel));
    return () => observer.disconnect();
  });
</script>

<section
  class="weight-comparison"
  class:short={height < 340}
  aria-labelledby="weight-comparison-title"
>
  <div class="comparison-header">
    <h2 id="weight-comparison-title" class="metric-view-title">
      Weight Configuration Comparison
    </h2>
    <div class="comparison-key">
      {#if configurations.length}
        <div
          class="accuracy-color-legend"
          role="img"
          aria-label="Accuracy color scale: {minimumAccuracy.toFixed(
            2,
          )}% to {maximumAccuracy.toFixed(
            2,
          )}%; darker purple means higher accuracy"
        >
          <span>Accuracy</span>
          <span>{minimumAccuracy.toFixed(2)}%</span>
          <span
            class="accuracy-gradient"
            style="background: {accuracyGradient};"
          ></span>
          <span>{maximumAccuracy.toFixed(2)}%</span>
        </div>
      {/if}
    </div>
  </div>

  <div class="comparison-body">
    <div class="ternary-plot" bind:this={plotContainer}>
      <svg
        viewBox="0 0 {width} {height}"
        role="group"
        aria-label="Ternary comparison of alpha, beta and gamma weights; circle area represents accuracy; darker purple means higher accuracy"
        shape-rendering="geometricPrecision"
      >
        <path
          class="triangle-fill"
          d="M{vertices[0].x},{vertices[0].y} L{vertices[1].x},{vertices[1]
            .y} L{vertices[2].x},{vertices[2].y} Z"
        />
        {#each tickRatios.filter((ratio) => ratio > 0 && ratio < 1) as ratio}
          {#each [0, 1, 2] as axis}
            {@const start = interpolate(
              vertices[(axis + 1) % 3],
              vertices[axis],
              ratio,
            )}
            {@const end = interpolate(
              vertices[(axis + 2) % 3],
              vertices[axis],
              ratio,
            )}
            <line
              class="ternary-grid"
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
            />
          {/each}
        {/each}

        {#if weightGuide}
          <path
            class="weight-guide"
            aria-hidden="true"
            data-strategy={hoveredStrategy.id}
            d="M {weightGuide.point.x},{weightGuide.point.y} L {weightGuide
              .alpha.x},{weightGuide.alpha.y}
             M {weightGuide.point.x},{weightGuide.point.y} L {weightGuide.beta
              .x},{weightGuide.beta.y}
             M {weightGuide.point.x},{weightGuide.point.y} L {weightGuide.gamma
              .x},{weightGuide.gamma.y}"
          />
        {/if}

        {#each plotted as strategy (strategy.id)}
          {#if strategy.label}
            <line
              class="strategy-label-leader"
              aria-hidden="true"
              x1={strategy.label.leaderStartX}
              y1={strategy.label.leaderStartY}
              x2={strategy.label.leaderX}
              y2={strategy.label.leaderY}
            />
          {/if}
        {/each}

        {#each tickRatios as ratio}
          {@const alphaPoint = interpolate(vertices[1], vertices[0], ratio)}
          {@const betaPoint = interpolate(vertices[2], vertices[1], ratio)}
          {@const gammaPoint = interpolate(vertices[0], vertices[2], ratio)}
          <line
            class="ternary-tick-mark"
            x1={alphaPoint.x}
            y1={alphaPoint.y}
            x2={alphaPoint.x - 5}
            y2={alphaPoint.y}
          />
          <line
            class="ternary-tick-mark"
            x1={betaPoint.x}
            y1={betaPoint.y}
            x2={betaPoint.x}
            y2={betaPoint.y + 5}
          />
          <line
            class="ternary-tick-mark"
            x1={gammaPoint.x}
            y1={gammaPoint.y}
            x2={gammaPoint.x + 5}
            y2={gammaPoint.y}
          />
          <text
            class="ternary-tick"
            text-anchor="end"
            x={alphaPoint.x - annotations.tickOffset}
            y={alphaPoint.y + 4}>{ratio.toFixed(1)}</text
          >
          <text
            class="ternary-tick"
            text-anchor="middle"
            x={betaPoint.x}
            y={betaPoint.y + annotations.baseTickOffset}
            >{ratio.toFixed(1)}</text
          >
          <text
            class="ternary-tick"
            text-anchor="start"
            x={gammaPoint.x + annotations.gammaTickOffset}
            y={gammaPoint.y + annotations.gammaTickY}>{ratio.toFixed(1)}</text
          >
        {/each}

        <g
          class="ternary-axis-label"
          data-axis="alpha"
          role="img"
          aria-label="α: Confidence weight"
        >
          <text
            class="ternary-axis"
            text-anchor={annotations.alpha.anchor}
            x={annotations.alpha.x}
            y={annotations.alpha.y}>α</text
          >
        </g>
        <g
          class="ternary-axis-label"
          data-axis="beta"
          role="img"
          aria-label="β: Uncertainty weight"
        >
          <text
            class="ternary-axis"
            text-anchor={annotations.beta.anchor}
            x={annotations.beta.x}
            y={annotations.beta.y}>β</text
          >
        </g>
        <g
          class="ternary-axis-label"
          data-axis="gamma"
          role="img"
          aria-label="γ: Class balance weight"
        >
          <text
            class="ternary-axis"
            text-anchor={annotations.gamma.anchor}
            x={annotations.gamma.x}
            y={annotations.gamma.y}>γ</text
          >
        </g>

        {#each plotted as strategy (strategy.id)}
          <g
            class="strategy-glyph"
            class:active={activeId === strategy.id}
            style="--strategy-fill: {strategy.colors
              .fill}; --strategy-stroke: {strategy.colors.stroke};"
            role="button"
            tabindex={disabled ? -1 : 0}
            aria-disabled={disabled}
            aria-label={describe(strategy)}
            aria-describedby={tooltip &&
            tooltip.key === `configuration-${strategy.id}`
              ? tooltipId
              : undefined}
            aria-pressed={activeId === strategy.id}
            data-strategy={strategy.id}
            data-alpha={strategy.weights[0]}
            data-beta={strategy.weights[1]}
            data-gamma={strategy.weights[2]}
            data-accuracy={strategy.accuracy}
            data-configuration-label={strategy.displayId}
            on:click={() => select(strategy.id)}
            on:keydown={(event) => selectWithKeyboard(event, strategy.id)}
            on:mouseenter={(event) =>
              showTooltip(event, configurationTooltip(strategy))}
            on:mousemove={moveTooltip}
            on:mouseleave={hideTooltip}
            on:focus={(event) =>
              showTooltip(event, configurationTooltip(strategy))}
            on:blur={hideTooltip}
          >
            <circle
              class="strategy-circle"
              cx={strategy.x}
              cy={strategy.y}
              r={strategy.radius}
              on:mouseenter={() => (hoveredStrategyId = strategy.id)}
              on:mouseleave={() => (hoveredStrategyId = null)}
            />
            {#if strategy.label}
              <text
                class="strategy-id"
                text-anchor="middle"
                dominant-baseline="central"
                x={strategy.label.centerX}
                y={strategy.label.centerY}>{strategy.displayId}</text
              >
            {/if}
          </g>
        {/each}
      </svg>
    </div>

    {#each [{ key: "best", title: "Best 3", entries: best }, { key: "worst", title: "Worst 3", entries: worst }] as ranking}
      <div
        class="ranking-panel {ranking.key}"
        aria-label={ranking.key === "best"
          ? "Three highest-accuracy configurations"
          : "Three lowest-accuracy configurations"}
      >
        <h3>{ranking.title}</h3>
        <ol>
          {#each ranking.entries as strategy (strategy.id)}
            <li>
              <button
                type="button"
                class="ranking-entry"
                class:active={activeId === strategy.id}
                {disabled}
                data-strategy={strategy.id}
                aria-pressed={activeId === strategy.id}
                aria-label={describe(strategy)}
                aria-describedby={tooltip &&
                tooltip.key === `configuration-${strategy.id}`
                  ? tooltipId
                  : undefined}
                on:click={() => select(strategy.id)}
                on:mouseenter={(event) =>
                  showTooltip(event, configurationTooltip(strategy))}
                on:mousemove={moveTooltip}
                on:mouseleave={hideTooltip}
                on:focus={(event) =>
                  showTooltip(event, configurationTooltip(strategy))}
                on:blur={hideTooltip}
                on:keydown={(event) => {
                  if (event.key === "Escape") hideTooltip();
                }}
              >
                <span class="ranking-summary"
                  ><span class="configuration-id">{strategy.displayId}</span
                  ><strong
                    aria-label="Accuracy: {strategy.accuracy.toFixed(2)}%"
                    >{strategy.accuracy.toFixed(2)}%</strong
                  ></span
                >
                <span class="ranking-weights">
                  {#each symbols as symbol, axis}<span
                      >{symbol}={strategy.rawWeights[axis].toFixed(2)}</span
                    >{/each}
                </span>
              </button>
            </li>
          {/each}
        </ol>
      </div>
    {/each}
  </div>
</section>

{#if tooltip && !disabled}
  <div
    id={tooltipId}
    class="comparison-tooltip"
    role="tooltip"
    use:tooltipPortal
    bind:this={tooltipElement}
    style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px;"
  >
    <div class="tooltip-heading">{tooltip.title}</div>
    <ul>
      {#each tooltip.items as item}<li>
          {item.label}: <strong>{item.value}</strong>
        </li>{/each}
    </ul>
  </div>
{/if}

<style>
  .weight-comparison {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    min-height: 0;
    padding: 8px 12px 4px;
    color: #000;
    font-family: Arial, sans-serif;
    font-variant-numeric: tabular-nums;
  }
  .comparison-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    column-gap: 8px;
    row-gap: 3px;
  }
  .comparison-key {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .weight-comparison .metric-view-title {
    color: #000;
  }
  .accuracy-color-legend {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #000;
    font-size: 12px;
    line-height: 16px;
    white-space: nowrap;
  }
  .accuracy-gradient {
    display: block;
    width: 60px;
    height: 6px;
    border: 1px solid #b7a4cb;
    border-radius: 1px;
  }
  .comparison-body {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    margin-top: 3px;
  }
  .ternary-plot {
    position: absolute;
    inset: 0;
    min-width: 0;
    min-height: 0;
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
    font-family: inherit;
  }
  svg text {
    fill: #000;
    font-family: inherit;
  }
  .triangle-fill {
    fill: #fff;
    stroke: #111;
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }
  .ternary-grid {
    stroke: #c0c6ce;
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }
  .weight-guide {
    fill: none;
    stroke: #e31a1c;
    stroke-width: 2;
    stroke-linecap: round;
    opacity: 0.9;
    pointer-events: none;
    vector-effect: non-scaling-stroke;
  }
  .ternary-tick-mark {
    stroke: #111;
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }
  .ternary-tick {
    font-size: 12px;
  }
  .ternary-axis {
    font-size: 20px;
    font-weight: 700;
    fill: #8A2BE2;
  }
  .strategy-glyph {
    cursor: pointer;
    outline: none;
  }
  .strategy-circle {
    fill: var(--strategy-fill);
    stroke: none;
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }
  .strategy-glyph.active .strategy-circle,
  .strategy-glyph:focus .strategy-circle,
  .strategy-glyph:hover .strategy-circle {
    stroke: #111;
    stroke-width: 2.5;
  }
  .strategy-label-leader {
    stroke: none;
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }
  .strategy-id {
    font-size: 12px;
    font-weight: 600;
    paint-order: stroke;
    stroke: #fff;
    stroke-width: 3px;
    stroke-linejoin: round;
  }
  .ranking-panel {
    position: absolute;
    top: 4px;
    width: 146px;
  }
  .ranking-panel.best {
    left: 0;
  }
  .ranking-panel.worst {
    right: 0;
  }
  h3 {
    margin: 0 0 5px;
    padding: 0 6px;
    color: #000;
    font-size: 14px;
    line-height: 20px;
    font-weight: 700;
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .ranking-entry {
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: 100%;
    padding: 4px 6px;
    margin-bottom: 4px;
    border: 1px solid #505253;
    border-radius: 4px;
    background: #fff;
    text-align: left;
    color: #000;
    font-family: inherit;
    cursor: pointer;
  }
  .ranking-entry strong {
    color: inherit;
  }
  .ranking-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    font-size: 12px;
    line-height: 16px;
    white-space: nowrap;
  }
  .configuration-id {
    font-weight: 600;
  }
  .ranking-weights {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 3px;
    font-size: 12px;
    line-height: 16px;
    white-space: nowrap;
  }
  .ranking-entry:hover,
  .ranking-entry.active {
    background: #f4eefb;
    border-color: #8059a0;
  }
  .ranking-entry:focus-visible {
    outline: 2px solid #111;
    outline-offset: 2px;
  }
  /* Compact spacing only in short restored-height rows; all font sizes and
     all six complete ranking entries remain unchanged. */
  .weight-comparison.short h3 {
    margin-bottom: 2px;
    line-height: 18px;
  }
  .weight-comparison.short .ranking-entry {
    gap: 0;
    padding-top: 1px;
    padding-bottom: 1px;
    margin-bottom: 5px;
  }
  .weight-comparison.short .ranking-summary,
  .weight-comparison.short .ranking-weights {
    line-height: 14px;
  }
  .comparison-tooltip {
    position: fixed;
    z-index: 10000;
    pointer-events: none;
    box-sizing: border-box;
    max-width: min(370px, calc(100vw - 16px));
    padding: 8px 12px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-family: Arial, sans-serif;
    font-size: 18px;
    line-height: 26px;
    text-align: left;
  }
  .tooltip-heading {
    margin-bottom: 4px;
    font-weight: 700;
  }
  .comparison-tooltip ul {
    margin: 0;
    padding-left: 22px;
    list-style: disc;
  }
  .comparison-tooltip li {
    padding-left: 1px;
  }
  .comparison-tooltip strong {
    color: inherit;
    font-weight: 700;
  }
</style>

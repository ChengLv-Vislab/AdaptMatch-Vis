<script>
    import { onDestroy, createEventDispatcher } from "svelte";
    import * as d3 from "d3";
    import { observeChartSize } from "./chart-size.js";
    import { selectedEpochStore, confusionData, selectedWeightConfigurationStore, classNamesStore } from "../stores.js";

    $: epoch = $selectedEpochStore;

    let svgContainer;
    let width = 0;
    let height = 0;
    let chartWidth = 0;
    let chartHeight = 0;

    function resizeChart(size) {
        chartWidth = size.width;
        chartHeight = size.height;
    }

    const numClasses = 10;
    const dispatch = createEventDispatcher();
    const margin = { top: 50, right: 10, bottom: 20, left: 110 }; // 增加右侧空间
    const canvasOffsetY = 8;

    let allConfusionData = [];

    $: allConfusionData = $confusionData;

    $: if (svgContainer && chartWidth > 0 && chartHeight > 0
      && allConfusionData.length > 0 && epoch !== undefined) {
        updateConfusionMatrix(epoch);
    }

    function updateConfusionMatrix(selectedEpoch) {
        const epochData = allConfusionData.find(
            (d) => d.epoch === selectedEpoch,
        );
        if (!epochData) return;

        d3.select(svgContainer).selectAll("*").remove();
        drawConfusion(epochData.matrix, selectedEpoch);
    }

    function drawConfusion(data, selectedEpoch) {
        const container = svgContainer;
        const rectSize = 25;

        const confusionArea = document.getElementById("confusion-area");
        if (confusionArea) {
            width = chartWidth;
            height = chartHeight;
            const title = confusionArea.querySelector('.metric-view-title');
            margin.top = Math.max(50, (title ? title.offsetHeight : 24) + 24);
        }

        const svg = d3
            .select(container)
            .attr("width", width)
            .attr("height", height);

        // Remove any existing tooltips before creating new ones
        d3.selectAll(".tooltip-confusion").remove();
        d3.selectAll(".tooltip-diff").remove();

        const g = svg
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top + canvasOffsetY})`);

        g.append("text")
            .attr("x", -85)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .attr("transform", `rotate(-90, -45, 60)`) // 旋转文字
            .text("Classes");

        g.append("text")
            .attr("x", 280)
            .attr("y", -4)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .text("Difference");

        // --- 创建 tooltip ---
        const tooltipConfusion = d3
            .select("body")
            .append("div")
            .attr("class", "tooltip-confusion")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("background", "rgba(0,0,0,0.7)")
            .style("color", "white")
            .style("padding", "4px 8px")
            .style("border-radius", "4px")
            .style("font-size", "16px")
            .style("display", "none");

        const tooltipDiff = d3
            .select("body")
            .append("div")
            .attr("class", "tooltip-diff")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("background", "rgba(0,0,0,0.7)")
            .style("color", "white")
            .style("padding", "4px 8px")
            .style("border-radius", "4px")
            .style("font-size", "16px")
            .style("display", "none");

        // 颜色比例尺
        const maxVal = d3.max(data.flat());
        const colorScale = d3
            .scaleSequential(d3.interpolateBlues)
            .domain([0, maxVal]);

        // --- 绘制颜色图例 ---
        const legendWidth = 10;
        const legendHeight = 80;
        const legendX = -88; // 紧贴右侧
        const legendY = 170;

        // 定义垂直渐变
        const defs = svg.append("defs");

        const gradient = defs
            .append("linearGradient")
            .attr("id", "color-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");

        // 顶部：最大值对应的颜色
        gradient
            .append("stop")
            .attr("offset", "0%")
            .attr("stop-color", colorScale(maxVal));

        // 底部：最小值对应的颜色
        gradient
            .append("stop")
            .attr("offset", "100%")
            .attr("stop-color", colorScale(0));

        // 绘制垂直渐变矩形
        g.append("rect")
            .attr("x", legendX)
            .attr("y", legendY)
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#color-gradient)");

        // 左右文字
        g.append("text")
            .attr("x", legendX + 4)
            .attr("y", legendY + legendHeight + 10)
            .attr("text-anchor", "start")
            .attr("font-size", "10px")
            .text("0");

        g.append("text")
            .attr("x", legendX + 10)
            .attr("y", legendY - 2)
            .attr("text-anchor", "end")
            .attr("font-size", "10px")
            .text(maxVal);

        // 图例标题
        const textOffsetX = 50; // 向左移动的距离

        g.append("text")
            .attr("x", legendX / 2 - textOffsetX)
            .attr("y", legendY + legendHeight / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr(
                "transform",
                `rotate(-90, ${legendX / 2 - textOffsetX}, ${legendY + legendHeight / 2})`,
            )
            .text("Count");

        // 绘制矩阵单元格
        g.selectAll("g.row")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "row")
            .attr("transform", (_, i) => `translate(4, ${i * rectSize - 10})`)
            .each(function (rowData, rowIndex) {
                d3.select(this)
                    .selectAll("rect")
                    .data(
                        rowData.map((d, colIndex) => ({ value: d, colIndex })),
                    ) // 👈 包装数据
                    .enter()
                    .append("rect")
                    .attr("x", (d) => d.colIndex * rectSize - 10)
                    .attr("width", rectSize - 1)
                    .attr("height", rectSize - 1)
                    .attr("fill", (d) => colorScale(d.value))
                    .attr("rx", 4)
                    .attr("ry", 4)
                    .on("mousemove", function (event, d) {
                        const rowName = classNames[rowIndex];
                        const colName = classNames[d.colIndex];

                        // ====== tooltip内容 ======
                        tooltipConfusion.style("display", "block").html(
                            `${rowName} → ${colName}<br>
             Value: <strong style="color:white;">${d.value}</strong>`,
                        );

                        // ====== 获取tooltip尺寸 ======
                        const tooltipNode = tooltipConfusion.node();
                        const tooltipWidth = tooltipNode.offsetWidth;

                        // ====== 容器位置（视口坐标） ======
                        const rect = confusionArea.getBoundingClientRect();

                        const centerX = rect.left + rect.width / 2;
                        const mouseX = event.clientX;
                        const pageX = event.pageX;

                        let left;
                        let top = event.pageY - 15;

                        if (mouseX > centerX) {
                            left = pageX - tooltipWidth - 10;
                        } else {
                            left = pageX + 10;
                        }
                        tooltipConfusion
                            .style("left", left + "px")
                            .style("top", top + "px");

                        // ====== 高亮 ======
                        d3.select(this)
                            .attr("stroke", "black")
                            .attr("stroke-width", 1.2);
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .attr("stroke-width", 0)
                            .attr("stroke", "none");
                        tooltipConfusion.style("display", "none");
                    });

                d3.select(this)
                    .selectAll("text")
                    .data(rowData)
                    .enter()
                    .append("text")
                    .attr("x", (_, i) => i * rectSize + rectSize / 2 - 11)
                    .attr("y", rectSize / 2)
                    .attr("text-anchor", "middle")
                    .attr("alignment-baseline", "middle")
                    .attr("font-size", "12px")
                    .attr("fill", (d) => (d > maxVal / 2 ? "white" : "black"))
                    .text((d) => d);
            });

        // ======================================================
        // Difference 柱形图
        // ======================================================

        // === 1. 只需要修改以下三个参数 ===
        const barX = rectSize * numClasses - 4; // 柱形区域左上角 X
        const barY = 0; // 柱形区域左上角 Y
        const barWidth = 80; // 柱形区域水平总长度

        // === 其他参数 ===
        const barHeight = 10; // 实际柱子的高度
        const bgHeight = 15; // 背景条高度
        const rowSpacing = 25; // 相邻柱子的垂直间距

        // ======================================================
        // 2. 计算行列总和
        // ======================================================

        const rowSums = data.map((row) => d3.sum(row));

        const colSums = d3
            .range(numClasses)
            .map((colIndex) => d3.sum(data.map((row) => row[colIndex])));

        // === 计算差值（列总 - 行总） ===
        const diffs = d3.range(numClasses).map((i) => colSums[i] - rowSums[i]);

        // ======================================================
        // 3. 根据柱形区域宽度自动计算比例尺
        // ======================================================

        // 零线位于柱形区域的水平中心
        const centerX = barX + barWidth / 2;

        // 正负两侧各占一半宽度
        const halfWidth = barWidth / 2;

        // 最大绝对差值
        const maxAbsDiff = d3.max(diffs, (d) => Math.abs(d)) || 1;

        // 差值映射到柱形长度
        const diffScale = d3
            .scaleLinear()
            .domain([-maxAbsDiff, maxAbsDiff])
            .range([-halfWidth, halfWidth]);

        // ======================================================
        // 4. 背景条
        // ======================================================

        g.selectAll(".diff-bg")
            .data(diffs)
            .enter()
            .append("rect")
            .attr("class", "diff-bg")
            .attr("x", barX)
            .attr("y", (_, i) => barY + i * rowSpacing)
            .attr("width", barWidth)
            .attr("height", bgHeight)
            .attr("rx", 2)
            .attr("ry", 2)
            .attr("fill", "#eee")
            .attr("opacity", 0.8);

        // ======================================================
        // 5. 中心零线
        // ======================================================

        g.append("line")
            .attr("class", "diff-zero-line")
            .attr("x1", centerX)
            .attr("x2", centerX)
            .attr("y1", barY)
            .attr("y2", barY + (numClasses - 1) * rowSpacing + bgHeight)
            .attr("stroke", "black")
            .attr("stroke-dasharray", "4 2");

        // ======================================================
        // 6. 绘制 Difference 柱形
        // ======================================================

        g.selectAll(".diff-bar")
            .data(diffs)
            .enter()
            .append("rect")
            .attr("class", "diff-bar")

            // 正值：从中心向右延伸
            // 负值：从中心向左延伸
            .attr("x", (d) => (d >= 0 ? centerX : centerX + diffScale(d)))

            // 柱形 Y 坐标
            .attr(
                "y",
                (_, i) => barY + (bgHeight - barHeight) / 2 + i * rowSpacing,
            )

            // 根据差值自动计算柱形长度
            .attr("width", (d) => Math.abs(diffScale(d)))

            .attr("height", barHeight)
            .attr("rx", 2)
            .attr("ry", 2)

            // 正值绿色，负值橙色
            .attr("fill", (d) => (d >= 0 ? "#69b3a2" : "#f28e2b"))

            .attr("opacity", 0.9)

            // ==================================================
            // Tooltip
            // ==================================================

            .on("mouseover", function (event, d) {
                tooltipDiff.style("display", "block").html(`
                <span style="font-size:16px;color:#fff;">
                    ${
                        d > 0
                            ? "Overestimated"
                            : d < 0
                              ? "Underestimated"
                              : "Balanced"
                    }
                </span>
                <br>
                Value:
                <strong style="color:white;">
                    ${d > 0 ? "+" : ""}${d.toFixed(0)}
                </strong>
            `);
            })

            .on("mousemove", function (event) {
                tooltipDiff
                    .style(
                        "left",
                        event.pageX - tooltipDiff.node().offsetWidth + "px",
                    )
                    .style("top", event.pageY - 15 + "px");
            })

            .on("mouseout", function () {
                tooltipDiff.style("display", "none");
            });

        // === 差值文字 ===
        const textGap = 4; // 文字与中心线的水平间距

        g.selectAll(".diff-text")
            .data(diffs)
            .enter()
            .append("text")
            .attr("class", "diff-text")

            // 正值放左侧，负值和零值放右侧
            .attr("x", (d) =>
                d > 0
                    ? centerX - textGap
                    : centerX + textGap
            )

            // 与柱形条垂直居中
            .attr("y", (_, i) =>
                barY + i * rowSpacing + bgHeight / 2
            )
            .attr("dy", "0.35em")

            // 左侧文字右对齐，右侧文字左对齐
            .attr("text-anchor", (d) =>
                d > 0 ? "end" : "start"
            )

            .attr("fill", (d) =>
                d >= 0 ? "#69b3a2" : "#f28e2b"
            )
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .text((d) =>
                d > 0 ? `+${d.toFixed(0)}` : d.toFixed(0)
            );

        // --- 行标签 ---
        const classNames = $classNamesStore;

        g.selectAll(".row-label")
            .data(classNames)
            .enter()
            .append("text")
            .attr("x", -10)
            .attr("y", (_, i) => i * rectSize + rectSize / 2 - 10)
            .attr("text-anchor", "end")
            .attr("alignment-baseline", "middle")
            .attr("font-size", "12px")
            .text((d) => d);

        g.selectAll(".col-label")
            .data(classNames)
            .enter()
            .append("text")
            .attr("class", "col-label")
            .attr("x", (_, i) => i * rectSize + rectSize / 2 - 16) // 对齐每列中心
            .attr("y", numClasses * rectSize - 11) // 放在矩阵下方
            .attr("text-anchor", "start") // 旋转后左对齐更自然
            .attr("alignment-baseline", "hanging")
            .attr("font-size", "12px")
            .attr(
                "transform",
                (_, i) =>
                    `rotate(20, ${i * rectSize + rectSize / 2 - 16}, ${numClasses * rectSize - 11})`,
            ) // ✅ 绕各自坐标点旋转
            .text((d) => d);
        const bounds = g.node().getBBox();
        dispatch('fit', { height: Math.ceil(margin.top + bounds.y + bounds.height + 12) + 4 });
    }
    onDestroy(() => {
        d3.selectAll('.tooltip-confusion, .tooltip-diff').remove();
    });
</script>

<div class="confusion-container" use:observeChartSize={resizeChart}>
    <h2 class="metric-view-title metric-overlay-title">Confusion Matrix of Epoch {epoch === undefined ? 0 : epoch}</h2>
    <svg data-configuration={$selectedWeightConfigurationStore ? $selectedWeightConfigurationStore.id : ''}
      data-epoch={epoch} bind:this={svgContainer}></svg>
</div>

<style>
    .confusion-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-height: 0;
        min-width: 0;
    }

    svg {
        flex: 1;
        display: block;
        width: 100%;
        font-family: sans-serif;
    }
</style>

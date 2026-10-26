<script>
    import { onDestroy } from "svelte";
    import * as d3 from "d3";
    import { lossData } from "../stores.js";

    export let epoch = 0; // Receive current epoch from parent
    export let showTitle = true;

    $: allData = $lossData;
    let svgContainer;
    let tooltip;
    let svg, g, xScale, yScale, lineGenerator, areaGenerator;
    let isInitialized = false;
    let previousData = null;

    // Watch for epoch changes and update incrementally
    $: if (allData.length > 0 && svgContainer) {
        if (allData !== previousData) {
            isInitialized = false;
            previousData = allData;
        }
        if (!isInitialized) {
            initializeChart();
            isInitialized = true;
        }
        updateChart(epoch);
    }

    // 当前高亮的折线，null 表示全部恢复默认状态
    let selectedLossKey = null;

    function initializeChart() {
        let width = 0,
            height = 0;

        let innerWidth = 0,
            innerHeight = 0;

        const margin = {
            top: 40,
            right: 18,
            bottom: 40,
            left: 45,
        };

        const lines = [
            {
                key: "loss",
                label: "Total Loss",
                color: "#08306b",
            },
            {
                key: "loss_x",
                label: "Cross Entropy Loss (Labeled image)",
                color: "#2171b5",
            },
            {
                key: "loss_u",
                label: "Consistency Loss (Unlabeled image)",
                color: "#6baed6",
            },
        ];

        if (!svgContainer || allData.length === 0) return;

        const lossArea = svgContainer;

        if (!lossArea) return;

        const rect = lossArea.getBoundingClientRect();

        width = rect.width;
        height = rect.height;

        innerWidth = width - margin.left - margin.right;
        innerHeight = height - margin.top - margin.bottom;

        if (innerWidth <= 0 || innerHeight <= 0) return;

        // 初始化时恢复默认状态
        selectedLossKey = null;

        // ---------------- Scales ----------------

        const lastEpoch = d3.max(allData, (d) => d.epoch) || 1;
        xScale = d3.scaleLinear().domain([0, lastEpoch]).range([0, innerWidth]);

        const yMax =
            d3.max(allData.flatMap((d) => [d.loss, d.loss_x, d.loss_u])) || 1;

        yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

        // ---------------- Generators ----------------

        lineGenerator = d3
            .line()
            .x((d) => xScale(d.epoch))
            .y((d) => yScale(d.value))
            .defined((d) => d.value != null)
            .curve(d3.curveMonotoneX);

        areaGenerator = d3
            .area()
            .x((d) => xScale(d.epoch))
            .y0(innerHeight)
            .y1((d) => yScale(d.value))
            .curve(d3.curveMonotoneX);

        // ---------------- SVG ----------------

        svg = d3
            .select(svgContainer)
            .attr("width", "100%")
            .attr("height", "100%");

        // 避免重复初始化时图表元素叠加
        svg.selectAll(".loss-chart-root").remove();

        g = svg
            .append("g")
            .attr("class", "loss-chart-root")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // ---------------- Title ----------------

        if (showTitle) {
            g.append("text")
                .attr("class", "chart-title")
                .attr("x", innerWidth / 2)
                .attr("y", -margin.top / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("font-weight", "bold")
                .text("Training Loss over Epochs");
        }

        // ---------------- X Axis ----------------

        const xAxisGrid = d3
            .axisBottom(xScale)
            .tickValues(d3.range(0, lastEpoch, 45).concat([lastEpoch]))
            .tickSize(4)
            .tickPadding(2);

        const xAxisGroup = g
            .append("g")
            .attr("class", "x-axis chart-axis")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(xAxisGrid);

        xAxisGroup.selectAll(".tick text").attr("y", 5);

        xAxisGroup
            .append("text")
            .attr("class", "axis-title")
            .attr("x", innerWidth / 2)
            .attr("y", 33)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text("Epochs");

        // ---------------- Y Axis ----------------

        const yAxisGrid = d3
            .axisLeft(yScale)
            .tickValues([
                ...new Set(d3.range(0, yMax + 0.001, 0.5).concat([yMax])),
            ])
            .tickFormat(d3.format(".1f"))
            .tickSize(4)
            .tickPadding(2);

        const yAxisGroup = g
            .append("g")
            .attr("class", "y-axis chart-axis")
            .call(yAxisGrid);

        yAxisGroup.selectAll(".tick text").attr("x", -4);

        yAxisGroup
            .append("text")
            .attr("class", "axis-title")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", -28)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text("Loss Value");

        // ==================================================
        // 创建折线和面积
        // ==================================================

        lines.forEach((lineInfo) => {
            // Area
            g.append("path")
                .attr("class", `area area-${lineInfo.key} loss-series-area`)
                .attr("data-key", lineInfo.key)
                .attr("fill", lineInfo.color)
                .attr("opacity", 0.05)
                .style("pointer-events", "none");

            // Line
            g.append("path")
                .attr("class", `line line-${lineInfo.key} loss-series-line`)
                .attr("data-key", lineInfo.key)
                .attr("fill", "none")
                .attr("stroke", lineInfo.color)
                .attr("stroke-width", 1.6)
                .attr("stroke-opacity", 1)
                .style("pointer-events", "none");
        });

        // ==================================================
        // 折线高亮状态更新函数
        // ==================================================

        function updateLossHighlight() {
            const hasSelection = selectedLossKey !== null;

            // ---------------- Lines ----------------

            g.selectAll(".loss-series-line")
                .interrupt()
                .attr("stroke-width", function () {
                    const key = d3.select(this).attr("data-key");

                    // 未选中任何图例：恢复原始宽度
                    if (!hasSelection) {
                        return 1.6;
                    }

                    // 被选中的折线加粗
                    return key === selectedLossKey ? 2.8 : 1.6;
                })
                .attr("stroke-opacity", function () {
                    const key = d3.select(this).attr("data-key");

                    // 未选中：所有折线恢复完全显示
                    if (!hasSelection) {
                        return 1;
                    }

                    // 被选中的折线保持完全显示
                    // 其他折线降低透明度
                    return key === selectedLossKey ? 1 : 0.12;
                });

            // ---------------- Areas ----------------

            g.selectAll(".loss-series-area")
                .interrupt()
                .attr("opacity", function () {
                    const key = d3.select(this).attr("data-key");

                    // 未选中：恢复原始面积透明度
                    if (!hasSelection) {
                        return 0.05;
                    }

                    // 高亮选中的面积
                    return key === selectedLossKey ? 0.15 : 0.01;
                });

            // ---------------- Legend ----------------

            g.selectAll(".loss-legend-item").each(function () {
                const item = d3.select(this);

                const key = item.attr("data-key");

                const isSelected = selectedLossKey === key;

                // 图例色块透明度
                item.select(".loss-legend-marker").attr(
                    "opacity",
                    !hasSelection || isSelected ? 1 : 0.3,
                );

                // 图例文字透明度
                item.select(".legend-label")
                    .attr("opacity", !hasSelection || isSelected ? 1 : 0.35)
                    .attr("font-weight", isSelected ? "bold" : "normal");
            });
        }

        // ==================================================
        // Tooltip
        // ==================================================

        if (!tooltip) {
            tooltip = d3
                .select("body")
                .append("div")
                .attr("class", "tooltip-loss")
                .style("position", "absolute")
                .style("pointer-events", "none")
                .style("color", "white")
                .style("background", "rgba(0,0,0,0.7)")
                .style("padding", "6px 10px")
                .style("border-radius", "6px")
                .style("font-size", "15px")
                .style("display", "none")
                .style("z-index", 9999);
        }

        // ==================================================
        // Hover Line
        // ==================================================

        const hoverLine = g
            .append("line")
            .attr("class", "loss-hover-line")
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4 4")
            .attr("y1", 0)
            .attr("y2", innerHeight)
            .style("display", "none")
            .style("pointer-events", "none");

        // ==================================================
        // 透明层捕获鼠标
        // ==================================================

        g.append("rect")
            .attr("class", "loss-hover-overlay")
            .attr("width", innerWidth)
            .attr("height", innerHeight)
            .attr("fill", "none")
            .attr("pointer-events", "all")

            .on("mousemove", (event) => {
                const [mx] = d3.pointer(event);

                const x0 = xScale.invert(mx);

                const bisect = d3.bisector((d) => d.epoch).left;

                const i = bisect(allData, x0);

                const d0 = allData[i - 1] || allData[0];

                const d1 = allData[i] || allData[allData.length - 1];

                const dClosest = x0 - d0.epoch > d1.epoch - x0 ? d1 : d0;

                const xPos = xScale(dClosest.epoch);

                // ---------------- Hover Line ----------------

                hoverLine
                    .attr("x1", xPos)
                    .attr("x2", xPos)
                    .style("display", "block");

                // ---------------- Container Boundary ----------------

                const containerRect = lossArea.getBoundingClientRect();

                // 先更新内容，以便正确获取 tooltip 尺寸
                tooltip
                    .html(
                        `
                <div>
                    Epoch:
                    <strong style="color:white;">
                        ${dClosest.epoch}
                    </strong>
                </div>

                <div>
                    Total Loss:
                    <strong style="color:white;">
                        ${Number(dClosest.loss).toFixed(4)}
                    </strong>
                </div>

                <div>
                    Cross Entropy Loss:
                    <strong style="color:white;">
                        ${Number(dClosest.loss_x).toFixed(4)}
                    </strong>
                </div>

                <div>
                    Consistency Loss:
                    <strong style="color:white;">
                        ${Number(dClosest.loss_u).toFixed(4)}
                    </strong>
                </div>
            `,
                    )
                    .style("display", "block");

                // ---------------- Tooltip Size ----------------

                const tooltipNode = tooltip.node();

                const tooltipWidth = tooltipNode.offsetWidth || 180;

                const tooltipHeight = tooltipNode.offsetHeight || 100;

                // ---------------- Tooltip Position ----------------

                let left = event.clientX + 10;
                let top = event.clientY - 28;

                // 右边界
                if (left + tooltipWidth > containerRect.right) {
                    left = event.clientX - tooltipWidth - 10;
                }

                // 左边界
                if (left < containerRect.left) {
                    left = containerRect.left;
                }

                // 下边界
                if (top + tooltipHeight > containerRect.bottom) {
                    top = containerRect.bottom - tooltipHeight;
                }

                // 上边界
                if (top < containerRect.top) {
                    top = containerRect.top;
                }

                tooltip
                    .style("left", left + window.scrollX + "px")
                    .style("top", top + window.scrollY + "px");
            })

            .on("mouseout", () => {
                tooltip.style("display", "none");

                hoverLine.style("display", "none");
            });

        // ==================================================
        // 图例
        // 放在透明鼠标捕获层之后，保证图例可以正常点击
        // ==================================================

        const legend = g
            .append("g")
            .attr("class", "chart-legend loss-legend")
            .attr("transform", `translate(${30}, ${-2})`);

        lines.forEach((lineInfo, i) => {
            const item = legend
                .append("g")
                .attr("class", "loss-legend-item")
                .attr("data-key", lineInfo.key)
                .attr(
                    "transform",
                    `translate(${i === 0 ? 0 : i === 1 ? 90 : 240}, 0)`,
                )
                .style("cursor", "pointer");

            // ---------------- 图例点击事件 ----------------

            item.on("click", function (event) {
                event.stopPropagation();

                // 第一次点击当前图例：选中对应折线
                // 再次点击同一图例：取消选中，恢复全部折线
                // 点击其他图例：切换高亮对象

                selectedLossKey =
                    selectedLossKey === lineInfo.key ? null : lineInfo.key;

                // 更新所有折线、面积及图例状态
                updateLossHighlight();
            });

            // ---------------- 图例颜色标记 ----------------

            item.append("rect")
                .attr("class", "loss-legend-marker")
                .attr("width", 15)
                .attr("height", 6)
                .attr("fill", lineInfo.color);

            // ---------------- 图例文字 ----------------

            item.append("text")
                .attr("class", "legend-label")
                .attr("x", 18)
                .attr("y", i === 0 ? -2 : 0)
                .attr("font-size", "8px")
                .attr("alignment-baseline", "hanging")
                .each(function () {
                    const text = lineInfo.label;

                    const regex = /(.*)\((.*)\)/;

                    const match = text.match(regex);

                    const textEl = d3.select(this);

                    if (match) {
                        // 第一行：括号外文字
                        textEl
                            .append("tspan")
                            .text(match[1].trim())
                            .attr("x", 18)
                            .attr("dy", "0em");

                        // 第二行：括号内文字
                        textEl
                            .append("tspan")
                            .text(`(${match[2].trim()})`)
                            .attr("x", 18)
                            .attr("dy", "1em");
                    } else {
                        textEl.text(text);
                    }
                });

            // ---------------- 扩大图例点击范围 ----------------

            // 在当前图例内添加透明区域，
            // 让色块和文字周围的空白处也可以点击。

            item.insert("rect", ":first-child")
                .attr("class", "loss-legend-hitbox")
                .attr("x", -4)
                .attr("y", -6)
                .attr("width", i === 0 ? 85 : i === 1 ? 145 : 175)
                .attr("height", 27)
                .attr("fill", "transparent")
                .style("pointer-events", "all");
        });

        // 初始化全部折线的显示状态
        updateLossHighlight();
    }

    // ======================================================
    // Update Chart
    // ======================================================

    function updateChart(currentEpoch) {
        if (!g || !allData.length) return;

        const filteredData = allData.filter((d) => d.epoch <= currentEpoch);

        if (filteredData.length === 0) return;

        const lines = [
            {
                key: "loss",
                label: "Total Loss",
                color: "#08306b",
            },
            {
                key: "loss_x",
                label: "Cross Entropy Loss (Labeled image)",
                color: "#2171b5",
            },
            {
                key: "loss_u",
                label: "Consistency Loss (Unlabeled image)",
                color: "#6baed6",
            },
        ];

        // ---------------- Update Lines and Areas ----------------

        lines.forEach((lineInfo) => {
            const points = filteredData.map((d) => ({
                epoch: d.epoch,
                value: d[lineInfo.key],
            }));

            // 更新面积路径
            g.select(`.area-${lineInfo.key}`)
                .datum(points)
                .attr("d", areaGenerator);

            // 更新折线路径
            g.select(`.line-${lineInfo.key}`)
                .datum(points)
                .attr("d", lineGenerator);
        });

        // 折线和面积路径更新不会改变其高亮样式，
        // 因此切换 Epoch 时保留当前图例的选中状态。
    }

    onDestroy(() => {
        if (tooltip) tooltip.remove();
    });
</script>

<svg
    id="loss-chart"
    aria-label="Training loss, cross entropy loss and consistency loss over epochs"
    bind:this={svgContainer}
></svg>

<style>
    svg {
        display: block;
        width: 100%;
        height: 100%;
    }
</style>

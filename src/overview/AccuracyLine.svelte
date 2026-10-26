<script>
    import { onDestroy } from "svelte";
    import * as d3 from "d3";
    import { observeChartSize, packChartRows } from "./chart-size.js";

    import { accuracyData, selectedWeightConfigurationStore, classNamesStore } from "../stores.js";
    let allData = [];
    $: allData = $accuracyData;

    export let epoch = 0;

    let svgContainer;
    let chartWidth = 0;
    let chartHeight = 0;
    let renderedWidth = 0;
    let renderedHeight = 0;

    function resizeChart(size) {
        chartWidth = size.width;
        chartHeight = size.height;
    }

    // Chart 1 variables (Overall Accuracy)
    let svg, g1, xScale1, yScale1, lineGen1;
    let innerHeight1,
        innerWidth1,
        overallPlotHeight,
        margin1 = { top: 50, right: 25, bottom: 30, left: 45 };

    // Chart 2 variables (Category Accuracy)
    let g2, xScale2, yScale2;
    let innerHeight2,
        innerWidth2,
        margin2 = { top: 280, right: 25, bottom: 5, left: 55 };
    let selectedClass = 0;
    let classControlLayout;
    let categoryTitleY = -80;
    const categoryDetailOffsetY = 5;
    const buttonHeight = 24;

    let isInitialized = false;

    const numClasses = 10;
    const colorCatrgery = [
        "#a6cee3",
        "#1f78b4",
        "#b2df8a",
        "#33a02c",
        "#fb9a99",
        "#e31a1c",
        "#fdbf6f",
        "#ff7f00",
        "#cab2d6",
        "#6a3d9a",
    ];

    $: classNames = $classNamesStore;

    let prevDataRef = null;

    $: if (allData.length > 0 && svgContainer && chartWidth > 0 && chartHeight > 0) {
        if (allData !== prevDataRef || chartWidth !== renderedWidth || chartHeight !== renderedHeight) {
            clearSvg();
            prevDataRef = allData;
            renderedWidth = chartWidth;
            renderedHeight = chartHeight;
        }

        if (!isInitialized) {
            initialize();
            isInitialized = true;
        }

        updateCharts(epoch);
    }
    function clearSvg() {
        if (!svgContainer) return;
        d3.select(svgContainer).selectAll("*").remove();
        g1 = null;
        g2 = null;
        isInitialized = false;
    }

    function initialize() {
        const accuracyArea = document.getElementById("accuracy-area");
        if (!accuracyArea) return;

        const width = chartWidth;
        const height = chartHeight;
        // A wrapped heading gets its own space; it never covers the plot.
        const title = accuracyArea.querySelector('.metric-view-title');
        margin1.top = Math.max(50, (title ? title.offsetHeight : 24) + 24);

        // Anchor the category chart to the bottom edge and let the upper plot
        // use the remaining height.  This removes the large empty lower band
        // that appeared on a 4K viewport while retaining a clear separation.
        margin2 = {
            ...margin2,
            top: Math.max(230, height - 18),
        };

        innerWidth1 = width - margin1.left - margin1.right;
        innerHeight1 = height - margin1.top - margin1.bottom;
        innerWidth2 = width - margin2.left - margin2.right;
        innerHeight2 = height - margin2.top - margin2.bottom;

        svg = d3
            .select(svgContainer)
            .attr("width", width)
            .attr("height", height);

        prepareClassControls();

        // Initialize Chart 1 - Overall Accuracy
        initializeChart1(width, height);

        // Initialize Chart 2 - Category Accuracy
        initializeChart2(width, height);
    }

    function initializeChart1(width, height) {
        // Measure and wrap the original 13px legend before allocating the
        // plot. A narrower accuracy column must not clip its class names.
        const legend = svg
            .append("g")
            .attr("class", "legend chart-legend accuracy-legend");

        const legendItemSize = 8,
            legendSpacing = 4,
            legendItemGap = 10;
        const legendItems = [];
        const legendWidths = [];

        classNames.forEach((cls, i) => {
            const legendItem = legend
                .append("g")
                .attr("class", "accuracy-legend-item");

            legendItem
                .append("rect")
                .attr("width", legendItemSize)
                .attr("height", legendItemSize)
                .attr("fill", colorCatrgery[i])
                .attr("rx", 2)
                .attr("ry", 2);

            const legendText = legendItem
                .append("text")
                .attr("class", "legend-label")
                .attr("x", legendItemSize + legendSpacing)
                .attr("y", legendItemSize / 2)
                .attr("alignment-baseline", "middle")
                .attr("font-size", "13px")
                .text(cls);

            legendItems.push(legendItem);
            legendWidths.push(legendItemSize + legendSpacing
                + legendText.node().getComputedTextLength());
        });

        // All ten classes share the first legend row, aligned to the right.
        const legendWidth = d3.sum(legendWidths) + legendItemGap * (numClasses - 1);
        const legendLeft = width - margin1.right - legendWidth;
        const legendTop = legendLeft > titleTextWidth() + 24 ? 14 : margin1.top - 10;
        legend.attr("transform", `translate(${legendLeft}, ${legendTop})`);
        legendItems.forEach((item, index) => item.attr("transform",
            `translate(${d3.sum(legendWidths.slice(0, index)) + index * legendItemGap}, 0)`));
        // Reserve the full selected-epoch rose above a high-accuracy point.
        margin1.top = Math.max(margin1.top, legendTop + 30, 58);
        svg.attr("height", height).style("height", `${height}px`);
        overallPlotHeight = Math.max(40, margin2.top + categoryTitleY - margin1.top - 42);

        g1 = svg.append("g").attr("class", "accuracy-epoch-group")
            .attr("transform", `translate(${margin1.left},${margin1.top})`);
        g1.append("text").attr("class", "axis-title")
            .attr("x", innerWidth1 / 2).attr("y", overallPlotHeight + 26)
            .attr("text-anchor", "middle").attr("font-size", "10px").text("Epochs");
        g1.append("text").attr("class", "axis-title").attr("transform", "rotate(-90)")
            .attr("x", -overallPlotHeight / 2).attr("y", -28)
            .attr("font-size", "10px").attr("text-anchor", "middle").text("Accuracy");

        const lastEpoch = d3.max(allData, (d) => d.epoch) || 1;
        xScale1 = d3.scaleLinear().domain([0, lastEpoch]).range([0, innerWidth1]);
        yScale1 = d3
            .scaleLinear()
            .domain([
                d3.min(allData, (d) => d.accuracy),
                d3.max(allData, (d) => d.accuracy),
            ])
            .range([overallPlotHeight, 0]);

        lineGen1 = d3
            .line()
            .x((d) => xScale1(d.epoch))
            .y((d) => yScale1(d.accuracy))
            .curve(d3.curveMonotoneX);

        // Axes
        g1.append("g")
            .attr("class", "x-axis chart-axis")
            .attr("transform", `translate(0, ${overallPlotHeight})`)
            .call(
                d3
                    .axisBottom(xScale1)
                    .tickValues(d3.range(0, lastEpoch, 45).concat([lastEpoch]))
                    .tickSize(3),
            );

        g1.append("g")
            .attr("class", "y-axis chart-axis")
            .call(d3.axisLeft(yScale1).ticks(Math.max(3, Math.floor(overallPlotHeight / 28)))
                .tickFormat(d3.format('.1f')).tickSize(3).tickSizeOuter(0));

        // Separate tick labels from the axis titles without changing their
        // typography.  The x ticks move upward and the y ticks move closer
        // to their axis line, creating clean title gutters.
        g1.select(".x-axis").selectAll(".tick text").attr("y", 6);
        g1.select(".y-axis").selectAll(".tick text").attr("x", -4);

        // Initialize empty line path
        g1.append("path")
            .attr("class", "accuracy-line")
            .attr("fill", "none")
            .attr("stroke", "#39A47B")
            .attr("stroke-width", 2);

        // --- 节点 ---
        const nodeRadius = 1;
        const nodes = g1
            .selectAll(".node")
            .data(allData)
            .enter()
            .append("circle")
            .attr("class", "node")
            .attr("cx", (d) => xScale1(d.epoch))
            .attr("cy", (d) => yScale1(d.accuracy))
            .attr("r", nodeRadius)
            .attr("fill", "white")
            .attr("stroke", "#39A47B")
            .style("cursor", "pointer");

        // --- 创建 tooltip ---
        let tooltip = d3
            .select("body")
            .append("div")
            .attr("class", "tooltip-accuracy")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("background", "rgba(0,0,0,0.7)")
            .style("color", "white")
            .style("padding", "4px 8px")
            .style("border-radius", "4px")
            .style("font-size", "14px")
            .style("display", "none");

        // --- 鼠标悬停交互 ---
        nodes
            .on("mouseover", function (event, d) {
                const node = d3.select(this);
                const cx = xScale1(d.epoch);
                const cy = yScale1(d.accuracy);

                // 节点放大
                node.transition()
                    .duration(100)
                    .attr("r", 4)
                    .attr("opacity", 1)
                    .attr("stroke", "#E18E6D")
                    .attr("fill", "#E18E6D");

                // ===== tooltip 尺寸（用于判断翻转）=====
                const tooltipNode = tooltip.node();
                const tooltipWidth = tooltipNode.offsetWidth || 120;

                // ===== 关键：使用 pageX，但用 width 做边界判断 =====
                let left = event.pageX + 10;
                let top = event.pageY - 28;

                // ===== 自动左右翻转（核心逻辑）=====
                if (left + tooltipWidth > width) {
                    left = event.pageX - tooltipWidth + 20; // 放到左侧
                }

                if (left < 0) {
                    left = 0;
                }

                // ===== 显示 tooltip =====
                tooltip
                    .style("display", "block")
                    .style("left", left + "px")
                    .style("top", top + "px").html(`
                <div>Epoch: <strong style="color:white;">${d.epoch}</strong></div>
                <div>Accuracy: <strong style="color:white;">${(d.accuracy * 100).toFixed(2)}%</strong></div>
            `);

                // 添加垂直虚线
                g1.append("line")
                    .attr("class", "hover-vline")
                    .style("pointer-events", "none")
                    .attr("x1", cx)
                    .attr("x2", cx)
                    .attr("y1", cy)
                    .attr("y2", overallPlotHeight)
                    .attr("stroke", "black")
                    .attr("stroke-width", 2)
                    .attr("stroke-dasharray", "4 4")
                    .attr("opacity", 0.7);
            })
            .on("mouseout", function (event, d) {
                const node = d3.select(this);

                // 恢复节点大小
                node.transition()
                    .duration(100)
                    .attr("r", nodeRadius)
                    .attr("fill", "white")
                    .attr("fill", "white")
                    .attr("stroke", "#39A47B")
                    .style("cursor", "pointer");

                // 隐藏 tooltip
                tooltip.style("display", "none");

                // 删除虚线
                g1.selectAll(".hover-vline").remove();
            });

        // --- 管理选中的节点 ---
        const selected = new Set();

        // --- 点击事件 ---
        nodes.on("click", function (event, d) {
            const key = d.epoch;

            // 已选中 → 取消
            if (selected.has(key)) {
                selected.delete(key);
                g1.selectAll(`.rose-${key}`).remove();
                g1.selectAll(`.vline-${key}`).remove(); // 删除虚线
                g1.selectAll(`.label-${key}`).remove();
                d3.select(this).attr("fill", "white").attr("stroke", "#39A47B");
                return;
            }

            // 新选中
            selected.add(key);
            d3.select(this).attr("fill", "#E18E6D").attr("stroke", "#E18E6D");

            const cx = xScale1(d.epoch);
            const cy = yScale1(d.accuracy);
            const roseRadius = Math.min(20, overallPlotHeight / 4);

            // --- 添加垂直虚线 ---
            g1.append("line")
                .attr("class", `vline-${key} accuracy-selection-line`)
                .style("pointer-events", "none")
                .attr("x1", cx)
                .attr("x2", cx)
                .attr("y1", cy)
                .attr("y2", overallPlotHeight)
                .attr("stroke", "black")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "4 4")
                .attr("opacity", 0.7);

            // --- 添加 accuracy 数值标签 ---
            const accuracyText = (d.accuracy * 100).toFixed(2) + "%";
            const labelPadding = 4;
            let labelY = overallPlotHeight - 18;
            if (Math.abs(labelY - cy) < roseRadius + 13) {
                labelY = cy - roseRadius - 16;
            }
            labelY = Math.max(14, labelY);
            const label = g1
                .append("g")
                .attr("class", `label-${key} accuracy-selection-label`)
                .style("pointer-events", "none")
                .attr("transform", `translate(${cx}, ${labelY})`);

            const text = label
                .append("text")
                .text(accuracyText)
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "middle")
                .attr("fill", "black")
                .attr("font-size", "12px")
                .attr("font-weight", "bold");

            const bbox = text.node().getBBox();
            const labelX = key === 299
                ? cx
                : Math.max(bbox.width / 2 + 3, Math.min(innerWidth1 - bbox.width / 2 - 3, cx));
            label.attr('transform', `translate(${labelX}, ${labelY})`);
            label
                .insert("rect", "text")
                .attr("x", bbox.x - labelPadding / 2)
                .attr("y", bbox.y - labelPadding / 2)
                .attr("width", bbox.width + labelPadding)
                .attr("height", bbox.height + labelPadding)
                .attr("rx", 4)
                .attr("ry", 4)
                .attr("fill", "#d9d9d9");

            // --- 绘制玫瑰图 ---
            const roseGap = 2;
            const gapAngle = 0.1; // 每个扇区之间的间隔，单位是弧度，越大间距越大

            const arc = d3
                .arc()
                .innerRadius(5)
                .outerRadius((a) => a.value * roseRadius - roseGap)
                .startAngle(
                    (a) =>
                        a.index * ((2 * Math.PI) / numClasses) + gapAngle / 2,
                )
                .endAngle(
                    (a) =>
                        (a.index + 1) * ((2 * Math.PI) / numClasses) -
                        gapAngle / 2,
                );

            const roseGroup = g1
                .append("g")
                .attr("class", `rose-${key} accuracy-selection-rose`)
                .style("pointer-events", "none")
                .attr("transform", `translate(${cx}, ${cy})`);

            roseGroup
                .selectAll("path")
                .data(d.classAccuracies.map((v, i) => ({ value: v, index: i })))
                .enter()
                .append("path")
                .attr("d", arc)
                .attr("fill", (d, i) => colorCatrgery[i])
                .attr("opacity", 0.8);

            // 外圈
            roseGroup
                .append("circle")
                .attr("r", roseRadius)
                .attr("fill", "none")
                .attr("stroke", "gray")
                .attr("stroke-width", 1)
                .attr("opacity", 0.5);
        });
    }

    function prepareClassControls() {
        const measure = svg.append("g").attr("visibility", "hidden");
        const buttonWidths = classNames.map(name => {
            const text = measure.append("text").attr("class", "chart-control-label").text(name);
            return Math.max(35, Math.ceil(text.node().getComputedTextLength() + 24));
        });
        const titleWidth = Math.max(...classNames.map(name => {
            const text = measure.append("text").attr("class", "category-title chart-title")
                .attr("font-size", "12px").attr("font-weight", "bold").text(`Accuracy for ${name}`);
            return text.node().getComputedTextLength();
        }));
        measure.remove();
        const totalWidth = d3.sum(buttonWidths) + 8 * (numClasses - 1);
        const inline = titleWidth + 16 + totalWidth <= innerWidth2;
        const packed = packChartRows(buttonWidths, innerWidth2, 8);
        const controlsHeight = packed.rows * buttonHeight + (packed.rows - 1) * 6;
        classControlLayout = {
            widths: buttonWidths,
            items: inline ? buttonWidths.map((width, index) => ({
                x: titleWidth + 16 + d3.sum(buttonWidths.slice(0, index)) + index * 8, row: 0,
            })) : packed.items,
            top: inline ? -90 : -76 - controlsHeight,
        };
        categoryTitleY = inline ? -80 : classControlLayout.top - 8;
    }

    function titleTextWidth() {
        const measure = svg.append('text').attr('font-family', 'Arial')
            .attr('font-size', 18).attr('font-weight', 700).text('Overall Accuracy over Epochs');
        const result = measure.node().getComputedTextLength();
        measure.remove();
        return result;
    }

    function initializeChart2(width, height) {
        g2 = svg
            .append("g")
            .attr("class", "accuracy-category-group")
            .attr("transform", `translate(${margin2.left},${margin2.top + categoryDetailOffsetY})`);

        // Class selection buttons
        const buttonGroup = svg
            .append("g")
            .attr(
                "transform",
                `translate(${margin2.left}, ${margin2.top + classControlLayout.top + categoryDetailOffsetY})`,
            );

        const buttonWidths = classControlLayout.widths;

        // 创建按钮
        const buttons = buttonGroup
            .selectAll(".class-button")
            .data(d3.range(numClasses))
            .enter()
            .append("g")
            .attr("class", "class-button")
            .attr("transform", (d, i) => `translate(${classControlLayout.items[i].x}, ${classControlLayout.items[i].row * (buttonHeight + 6)})`)
            .style("cursor", "pointer")

            .on("click", (event, classIndex) => {
                selectedClass = classIndex;

                updateButtonStyles(buttons);

                updateCategoryChart(
                    allData.filter((d) => d.epoch <= epoch),
                    classIndex,
                );
            })

            .on("mouseover", function (_, i) {
                if (i !== selectedClass) {
                    d3.select(this)
                        .select("rect")
                        .attr("fill", "white")
                        .attr("stroke", "#007bff");

                    d3.select(this).select("text").attr("fill", "#007bff");
                }
            })

            .on("mouseout", function (_, i) {
                if (i !== selectedClass) {
                    d3.select(this)
                        .select("rect")
                        .attr("fill", "white")
                        .attr("stroke", "#aaa");

                    d3.select(this).select("text").attr("fill", "black");
                }
            });

        // 按钮背景
        buttons
            .append("rect")
            .attr("width", (d) => buttonWidths[d])
            .attr("height", buttonHeight)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("fill", "white")
            .attr("stroke", (d) => (d === selectedClass ? "#007bff" : "#aaa"))
            .attr("stroke-width", 1.5);

        // 按钮文字
        buttons
            .append("text")
            .attr("class", "chart-control-label")
            .attr("x", (d) => buttonWidths[d] / 2)
            .attr("y", buttonHeight / 2)
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .attr("fill", (d) => (d === selectedClass ? "#007bff" : "black"))
            .text((d) => classNames[d]);

        // Scales for category chart
        xScale2 = d3
            .scaleBand()
            .domain(d3.range(allData.length))
            .range([0, innerWidth2]);

        // Axis labels
        g2.append("text")
            .attr("class", "category-y-label axis-title")
            .attr("transform", "rotate(-90)")
            .attr("x", 45)
            .attr("y", -32)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .text("Accuracy");

        g2.append("text")
            .attr("class", "category-x-label axis-title")
            .attr("x", innerWidth2 / 2)
            .attr("y", 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .text("Epochs");
    }

    function updateButtonStyles(buttons) {
        buttons
            .select("rect")
            .attr("stroke", (d) => (d === selectedClass ? "#007bff" : "#aaa"))
            .attr("fill", "white");

        buttons
            .select("text")
            .attr("fill", (d) => (d === selectedClass ? "#007bff" : "black"));
    }

    function updateCharts(currentEpoch) {
        if (!g1 || !g2 || !allData.length) return;

        const filteredData = allData.filter((d) => d.epoch <= currentEpoch);
        if (filteredData.length === 0) return;

        // Update Chart 1 - Overall Accuracy line
        g1.select(".accuracy-line").datum(filteredData).attr("d", lineGen1);

        // Update Chart 2 - Category Accuracy bars
        updateCategoryChart(filteredData, selectedClass);
    }

    function updateCategoryChart(data, classIndex) {
        if (!g2 || !data.length) return;

        // Use full data for scale calculation to keep consistent scale
        const minVal = d3.min(allData, (d) => d.classAccuracies[classIndex]);
        const maxVal = d3.max(allData, (d) => d.classAccuracies[classIndex]);
        const rowHeight = 40;

        // Update y scale with full data range
        yScale2 = d3
            .scaleLinear()
            .domain([minVal, maxVal])
            .range([rowHeight, 0]);

        // Update x scale domain based on the actual epoch history.
        xScale2.domain(d3.range(allData.length));

        // Update or create Y axis
        if (g2.select(".category-y-axis").empty()) {
            g2.append("g")
                .attr("class", "category-y-axis")
                .attr("transform", `translate(${-1},${-60})`)
                .call(
                    d3
                        .axisLeft(yScale2)
                        .tickSize(3)
                        .tickValues([minVal, maxVal]).tickFormat(d3.format('.1f')),
                );
        } else {
            g2.select(".category-y-axis")
                .attr("transform", `translate(${-1},${-60})`)
                .call(
                    d3
                        .axisLeft(yScale2)
                        .tickSize(3)
                        .tickValues([minVal, maxVal]).tickFormat(d3.format('.1f')),
                );
        }

        // Update or create X axis
        if (g2.select(".category-x-axis").empty()) {
            g2.append("g")
                .attr("class", "category-x-axis")
                .attr("transform", `translate(0, ${-20})`)
                .call(
                    d3
                        .axisBottom(xScale2)
                        .tickSize(3)
                        .tickSizeOuter(0)
                        .tickValues(
                            d3
                                .range(0, allData.length - 1, 45)
                                .concat(allData.length - 1),
                        )
                        .tickFormat((i) => allData[i]?.epoch || i),
                );
        } else {
            g2.select(".category-x-axis")
                .attr("transform", `translate(0, ${-20})`)
                .call(
                    d3
                        .axisBottom(xScale2)
                        .tickSize(3)
                        .tickSizeOuter(0)
                        .tickValues(
                            d3
                                .range(0, allData.length - 1, 45)
                                .concat(allData.length - 1),
                        )
                        .tickFormat((i) => allData[i]?.epoch || i),
                );
        }

        // Title - 在g2的上方
        // 删除之前的标题
        g2.selectAll(".category-title").remove();

        g2.append("text")
            .attr("class", "category-title chart-title")
            // Preserve the title's original left edge while allowing the 4K
            // font to grow to the right instead of being clipped by the SVG.
            .attr("x", 0)
            .attr("y", categoryTitleY)
            .attr("text-anchor", "start")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .text("Accuracy for " + classNames[selectedClass]);

        // Update bars using D3 data join pattern (enter-update-exit)
        const bars = g2.selectAll(".category-rect").data(data, (d) => d.epoch); // Use epoch as key for data join

        d3.selectAll('.tooltip-bar').remove();
        const tooltipBar = d3
            .select("body")
            .append("div")
            .attr("class", "tooltip-bar")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("background", "rgba(0,0,0,0.7)")
            .style("color", "white")
            .style("padding", "4px 8px")
            .style("border-radius", "4px")
            .style("font-size", "14px")
            .style("display", "none");

        // Remove bars that are no longer needed
        bars.exit().remove();

        // Add new bars
        bars.enter()
            .append("rect")
            .attr("class", "category-rect")
            .attr("x", (d, j) =>
                xScale2(allData.findIndex((ad) => ad.epoch === d.epoch)),
            )
            .attr("y", (d) => yScale2(d.classAccuracies[classIndex]))
            .attr("width", xScale2.bandwidth())
            .attr(
                "height",
                (d) => rowHeight - yScale2(d.classAccuracies[classIndex]),
            )
            .attr("fill", colorCatrgery[classIndex])
            .merge(bars) // Merge with existing bars
            .attr("x", (d, j) =>
                xScale2(allData.findIndex((ad) => ad.epoch === d.epoch)),
            )
            .attr("y", (d) => yScale2(d.classAccuracies[classIndex]) - 60)
            .attr(
                "height",
                (d) => rowHeight - yScale2(d.classAccuracies[classIndex]),
            )
            .attr("fill", colorCatrgery[classIndex])
            .on("mousemove", function (event, d) {
                const value = d.classAccuracies[classIndex];

                // ====== tooltip内容 ======
                tooltipBar.style("display", "block").html(`
                    Epoch: <strong style="color:white;">${d.epoch}</strong><br>
                    Value: <strong style="color:white;">${(value * 100).toFixed(2) + "%"}</strong>
                `);

                // ====== tooltip尺寸 ======
                const tooltipNode = tooltipBar.node();
                const tooltipWidth = tooltipNode.offsetWidth;

                const rect = this.ownerSVGElement.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const mouseX = event.clientX;

                let left;
                let top = event.pageY - 15;

                if (mouseX > centerX) {
                    left = event.pageX - tooltipWidth - 10;
                } else {
                    left = event.pageX + 10;
                }
                tooltipBar.style("left", left + "px").style("top", top + "px");
                d3.select(this).attr("stroke", "black").attr("stroke-width", 1);
            })
            .on("mouseout", function () {
                tooltipBar.style("display", "none");

                d3.select(this).attr("stroke", "none");
            });
    }

    onDestroy(() => {
        d3.selectAll('.tooltip-bar, .tooltip-accuracy').remove();
    });
</script>

<div class="accuracy-container" use:observeChartSize={resizeChart}>
    <h2 class="metric-view-title metric-overlay-title">Overall Accuracy over Epochs</h2>
    <svg data-configuration={$selectedWeightConfigurationStore ? $selectedWeightConfigurationStore.id : ''} bind:this={svgContainer}></svg>
</div>

<style>
    .accuracy-container {
        width: 100%;
        height: 100%;
        min-height: 0;
    }

    svg {
        display: block;
        width: 100%;
        height: 100%;
    }
</style>

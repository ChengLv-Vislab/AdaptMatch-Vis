// Reflow SVG geometry when its actual layout column changes, not just when
// the dataset or selected epoch changes. Ignore subpixel jitter and hidden
// containers to avoid repeated rebuilds and zero-sized chart scales.
export function observeChartSize(node, onResize) {
  let width = 0;
  let height = 0;
  let destroyed = false;
  const measure = () => {
    if (destroyed) return;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    if (Math.abs(rect.width - width) <= 0.5 && Math.abs(rect.height - height) <= 0.5) return;
    width = rect.width;
    height = rect.height;
    onResize({ width, height });
  };
  const observer = new ResizeObserver(measure);
  observer.observe(node);
  measure();
  return {
    destroy() {
      destroyed = true;
      observer.disconnect();
    },
  };
}

// Pack measured labels/controls into rows without changing their typography.
export function packChartRows(widths, availableWidth, gap = 8) {
  let row = 0;
  let x = 0;
  const items = widths.map(width => {
    if (x > 0 && x + width > availableWidth) { row++; x = 0; }
    const item = { x, row, width };
    x += width + gap;
    return item;
  });
  return { items, rows: items.length ? row + 1 : 0 };
}

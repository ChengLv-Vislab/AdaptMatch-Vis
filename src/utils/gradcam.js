// The exported classifier is BatchNorm -> ReLU -> 2x2 max pool -> linear.
// Its gradients can be evaluated from inference outputs without retraining.
export function computeGradCAM(results, weights, variance, gamma, epsilon = 1e-5) {
  const activation = results.block_3_layer_4_out;
  const normalized = results.norm;
  const activated = results.relu;
  const pooled = results.pool;
  const logits = results.output;
  if (!activation || !normalized || !activated || !pooled || !logits) {
    throw new Error("Grad-CAM requires the exported classifier feature maps.");
  }

  const [, channels, height, width] = activation.dims;
  const [, poolChannels, poolHeight, poolWidth] = pooled.dims;
  const plane = height * width;
  const poolPlane = poolHeight * poolWidth;
  if (
    channels !== poolChannels || height !== poolHeight * 2 ||
    width !== poolWidth * 2 || weights.length !== logits.data.length * channels * poolPlane ||
    variance.length !== channels || gamma.length !== channels
  ) {
    throw new Error("Grad-CAM classifier dimensions do not match the exported weights.");
  }

  let target = 0;
  for (let i = 1; i < logits.data.length; i++) {
    if (logits.data[i] > logits.data[target]) target = i;
  }

  const values = new Float64Array(plane);
  const classOffset = target * channels * poolPlane;
  for (let channel = 0; channel < channels; channel++) {
    const offset = channel * plane;
    const slope = gamma[channel] / Math.sqrt(variance[channel] + epsilon);
    let gradientSum = 0;
    for (let row = 0; row < poolHeight; row++) {
      for (let column = 0; column < poolWidth; column++) {
        let selected = offset + row * 2 * width + column * 2;
        for (const index of [selected + 1, selected + width, selected + width + 1]) {
          if (activated.data[index] > activated.data[selected]) selected = index;
        }
        if (normalized.data[selected] > 0) {
          gradientSum += weights[classOffset + channel * poolPlane + row * poolWidth + column] * slope;
        }
      }
    }
    const channelWeight = gradientSum / plane;
    for (let pixel = 0; pixel < plane; pixel++) {
      values[pixel] += channelWeight * activation.data[offset + pixel];
    }
  }

  let min = Infinity;
  let max = -Infinity;
  for (let pixel = 0; pixel < plane; pixel++) {
    values[pixel] = Math.max(0, values[pixel]);
    min = Math.min(min, values[pixel]);
    max = Math.max(max, values[pixel]);
  }
  return { values, min, max, width, height, target };
}

export function normalizeColorValue(value, min, max) {
  return max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0.5;
}

// Blue -> cyan -> green -> yellow -> red, shared by the heatmap and legend.
export function gradCAMColor(t) {
  t = Math.max(0, Math.min(1, t));
  return [
    255 * Math.max(0, Math.min(1, 4 * t - 2)),
    255 * Math.max(0, Math.min(1, 4 * t, 4 * (1 - t))),
    255 * Math.max(0, Math.min(1, 2 - 4 * t)),
  ];
}

export function formatColorValue(value) {
  if (!Number.isFinite(value)) return "—";
  const label = value.toFixed(2);
  return label === "-0.00" ? "0.00" : label;
}

export function renderGradCAM(cam, input, mean, std) {
  const [height, width] = input.shape;
  const pixels = input.dataSync();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const image = context.createImageData(width, height);
  const range = Math.max(cam.max - cam.min, 1e-12);

  for (let row = 0; row < height; row++) {
    const y = Math.max(0, Math.min(cam.height - 1, (row + 0.5) * cam.height / height - 0.5));
    const y0 = Math.floor(y);
    const y1 = Math.min(y0 + 1, cam.height - 1);
    for (let column = 0; column < width; column++) {
      const x = Math.max(0, Math.min(cam.width - 1, (column + 0.5) * cam.width / width - 0.5));
      const x0 = Math.floor(x);
      const x1 = Math.min(x0 + 1, cam.width - 1);
      const top = cam.values[y0 * cam.width + x0] * (1 - (x - x0)) + cam.values[y0 * cam.width + x1] * (x - x0);
      const bottom = cam.values[y1 * cam.width + x0] * (1 - (x - x0)) + cam.values[y1 * cam.width + x1] * (x - x0);
      const value = top * (1 - (y - y0)) + bottom * (y - y0);
      const color = gradCAMColor((value - cam.min) / range);
      const pixel = row * width + column;
      for (let channel = 0; channel < 3; channel++) {
        const original = (pixels[pixel * 3 + channel] * std[channel] + mean[channel]) * 255;
        image.data[pixel * 4 + channel] = Math.max(0, Math.min(255, Math.floor(original * 0.55 + color[channel] * 0.45)));
      }
      image.data[pixel * 4 + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

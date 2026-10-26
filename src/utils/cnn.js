export class Node {
  /**
   * Class structure for each neuron node.
   *
   * @param {string} layerName Name of the node's layer.
   * @param {int} index Index of this node in its layer.
   * @param {string} type Node type {input, conv, pool, relu, fc}.
   * @param {number[]} output Output of this node.
   * @param {Array} intermediateOutputs Intermediate outputs for this node.
   */
  constructor(layerName, index, type, output, bias = 0) {
    this.layerName = layerName;
    this.bias = bias;
    this.index = index;
    this.type = type;
    this.output = output;
    // Weights are stored in the links
    this.inputLinks = [];
    this.outputLinks = [];
  }
}

export class Link {
  /**
   * Class structure for each link between two nodes.
   *
   * @param {Node} source Source node.
   * @param {Node} dest Target node.
   * @param {number} weight Weight associated to this link. It can be a number,
   *  1D array, or 2D array.
   */
  constructor(source, dest, weight = []) {
    this.source = source;
    this.dest = dest;
    this.weight = weight;
  }
}

/**
 * Create a 2D array (matrix) with given size and default value.
 *
 * @param {int} height Height (number of rows) for the matrix
 * @param {int} width Width (number of columns) for the matrix
 * @param {int} fill Default value to fill this matrix
 */
export const init2DArray = (height, width, fill) => {
  let array = [];
  // Itereate through rows
  for (let r = 0; r < height; r++) {
    let row = new Array(width).fill(fill);
    array.push(row);
  }
  return array;
};

/**
 * Dot product of two matrices.
 * @param {[[number]]} mat1 Matrix 1
 * @param {[[number]]} mat2 Matrix 2
 */
const matrixDot = (mat1, mat2) => {
  console.assert(mat1.length === mat2.length, "Dimension not matching");
  console.assert(mat1[0].length === mat2[0].length, "Dimension not matching");

  let result = 0;
  for (let i = 0; i < mat1.length; i++) {
    for (let j = 0; j < mat1[0].length; j++) {
      result += mat1[i][j] * mat2[i][j];
    }
  }

  return result;
};

/**
 * 2D slice on a matrix.
 * @param {[[number]]} mat Matrix
 * @param {int} xs First dimension (row) starting index
 * @param {int} xe First dimension (row) ending index
 * @param {int} ys Second dimension (column) starting index
 * @param {int} ye Second dimension (column) ending index
 */
export const matrixSlice = (mat, xs, xe, ys, ye) => {
  return mat.slice(xs, xe).map((s) => s.slice(ys, ye));
};

/**
 * Compute the maximum of a matrix.
 * @param {[[number]]} mat Matrix
 */
const matrixMax = (mat) => {
  let curMax = -Infinity;
  for (let i = 0; i < mat.length; i++) {
    for (let j = 0; j < mat[0].length; j++) {
      if (mat[i][j] > curMax) {
        curMax = mat[i][j];
      }
    }
  }
  return curMax;
};

/**
 * Compute convolutions of one kernel on one matrix (one slice of a tensor).
 * @param {[[number]]} input Input, square matrix
 * @param {[[number]]} kernel Kernel weights, square matrix
 * @param {int} stride Stride size
 * @param {int} padding Padding size
 */
export const singleConv = (input, kernel, stride = 1, padding = 1) => {
  console.assert(input.length === input[0].length, "Conv input is not square");
  console.assert(
    kernel.length === kernel[0].length,
    "Conv kernel is not square"
  );

  let inputSize = input.length;
  let kernelSize = kernel.length;

  // Handle padding: if padding > 0, manually pad input matrix
  if (padding > 0) {
    let paddedSize = inputSize + 2 * padding;
    let paddedInput = init2DArray(paddedSize, paddedSize, 0);

    for (let i = 0; i < inputSize; i++) {
      for (let j = 0; j < inputSize; j++) {
        paddedInput[i + padding][j + padding] = input[i][j];
      }
    }
    input = paddedInput;
    inputSize = paddedSize; // Update size after padding
  }

  // Compute output size after convolution
  let outputSize = Math.floor((inputSize - kernelSize) / stride) + 1;

  let result = init2DArray(outputSize, outputSize, 0);

  // Window sliding
  for (let r = 0; r < outputSize; r++) {
    for (let c = 0; c < outputSize; c++) {
      let curWindow = matrixSlice(
        input,
        r * stride,
        r * stride + kernelSize,
        c * stride,
        c * stride + kernelSize
      );
      let dot = matrixDot(curWindow, kernel);
      result[r][c] = dot;
    }
  }

  return result;
};

/**
 * Activate matrix mat using ReLU (max(0, x)).
 * @param {[[number]]} mat Matrix
 */
export const singleRelu = (mat) => {
  // Only support square matrix
  console.assert(mat.length === mat[0].length, "Activating non-square matrix!");

  let width = mat.length;
  let result = init2DArray(width, width, 0);

  for (let i = 0; i < width; i++) {
    for (let j = 0; j < width; j++) {
      result[i][j] = Math.max(0, mat[i][j]);
    }
  }
  return result;
};

/**
 * Apply inference-time batch normalization to one feature-map channel.
 * y = gamma * (x - mean) / sqrt(variance + epsilon) + beta
 * @param {[[number]]} mat Input feature map
 * @param {number} mean Running mean for this channel
 * @param {number} variance Running variance for this channel
 * @param {number} gamma Learned scale for this channel
 * @param {number} beta Learned shift for this channel
 * @param {number} epsilon Numerical stability term
 */
export const singleBatchNorm = (
  mat,
  mean,
  variance,
  gamma,
  beta,
  epsilon = 1e-5
) => {
  const height = mat.length;
  const width = mat[0].length;
  const denominator = Math.sqrt(variance + epsilon);
  const result = init2DArray(height, width, 0);

  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      result[row][column] =
        gamma * ((mat[row][column] - mean) / denominator) + beta;
    }
  }
  return result;
};

/**
 * Max pool one matrix.
 * @param {[[number]]} mat Matrix
 * @param {int} kernelWidth Pooling kernel length (only supports 2)
 * @param {int} stride Pooling sliding stride (only supports 2)
 * @param {string} padding Pading method when encountering odd number mat,
 * currently this function only supports 'VALID'
 */
export const singleMaxPooling = (
  mat,
  kernelWidth = 2,
  stride = 2,
  padding = "VALID"
) => {
  console.assert(kernelWidth === 2, "Only supports kernen = [2,2]");
  console.assert(stride === 2, "Only supports stride = 2");
  console.assert(padding === "VALID", "Only support valid padding");

  // Handle odd length mat
  // 'VALID': ignore edge rows and columns
  // 'SAME': add zero padding to make the mat have even length
  if (mat.length % 2 === 1 && padding === "VALID") {
    mat = matrixSlice(mat, 0, mat.length - 1, 0, mat.length - 1);
  }

  let stepSize = (mat.length - kernelWidth) / stride + 1;
  let result = init2DArray(stepSize, stepSize, 0);

  for (let r = 0; r < stepSize; r++) {
    for (let c = 0; c < stepSize; c++) {
      let curWindow = matrixSlice(
        mat,
        r * stride,
        r * stride + kernelWidth,
        c * stride,
        c * stride + kernelWidth
      );
      result[r][c] = matrixMax(curWindow);
    }
  }
  return result;
};


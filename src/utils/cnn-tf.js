/* global tf */
import { singleBatchNorm, singleRelu } from "./cnn.js";
import { computeGradCAM, renderGradCAM } from "./gradcam.js";
import { get } from 'svelte/store';
import { trainingDataPathStore } from '../stores.js';

// Network input image size
const networkInputSize = 32;
const batchNormEpsilon = 1e-5;
const cifar10Mean = [0.4914, 0.4822, 0.4465];
const cifar10Std = [0.2471, 0.2435, 0.2616];
const binaryAssetVersion = "20260923-norm-v1";

// Enum of node types
const nodeType = {
  INPUT: "input",
  BLOCK_OUT: "block_out",
  LAYER_OUT: "layer_out",
  CONV: "conv",
  POOL: "pool",
  RELU: "relu",
  NORM: "norm",
  FC: "fc",
  FLATTEN: "flatten",
};

class Node {
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
    // Store hidden intermediate nodes (not in visible cnn structure yet)
  }
}

class Link {
  /**
   * Class structure for each link between two nodes.
   *
   * @param {Node} source Source node.
   * @param {Node} dest Target node.
   * @param {number} weight Weight associated to this link. It can be a number,
   *  1D array, or 2D array.
   */
  constructor(
    source,
    dest,
    weight = [],
    mean = null,
    variance = null,
    gamma = null,
    beta = null,
    epsilon = null
  ) {
    this.source = source;
    this.dest = dest;
    this.weight = weight;
    this.mean = mean;
    this.variance = variance;
    this.gamma = gamma;
    this.beta = beta;
    this.epsilon = epsilon;
  }
}
async function loadBinaryWeights(filePath, shape, dtype = "float32") {
  const versionedFilePath = `${filePath}${filePath.includes("?") ? "&" : "?"}v=${binaryAssetVersion}`;
  const response = await fetch(versionedFilePath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    throw new Error(`Expected binary weights at ${filePath}, but received HTML`);
  }
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength % Float32Array.BYTES_PER_ELEMENT !== 0) {
    throw new Error(`Invalid float32 weight file: ${filePath}`);
  }
  let typedArray;
  if (dtype === "float32") {

    typedArray = new Float32Array(arrayBuffer);
  } else {
    throw new Error(`Unsupported dtype: ${dtype}`);
  }

  // Keep a flat float32 buffer; each layer applies its own weight shape.
  return typedArray;
}

/**
 * Construct a CNN with given extracted outputs from every layer.
 *
 * @param {number[][]} allOutputs Array of outputs for each layer.
 *  allOutputs[i][j] is the output for layer i node j.
 * @param {Model} model Loaded tf.js model.
 * @param {Tensor} inputImageTensor Loaded input image tensor.
 */
const constructCNNFromOutputs = async (
  allOutputs,
  model,
  inputImageTensor,
  model_name,
  dataPath
) => {
  let cnn = [];
  let classifierWeights;
  let normalizationVariance;
  let normalizationGamma;
  // Add the first layer (input layer)
  let inputLayer = [];
  let inputShape = inputImageTensor.shape;
  let inputImageArray = tf.tidy(() => inputImageTensor.transpose([2, 0, 1]).arraySync());
  
  // First layer's three nodes' outputs are the channels of inputImageArray
  for (let i = 0; i < inputShape[2]; i++) {
    let node = new Node("input", i, nodeType.INPUT, inputImageArray[i], 0);
    inputLayer.push(node);
  }
  cnn.push(inputLayer); // Add the first layer (input layer)
  let curLayerIndex = 1;

  for (let l = 0; l < allOutputs.length; l++) {
    let layer = allOutputs[l];

    let outputs = tf.tidy(() => tf.tensor(
        allOutputs[l].tensor.data,
        allOutputs[l].tensor.dims,
        allOutputs[l].tensor.type
      )
      .squeeze().arraySync());

    let curLayerNodes = [];
    let curLayerType;

    // Identify layer type based on the layer name
    if (layer.name.includes("conv")) {
      curLayerType = nodeType.CONV;
    } else if (layer.name.includes("layer_4_out")) {
      curLayerType = nodeType.BLOCK_OUT;
    } else if (layer.name.includes("block")) {
      curLayerType = nodeType.LAYER_OUT;
    } else if (layer.name.includes("pool")) {
      curLayerType = nodeType.POOL;
    } else if (layer.name.includes("relu")) {
      curLayerType = nodeType.RELU;
    } else if (layer.name.includes("output")) {
      curLayerType = nodeType.FC;
    } else if (layer.name.includes("flatten")) {
      curLayerType = nodeType.FLATTEN;
    } else if (layer.name.includes("norm")) {
      curLayerType = nodeType.NORM;
    } else {
      continue;
    }

    // Construct this layer based on its layer type
    switch (curLayerType) {
      case nodeType.CONV: {
        // Load weights from binary file
        const weights = await loadBinaryWeights(
          `${dataPath}/${model_name}/${layer.name}.bin`
        );
        const kernelWeight = tf.tidy(() => tf.tensor(weights, [16, 3, 3, 3]).arraySync());
        for (let i = 0; i < Math.min(10, outputs.length); i++) {
          let nodeOutput;
          if (Array.isArray(outputs[i])) {
            if (Array.isArray(outputs[i][0])) {
              nodeOutput = outputs[i]; // already [row][col]
            } else {
              nodeOutput = [outputs[i]]; // it's 1D, make it 2D
            }
          } else if (typeof outputs[i] === "number") {
            nodeOutput = [[outputs[i]]]; // scalar, make 2D
          } else {
            
            nodeOutput = [[0]]; // fallback dummy
          }
          let node = new Node(layer.name, i, curLayerType, nodeOutput);

          // Add weight
          for (let j = 0; j < cnn[curLayerIndex - 1].length; j++) {
            let preNode = cnn[curLayerIndex - 1][j];
            let curLink = new Link(preNode, node, kernelWeight[i][j]);
            preNode.outputLinks.push(curLink);
            node.inputLinks.push(curLink);
          }

          curLayerNodes.push(node);
        }
        break;
      }
      case nodeType.LAYER_OUT: {
        for (let i = 0; i < Math.min(10, outputs.length); i++) {
          let nodeOutput;
          if (Array.isArray(outputs[i])) {
            if (Array.isArray(outputs[i][0])) {
              nodeOutput = outputs[i]; // already [row][col]
            } else {
              nodeOutput = [outputs[i]]; // it's 1D, make it 2D
            }
          } else if (typeof outputs[i] === "number") {
            nodeOutput = [[outputs[i]]]; // scalar, make 2D
          } else {
            nodeOutput = [[0]]; // fallback dummy
          }

        
          let node = new Node(layer.name, i, curLayerType, nodeOutput);

          // Add weight
          for (let j = 0; j < cnn[curLayerIndex - 1].length; j++) {
            let preNode = cnn[curLayerIndex - 1][j];
            let curLink = new Link(preNode, node);
            preNode.outputLinks.push(curLink);
            node.inputLinks.push(curLink);
          }

          curLayerNodes.push(node);
        }
        break;
      }
      case nodeType.BLOCK_OUT: {
        for (let i = 0; i < Math.min(10, outputs.length); i++) {
          let nodeOutput;
          if (Array.isArray(outputs[i])) {
            if (Array.isArray(outputs[i][0])) {
              nodeOutput = outputs[i]; // already [row][col]
            } else {
              nodeOutput = [outputs[i]]; // it's 1D, make it 2D
            }
          } else if (typeof outputs[i] === "number") {
            nodeOutput = [[outputs[i]]]; // scalar, make 2D
          } else {
            
            nodeOutput = [[0]]; // fallback dummy
          }
          let node = new Node(layer.name, i, curLayerType, nodeOutput);

          // Add weight
          for (let j = 0; j < cnn[curLayerIndex - 1].length; j++) {
            let preNode = cnn[curLayerIndex - 1][j];
            let curLink = new Link(preNode, node);
            preNode.outputLinks.push(curLink);
            node.inputLinks.push(curLink);
          }

          curLayerNodes.push(node);
        }
        break;
      }
      case nodeType.RELU:
      case nodeType.POOL: {
        for (let i = 0; i < Math.min(10, outputs.length); i++) {
          let output = outputs[i];
          let nodeOutput;
          if (Array.isArray(output)) {
            nodeOutput = Array.isArray(output[0]) ? output : [output];
          } else if (typeof output === "number") {
            nodeOutput = [[output]];
          } else {
            
            nodeOutput = [[0]];
          }

          // Keep the visualized ReLU node mathematically consistent with
          // ReLU(x) = max(0, x), even when an exported tensor contains a
          // pre-activation value.
          if (curLayerType === nodeType.RELU) {
            nodeOutput = singleRelu(nodeOutput);
          }

          const node = new Node(layer.name, i, curLayerType, nodeOutput);

          let preNode = cnn[curLayerIndex - 1][i];
          let link = new Link(preNode, node); // Save in weight field
          preNode.outputLinks.push(link);
          node.inputLinks.push(link);
          curLayerNodes.push(node);
        }
        break;
      }
      case nodeType.NORM: {
        let running_mean = await loadBinaryWeights(
          `${dataPath}/${model_name}/norm_mean.bin`
        );
        // running_mean = tf.tensor(running_mean, [128]).arraySync();
        let running_var = await loadBinaryWeights(
          `${dataPath}/${model_name}/norm_var.bin`
        );
        let gammes = await loadBinaryWeights(
          `${dataPath}/${model_name}/norm_weight.bin`
        );
        let betas = await loadBinaryWeights(
          `${dataPath}/${model_name}/norm_bias.bin`
        );
        normalizationVariance = running_var;
        normalizationGamma = gammes;

        for (let i = 0; i < Math.min(10, outputs.length); i++) {
          const preNode = cnn[curLayerIndex - 1][i];
          const nodeOutput = singleBatchNorm(
            preNode.output,
            running_mean[i],
            running_var[i],
            gammes[i],
            betas[i],
            batchNormEpsilon
          );

          const node = new Node(layer.name, i, curLayerType, nodeOutput);

          let link = new Link(
            preNode,
            node,
            [],
            running_mean[i],
            running_var[i],
            gammes[i],
            betas[i],
            batchNormEpsilon
          ); // Save in weight field
          preNode.outputLinks.push(link);
          node.inputLinks.push(link);

          curLayerNodes.push(node);
        }
        break;
      }
      case nodeType.FLATTEN: {
        // Flatten layer has no bias nor weights.
        let bias = 0;
        let preNodeWidth = cnn[curLayerIndex - 1][0].output.length;
        let preNodeNum = cnn[curLayerIndex - 1].length;
        let preNodePlane = preNodeWidth * preNodeWidth;
        let visibleFlattenLength = Math.min(
          outputs.length,
          preNodeNum * preNodePlane
        );

        // ONNX flattens the NCHW Pool tensor in channel-major order. Keep the
        // sampled Flatten nodes in that same order so each value, Pool pixel,
        // and classifier weight refer to one identical real index.
        for (let realIndex = 0; realIndex < visibleFlattenLength; realIndex++) {
          let preNodeIndex = Math.floor(realIndex / preNodePlane);
          let preNodeOffset = realIndex % preNodePlane;
          let preNodeRow = Math.floor(preNodeOffset / preNodeWidth);
          let preNodeCol = preNodeOffset % preNodeWidth;

          let node = new Node(
            layer.name,
            realIndex,
            curLayerType,
            outputs[realIndex],
            bias
          );
          node.realIndex = realIndex;
          let link = new Link(cnn[curLayerIndex - 1][preNodeIndex], node, [
            preNodeRow,
            preNodeCol,
          ]);

          cnn[curLayerIndex - 1][preNodeIndex].outputLinks.push(link);
          node.inputLinks.push(link);

          curLayerNodes.push(node);
        }
        break;
      }
      case nodeType.FC: {
        const weights = await loadBinaryWeights(
          `${dataPath}/${model_name}/${layer.name}.bin`
        );
        const reshapedWeights = tf.tensor(weights, [10, 2048]);
        const kernelWeight = reshapedWeights.arraySync();
        reshapedWeights.dispose();
        classifierWeights = weights;

        // `outputs` is the current ONNX `output` tensor and contains logits.
        // The ONNX model also exposes a final `probs` tensor, so reading the
        // last model output here would apply softmax to probabilities a second
        // time and incorrectly compress every class toward 0.1.
        const logits = tf.tensor(outputs);
        const probabilities = tf.softmax(logits);
        const probabilitiesArray = probabilities.arraySync();
        const logitsArray = outputs;
        
        for (let i = 0; i < Math.min(10, logitsArray.length); i++) {
          let node = new Node(layer.name, i, curLayerType, probabilitiesArray[i], 0);
          // Use the original logit value from the model output
          let curLogit = logitsArray[i];

          for (let j = 0; j < cnn[curLayerIndex - 1].length; j++) {
            let preNode = cnn[curLayerIndex - 1][j];
            let curLink = new Link(
              preNode,
              node,
              kernelWeight[i][preNode.realIndex]
            );
            preNode.outputLinks.push(curLink);
            node.inputLinks.push(curLink);
          }
          node.logit = curLogit;
          curLayerNodes.push(node);
        }
        
        // Clean up tensors
        logits.dispose();
        probabilities.dispose();

        // Sort flatten layer based on the node TF index
        cnn[curLayerIndex - 1].sort((a, b) => a.realIndex - b.realIndex);
        break;
      }
      default: {
        break;
      }
    }

    // Add current layer to the NN
    cnn.push(curLayerNodes);
    curLayerIndex++;
  }

  const results = Object.fromEntries(allOutputs.map(({ name, tensor }) => [name, tensor]));
  const cam = computeGradCAM(results, classifierWeights, normalizationVariance, normalizationGamma, batchNormEpsilon);
  cnn.gradcam = {
    ...cam,
    modelName: model_name,
    imageUrl: renderGradCAM(cam, inputImageTensor, cifar10Mean, cifar10Std),
  };
  return cnn;
};

/**
 * Construct a CNN with given model and input.
 *
 * @param {string} inputImageFile filename of input image.
 * @param {Model} model Loaded tf.js model.
 */
export const constructCNN = async (inputImageFile, model, model_name, dataPath = get(trainingDataPathStore)) => {
  if (!model) {
    throw new Error("ONNX model session not loaded.");
  }

  let inputTensor = await getInputImageArray(inputImageFile, true); // returns tf.Tensor
  let shape = inputTensor.shape; // [H, W, C]
  const chw = tf.tidy(() =>
    inputTensor.transpose([2, 0, 1]).reshape([1, 3, shape[0], shape[1]])
  );
  try {
    const ortTensor = new ort.Tensor("float32", chw.dataSync(), chw.shape);
    const results = await model.run({ input: ortTensor });
    const outputs = Object.entries(results).map(([name, tensor]) => ({ name, tensor }));
    return await constructCNNFromOutputs(outputs, model, inputTensor, model_name, dataPath);
  } finally {
    chw.dispose();
    inputTensor.dispose();
  }
};

// Helper functions

/**
 * Convert canvas image data into a 3D tensor with dimension [height, width, 3].
 * Recall that tensorflow uses NHWC order (batch, height, width, channel).
 * Each pixel is in 0-255 scale.
 *
 * @param {[int8]} imageData Canvas image data
 * @param {int} width Canvas image width
 * @param {int} height Canvas image height
 */
const imageDataTo3DTensor = (imageData, width, height, normalize = true) => {
  // CIFAR-10 normalization constants (matching training preprocessing)

  const values = new Float32Array(height * width * 3);
  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex++) {
    for (let channelIndex = 0; channelIndex < 3; channelIndex++) {
      let value = imageData[pixelIndex * 4 + channelIndex];
      if (normalize) {
        value /= 255;
        value =
          (value - cifar10Mean[channelIndex]) / cifar10Std[channelIndex];
      }
      values[pixelIndex * 3 + channelIndex] = value;
    }
  }

  return tf.tensor3d(values, [height, width, 3]);
};

/**
 * Get the 3D pixel value array of the given image file.
 *
 * @param {string} imgFile File path to the image file
 * @returns A promise with the corresponding 3D array
 */
const getInputImageArray = (imgFile, normalize = true) => {
  let canvas = document.createElement("canvas");
  canvas.style.cssText = "display:none;";
  canvas.width = networkInputSize;
  canvas.height = networkInputSize;
  document.getElementsByTagName("body")[0].appendChild(canvas);
  let context = canvas.getContext("2d");

  return new Promise((resolve, reject) => {
    let inputImage = new Image();
    inputImage.crossOrigin = "Anonymous";
    inputImage.onload = () => {
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        inputImage,
        0,
        0,
        networkInputSize,
        networkInputSize
      );
      const canvasImage = context.getImageData(
        0,
        0,
        networkInputSize,
        networkInputSize
      );
      canvas.remove();
      resolve(
        imageDataTo3DTensor(
          canvasImage.data,
          networkInputSize,
          networkInputSize,
          normalize
        )
      );
    };
    inputImage.onerror = (error) => {
      canvas.remove();
      reject(error);
    };
    inputImage.src = imgFile;
  });
};

export const loadTrainedModel = async (modelPath) => {
  try {
    const session = await ort.InferenceSession.create(modelPath);
    return session;
  } catch (error) {
    throw error;
  }
};


# AdaptMatch-Vis

AdaptMatch-Vis is an interactive visual analysis system for examining model predictions, intermediate feature maps, training results, and adaptive class thresholds.

## Features

- Switch between the installed CIFAR-10 and STL-10 results, with twelve weight configurations for each dataset.
- Inspect layer outputs, convolution and normalization details, class probabilities, and Grad-CAM overlays.
- Explore accuracy, loss, and confusion matrices across training epochs.
- Adjust the three ACCT weights and inspect their contributions to class-specific adoption thresholds.
- Compare configurations by validation accuracy and select their exported checkpoints.
- Analyze the supplied sample images or upload an image in the browser.

## Run locally

The project has been verified with Node.js 20.12.2 and npm. Clone the repository normally; the exported runtime resources are included in Git, without a separate model download.

```sh
git clone https://github.com/ChengLv-Vislab/AdaptMatch-Vis.git
cd AdaptMatch-Vis
npm ci
npm run build
npm run start:dev
```

## Development and deployment

```sh
npm run dev
```

Development mode watches the source and starts the local server on port 3000. For a production build, run `npm run build` and serve the contents of `public/` from the web server's root path. The application fetches `/assets/...` URLs and must be accessed through HTTP rather than opening the HTML file directly.

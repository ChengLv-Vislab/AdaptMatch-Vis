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

Open <http://localhost:3000/>. Keep the terminal running while using the system.

The complete runtime assets occupy approximately 1.5 GB. The page also loads its browser libraries, styles, and web font from the CDNs referenced in `public/index.html`, so an internet connection is required.

## Development and deployment

```sh
npm run dev
```

Development mode watches the source and starts the local server on port 3000. For a production build, run `npm run build` and serve the contents of `public/` from the web server's root path. The application fetches `/assets/...` URLs and must be accessed through HTTP rather than opening the HTML file directly.

## Repository contents

| Path | Purpose |
| --- | --- |
| `src/` | Svelte components, visual encodings, interactions, and browser-side model inference |
| `public/assets/data/` | Exported ONNX models, layer weights, configuration catalogs, metrics, and ACCT statistics |
| `public/assets/img/` | Sample images and interface graphics |
| `public/assets/vendor/` | Locally served D3 distribution and its license notice |
| `public/` | Page entry, styles, and built application bundles |
| `package.json`, `package-lock.json` | Dependency versions and application commands |
| `rollup.config.js`, `rollup_start_dev.js` | Build and development-server configuration |

The repository contains the visual analysis application and the exported resources needed to run it. Training pipelines, raw training datasets, optimizer checkpoints, local dependencies, editor settings, and backup directories are excluded.

## Acknowledgments

The visualization implementation builds on [CNN Explainer](https://github.com/poloclub/cnn-explainer). Its upstream copyright and license notice are preserved in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The vendored D3 license is included at `public/assets/vendor/d3.LICENSE.txt`. Other dependencies retain their own licenses.

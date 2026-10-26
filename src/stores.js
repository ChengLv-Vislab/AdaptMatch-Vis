import { writable } from "svelte/store";
import { ACCT_DEFAULT_PARAMETERS } from "./overview/acct-config.js";
import { DATASETS, ORIGINAL_IMAGES, ORIGINAL_IMAGE_ROOT } from './overview/datasets.js';

export const cnnStore = writable([]);
export const svgStore = writable(undefined);

export const vSpaceAroundGapStore = writable(undefined);
export const hSpaceAroundGapStore = writable(undefined);

export const nodeCoordinateStore = writable([]);
export const selectedScaleLevelStore = writable(undefined);

export const cnnLayerRangesStore = writable({});
export const cnnLayerMinMaxStore = writable([]);
export const modelColorDomainStore = writable(null);

export const needRedrawStore = writable([undefined, undefined]);

export const detailedModeStore = writable(true);

export const shouldIntermediateAnimateStore = writable(false);

export const isInSoftmaxStore = writable(false);
export const softmaxDetailViewStore = writable({});
export const allowsSoftmaxAnimationStore = writable(false);

export const hoverInfoStore = writable({});

export const modalStore = writable({});

export const intermediateLayerPositionStore = writable({});

export const model_nameStore = writable(undefined);
export const selectedImageStore = writable(undefined);
export const customImageStore = writable(undefined);

// ACCT parameters
export const alphaStore = writable(ACCT_DEFAULT_PARAMETERS.alpha);
export const betaStore = writable(ACCT_DEFAULT_PARAMETERS.beta);
export const gammaStore = writable(ACCT_DEFAULT_PARAMETERS.gamma);

export const accuracyData = writable([]);
export const confusionData = writable([]);
export const lossData = writable([]);
export const weightConfigurationsStore = writable([]);
export const selectedWeightConfigurationStore = writable(null);
export const trainingDataPathStore = writable('/assets/data');
export const availableModelsStore = writable([]);
export const selectedEpochStore = writable(0);
export const lastEpochStore = writable(299);
export const runLoadingStore = writable(true);
export const modelLoadingStore = writable(true);
export const runErrorStore = writable('');
export const datasetsStore = writable(DATASETS.map((item) => ({ ...item, available: false })));
export const selectedDatasetStore = writable(null);
export const classNamesStore = writable([...DATASETS[0].classNames]);
export const imageOptionsStore = writable(ORIGINAL_IMAGES);
export const imageRootStore = writable(ORIGINAL_IMAGE_ROOT);
export const imagePreviewRootStore = writable(ORIGINAL_IMAGE_ROOT);
export const imageVersionStore = writable('');
export const datasetSelectionDisabledStore = writable(false);

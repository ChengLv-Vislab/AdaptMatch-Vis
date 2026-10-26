import { get } from 'svelte/store';
import {
  accuracyData, confusionData, lossData, weightConfigurationsStore,
  selectedWeightConfigurationStore, trainingDataPathStore, availableModelsStore,
  lastEpochStore, selectedEpochStore, runLoadingStore, runErrorStore,
  model_nameStore, alphaStore, betaStore, gammaStore, datasetsStore,
  selectedDatasetStore, classNamesStore, imageOptionsStore, imageRootStore,
  selectedImageStore, customImageStore, imagePreviewRootStore, imageVersionStore,
} from '../stores.js';
import { DATASETS, activateClasses, demoImages, ORIGINAL_IMAGES, ORIGINAL_IMAGE_ROOT } from './datasets.js';
import { fetchAccuracyData } from './loadAccuracyData.js';
import { fetchConfusionData } from './loadConfusionData.js';
import { fetchACCTStatistics, activateACCTStatistics } from './acct-statistics.js';
import { rankWeightConfigurations } from './weight-comparison.js';

let initialization;
let requestVersion = 0;
const runCache = new Map();
const catalogCache = new Map();

async function json(url, optional = false) {
  const response = await fetch(url, { cache: 'no-store' });
  if (optional && response.status === 404) return null;
  // sirv --single serves index.html with HTTP 200 for absent asset paths.
  if (optional && response.headers?.get('content-type')?.includes('text/html')) return null;
  if (!response.ok) throw new Error(`Unable to load ${url}: HTTP ${response.status}`);
  return response.json();
}

export function updateSelectedEpoch(name) {
  const entry = get(availableModelsStore).find((model) => model.name === name);
  if (entry) selectedEpochStore.set(entry.training_epoch_index);
}

export async function fetchRunData(configuration) {
  const path = configuration.dataPath;
  if (!runCache.has(path)) {
    const promise = Promise.all([
      fetchAccuracyData(path), fetchConfusionData(path), fetchACCTStatistics(path),
      fetch(`${path}/learning_curve.json`, { cache: 'no-store' }).then(async (response) => {
        if (!response.ok) throw new Error(`Unable to load loss data: HTTP ${response.status}`);
        return (await response.text()).trim().split(/\r?\n/).filter(Boolean).map((line) => {
          const record = JSON.parse(line);
          return { epoch: record.epoch, loss: record.loss, loss_x: record.loss_x, loss_u: record.loss_u };
        });
      }),
    ]).then(([accuracy, confusion, statistics, loss]) => {
      for (const records of [accuracy, confusion, loss]) {
        if (records.length !== configuration.completedEpochs || records.some((record, index) => record.epoch !== index)) {
          throw new Error(`Incomplete epoch history for ${configuration.id}`);
        }
      }
      if (!statistics.models?.model_best || !configuration.models?.some((model) => model.name === 'model_best')) {
        throw new Error(`Missing best model for ${configuration.id}`);
      }
      for (const model of configuration.models) {
        const entry = statistics.models[model.name];
        if (!entry || entry.training_epoch_index !== model.training_epoch_index ||
            entry.class_names?.join('|') !== configuration.classNames.join('|') ||
            ['alpha', 'beta', 'gamma'].some((key) => !Number.isFinite(entry.weights?.[key]) ||
              Math.abs(entry.weights[key] - configuration[key]) > 1e-6)) {
          throw new Error(`Checkpoint statistics do not match ${configuration.datasetId}/${configuration.id}/${model.name}`);
        }
      }
      return { accuracy, confusion, statistics, loss };
    }).catch((error) => { runCache.delete(path); throw error; });
    runCache.set(path, promise);
  }
  return runCache.get(path);
}

function commitRun(configuration, data, dataset, catalog) {
  // No store changes until all metrics load and agree. Dataset and weight
  // changes share one request generation, so a stale response cannot win.
  activateACCTStatistics(data.statistics);
  if (dataset) {
    activateClasses(dataset.classNames);
    classNamesStore.set([...dataset.classNames]);
    const images = dataset.id === 'cifar10' ? ORIGINAL_IMAGES : demoImages(dataset.classNames, Boolean(dataset.legacy));
    imageOptionsStore.set(images);
    imageRootStore.set(dataset.id === 'cifar10' ? ORIGINAL_IMAGE_ROOT : dataset.imageRoot);
    imagePreviewRootStore.set(dataset.id === 'cifar10' ? ORIGINAL_IMAGE_ROOT :
      dataset.previewImageRoot || dataset.imageRoot);
    imageVersionStore.set(dataset.imageVersion || '');
    customImageStore.set(false);
    selectedImageStore.set(images[0].file);
    selectedDatasetStore.set({ ...dataset, epochs: catalog.epochs });
    weightConfigurationsStore.set(catalog.configurations);
  }
  accuracyData.set(data.accuracy);
  confusionData.set(data.confusion);
  lossData.set(data.loss);
  availableModelsStore.set(configuration.models);
  lastEpochStore.set(configuration.lastEpoch);
  alphaStore.set(configuration.alpha);
  betaStore.set(configuration.beta);
  gammaStore.set(configuration.gamma);
  selectedEpochStore.set(configuration.bestEpoch);
  model_nameStore.set('model_best');
  trainingDataPathStore.set(configuration.dataPath);
  selectedWeightConfigurationStore.set(configuration);
}

export async function selectWeightConfiguration(id) {
  const cfg = get(weightConfigurationsStore).find((item) => item.id === id);
  if (!cfg) throw new Error(`Unknown configuration ${id}`);
  if (get(selectedWeightConfigurationStore)?.id === id && !get(runErrorStore) && !get(runLoadingStore)) return true;
  const version = ++requestVersion;
  runLoadingStore.set(true);
  runErrorStore.set('');
  try {
    const data = await fetchRunData(cfg);
    if (version !== requestVersion) return false;
    commitRun(cfg, data);
    return true;
  } catch (error) {
    if (version === requestVersion) runErrorStore.set(error.message);
    throw error;
  } finally { if (version === requestVersion) runLoadingStore.set(false); }
}

async function loadCatalog(dataset) {
  if (!catalogCache.has(dataset.id)) {
    const promise = (async () => {
      let catalog;
      if (dataset.legacy) {
        const [statistics, summary] = await Promise.all([
          fetchACCTStatistics('/assets/data'), json('/assets/data/training_run_summary.json')]);
        const best = statistics.models.model_best;
        const models = Object.values(statistics.models).map((model) => ({
          name: model.checkpoint, training_epoch_index: model.training_epoch_index,
          label: `Epoch ${model.training_epoch_index}${model.checkpoint === 'model_best' ? ' (best)' : ''}`,
        }));
        catalog = { dataset: 'CIFAR-10', numLabeled: 4000, epochs: summary.completed_epochs,
          classNames: best.class_names, defaultConfigurationId: 'Legacy', configurations: [{
            id: 'Legacy', ...best.weights, recommended: false, simulated: false,
            accuracy: summary.best_validation_accuracy_percent, bestEpoch: best.training_epoch_index,
            lastEpoch: summary.completed_epochs - 1, completedEpochs: summary.completed_epochs,
            dataPath: '/assets/data', models,
          }] };
      } else {
        catalog = await json(dataset.catalogPath);
        if (catalog.dataset !== dataset.name || catalog.numLabeled !== dataset.numLabeled ||
            catalog.epochs !== 300 || catalog.configurations?.length !== 12 ||
            catalog.classNames?.join('|') !== dataset.classNames.join('|')) {
          throw new Error(`Invalid ${dataset.name} twelve-configuration catalog`);
        }
        if (catalog.configurations.some((cfg) => cfg.completedEpochs !== 300 || cfg.lastEpoch !== 299 ||
            !Number.isInteger(cfg.bestEpoch) || cfg.bestEpoch < 0 || cfg.bestEpoch > 299 || cfg.simulated !== false ||
            !Number.isFinite(cfg.accuracy) || cfg.accuracy < 0 || cfg.accuracy > 100 ||
            ['alpha', 'beta', 'gamma'].some((key) => !Number.isFinite(cfg[key]) || cfg[key] < 0 || cfg[key] > 1) ||
            Math.abs(cfg.alpha + cfg.beta + cfg.gamma - 1) > 1e-6)) {
          throw new Error('Catalog contains incomplete or non-real training results');
        }
        if (catalog.selectionSplit !== 'validation' || new Set(catalog.configurations.map((cfg) => cfg.id)).size !== 12) {
          throw new Error('Configuration ranking requires unique, real validation results');
        }
      }
      catalog.configurations = catalog.configurations.map((cfg) => {
        if (!cfg.dataPath.startsWith('/assets/data/') && cfg.dataPath !== '/assets/data') throw new Error('Invalid run data path');
        return { ...cfg, datasetId: dataset.id, numLabeled: catalog.numLabeled, epochs: catalog.epochs,
          classNames: [...dataset.classNames], legacy: Boolean(dataset.legacy),
          dataPath: dataset.legacy ? '/assets/data' : cfg.dataPath.replace(/^\/assets\/data/, dataset.dataRoot) };
      });
      const best = rankWeightConfigurations(catalog.configurations)[0];
      if (!best) throw new Error('No real configuration has a valid accuracy');
      // Even an older catalog with a fixed recommended ID must open the actual
      // highest-performing run; ties follow the same rule as the Best ranking.
      catalog.defaultConfigurationId = best.id;
      catalog.highestValidationAccuracyId = best.id;
      return catalog;
    })().catch((error) => { catalogCache.delete(dataset.id); throw error; });
    catalogCache.set(dataset.id, promise);
  }
  return catalogCache.get(dataset.id);
}

export async function selectDataset(id) {
  const dataset = get(datasetsStore).find((item) => item.id === id);
  if (!dataset?.available) {
    throw new Error(`${dataset?.name || id} results are not installed. Restore the exported runtime assets in public/assets/data and reload.`);
  }
  if (get(selectedDatasetStore)?.id === id && !get(runErrorStore) && !get(runLoadingStore)) return true;
  const version = ++requestVersion;
  runLoadingStore.set(true);
  runErrorStore.set('');
  try {
    const catalog = await loadCatalog(dataset);
    const cfg = catalog.configurations.find((item) => item.id === catalog.defaultConfigurationId);
    if (!cfg) throw new Error('Missing default configuration');
    const data = await fetchRunData(cfg);
    if (version !== requestVersion) return false;
    commitRun(cfg, data, dataset, catalog);
    return true;
  } catch (error) {
    if (version === requestVersion) runErrorStore.set(error.message);
    throw error;
  } finally { if (version === requestVersion) runLoadingStore.set(false); }
}

export function initializeRunCatalog() {
  if (!initialization) {
    initialization = (async () => {
      const registry = await json('/assets/data/datasets.json', true);
      let datasets;
      if (registry) {
        datasets = DATASETS.map((definition) => ({ ...definition,
          ...registry.datasets.find((entry) => entry.id === definition.id) }));
      } else {
        const rootCatalog = await json('/assets/data/weight_configurations.json', true);
        datasets = DATASETS.map((item) => item.id === 'cifar10' ? {
          ...item, available: true, legacy: !rootCatalog, dataRoot: '/assets/data',
          catalogPath: '/assets/data/weight_configurations.json', imageRoot: '/assets/img',
        } : { ...item, available: false });
      }
      datasetsStore.set(datasets);
      const defaultId = datasets.find((item) => item.id === registry?.defaultDatasetId && item.available)?.id ||
        datasets.find((item) => item.id === 'cifar10' && item.available)?.id ||
        datasets.find((item) => item.available)?.id;
      if (!defaultId) throw new Error('No trained dataset is installed');
      await selectDataset(defaultId);
      return get(selectedDatasetStore);
    })().catch((error) => {
      initialization = null;
      runLoadingStore.set(false);
      runErrorStore.set(error.message);
      throw error;
    });
  }
  return initialization;
}

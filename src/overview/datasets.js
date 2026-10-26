// Shared ordering drives logits, ACCT statistics, charts and sample images.
export const DATASETS = [
  { id: 'cifar10', name: 'CIFAR-10', numLabeled: 4000,
    classNames: ['airplane', 'automobile', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck'] },
  { id: 'stl10', name: 'STL-10', numLabeled: 1000,
    classNames: ['airplane', 'bird', 'car', 'cat', 'deer', 'dog', 'horse', 'monkey', 'ship', 'truck'] },
];
// Mutate in place on activation: existing draw modules retain this reference.
export const ACTIVE_CLASS_NAMES = [...DATASETS[0].classNames];
export const ORIGINAL_IMAGE_ROOT = '/assets/img/original-gallery';
export const ORIGINAL_IMAGES = [
  ['airplane.png', 'airplane'], ['bird.png', 'bird'],
  ['automobile.png', 'automobile'], ['cat.jpg', 'cat'], ['deer.png', 'deer'],
  ['dog.png', 'dog'], ['hours.png', 'horse'], ['ship.png', 'ship'], ['truck.png', 'truck'],
].map(([file, name]) => ({ file, class: name }));
export function activateClasses(names) {
  ACTIVE_CLASS_NAMES.splice(0, ACTIVE_CLASS_NAMES.length, ...names);
}
export function demoImages(names, legacy = false) {
  return names.map((name) => ({ class: name,
    file: name === 'cat' ? 'cat.jpg' : legacy && name === 'horse' ? 'hours.png' : `${name}.png` }));
}
export function demoImageURL(root, filename, version = '') {
  return `${root}/${filename}${version ? `?v=${encodeURIComponent(version)}` : ''}`;
}

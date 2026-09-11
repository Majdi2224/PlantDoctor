const remedies = require('./assets/remedies.json');

// Model label strings differ across model versions (Teachable Machine's
// "Early_bright" vs. PlantVillage's "Tomato___Early_blight"), so match on
// keywords instead of requiring an exact string.
const KEYWORD_TO_KEY = [
  ['healthy', 'healthy'],
  ['early', 'early_blight'],
  ['late', 'late_blight'],
  ['bacterial', 'bacterial_spot'],
  ['septoria', 'septoria_leaf_spot'],
  ['mold', 'leaf_mold'],
  ['mite', 'spider_mites'],
  ['spider', 'spider_mites'],
  ['target', 'target_spot'],
  ['mosaic', 'mosaic_virus'],
  ['yellow', 'yellow_leaf_curl_virus'],
  ['curl', 'yellow_leaf_curl_virus'],
];

function getRemedy(rawLabel) {
  const normalized = String(rawLabel || '').toLowerCase();
  const match = KEYWORD_TO_KEY.find(([kw]) => normalized.includes(kw));
  return remedies[match ? match[1] : 'unknown'];
}

module.exports = { getRemedy };

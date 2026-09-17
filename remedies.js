const remedies = require('./assets/remedies.json');

// Model labels follow PlantVillage's "Species___Disease" convention (our own
// metadata.json labels always do, since we train against that dataset).
// Matching is scoped PER SPECIES because disease names collide across
// species with different remedies - e.g. "bacterial_spot" exists for both
// Tomato and Peach, and every species has its own "healthy" class - so a
// single global keyword table (the old approach) would silently return the
// wrong plant's remedy once more than one species was supported.
const SPECIES_KEYWORDS = {
  tomato: [
    ['healthy', 'tomato_healthy'],
    ['early', 'tomato_early_blight'],
    ['late', 'tomato_late_blight'],
    ['bacterial', 'tomato_bacterial_spot'],
    ['septoria', 'tomato_septoria_leaf_spot'],
    ['mold', 'tomato_leaf_mold'],
    ['mite', 'tomato_spider_mites'],
    ['spider', 'tomato_spider_mites'],
    ['target', 'tomato_target_spot'],
    ['mosaic', 'tomato_mosaic_virus'],
    ['yellow', 'tomato_yellow_leaf_curl_virus'],
    ['curl', 'tomato_yellow_leaf_curl_virus'],
  ],
  apple: [
    ['healthy', 'apple_healthy'],
    ['scab', 'apple_scab'],
    ['rot', 'apple_black_rot'],
    ['rust', 'apple_cedar_apple_rust'],
  ],
  cherry: [
    ['healthy', 'cherry_healthy'],
    ['powdery', 'cherry_powdery_mildew'],
    ['mildew', 'cherry_powdery_mildew'],
  ],
  peach: [
    ['healthy', 'peach_healthy'],
    ['bacterial', 'peach_bacterial_spot'],
  ],
};

// Order matters only in that longer/more-specific names should be checked
// before substrings of themselves - none currently collide (apple/cherry/
// peach/tomato share no substrings), so plain "includes" is enough.
const SPECIES_NAMES = Object.keys(SPECIES_KEYWORDS);

function detectSpecies(prefix) {
  const p = prefix.toLowerCase();
  return SPECIES_NAMES.find((name) => p.includes(name)) || null;
}

function getRemedy(rawLabel) {
  const label = String(rawLabel || '');
  const parts = label.split('___');

  let species = null;
  let diseasePart = label.toLowerCase();
  if (parts.length === 2) {
    species = detectSpecies(parts[0]);
    diseasePart = parts[1].toLowerCase();
  }
  // No species prefix (e.g. legacy Teachable Machine labels like
  // "Early_bright") - those older models were tomato-only, so fall back to
  // matching the whole label against the tomato table.
  if (!species) species = 'tomato';

  const table = SPECIES_KEYWORDS[species] || SPECIES_KEYWORDS.tomato;
  const match = table.find(([kw]) => diseasePart.includes(kw));
  return remedies[match ? match[1] : 'unknown'];
}

module.exports = { getRemedy };

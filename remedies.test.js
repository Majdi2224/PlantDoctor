const assert = require('assert');
const { getRemedy } = require('./remedies');
const allRemedies = require('./assets/remedies.json');

assert.strictEqual(getRemedy('healthy').displayName, 'Healthy');
assert.strictEqual(getRemedy('Early_bright').displayName, 'Early Blight');
assert.strictEqual(getRemedy('Tomato___Early_blight').displayName, 'Early Blight');
assert.strictEqual(getRemedy('Tomato___Late_blight').displayName, 'Late Blight');
assert.strictEqual(getRemedy('Tomato___Leaf_Mold').displayName, 'Leaf Mold');
assert.strictEqual(getRemedy('Tomato___Spider_mites Two-spotted_spider_mite').displayName, 'Spider Mites');
assert.strictEqual(getRemedy('Tomato___Tomato_Yellow_Leaf_Curl_Virus').displayName, 'Yellow Leaf Curl Virus');
assert.strictEqual(getRemedy('totally unrecognized string').displayName, 'Unrecognized');

// Cross-species collisions this matching has to get right: "bacterial" and
// "healthy" both appear in more than one species' labels, and must resolve
// to that species' own entry, not tomato's.
assert.strictEqual(getRemedy('Apple___healthy').displayName, 'Healthy');
assert.strictEqual(getRemedy('Apple___Apple_scab').displayName, 'Apple Scab');
assert.strictEqual(getRemedy('Apple___Black_rot').displayName, 'Black Rot');
assert.strictEqual(getRemedy('Apple___Cedar_apple_rust').displayName, 'Cedar Apple Rust');
assert.strictEqual(getRemedy('Cherry_(including_sour)___healthy').displayName, 'Healthy');
assert.strictEqual(getRemedy('Cherry_(including_sour)___Powdery_mildew').displayName, 'Powdery Mildew');
assert.strictEqual(getRemedy('Peach___healthy').displayName, 'Healthy');
assert.strictEqual(getRemedy('Peach___Bacterial_spot').displayName, 'Bacterial Spot');
assert.notStrictEqual(
  getRemedy('Peach___Bacterial_spot').cause,
  getRemedy('Tomato___Bacterial_spot').cause,
  'peach and tomato bacterial spot must not resolve to the same remedy'
);

for (const [key, entry] of Object.entries(allRemedies)) {
  assert.ok(entry.homeRemedy && entry.homeRemedy.length > 20, `${key} missing a real homeRemedy`);
  assert.ok(entry.marketRemedy && entry.marketRemedy.length > 20, `${key} missing a real marketRemedy`);
}

console.log('remedies.test.js: all checks passed');

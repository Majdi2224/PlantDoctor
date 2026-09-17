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

for (const [key, entry] of Object.entries(allRemedies)) {
  assert.ok(entry.homeRemedy && entry.homeRemedy.length > 20, `${key} missing a real homeRemedy`);
  assert.ok(entry.marketRemedy && entry.marketRemedy.length > 20, `${key} missing a real marketRemedy`);
}

console.log('remedies.test.js: all checks passed');

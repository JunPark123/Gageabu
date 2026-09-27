import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { budgetPercent, budgetView } from '../src/pig-state.mjs';

for (const [value, state, position] of [
  [0, 'happy', 0], [59.99, 'happy', 59.99], [60, 'concerned', 60],
  [77, 'concerned', 77], [89.99, 'concerned', 89.99],
  [90, 'crying', 90], [100, 'crying', 100], [120, 'crying', 100],
]) assert.deepEqual(budgetView(value), { raw: value, state, position });
for (const value of [null, undefined, NaN, Infinity, -1]) {
  assert.deepEqual(budgetView(value), { raw: null, state: null, position: 0 });
}
assert.equal(budgetPercent(2317400, 3000000).toFixed(2), '77.25');
assert.equal(budgetPercent(0, 100), 0);
assert.equal(budgetPercent(100, 0), null);
assert.equal(budgetPercent(-1, 100), null);
assert.equal(budgetPercent(Number.MAX_VALUE, Number.MIN_VALUE), null);
assert.equal(budgetView(77, { concernedAt: 80, cryingAt: 100 }).state, 'happy');
assert.throws(() => budgetView(20, { concernedAt: 90, cryingAt: 60 }), RangeError);

const assetDir = fileURLToPath(new URL('../public/pig-assets/', import.meta.url));
const files = ['main-wealthy.png', 'main-normal.png', 'main-hungry.png', 'face-happy.png', 'face-concerned.png', 'face-crying.png'];
for (const file of files) {
  const png = fs.readFileSync(`${assetDir}/${file}`);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 1254);
  assert.equal(png.readUInt32BE(20), 1254);
  assert.equal(png[25], 6, `${file} must be RGBA PNG`);
}
console.log('PASS: state boundaries, invalid data, overrides, and six RGBA PNG assets.');

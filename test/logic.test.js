const test = require('node:test');
const assert = require('node:assert/strict');
const { gcd, simplify, checkFraction, checkSimplified, checkPercent, LEVELS } = require('../juego1/logic.js');

test('gcd and simplify reduce fractions to lowest terms', () => {
  assert.equal(gcd(4, 10), 2);
  assert.deepEqual(simplify(3, 9), [1, 3]);
  assert.deepEqual(simplify(3, 10), [3, 10]);
});

test('fraction must match favorable over total', () => {
  assert.equal(checkFraction(3, 9, 3, 9), true);
  assert.equal(checkFraction(1, 3, 3, 9), false);
  assert.equal(checkFraction(9, 3, 3, 9), false);
});

test('simplified fraction must be in lowest terms', () => {
  assert.equal(checkSimplified(1, 3, 3, 9), true);
  assert.equal(checkSimplified(3, 9, 3, 9), false);
  assert.equal(checkSimplified(2, 6, 3, 9), false);
});

test('percent accepts rounded values within one point', () => {
  assert.equal(checkPercent(33, 3, 9), true);
  assert.equal(checkPercent(33.3, 3, 9), true);
  assert.equal(checkPercent(44, 4, 9), true);
  assert.equal(checkPercent(50, 3, 9), false);
  assert.equal(checkPercent(NaN, 3, 9), false);
});

test('every level has a target present in its items', () => {
  assert.equal(LEVELS.length, 8);
  for (const level of LEVELS) {
    const total = level.items.reduce((s, i) => s + i.count, 0);
    const fav = level.items.filter(i => i.target).reduce((s, i) => s + i.count, 0);
    assert.ok(fav > 0 && fav < total, level.question);
  }
});

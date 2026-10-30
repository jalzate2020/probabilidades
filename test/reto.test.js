const test = require('node:test');
const assert = require('node:assert/strict');
const { generateRound, mulberry32, fractionValue } = require('../reto/logic.js');

const seeds = Array.from({ length: 200 }, (_, i) => i + 1);

test('a round has 5 questions, one of each type', () => {
  for (const seed of seeds) {
    const round = generateRound(mulberry32(seed));
    assert.equal(round.length, 5);
    assert.equal(new Set(round.map((q) => q.type)).size, 5);
  }
});

test('every question has unique options and a valid answer', () => {
  for (const seed of seeds) {
    for (const q of generateRound(mulberry32(seed))) {
      assert.ok(q.options.length >= 3, q.type);
      assert.ok(q.answer >= 0 && q.answer < q.options.length, q.type);
      const keys = q.options.map((o) => JSON.stringify(o));
      assert.equal(new Set(keys).size, keys.length, `${q.type} duplicated options`);
    }
  }
});

test('fraction answers match the probability of the scene', () => {
  for (const seed of seeds) {
    for (const q of generateRound(mulberry32(seed))) {
      if (q.type === 'wheel') {
        const fav = q.sectors.filter((s) => s.target).length;
        assert.equal(fractionValue(q.options[q.answer]), fav / q.sectors.length);
      }
      if (q.type === 'dice') {
        const fav = [1, 2, 3, 4, 5, 6].filter(q.event).length;
        assert.equal(fractionValue(q.options[q.answer]), fav / 6);
      }
      if (q.type === 'percent') {
        const fav = q.bag.filter((b) => b.target).length;
        assert.equal(q.options[q.answer], (fav / q.bag.length) * 100);
      }
    }
  }
});

test('fraction options are shown in lowest terms and never repeat a value', () => {
  for (const seed of seeds) {
    for (const q of generateRound(mulberry32(seed))) {
      if (q.type !== 'wheel' && q.type !== 'dice') continue;
      const values = q.options.map(fractionValue);
      assert.equal(new Set(values).size, values.length);
      for (const [n, d] of q.options) {
        const g = (a, b) => (b ? g(b, a % b) : a);
        assert.ok(n === 0 || g(n, d) === 1, `${n}/${d} not simplified`);
      }
    }
  }
});

test('likelihood words match the bag contents', () => {
  for (const seed of seeds) {
    const q = generateRound(mulberry32(seed)).find((x) => x.type === 'words');
    const fav = q.bag.filter((b) => b.target).length;
    const total = q.bag.length;
    const expected = fav === total ? 'Seguro' : fav === 0 ? 'Imposible' : fav * 2 > total ? 'Probable' : 'Poco probable';
    assert.equal(q.options[q.answer], expected);
  }
});

test('compare answer matches which bag gives better odds', () => {
  for (const seed of seeds) {
    const q = generateRound(mulberry32(seed)).find((x) => x.type === 'compare');
    const p = (bag) => bag.filter((b) => b.target).length / bag.length;
    const a = p(q.bagA), b = p(q.bagB);
    const expected = a === b ? 'Es igual' : a > b ? 'Bolsa A' : 'Bolsa B';
    assert.equal(q.options[q.answer], expected);
  }
});

test('rounds change between games', () => {
  const a = JSON.stringify(generateRound(mulberry32(1)).map((q) => q.prompt));
  const b = JSON.stringify(generateRound(mulberry32(2)).map((q) => q.prompt));
  assert.notEqual(a, b);
});

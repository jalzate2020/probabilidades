// Pure game logic: shared by the browser (global `Logic`) and Node tests.
(function (root) {
  function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
  }

  function simplify(num, den) {
    const d = gcd(num, den);
    return [num / d, den / d];
  }

  function checkFraction(num, den, fav, total) {
    return num === fav && den === total;
  }

  function checkSimplified(num, den, fav, total) {
    const [n, d] = simplify(fav, total);
    return num === n && den === d;
  }

  // Kids round percentages (33 for 1/3), so allow one point of tolerance.
  function checkPercent(value, fav, total) {
    if (!Number.isFinite(value)) return false;
    return Math.abs(value - (fav / total) * 100) <= 1;
  }

  // Situations from the classroom worksheet. `shape` maps to a drawing in app.js.
  const LEVELS = [
    {
      question: '¿Cuál es la probabilidad de sacar una', target: 'bolita roja', color: '#e53935', container: 'jar',
      items: [
        { shape: 'ball', color: '#e53935', count: 3, target: true },
        { shape: 'ball', color: '#fdd835', count: 3 },
        { shape: 'ball', color: '#1e88e5', count: 3 },
      ],
    },
    {
      question: '¿Cuál es la probabilidad de sacar una', target: 'bolita verde', color: '#2e7d32', container: 'jar',
      items: [
        { shape: 'ball', color: '#43a047', count: 4, target: true },
        { shape: 'ball', color: '#fdd835', count: 3 },
        { shape: 'ball', color: '#8e24aa', count: 2 },
      ],
    },
    {
      question: '¿Cuál es la probabilidad de sacar una', target: 'estrella amarilla', color: '#f9a825', container: 'box',
      items: [
        { shape: 'star', color: '#fdd835', count: 4, target: true },
        { shape: 'star', color: '#1e88e5', count: 3 },
        { shape: 'star', color: '#e53935', count: 3 },
      ],
    },
    {
      question: '¿Cuál es la probabilidad de sacar un', target: 'carrito', color: '#1565c0', container: 'box',
      items: [
        { shape: 'emoji', emoji: '🚗', count: 6, target: true },
        { shape: 'emoji', emoji: '🐤', count: 3 },
      ],
    },
    {
      question: '¿Cuál es la probabilidad de sacar una', target: 'ficha morada', color: '#8e24aa', container: 'jar',
      items: [
        { shape: 'chip', color: '#8e24aa', count: 4, target: true },
        { shape: 'chip', color: '#fb8c00', count: 2 },
        { shape: 'chip', color: '#43a047', count: 2 },
      ],
    },
    {
      question: '¿Cuál es la probabilidad de sacar un', target: 'dulce de fresa', color: '#e53935', container: 'jar',
      items: [
        { shape: 'candy', color: '#e53935', count: 2, target: true },
        { shape: 'candy', color: '#fdd835', count: 2 },
        { shape: 'candy', color: '#8e24aa', count: 2 },
        { shape: 'candy', color: '#43a047', count: 2 },
      ],
    },
    {
      question: '¿Cuál es la probabilidad de sacar una figura de', target: 'triángulo', color: '#e53935', container: 'box',
      items: [
        { shape: 'triangle', color: '#e53935', count: 2, target: true },
        { shape: 'triangle', color: '#43a047', count: 1, target: true },
        { shape: 'circle', color: '#1e88e5', count: 4 },
        { shape: 'square', color: '#fdd835', count: 3 },
      ],
    },
    {
      question: '¿Cuál es la probabilidad de sacar una', target: 'pelota de fútbol', color: '#2e7d32', container: 'box',
      items: [
        { shape: 'emoji', emoji: '⚽', count: 6, target: true },
        { shape: 'emoji', emoji: '🏀', count: 1 },
        { shape: 'emoji', emoji: '🎾', count: 1 },
      ],
    },
  ];

  const api = { gcd, simplify, checkFraction, checkSimplified, checkPercent, LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(this);

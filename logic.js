// Question generator for "Reto de la Suerte". Pure: takes an rng, returns data.
(function (root) {
  const COLORS = [
    { hex: '#ff4d6d', m: 'rojo', f: 'roja' },
    { hex: '#3a86ff', m: 'azul', f: 'azul' },
    { hex: '#38d39f', m: 'verde', f: 'verde' },
    { hex: '#ffbe0b', m: 'amarillo', f: 'amarilla' },
    { hex: '#9d4edd', m: 'morado', f: 'morada' },
    { hex: '#ff8c42', m: 'naranja', f: 'naranja' },
  ];

  const DICE_EVENTS = [
    { text: 'un número par', test: (n) => n % 2 === 0 },
    { text: 'un número impar', test: (n) => n % 2 === 1 },
    { text: 'un número mayor que 4', test: (n) => n > 4 },
    { text: 'un número menor que 3', test: (n) => n < 3 },
    { text: 'el número 6', test: (n) => n === 6 },
    { text: 'un múltiplo de 3', test: (n) => n % 3 === 0 },
    { text: 'un número menor que 5', test: (n) => n < 5 },
    { text: 'el número 7', test: () => false },
  ];

  const WORDS = ['Seguro', 'Probable', 'Poco probable', 'Imposible'];

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const simplify = ([n, d]) => (n === 0 ? [0, 1] : [n / gcd(n, d), d / gcd(n, d)]);
  const fractionValue = ([n, d]) => n / d;
  const plural = (word) => (/[aeiou]$/.test(word) ? word + 's' : word + 'es');

  function tools(rng) {
    const int = (min, max) => min + Math.floor(rng() * (max - min + 1));
    const pick = (list) => list[int(0, list.length - 1)];
    const shuffle = (list) => {
      const a = list.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = int(0, i);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    return { int, pick, shuffle };
  }

  // Builds a bag of `fav` target items plus filler items in other colors.
  function makeBag(t, target, fav, total, others) {
    const bag = Array.from({ length: fav }, () => ({ color: target.hex, target: true }));
    for (let i = fav; i < total; i++) bag.push({ color: t.pick(others).hex, target: false });
    return t.shuffle(bag);
  }

  // Wrong answers kids typically give, then random fillers; all distinct by value.
  function fractionOptions(t, n, d) {
    const correct = simplify([n, d]);
    const candidates = [[d - n, d], [n, d - n], [n + 1, d], [1, d], [n, d + 2], [1, n + 1]];
    const out = [correct];
    const seen = new Set([fractionValue(correct)]);
    const add = (f) => {
      if (f[1] <= 0 || f[0] < 0 || f[0] > f[1]) return;
      const s = simplify(f);
      const v = fractionValue(s);
      if (seen.has(v)) return;
      seen.add(v);
      out.push(s);
    };
    t.shuffle(candidates).forEach((c) => out.length < 4 && add(c));
    while (out.length < 4) add([t.int(1, 5), t.int(2, 12)]);
    const options = t.shuffle(out);
    return { options, answer: options.indexOf(correct) };
  }

  function wheelQuestion(t) {
    const size = t.pick([4, 6, 8]);
    const [target, ...others] = t.shuffle(COLORS).slice(0, t.int(2, 4));
    const fav = t.int(1, size - 1);
    const sectors = Array.from({ length: size }, (_, i) =>
      i < fav ? { color: target.hex, target: true } : { color: others[i % others.length].hex, target: false });
    return {
      type: 'wheel',
      prompt: `Si giras la ruleta, ¿cuál es la probabilidad de que caiga en ${target.m}?`,
      highlight: { text: target.m, color: target.hex },
      sectors: t.shuffle(sectors),
      explain: `Hay ${fav} casillas de color ${target.m} de ${size} en total: ${fav}/${size}.`,
      ...fractionOptions(t, fav, size),
    };
  }

  function diceQuestion(t) {
    const ev = t.pick(DICE_EVENTS);
    const favs = [1, 2, 3, 4, 5, 6].filter(ev.test);
    const explain = favs.length
      ? `Los resultados que sirven son ${favs.join(', ')}: ${favs.length} de 6 caras.`
      : `¡Un dado solo tiene caras del 1 al 6! Es imposible, la probabilidad es 0.`;
    return {
      type: 'dice',
      prompt: `Al lanzar un dado, ¿cuál es la probabilidad de sacar ${ev.text}?`,
      highlight: { text: ev.text, color: '#ff8c42' },
      event: ev.test,
      explain,
      ...fractionOptions(t, favs.length, 6),
    };
  }

  function wordsQuestion(t) {
    const [target, ...others] = t.shuffle(COLORS);
    const total = t.int(6, 10);
    const kind = t.pick(WORDS);
    const fav = {
      Seguro: total,
      Imposible: 0,
      Probable: t.int(Math.floor(total / 2) + 1, total - 1),
      'Poco probable': t.int(1, Math.ceil(total / 2) - 1),
    }[kind];
    return {
      type: 'words',
      prompt: `¿Cómo es sacar una canica ${target.f} de esta bolsa?`,
      highlight: { text: target.f, color: target.hex },
      bag: makeBag(t, target, fav, total, others.slice(0, 2)),
      explain: `Hay ${fav} canicas ${plural(target.f)} de ${total}. Por eso es "${kind.toLowerCase()}".`,
      options: WORDS,
      answer: WORDS.indexOf(kind),
    };
  }

  function compareQuestion(t) {
    const [target, other] = t.shuffle(COLORS);
    const bag = (fav, total) => makeBag(t, target, fav, total, [other]);
    let a, b;
    if (t.int(0, 2) === 0) {
      // Same odds with different amounts: the classic trap.
      const f = t.int(1, 2), tot = f + t.int(1, 2), k = t.int(2, 3);
      [a, b] = t.shuffle([[f, tot], [f * k, tot * k]]);
    } else {
      do {
        a = [t.int(1, 4), 0]; a[1] = a[0] + t.int(1, 4);
        b = [t.int(1, 4), 0]; b[1] = b[0] + t.int(1, 4);
      } while (a[0] * b[1] === b[0] * a[1]);
    }
    const pa = a[0] / a[1], pb = b[0] / b[1];
    const options = ['Bolsa A', 'Bolsa B', 'Es igual'];
    const answer = pa === pb ? 2 : pa > pb ? 0 : 1;
    return {
      type: 'compare',
      prompt: `¿En qué bolsa es más probable sacar una canica ${target.f}?`,
      highlight: { text: target.f, color: target.hex },
      bagA: bag(a[0], a[1]),
      bagB: bag(b[0], b[1]),
      explain: `Bolsa A: ${a[0]}/${a[1]} · Bolsa B: ${b[0]}/${b[1]}. ${answer === 2 ? '¡Son fracciones equivalentes!' : 'Compara las fracciones, no solo cuántas hay.'}`,
      options,
      answer,
    };
  }

  function percentQuestion(t) {
    const [target, ...others] = t.shuffle(COLORS);
    const total = t.pick([4, 5, 10, 20]);
    const fav = t.int(1, total - 1);
    const pct = (fav / total) * 100;
    const seen = new Set([pct]);
    const out = [pct];
    t.shuffle([fav, 100 - pct, pct + 10, pct - 10, pct + 5, pct * 2, 50]).forEach((v) => {
      if (out.length < 4 && v > 0 && v < 100 && !seen.has(v)) { seen.add(v); out.push(v); }
    });
    while (out.length < 4) {
      const v = t.int(1, 19) * 5;
      if (!seen.has(v)) { seen.add(v); out.push(v); }
    }
    const options = t.shuffle(out);
    return {
      type: 'percent',
      prompt: `¿Qué porcentaje de probabilidad hay de sacar un dulce ${target.m}?`,
      highlight: { text: target.m, color: target.hex },
      bag: makeBag(t, target, fav, total, others.slice(0, 2)),
      explain: `${fav} de ${total} = ${fav}/${total}. ${fav} ÷ ${total} × 100 = ${pct}%.`,
      options,
      answer: options.indexOf(pct),
    };
  }

  function generateRound(rng = Math.random) {
    const t = tools(rng);
    const makers = [wheelQuestion, diceQuestion, wordsQuestion, compareQuestion, percentQuestion];
    return t.shuffle(makers).map((make) => make(t));
  }

  const api = { generateRound, mulberry32, fractionValue };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Reto = api;
})(this);

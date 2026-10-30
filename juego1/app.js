(function () {
  const { simplify, checkFraction, checkSimplified, checkPercent, LEVELS } = window.Logic;

  const $ = (id) => document.getElementById(id);
  const form = $('answers');

  const state = {
    levels: LEVELS.slice(),
    index: 0,
    solved: new Set(),
    hints: 0,
    draws: { total: 0, hits: 0 },
    bag: [],
  };

  // ---------- Drawings ----------

  const SHAPES = {
    ball: (c) => `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="2"/><ellipse cx="14" cy="13" rx="5" ry="3.5" fill="#fff" opacity=".7"/></svg>`,
    chip: (c) => `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="2"/><circle cx="20" cy="20" r="11" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3"/></svg>`,
    star: (c) => `<svg viewBox="0 0 40 40"><polygon points="20,2 25,15 39,15 28,24 32,38 20,30 8,38 12,24 1,15 15,15" fill="${c}" stroke="rgba(0,0,0,.3)" stroke-width="2" stroke-linejoin="round"/></svg>`,
    candy: (c) => `<svg viewBox="0 0 48 40"><polygon points="2,8 14,20 2,32" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="2" stroke-linejoin="round"/><polygon points="46,8 34,20 46,32" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="2" stroke-linejoin="round"/><ellipse cx="24" cy="20" rx="12" ry="10" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="2"/><path d="M18 14 Q24 20 18 26" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6"/></svg>`,
    triangle: (c) => `<svg viewBox="0 0 40 40"><polygon points="20,3 38,36 2,36" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="2" stroke-linejoin="round"/></svg>`,
    square: (c) => `<svg viewBox="0 0 40 40"><rect x="4" y="4" width="32" height="32" rx="3" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="2"/></svg>`,
    circle: (c) => `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="2"/></svg>`,
    emoji: (_, e) => `<span class="emoji">${e}</span>`,
  };

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function counts(level) {
    const total = level.items.reduce((s, i) => s + i.count, 0);
    const fav = level.items.filter((i) => i.target).reduce((s, i) => s + i.count, 0);
    return { total, fav };
  }

  // ---------- Surprise challenges ----------

  const RANDOM_COLORS = [
    { hex: '#e53935', f: 'roja', m: 'rojo' },
    { hex: '#fdd835', f: 'amarilla', m: 'amarillo' },
    { hex: '#1e88e5', f: 'azul', m: 'azul' },
    { hex: '#43a047', f: 'verde', m: 'verde' },
    { hex: '#8e24aa', f: 'morada', m: 'morado' },
    { hex: '#fb8c00', f: 'naranja', m: 'naranja' },
  ];
  const RANDOM_KINDS = [
    { shape: 'ball', noun: 'bolita', art: 'una', g: 'f', container: 'jar' },
    { shape: 'star', noun: 'estrella', art: 'una', g: 'f', container: 'box' },
    { shape: 'chip', noun: 'ficha', art: 'una', g: 'f', container: 'jar' },
    { shape: 'candy', noun: 'dulce', art: 'un', g: 'm', container: 'jar' },
    { shape: 'square', noun: 'cuadrado', art: 'un', g: 'm', container: 'box' },
  ];
  const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

  function randomLevel() {
    const kind = RANDOM_KINDS[rand(0, RANDOM_KINDS.length - 1)];
    const colors = shuffle(RANDOM_COLORS).slice(0, rand(2, 4));
    const items = colors.map((c, i) => ({ shape: kind.shape, color: c.hex, count: rand(1, 4), target: i === 0 }));
    return {
      question: `¿Cuál es la probabilidad de sacar ${kind.art}`,
      target: `${kind.noun} ${kind.g === 'f' ? colors[0].f : colors[0].m}`,
      color: colors[0].hex === '#fdd835' ? '#f9a825' : colors[0].hex,
      container: kind.container,
      items,
    };
  }

  // ---------- Rendering ----------

  function renderNav() {
    const nav = $('levels');
    nav.innerHTML = '';
    state.levels.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'level-btn' + (state.solved.has(i) ? ' solved' : '');
      b.textContent = i < LEVELS.length ? i + 1 : '🎁';
      b.setAttribute('aria-label', `Situación ${i + 1}`);
      b.setAttribute('aria-current', String(i === state.index));
      b.addEventListener('click', () => go(i));
      nav.appendChild(b);
    });
  }

  function renderLevel() {
    const level = state.levels[state.index];
    $('card').hidden = false;
    $('done').hidden = true;
    $('badge').textContent = state.index < LEVELS.length ? state.index + 1 : '🎁';
    $('question').innerHTML = `${level.question} <strong style="color:${level.color}">${level.target}</strong>?`;

    const container = $('container');
    container.className = `container ${level.container}`;
    container.style.setProperty('--lid', ['#26a69a', '#7e57c2', '#ef5350', '#29b6f6'][state.index % 4]);

    state.bag = shuffle(level.items.flatMap((it) => Array.from({ length: it.count }, () => it)));
    const items = $('items');
    items.style.setProperty('--cols', state.bag.length > 9 ? 4 : 3);
    items.innerHTML = state.bag
      .map((it) => `<div class="item">${SHAPES[it.shape](it.color, it.emoji)}</div>`)
      .join('');

    form.reset();
    form.querySelectorAll('.field').forEach((f) => {
      f.classList.remove('ok', 'bad');
      f.querySelector('.mark').textContent = '';
    });
    state.hints = 0;
    state.draws = { total: 0, hits: 0 };
    $('draws').textContent = '';
    $('feedback').textContent = '';
    $('next').hidden = true;
    renderNav();
  }

  function go(i) {
    state.index = i;
    renderLevel();
  }

  // ---------- Answer checking ----------

  const num = (name) => {
    const raw = form.elements[name].value.trim().replace(',', '.');
    return raw === '' ? NaN : Number(raw);
  };

  function mark(field, ok) {
    const el = form.querySelector(`[data-field="${field}"]`);
    el.classList.toggle('ok', ok);
    el.classList.toggle('bad', !ok);
    el.querySelector('.mark').textContent = ok ? '✅' : '❌';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { fav, total } = counts(state.levels[state.index]);
    const results = {
      fraction: checkFraction(num('fnum'), num('fden'), fav, total),
      simplified: checkSimplified(num('snum'), num('sden'), fav, total),
      percent: checkPercent(num('pct'), fav, total),
    };
    Object.entries(results).forEach(([k, ok]) => mark(k, ok));

    const allOk = Object.values(results).every(Boolean);
    if (allOk) {
      state.solved.add(state.index);
      $('feedback').textContent = '🎉 ¡Excelente! Todo está correcto.';
      $('feedback').style.color = 'var(--ok)';
      $('next').hidden = false;
      renderNav();
      celebrate();
    } else {
      $('feedback').textContent = 'Casi... revisa las casillas con ❌. ¡Tú puedes!';
      $('feedback').style.color = 'var(--bad)';
    }
  });

  $('hint').addEventListener('click', () => {
    const level = state.levels[state.index];
    const { fav, total } = counts(level);
    const [n, d] = simplify(fav, total);
    const hints = [
      `Cuenta todos los objetos: ese número va abajo (denominador).`,
      `Ahora cuenta solo los de "${level.target}": ese número va arriba (numerador).`,
      n === fav
        ? `Para simplificar busca un número que divida arriba y abajo... ¡aquí no hay! Ya está simplificada.`
        : `Para simplificar divide arriba y abajo entre ${fav / n}.`,
      `Porcentaje: divide el numerador entre el denominador y multiplica por 100. Ej: ${n} ÷ ${d} × 100.`,
    ];
    $('feedback').textContent = '💡 ' + hints[state.hints % hints.length];
    $('feedback').style.color = 'var(--ink)';
    state.hints++;
  });

  $('next').addEventListener('click', () => {
    const next = state.levels.findIndex((_, i) => !state.solved.has(i) && i > state.index);
    const firstOpen = state.levels.findIndex((_, i) => !state.solved.has(i));
    if (next !== -1) go(next);
    else if (firstOpen !== -1) go(firstOpen);
    else finish();
  });

  // ---------- Random draw (experimental probability) ----------

  $('draw').addEventListener('click', () => {
    const pick = Math.floor(Math.random() * state.bag.length);
    const el = $('items').children[pick];
    el.classList.remove('picked');
    void el.offsetWidth; // restart the animation
    el.classList.add('picked');

    state.draws.total++;
    if (state.bag[pick].target) state.draws.hits++;
    const { total, hits } = state.draws;
    const target = state.levels[state.index].target;
    $('draws').textContent = `Sacaste "${target}" ${hits} de ${total} veces (${Math.round((hits / total) * 100)}%).`;
  });

  // ---------- End & extras ----------

  function finish() {
    $('card').hidden = true;
    $('done').hidden = false;
    celebrate(120);
  }

  $('random').addEventListener('click', () => {
    state.levels.push(randomLevel());
    go(state.levels.length - 1);
  });

  $('restart').addEventListener('click', () => {
    state.levels = LEVELS.slice();
    state.solved.clear();
    go(0);
  });

  function celebrate(amount = 60) {
    const box = $('confetti');
    const colors = ['#ff5c8a', '#ffd60a', '#3ccf6e', '#29b6f6', '#7c4dff', '#ff9f1c'];
    for (let i = 0; i < amount; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 1.5 + Math.random() * 1.5 + 's';
      p.style.animationDelay = Math.random() * 0.4 + 's';
      box.appendChild(p);
      setTimeout(() => p.remove(), 3500);
    }
  }

  go(0);
})();

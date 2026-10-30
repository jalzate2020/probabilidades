(function () {
  const { generateRound } = window.Reto;
  const $ = (id) => document.getElementById(id);

  const POINTS = 100;
  const state = { round: [], index: 0, score: 0, results: [], muted: false, wheelTurn: 0 };

  // ---------- Sound (tiny WebAudio beeps, no files) ----------

  let audio;
  function beep(notes) {
    if (state.muted) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      notes.forEach(([freq, start, dur]) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, audio.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + start + dur);
        osc.connect(gain).connect(audio.destination);
        osc.start(audio.currentTime + start);
        osc.stop(audio.currentTime + start + dur);
      });
    } catch (_) { /* sound is optional */ }
  }
  const sounds = {
    right: () => beep([[523, 0, 0.15], [659, 0.12, 0.15], [784, 0.24, 0.3]]),
    wrong: () => beep([[220, 0, 0.25], [180, 0.2, 0.35]]),
    tick: () => beep([[880, 0, 0.05]]),
    win: () => beep([[523, 0, 0.2], [659, 0.15, 0.2], [784, 0.3, 0.2], [1047, 0.45, 0.5]]),
  };

  // ---------- Small render helpers ----------

  function fractionHTML([n, d]) {
    if (n === 0) return '0';
    if (n === d) return '1';
    return `<span class="frac"><b>${n}</b><b>${d}</b></span>`;
  }

  function optionHTML(q, opt) {
    if (q.type === 'wheel' || q.type === 'dice') return fractionHTML(opt);
    if (q.type === 'percent') return `${opt}%`;
    return opt;
  }

  const marbles = (bag) => bag.map((b) => `<span class="marble" style="background:${b.color}"></span>`).join('');
  const candySVG = (c) => `<svg class="candy" viewBox="0 0 48 40"><polygon points="2,8 14,20 2,32" fill="${c}"/><polygon points="46,8 34,20 46,32" fill="${c}"/><ellipse cx="24" cy="20" rx="12" ry="10" fill="${c}"/><path d="M18 14 Q24 20 18 26" stroke="#fff" stroke-width="2.5" fill="none" opacity=".6"/></svg>`;

  function wheelSVG(sectors) {
    const n = sectors.length;
    const r = 100;
    const point = (i) => {
      const a = (i / n) * 2 * Math.PI - Math.PI / 2;
      return `${110 + r * Math.cos(a)},${110 + r * Math.sin(a)}`;
    };
    const slices = sectors
      .map((s, i) => `<path d="M110,110 L${point(i)} A${r},${r} 0 0,1 ${point(i + 1)} Z" fill="${s.color}" stroke="#fff" stroke-width="4"/>`)
      .join('');
    return `<svg viewBox="0 0 220 220" id="wheel"><circle cx="110" cy="110" r="106" fill="#241640"/>${slices}<circle cx="110" cy="110" r="14" fill="#fff" stroke="#241640" stroke-width="4"/></svg>`;
  }

  const PIPS = {
    1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 25], [72, 25], [28, 50], [72, 50], [28, 75], [72, 75]],
  };
  const dieSVG = (face) =>
    `<svg class="die" id="die" viewBox="0 0 100 100"><rect x="4" y="4" width="92" height="92" rx="18" fill="#fff" stroke="#241640" stroke-width="5"/>${PIPS[face].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="#ff4d6d"/>`).join('')}</svg>`;

  // ---------- Scenes: each has a playful action to try the experiment ----------

  const SCENES = {
    wheel(q, scene) {
      state.wheelTurn = 0;
      scene.innerHTML = `<div class="wheel-wrap"><div class="pointer"></div>${wheelSVG(q.sectors)}</div>
        <button class="btn btn-small" type="button" data-act>🎡 Girar</button><p class="scene-note"></p>`;
      return (note) => {
        const n = q.sectors.length;
        const i = Math.floor(Math.random() * n);
        const sector = 360 / n;
        const target = 360 - (i + 0.5) * sector;
        const current = state.wheelTurn % 360;
        state.wheelTurn += 1440 + ((target - current + 360) % 360);
        $('wheel').style.transform = `rotate(${state.wheelTurn}deg)`;
        note.textContent = 'Girando...';
        setTimeout(() => {
          note.textContent = q.sectors[i].target ? `¡Cayó en ${q.highlight.text}! 🎉` : `No cayó en ${q.highlight.text}.`;
          sounds.tick();
        }, 3000);
      };
    },
    dice(q, scene) {
      scene.innerHTML = `${dieSVG(5)}<button class="btn btn-small" type="button" data-act>🎲 Lanzar</button><p class="scene-note"></p>`;
      return (note) => {
        const face = 1 + Math.floor(Math.random() * 6);
        const die = $('die');
        die.classList.remove('roll');
        void die.getBoundingClientRect(); // restart animation
        die.classList.add('roll');
        setTimeout(() => {
          if (!die.isConnected) return; // player already moved to another question
          die.outerHTML = dieSVG(face);
          note.textContent = `Salió ${face}: ${q.event(face) ? '¡sí cumple! 🎉' : 'no cumple.'}`;
          sounds.tick();
        }, 800);
      };
    },
    words(q, scene) {
      scene.innerHTML = `<div class="bags"><div class="bag">${marbles(q.bag)}</div></div>
        <button class="btn btn-small" type="button" data-act>✋ Sacar una</button><p class="scene-note"></p>`;
      return drawFrom(q.bag, scene, '.marble');
    },
    percent(q, scene) {
      scene.innerHTML = `<div class="bags"><div class="bag">${q.bag.map((b) => candySVG(b.color)).join('')}</div></div>
        <button class="btn btn-small" type="button" data-act>✋ Sacar uno</button><p class="scene-note"></p>`;
      return drawFrom(q.bag, scene, '.candy');
    },
    compare(q, scene) {
      scene.innerHTML = `<div class="bags compare">
        <div class="bag"><span class="bag-label">A</span>${marbles(q.bagA)}</div>
        <div class="bag"><span class="bag-label">B</span>${marbles(q.bagB)}</div></div>`;
      return null;
    },
  };

  function drawFrom(bag, scene, selector) {
    let hits = 0, total = 0;
    return (note) => {
      const i = Math.floor(Math.random() * bag.length);
      const el = scene.querySelectorAll(selector)[i];
      el.classList.remove('picked');
      void el.getBoundingClientRect();
      el.classList.add('picked');
      total++;
      if (bag[i].target) hits++;
      note.textContent = `${bag[i].target ? '¡Salió! 🎉' : 'No salió.'} Llevas ${hits} de ${total}.`;
      sounds.tick();
    };
  }

  // ---------- Game flow ----------

  function show(id) {
    ['start', 'quiz', 'end'].forEach((s) => ($(s).hidden = s !== id));
  }

  function renderProgress() {
    $('progress').innerHTML = Array.from({ length: 5 }, (_, i) => {
      const cls = state.results[i] === true ? 'ok' : state.results[i] === false ? 'bad' : i === state.index ? 'now' : '';
      return `<span class="dot ${cls}"></span>`;
    }).join('');
    $('score').textContent = state.score;
  }

  function startGame() {
    state.round = generateRound();
    state.index = 0;
    state.score = 0;
    state.results = [];
    show('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.round[state.index];
    $('qnum').textContent = `Pregunta ${state.index + 1} de 5`;
    $('prompt').innerHTML = q.prompt.replace(q.highlight.text, `<mark style="color:${q.highlight.color}">${q.highlight.text}</mark>`);

    const scene = $('scene');
    const act = SCENES[q.type](q, scene);
    const button = scene.querySelector('[data-act]');
    if (act && button) button.addEventListener('click', () => act(scene.querySelector('.scene-note')));

    const options = $('options');
    options.innerHTML = q.options.map((o, i) => `<button class="option" type="button" data-i="${i}">${optionHTML(q, o)}</button>`).join('');
    options.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => answer(Number(b.dataset.i))));

    $('explain').hidden = true;
    $('next').hidden = true;
    $('quiz').classList.remove('screen');
    void $('quiz').offsetWidth;
    $('quiz').classList.add('screen');
    renderProgress();
  }

  function answer(choice) {
    const q = state.round[state.index];
    const ok = choice === q.answer;
    const buttons = $('options').querySelectorAll('.option');
    buttons.forEach((b) => (b.disabled = true));
    buttons[q.answer].classList.add('right');
    if (!ok) buttons[choice].classList.add('wrong');

    state.results[state.index] = ok;
    if (ok) {
      state.score += POINTS;
      $('score').parentElement.classList.remove('bump');
      void $('score').offsetWidth;
      $('score').parentElement.classList.add('bump');
      sounds.right();
      celebrate(40);
    } else {
      sounds.wrong();
    }

    const explain = $('explain');
    explain.className = `explain ${ok ? 'ok' : 'bad'}`;
    explain.textContent = `${ok ? '✅ ¡Correcto! ' : '❌ ¡Uy! '}${q.explain}`;
    explain.hidden = false;
    $('next').textContent = state.index === 4 ? 'Ver resultado 🏁' : 'Siguiente ➜';
    $('next').hidden = false;
    renderProgress();
  }

  function next() {
    if (state.index < 4) {
      state.index++;
      renderQuestion();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      finish();
    }
  }

  function finish() {
    const right = state.results.filter(Boolean).length;
    const stars = right === 5 ? 3 : right >= 3 ? 2 : right >= 1 ? 1 : 0;
    $('stars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? '' : 'off'}" style="animation-delay:${i * 0.25}s">⭐</span>`).join('');
    $('endTitle').textContent = ['¡Sigue practicando!', '¡Buen intento!', '¡Muy bien!', '¡Eres experta en probabilidad!'][stars];
    $('endText').textContent = `Acertaste ${right} de 5 preguntas y ganaste ${state.score} puntos.`;
    state.index = 5;
    renderProgress();
    show('end');
    if (stars >= 2) { sounds.win(); celebrate(140); }
  }

  function celebrate(amount) {
    const box = $('confetti');
    const colors = ['#ff4d6d', '#ffbe0b', '#38d39f', '#3a86ff', '#9d4edd', '#ff8c42'];
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

  $('play').addEventListener('click', startGame);
  $('again').addEventListener('click', startGame);
  $('next').addEventListener('click', next);
  $('sound').addEventListener('click', () => {
    state.muted = !state.muted;
    $('sound').textContent = state.muted ? '🔇' : '🔊';
  });

  renderProgress();
})();

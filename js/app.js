import { CHALLENGES, FAMILY_COLORS, buildDeck } from './challenges.js';
import { createChallengeSeed, decodeChallenge, encodeChallenge, seededRandom } from './challenge-mode.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 0) => Number(value.toFixed(digits));
const accuracy = (error, tolerance) => clamp(100 * Math.exp(-((error / tolerance) ** 2)), 0, 100);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mean = (items) => items.length ? items.reduce((sum, value) => sum + value, 0) / items.length : 0;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const challengeCatalog = new Map(CHALLENGES.map((challenge) => [challenge.id, challenge]));
const pageParams = new URLSearchParams(window.location.search);
const qaLevelId = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? pageParams.get('qa-level')
  : null;
const qaCountdown = Boolean(qaLevelId && pageParams.has('qa-countdown'));
['count-7', 'count-11', 'count-14-fast', 'count-9-fakes', 'count-16-fakes']
  .forEach((legacyId) => challengeCatalog.set(legacyId, challengeCatalog.get('count-unknown')));

const screens = $$('.screen');
const homeScreen = $('#home-screen');
const gameScreen = $('#game-screen');
const resultScreen = $('#result-screen');
const stage = $('#challenge-stage');
const controls = $('#challenge-controls');
const feedbackLayer = $('#feedback-layer');
const howDialog = $('#how-dialog');
const compareDialog = $('#compare-dialog');
const trainingDialog = $('#training-dialog');
const trainingSearch = $('#training-search');
let trainingFamily = 'Tutte';

function syncViewportHeight() {
  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
  document.documentElement.style.setProperty('--viewport-offset-top', `${Math.round(viewport?.offsetTop || 0)}px`);
}

syncViewportHeight();
window.addEventListener('resize', syncViewportHeight, { passive: true });
window.addEventListener('orientationchange', syncViewportHeight, { passive: true });
window.visualViewport?.addEventListener('resize', syncViewportHeight, { passive: true });
window.visualViewport?.addEventListener('scroll', syncViewportHeight, { passive: true });

const storedBest = Number(localStorage.getItem('quasi-best')) || 0;
const storedSound = localStorage.getItem('quasi-sound');

function storedList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

const state = {
  deck: [],
  round: 0,
  results: [],
  best: storedBest,
  sound: storedSound !== 'off',
  cleanup: [],
  locked: false,
  mode: 'solo',
  challengeSeed: '',
  opponentScore: null,
  startAt: null,
  randomSource: Math.random,
};

const random = () => state.randomSource();

$('#header-best').textContent = storedBest ? `${storedBest}` : '—';
$('#sound-toggle').setAttribute('aria-pressed', String(state.sound));

const decodedChallenge = decodeChallenge(
  pageParams.get('challenge') || '',
  new Set(challengeCatalog.keys()),
);
const incomingChallenge = decodedChallenge
  && new Set(decodedChallenge.deck.map((id) => challengeCatalog.get(id).kind)).size === 10
  ? decodedChallenge
  : null;

if (incomingChallenge) {
  $('#challenge-invite').hidden = false;
  const storedLiveResult = localStorage.getItem(`quasi-live-result:${incomingChallenge.seed}`);
  if (storedLiveResult !== null) {
    const savedScore = Number(storedLiveResult);
    if (incomingChallenge.score !== null) {
      $('#challenge-invite > span').textContent = 'CONFRONTO';
      $('.challenge-invite strong').innerHTML = `<b>${savedScore}</b> TU · <b>${incomingChallenge.score}</b> AMICO`;
      $('.challenge-invite small').textContent = savedScore > incomingChallenge.score ? 'Hai vinto la sfida!' : savedScore < incomingChallenge.score ? 'Questa volta ha vinto il tuo amico.' : 'Parità perfetta.';
      $('#challenge-button span').textContent = 'GIOCA LA RIVINCITA';
    } else updateHomeAfterLiveGame(savedScore);
  } else if (incomingChallenge.score === null && incomingChallenge.startAt) {
    $('#challenge-invite > span').textContent = 'SFIDA LIVE';
    $('.challenge-invite strong').innerHTML = '<b id="live-home-clock">--:--</b> ALLA PARTENZA';
    $('.challenge-invite small').textContent = 'Entra ora: la partita inizierà per tutti allo stesso istante.';
    $('#challenge-button span').textContent = 'ENTRA NELLA LOBBY';
    const updateHomeClock = () => {
      const clock = $('#live-home-clock');
      if (clock) clock.textContent = formatClock(Math.max(0, incomingChallenge.startAt - Date.now()));
    };
    updateHomeClock();
    setInterval(updateHomeClock, 500);
  } else {
    $('#opponent-score').textContent = incomingChallenge.score;
    $('#challenge-button span').textContent = 'ACCETTA LA SFIDA';
  }
  $('#challenge-button').classList.add('has-invite');
}

function formatClock(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateHomeAfterLiveGame(score) {
  $('#challenge-invite').hidden = false;
  $('#challenge-invite > span').textContent = 'SFIDA FINITA';
  $('.challenge-invite strong').innerHTML = `<b>${score}</b>/100 IL TUO RISULTATO`;
  $('.challenge-invite small').textContent = 'Condividi il risultato oppure crea una nuova sfida.';
  $('#challenge-button span').textContent = 'NUOVA SFIDA LIVE';
  $('#challenge-button').classList.add('has-invite');
}

function showScreen(screen) {
  screens.forEach((item) => item.classList.toggle('is-active', item === screen));
  document.body.classList.toggle('is-playing', screen === gameScreen);
  syncViewportHeight();
  window.scrollTo({ top: 0, behavior: screen === gameScreen ? 'auto' : 'smooth' });
  $('#app').focus({ preventScroll: true });
}

function registerCleanup(fn) { state.cleanup.push(fn); }
function clearChallenge() {
  state.cleanup.splice(0).forEach((fn) => {
    try { fn(); } catch { /* A finished animation may already be gone. */ }
  });
  stage.replaceChildren();
  controls.replaceChildren();
  $('#keyboard-hint').textContent = '';
}

let audioContext;
function tone(frequency = 440, duration = 0.07, type = 'sine') {
  if (!state.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.055, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch { /* Sound remains an optional enhancement. */ }
}

function blockGameSpaceScroll(event) {
  if (!document.body.classList.contains('is-playing')) return;
  if (event.code !== 'Space' && event.key !== ' ') return;

  // Focused challenge and feedback buttons keep their native keyboard action.
  // Everywhere else Space belongs exclusively to the active challenge.
  const isGameButton = event.target instanceof Element
    && event.target.closest('.challenge-card button, .feedback-layer button');
  if (isGameButton) return;
  event.preventDefault();
}

window.addEventListener('keydown', blockGameSpaceScroll, { capture: true });
window.addEventListener('keyup', blockGameSpaceScroll, { capture: true });

function addKeyHandler(keys, handler) {
  const listener = (event) => {
    if (keys.includes(event.code) && !event.repeat && feedbackLayer.hidden) {
      event.preventDefault();
      handler(event);
    }
  };
  window.addEventListener('keydown', listener);
  registerCleanup(() => window.removeEventListener('keydown', listener));
}

function addKeyHoldHandler(code, onPress, onRelease) {
  let pressed = false;
  const keyDown = (event) => {
    if (event.code !== code || event.repeat || !feedbackLayer.hidden) return;
    event.preventDefault();
    pressed = true;
    onPress(event);
  };
  const keyUp = (event) => {
    if (event.code !== code || !pressed) return;
    event.preventDefault();
    pressed = false;
    onRelease(event);
  };
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  registerCleanup(() => {
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
  });
}

function makeButton(label, className = 'confirm-button') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

function makeCanvas(height = 330, width = 900) {
  const canvas = document.createElement('canvas');
  canvas.className = 'game-canvas';
  canvas.width = width;
  canvas.height = height;
  canvas.style.setProperty('--canvas-ratio', `${canvas.width} / ${canvas.height}`);
  canvas.setAttribute('aria-label', 'Area interattiva della sfida');
  stage.append(canvas);
  const pointFromEvent = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
    };
  };
  return { canvas, ctx: canvas.getContext('2d'), pointFromEvent };
}

function challengeResult(score, detail) {
  if (state.locked) return;
  state.locked = true;
  const finalScore = clamp(Math.round(score), 0, 100);
  state.results.push({ challenge: state.deck[state.round], score: finalScore, detail });
  tone(finalScore >= 90 ? 740 : finalScore >= 70 ? 520 : 260, 0.13, 'triangle');
  $('#feedback-score').textContent = finalScore;
  $('#feedback-title').textContent = scoreMessage(finalScore);
  $('#feedback-detail').textContent = detail;
  if (state.mode === 'training') {
    const bestKey = `quasi-training-best:${state.deck[0].id}`;
    const storedTrainingBest = localStorage.getItem(bestKey);
    if (storedTrainingBest === null || finalScore > Number(storedTrainingBest)) {
      localStorage.setItem(bestKey, String(finalScore));
    }
    $('#next-button span').textContent = 'RIPROVA IL LIVELLO';
    $('#training-back-button').hidden = false;
  } else {
    $('#next-button span').textContent = state.round === 9 ? 'VEDI IL RISULTATO' : 'PROSSIMA SFIDA';
    $('#training-back-button').hidden = true;
  }
  feedbackLayer.hidden = false;
  $('#next-button').focus();
}

function scoreMessage(score) {
  if (score >= 99) return 'PRATICAMENTE PERFETTO!';
  if (score >= 93) return 'QUASI PERFETTO!';
  if (score >= 82) return 'MANO FERMISSIMA!';
  if (score >= 68) return 'CI SEI QUASI!';
  if (score >= 45) return 'UN ALTRO MILLIMETRO…';
  return 'IL CAOS HA VINTO.';
}

function startGame({ mode = 'solo', deck = null, opponentScore = null, seed = null, startAt = null } = {}) {
  clearChallenge();
  const recentKinds = storedList('quasi-recent-kinds');
  const recentIds = storedList('quasi-recent-levels');
  state.deck = deck ? [...deck] : buildDeck(10, { excludedKinds: recentKinds, excludedIds: recentIds });
  state.mode = mode;
  state.opponentScore = opponentScore;
  state.challengeSeed = seed || createChallengeSeed();
  state.startAt = startAt;
  if (mode !== 'training') {
    localStorage.setItem('quasi-recent-kinds', JSON.stringify(state.deck.map((challenge) => challenge.kind)));
    const updatedRecentIds = [...state.deck.map((challenge) => challenge.id), ...recentIds]
      .filter((id, index, items) => items.indexOf(id) === index)
      .slice(0, 80);
    localStorage.setItem('quasi-recent-levels', JSON.stringify(updatedRecentIds));
  }
  state.results = [];
  state.round = 0;
  state.locked = false;
  howDialog.close();
  if (trainingDialog.open) trainingDialog.close();
  showScreen(gameScreen);
  renderChallenge();
}

function renderChallenge() {
  clearChallenge();
  state.locked = false;
  const challenge = state.deck[state.round];
  state.randomSource = seededRandom(`${state.challengeSeed}:${state.round}:${challenge.id}`);
  const isTraining = state.mode === 'training';
  $('#round-context').textContent = isTraining ? 'ALLENAMENTO' : 'SFIDA';
  $('#round-number').textContent = isTraining ? '' : state.round + 1;
  $('#round-total').textContent = isTraining ? ' · LIVELLO SINGOLO' : ' / 10';
  $('#progress-fill').style.width = isTraining ? '100%' : `${(state.round + 1) * 10}%`;
  $('#running-label').textContent = isTraining ? 'RECORD' : 'MEDIA';
  $('#running-score').textContent = isTraining
    ? localStorage.getItem(`quasi-training-best:${challenge.id}`) || '—'
    : state.results.length ? Math.round(mean(state.results.map((item) => item.score))) : '—';
  $('#challenge-category').textContent = challenge.family;
  $('#challenge-title').textContent = challenge.name;
  $('#challenge-instruction').textContent = challenge.instruction;
  const challengeCard = $('.challenge-card');
  challengeCard.style.setProperty('--challenge-color', FAMILY_COLORS[challenge.family]);
  challengeCard.dataset.challengeId = challenge.id;
  challengeCard.dataset.kind = challenge.kind;
  challengeCard.dataset.variant = challenge.config.mode || challenge.config.shape || challenge.config.path || '';

  const renderer = renderers[challenge.kind];
  if (!renderer) {
    challengeResult(0, 'Questa prova non è disponibile.');
    return;
  }
  const beginChallenge = () => {
    if (startsAutomatically(challenge) && (!qaLevelId || qaCountdown)) renderStartCountdown(() => renderer(challenge.config));
    else renderer(challenge.config);
  };
  if (state.round === 0 && state.startAt && state.startAt > Date.now()) renderLiveWaiting(beginChallenge);
  else beginChallenge();
}

function renderLiveWaiting(onReady) {
  const waiting = document.createElement('div');
  waiting.className = 'start-countdown live-start';
  waiting.innerHTML = `
    <div class="countdown-panel">
      <div class="countdown-copy">
        <span>SFIDA LIVE</span>
        <h3>INSIEME.</h3>
        <p>Tieni aperta questa pagina. La partita partirà automaticamente.</p>
      </div>
      <div class="countdown-number-box">
        <strong class="live-clock">${formatClock(state.startAt - Date.now())}</strong>
        <small>ALLA PARTENZA</small>
      </div>
      <div class="live-pulse" aria-hidden="true"><i></i></div>
    </div>
  `;
  stage.append(waiting);
  const interval = setInterval(() => {
    const remaining = state.startAt - Date.now();
    if (remaining > 0) {
      $('.live-clock', waiting).textContent = formatClock(remaining);
      return;
    }
    clearInterval(interval);
    stage.replaceChildren();
    controls.replaceChildren();
    tone(680, .1, 'triangle');
    onReady();
  }, 100);
  registerCleanup(() => clearInterval(interval));
}

function startsAutomatically(challenge) {
  if (['sweep', 'predictBeat', 'reaction', 'memory', 'countFlash'].includes(challenge.kind)) return true;
  if (challenge.kind === 'rhythm' && challenge.config.demo) return true;
  if (challenge.kind === 'center' && challenge.config.shape === 'hidden') return true;
  return challenge.kind === 'measure' && challenge.config.mode === 'memory';
}

function renderStartCountdown(onReady) {
  const countdown = document.createElement('div');
  countdown.className = 'start-countdown';
  countdown.innerHTML = `
    <div class="countdown-panel">
      <div class="countdown-copy">
        <span>SI PARTE TRA</span>
        <h3>LEGGI BENE.</h3>
        <p>Poi cerca di essere preciso.</p>
      </div>
      <div class="countdown-number-box">
        <strong class="countdown-number">5</strong>
        <small>SECONDI</small>
      </div>
      <div class="countdown-steps" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    </div>
  `;
  stage.append(countdown);
  const hint = document.createElement('p');
  hint.className = 'countdown-hint';
  hint.textContent = 'La prova partirà automaticamente';
  controls.append(hint);
  let remaining = 5;
  const interval = setInterval(() => {
    remaining -= 1;
    if (remaining > 0) {
      const number = $('.countdown-number', countdown);
      number.textContent = remaining;
      number.classList.remove('is-ticking');
      void number.offsetWidth;
      number.classList.add('is-ticking');
      $$('.countdown-steps i', countdown).forEach((step, index) => step.classList.toggle('is-done', index < 5 - remaining));
      tone(310 + (5 - remaining) * 55, .045, 'triangle');
      return;
    }
    clearInterval(interval);
    stage.replaceChildren();
    controls.replaceChildren();
    tone(680, .08, 'triangle');
    onReady();
  }, 1000);
  registerCleanup(() => clearInterval(interval));
}

function finishGame() {
  clearChallenge();
  const finalScore = Math.round(mean(state.results.map((item) => item.score)));
  if (finalScore > state.best) {
    state.best = finalScore;
    localStorage.setItem('quasi-best', String(finalScore));
    $('#header-best').textContent = String(finalScore);
  }
  const { grade, label } = getGrade(finalScore);
  $('#compare-button').hidden = true;
  if (state.mode.startsWith('challenge-live')) {
    localStorage.setItem(`quasi-live-result:${state.challengeSeed}`, String(finalScore));
    updateHomeAfterLiveGame(finalScore);
    $('#result-title').innerHTML = 'SFIDA<br><em>COMPLETATA.</em>';
    $('#result-summary').textContent = `${finalScore}/100 · Grado ${grade}. Condividi il risultato per confrontarlo con gli amici.`;
    $('#share-button span').textContent = 'CONDIVIDI RISULTATO';
    $('#compare-button').hidden = false;
  } else if (state.mode === 'challenge-guest') {
    const difference = finalScore - state.opponentScore;
    if (difference > 0) {
      $('#result-title').innerHTML = `SFIDA VINTA.<br><em>+${difference} PUNTI.</em>`;
      $('#result-summary').textContent = `${finalScore}/100 contro ${state.opponentScore}/100. Sei stato più preciso!`;
    } else if (difference < 0) {
      $('#result-title').innerHTML = `SFIDA PERSA.<br><em>${difference} PUNTI.</em>`;
      $('#result-summary').textContent = `${finalScore}/100 contro ${state.opponentScore}/100. Ci sei andato vicino.`;
    } else {
      $('#result-title').innerHTML = 'PARITÀ<br><em>PERFETTA.</em>';
      $('#result-summary').textContent = `Entrambi avete totalizzato ${finalScore}/100. Serve una rivincita.`;
    }
    $('#share-button span').textContent = 'LANCIA LA RIVINCITA';
  } else if (state.mode === 'challenge-host') {
    $('#result-title').innerHTML = 'PUNTEGGIO<br><em>DA BATTERE.</em>';
    $('#result-summary').textContent = `${finalScore}/100 · Grado ${grade}. Ora manda la sfida a un amico.`;
    $('#share-button span').textContent = 'SFIDA UN AMICO';
  } else {
    $('#result-title').innerHTML = finalScore >= 88 ? 'CI SEI ANDATO<br><em>MOLTO VICINO.</em>' : 'QUASI.<br><em>MA NON ABBASTANZA.</em>';
    $('#result-summary').textContent = `${finalScore}/100 · Grado ${grade}. ${label}`;
    $('#share-button span').textContent = 'CONDIVIDI RISULTATO';
  }
  drawResultCard(finalScore, grade);
  showScreen(resultScreen);
}

function getGrade(score) {
  if (score >= 98) return { grade: 'S+', label: 'Praticamente impossibile.' };
  if (score >= 94) return { grade: 'S', label: 'Precisione assoluta.' };
  if (score >= 88) return { grade: 'A', label: 'Quasi perfetto!' };
  if (score >= 80) return { grade: 'B', label: 'Mano fermissima.' };
  if (score >= 70) return { grade: 'C', label: 'Ci sei quasi.' };
  if (score >= 60) return { grade: 'D', label: 'Serve un altro giro.' };
  return { grade: 'E', label: 'Caos controllato.' };
}

const renderers = {
  timer: renderTimer,
  sweep: renderSweep,
  hold: renderHold,
  rhythm: renderRhythm,
  predictBeat: renderPredictBeat,
  draw: renderDraw,
  split: renderSplit,
  center: renderCenter,
  measure: renderMeasure,
  angle: renderAngle,
  percent: renderPercent,
  trace: renderTrace,
  steady: renderSteady,
  reaction: renderReaction,
  memory: renderMemory,
  precision: renderPrecision,
  symmetry: renderSymmetry,
  balance: renderBalance,
  colorMatch: renderColorMatch,
  countFlash: renderCountFlash,
};

function renderTimer(config) {
  const target = document.createElement('span');
  target.className = 'timer-target';
  target.textContent = `TARGET ${config.target.toFixed(3)} s`;
  const display = document.createElement('div');
  display.className = 'timer-display';
  display.innerHTML = '0.000<small>s</small>';
  stage.append(target, display);
  const button = makeButton('AVVIA', 'big-action');
  controls.append(button);
  $('#keyboard-hint').textContent = 'SPAZIO per avviare e fermare';
  let started = false;
  let startTime = 0;
  let raf = 0;

  const tick = (now) => {
    const elapsed = (now - startTime) / 1000;
    display.innerHTML = `${elapsed.toFixed(3)}<small>s</small>`;
    if (!config.visible && elapsed >= 1) display.classList.add('is-blind');
    if (elapsed > config.target + 4) stopTimer();
    else raf = requestAnimationFrame(tick);
  };
  const stopTimer = () => {
    if (!started || state.locked) return;
    cancelAnimationFrame(raf);
    const elapsed = (performance.now() - startTime) / 1000;
    display.classList.remove('is-blind');
    display.innerHTML = `${elapsed.toFixed(3)}<small>s</small>`;
    button.disabled = true;
    const error = Math.abs(elapsed - config.target);
    challengeResult(accuracy(error, config.target * 0.105), `Scarto: ${error.toFixed(3)} secondi.`);
  };
  const action = () => {
    if (!started) {
      started = true;
      startTime = performance.now();
      button.textContent = 'STOP!';
      tone(420);
      raf = requestAnimationFrame(tick);
    } else stopTimer();
  };
  button.addEventListener('click', action);
  addKeyHandler(['Space'], action);
  registerCleanup(() => cancelAnimationFrame(raf));
}

function renderSweep(config) {
  const { canvas, ctx } = makeCanvas();
  const button = makeButton('FERMA LA LANCETTA', 'big-action');
  controls.append(button);
  $('#keyboard-hint').textContent = 'SPAZIO per fermare';
  const start = performance.now();
  let position = 0;
  let raf;
  const draw = (now) => {
    const t = ((now - start) / 1000 * config.speed) % 2;
    position = t <= 1 ? t : 2 - t;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f5ead6';
    ctx.fillRect(70, 125, 760, 80);
    ctx.strokeStyle = '#171513'; ctx.lineWidth = 4; ctx.strokeRect(70, 125, 760, 80);
    ctx.fillStyle = 'rgba(38,201,167,.45)'; ctx.fillRect(410, 125, 80, 80);
    ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.moveTo(450, 92); ctx.lineTo(450, 236); ctx.stroke(); ctx.setLineDash([]);
    const x = 70 + position * 760;
    ctx.fillStyle = '#ff5b3d'; ctx.beginPath(); ctx.arc(x, 165, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = '900 22px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#171513'; ctx.fillText('ZERO', 450, 72);
    raf = requestAnimationFrame(draw);
  };
  const stop = () => {
    if (state.locked) return;
    cancelAnimationFrame(raf);
    button.disabled = true;
    const error = Math.abs(position - 0.5);
    challengeResult(accuracy(error, 0.11), `Distanza dal centro: ${(error * 100).toFixed(1)}%.`);
  };
  button.addEventListener('click', stop);
  addKeyHandler(['Space'], stop);
  raf = requestAnimationFrame(draw);
  registerCleanup(() => cancelAnimationFrame(raf));
}

function renderHold(config) {
  const display = document.createElement('div');
  display.className = 'timer-display';
  display.innerHTML = '0.000<small>s</small>';
  stage.append(display);
  const button = makeButton('TIENI PREMUTO', 'big-action');
  controls.append(button);
  $('#keyboard-hint').textContent = 'Tieni premuto SPAZIO oppure il pulsante';
  let startTime = 0;
  let holding = false;
  let raf;
  const update = () => {
    const elapsed = (performance.now() - startTime) / 1000;
    display.innerHTML = `${elapsed.toFixed(3)}<small>s</small>`;
    if (elapsed > config.target + 3) release();
    else raf = requestAnimationFrame(update);
  };
  const press = (event) => {
    event?.preventDefault();
    if (holding || state.locked) return;
    holding = true; startTime = performance.now(); button.textContent = 'ORA RILASCIA…';
    if (event?.pointerId !== undefined) button.setPointerCapture?.(event.pointerId);
    tone(390); raf = requestAnimationFrame(update);
  };
  const release = () => {
    if (!holding || state.locked) return;
    holding = false; cancelAnimationFrame(raf); button.disabled = true;
    const elapsed = (performance.now() - startTime) / 1000;
    const error = Math.abs(elapsed - config.target);
    display.innerHTML = `${elapsed.toFixed(3)}<small>s</small>`;
    challengeResult(accuracy(error, config.target * 0.12), `Durata: ${elapsed.toFixed(3)} s · scarto ${error.toFixed(3)} s.`);
  };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  addKeyHoldHandler('Space', press, release);
  registerCleanup(() => cancelAnimationFrame(raf));
}

function renderRhythm(config) {
  const pad = makeButton(config.demo ? 'OSSERVA…' : 'BATTI', 'rhythm-pad');
  const dots = document.createElement('div');
  dots.className = 'rhythm-dots';
  dots.innerHTML = Array.from({ length: config.taps }, () => '<i></i>').join('');
  stage.append(pad, dots);
  $('#keyboard-hint').textContent = 'Tocca il disco o usa SPAZIO';
  let taps = [];
  let accepting = !config.demo;
  const hit = () => {
    if (!accepting || state.locked) return;
    taps.push(performance.now());
    tone(520); pad.classList.add('is-hit'); setTimeout(() => pad.classList.remove('is-hit'), 80);
    dots.children[taps.length - 1]?.classList.add('done');
    if (taps.length === config.taps) {
      accepting = false;
      const intervals = taps.slice(1).map((time, index) => time - taps[index]);
      const targets = config.intervals || Array(intervals.length).fill(config.interval);
      const errors = intervals.map((value, index) => Math.abs(value - targets[index]));
      const error = mean(errors);
      challengeResult(accuracy(error, 185), `Errore medio del ritmo: ${Math.round(error)} ms.`);
    }
  };
  pad.addEventListener('click', hit);
  addKeyHandler(['Space'], hit);
  if (config.demo) {
    pad.disabled = true;
    const demoTimes = [0, ...config.intervals].reduce((arr, value, index) => {
      arr.push(index ? arr[index - 1] + value : 500); return arr;
    }, []);
    demoTimes.forEach((time) => {
      const id = setTimeout(() => { tone(660); pad.classList.add('is-hit'); setTimeout(() => pad.classList.remove('is-hit'), 100); }, time);
      registerCleanup(() => clearTimeout(id));
    });
    const end = setTimeout(() => { pad.disabled = false; pad.textContent = 'RIPETI'; accepting = true; }, demoTimes.at(-1) + 600);
    registerCleanup(() => clearTimeout(end));
  }
}

function renderPredictBeat(config) {
  const pad = makeButton('ASCOLTA…', 'rhythm-pad');
  pad.disabled = true;
  stage.append(pad);
  let targetTime = 0;
  const base = performance.now() + 650;
  [0, 1, 2].forEach((index) => {
    const id = setTimeout(() => { tone(600); pad.classList.add('is-hit'); setTimeout(() => pad.classList.remove('is-hit'), 100); }, 650 + index * config.interval);
    registerCleanup(() => clearTimeout(id));
  });
  const ready = setTimeout(() => {
    pad.disabled = false; pad.textContent = 'QUARTO BATTITO';
    targetTime = base + config.interval * 3;
  }, 650 + config.interval * 2 + 180);
  registerCleanup(() => clearTimeout(ready));
  const hit = () => {
    if (!targetTime || state.locked) return;
    const error = Math.abs(performance.now() - targetTime);
    pad.disabled = true; tone(760);
    challengeResult(accuracy(error, 190), `Anticipo o ritardo: ${Math.round(error)} ms.`);
  };
  pad.addEventListener('click', hit);
  addKeyHandler(['Space'], hit);
}

function renderDraw(config) {
  // Il foglio è volutamente alto: cerchi, otto e spirali devono poter usare
  // quasi tutta l'area disponibile anche sugli schermi stretti.
  const { canvas, ctx, pointFromEvent } = makeCanvas(660, 660);
  const confirm = makeButton('DISEGNA PER VALUTARE');
  confirm.disabled = true;
  controls.append(confirm);
  const points = [];
  let drawing = false;
  const paperColor = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#fff7e9';

  const background = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(23,21,19,.18)'; ctx.lineWidth = 3; ctx.setLineDash([10, 12]);
    if (config.shape === 'line') {
      const [start, end] = drawLineGuide(canvas.width, canvas.height);
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = '#ff5b3d';
      [start, end].forEach((p) => { ctx.beginPath(); ctx.arc(p.x,p.y,11,0,Math.PI*2); ctx.fill(); });
    } else if (config.shape === 'spiral') {
      ctx.beginPath();
      spiralPoints(canvas.width, canvas.height).forEach((p, index) => index ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y)); ctx.stroke();
    }
    ctx.setLineDash([]);
  };
  const redraw = () => {
    background();
    if (points.length < 2) return;
    ctx.strokeStyle = '#7558ff'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    points.forEach((p, index) => index ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y)); ctx.stroke();
  };
  background();
  canvas.addEventListener('pointerdown', (event) => { drawing = true; points.length = 0; points.push(pointFromEvent(event)); canvas.setPointerCapture(event.pointerId); redraw(); });
  canvas.addEventListener('pointermove', (event) => { if (!drawing) return; points.push(pointFromEvent(event)); redraw(); });
  const finishDrawing = () => { drawing = false; if (points.length > 8) { confirm.disabled = false; confirm.textContent = 'VALUTA IL DISEGNO'; } };
  canvas.addEventListener('pointerup', finishDrawing);
  canvas.addEventListener('pointercancel', () => { drawing = false; });
  confirm.addEventListener('click', () => evaluateDrawing(config.shape, points, canvas));
}

function evaluateDrawing(shape, points, canvas) {
  if (points.length < 8) return;
  const xs = points.map((p) => p.x); const ys = points.map((p) => p.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const width = maxX - minX; const height = maxY - minY;
  let score = 0; let detail = '';
  if (shape === 'circle') {
    const center = { x: mean(xs), y: mean(ys) };
    const radii = points.map((p) => distance(p, center));
    const variation = Math.sqrt(mean(radii.map((r) => (r - mean(radii)) ** 2))) / mean(radii);
    const closure = distance(points[0], points.at(-1)) / Math.max(width, height);
    score = accuracy(variation * .75 + closure * .25, .18);
    detail = `Irregolarità radiale: ${(variation * 100).toFixed(1)}%.`;
  } else if (shape === 'square') {
    const edgeErrors = points.map((p) => Math.min(p.x-minX, maxX-p.x, p.y-minY, maxY-p.y));
    const edgeError = mean(edgeErrors) / Math.max(width, height);
    const aspectError = Math.abs(width - height) / Math.max(width, height);
    const closure = distance(points[0], points.at(-1)) / Math.max(width, height);
    const combined = edgeError * .5 + aspectError * .3 + closure * .2;
    score = accuracy(combined, .17); detail = `Differenza fra i lati: ${(aspectError * 100).toFixed(1)}%.`;
  } else if (shape === 'line') {
    const [a, b] = drawLineGuide(canvas.width, canvas.height);
    const deviations = points.map((p) => pointToSegment(p, a, b));
    const ends = (distance(points[0], a) + distance(points.at(-1), b)) / 2;
    const error = mean(deviations) * .72 + ends * .28;
    score = accuracy(error, canvas.width * .047); detail = `Deviazione media: ${mean(deviations).toFixed(1)} px.`;
  } else if (shape === 'spiral') {
    const guide = spiralPoints(canvas.width, canvas.height);
    const deviations = points.map((p) => Math.min(...guide.filter((_, i) => i % 3 === 0).map((g) => distance(p,g))));
    const endError = distance(points.at(-1), guide.at(-1));
    score = accuracy(mean(deviations) * .8 + endError * .2, Math.min(canvas.width, canvas.height) * .112); detail = `Distanza media dalla spirale: ${mean(deviations).toFixed(1)} px.`;
  } else {
    const aspectError = Math.abs(width / Math.max(height, 1) - .72);
    const center = { x: (minX+maxX)/2, y: (minY+maxY)/2 };
    const left = points.filter((p) => p.x < center.x).length; const right = points.length-left;
    const balance = Math.abs(left-right)/points.length;
    const closure = distance(points[0], points.at(-1))/Math.max(width,height);
    score = accuracy(aspectError*.4 + balance*.35 + closure*.25, .28); detail = `Squilibrio fra i due lobi: ${(balance*100).toFixed(1)}%.`;
  }
  challengeResult(score, detail);
}

function drawLineGuide(width, height) {
  return [
    { x: width * .12, y: height * .78 },
    { x: width * .88, y: height * .22 },
  ];
}

function spiralPoints(width = 900, height = 330) {
  const outerRadius = Math.min(width, height) * .455;
  return Array.from({ length: 150 }, (_, index) => {
    const t = index / 149 * Math.PI * 4.6;
    const radius = outerRadius * (1 - index / 149 * .815);
    return { x: width / 2 + Math.cos(t) * radius, y: height / 2 + Math.sin(t) * radius };
  });
}

function pointToSegment(point, start, end) {
  const dx = end.x-start.x; const dy = end.y-start.y;
  const t = clamp(((point.x-start.x)*dx + (point.y-start.y)*dy)/(dx*dx+dy*dy), 0, 1);
  return distance(point, { x: start.x+t*dx, y:start.y+t*dy });
}

function renderSplit(config) {
  if (['diagonal', 'circle'].includes(config.mode)) return renderSplitCanvas(config);
  const zone = document.createElement('div');
  zone.className = `split-zone ${config.mode === 'horizontal' ? 'is-horizontal' : ''}`;
  zone.innerHTML = '<div class="split-fill"></div><div class="split-line"></div><div class="split-labels"><span>A</span><span>B</span></div>';
  stage.append(zone);
  const confirm = makeButton('CONFERMA IL TAGLIO'); confirm.disabled = true; controls.append(confirm);
  let value;
  do { value = .12 + random() * .76; } while (Math.abs(value - config.target) < .14);
  const initialProperty = config.mode === 'horizontal' ? 'height' : 'width';
  $('.split-fill', zone).style[initialProperty] = `${value * 100}%`;
  if (config.mode === 'horizontal') $('.split-line', zone).style.top = `${value * 100}%`;
  else $('.split-line', zone).style.left = `${value * 100}%`;
  const update = (event) => {
    const rect = zone.getBoundingClientRect();
    value = config.mode === 'horizontal' ? clamp((event.clientY-rect.top)/rect.height,0,1) : clamp((event.clientX-rect.left)/rect.width,0,1);
    const property = config.mode === 'horizontal' ? 'height' : 'width';
    $('.split-fill', zone).style[property] = `${value*100}%`;
    if (config.mode === 'horizontal') $('.split-line', zone).style.top = `${value*100}%`;
    else $('.split-line', zone).style.left = `${value*100}%`;
    confirm.disabled = false;
  };
  zone.addEventListener('pointerdown', (event) => { update(event); zone.setPointerCapture(event.pointerId); });
  zone.addEventListener('pointermove', (event) => { if (zone.hasPointerCapture(event.pointerId)) update(event); });
  confirm.addEventListener('click', () => {
    const error = Math.abs(value-config.target);
    challengeResult(accuracy(error, .075), `Divisione: ${(value*100).toFixed(1)}% / ${((1-value)*100).toFixed(1)}%.`);
  });
}

function renderSplitCanvas(config) {
  const { canvas, ctx, pointFromEvent } = makeCanvas();
  const confirm = makeButton('CONFERMA IL TAGLIO'); confirm.disabled = true; controls.append(confirm);
  let chosen = { x: 310, y: 165 };
  const draw = () => {
    ctx.clearRect(0,0,canvas.width,canvas.height); ctx.lineWidth = 4; ctx.strokeStyle='#171513';
    if (config.mode === 'circle') { ctx.fillStyle='#ffc93d'; ctx.beginPath(); ctx.arc(450,165,130,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
    else { ctx.fillStyle='#26c9a7'; ctx.fillRect(185,50,530,230); ctx.strokeRect(185,50,530,230); }
    ctx.beginPath(); ctx.moveTo(chosen.x-250,chosen.y+180); ctx.lineTo(chosen.x+250,chosen.y-180); ctx.stroke();
  };
  draw();
  const update = (event) => { chosen=pointFromEvent(event); draw(); confirm.disabled=false; };
  canvas.addEventListener('pointerdown', update);
  canvas.addEventListener('pointermove', (event) => { if (event.buttons) update(event); });
  confirm.addEventListener('click', () => {
    const error = distance(chosen,{x:450,y:165});
    challengeResult(accuracy(error, 46), `Il taglio passa a ${error.toFixed(1)} px dal centro.`);
  });
}

function renderCenter(config) {
  const { canvas, ctx, pointFromEvent } = makeCanvas();
  const confirm = makeButton('INDICA IL CENTRO'); confirm.disabled = true; controls.append(confirm);
  const offset = { x: config.offsetX || 0, y: config.offsetY || 0 };
  let target = {x:450+offset.x,y:165+offset.y}; let selected = null; let hidden = false;
  if (config.shape === 'triangle') target = {x:(250+700+420)/3+offset.x,y:(270+245+45)/3+offset.y};
  if (config.shape === 'blob') target = {x:445+offset.x,y:166+offset.y};
  if (config.shape === 'circumcenter') target = {x:450+offset.x,y:166+offset.y};
  const shifted = (x, y) => ({ x: x + offset.x, y: y + offset.y });
  const draw = () => {
    ctx.clearRect(0,0,canvas.width,canvas.height); ctx.lineWidth=4; ctx.strokeStyle='#171513'; ctx.fillStyle='#7558ff';
    if (config.shape === 'circle' || config.shape === 'hidden') { if (!hidden) { ctx.beginPath();ctx.arc(450+offset.x,165+offset.y,125,0,Math.PI*2);ctx.fill();ctx.stroke(); } }
    else if (config.shape === 'triangle') { const a=shifted(250,270),b=shifted(700,245),c=shifted(420,45);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.fill();ctx.stroke(); }
    else if (config.shape === 'blob') { const a=shifted(250,110),b=shifted(360,10),c=shifted(550,45),d=shifted(670,125),e=shifted(750,210),f=shifted(590,315),g=shifted(430,275),h=shifted(280,320),i=shifted(165,225);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(b.x,b.y,c.x,c.y,d.x,d.y);ctx.bezierCurveTo(e.x,e.y,f.x,f.y,g.x,g.y);ctx.bezierCurveTo(h.x,h.y,i.x,i.y,a.x,a.y);ctx.fill();ctx.stroke(); }
    else { [shifted(250,245),shifted(650,245),shifted(450,21)].forEach((p)=>{ctx.fillStyle='#ff5b3d';ctx.beginPath();ctx.arc(p.x,p.y,16,0,Math.PI*2);ctx.fill();ctx.stroke();}); }
    if (selected) { ctx.fillStyle='#ffc93d';ctx.beginPath();ctx.arc(selected.x,selected.y,11,0,Math.PI*2);ctx.fill();ctx.stroke(); }
    if (config.shape === 'hidden' && hidden && !selected) { ctx.font='900 22px system-ui';ctx.textAlign='center';ctx.fillStyle='#171513';ctx.fillText('DOV’ERA IL CENTRO?',450,165); }
  };
  draw();
  if (config.shape === 'hidden') { const id=setTimeout(()=>{hidden=true;draw();},1350);registerCleanup(()=>clearTimeout(id)); }
  canvas.addEventListener('pointerdown',(event)=>{ if(config.shape==='hidden'&&!hidden)return; selected=pointFromEvent(event);draw();confirm.disabled=false;confirm.textContent='CONFERMA IL PUNTO'; });
  confirm.addEventListener('click',()=>{ if(!selected)return;const error=distance(selected,target);challengeResult(accuracy(error,49),`Distanza dal centro ideale: ${error.toFixed(1)} px.`); });
}

function renderMeasure(config) {
  const wrap=document.createElement('div');wrap.className='measure-stage';stage.append(wrap);
  const confirm=makeButton('CONFERMA LA MISURA');confirm.disabled=true;controls.append(confirm);
  let value=config.target*.65;
  if(config.mode==='line'||config.mode==='memory'){
    wrap.innerHTML=`<span class="measure-label ref">RIFERIMENTO</span><div class="measure-reference ${config.mode==='memory'?'memory-hide':''}"></div><span class="measure-label you">LA TUA LINEA</span><div class="user-line"><i class="line-handle"></i></div>`;
    const ref=$('.measure-reference',wrap), user=$('.user-line',wrap);ref.style.width=`${config.target}px`;ref.style.transform=`rotate(${config.angle||0}deg)`;user.style.width=`${value}px`;
    let dragging=false;
    const update=(event)=>{const rect=user.getBoundingClientRect();value=clamp(event.clientX-rect.left,4,360);user.style.width=`${value}px`;confirm.disabled=false;};
    $('.line-handle',wrap).addEventListener('pointerdown',(event)=>{dragging=true;event.target.setPointerCapture(event.pointerId);});
    $('.line-handle',wrap).addEventListener('pointermove',(event)=>{if(dragging)update(event);});
    $('.line-handle',wrap).addEventListener('pointerup',()=>dragging=false);
  }else{
    const visual=document.createElement('div');visual.className=config.mode==='diameter'?'measure-circles':'measure-columns';
    const ref=document.createElement('div'),user=document.createElement('div');
    ref.className=config.mode==='diameter'?'measure-circle':'measure-column';user.className=`${config.mode==='diameter'?'measure-circle':'measure-column'} user`;
    if(config.mode==='diameter'){ref.style.width=ref.style.height=`${config.target}px`;user.style.width=user.style.height=`${value}px`;}
    else{ref.style.height=`${config.target}px`;user.style.height=`${value}px`;}
    visual.append(ref,user);wrap.append(visual);
    const slider=document.createElement('input');slider.type='range';slider.className='measure-slider';slider.min='40';slider.max='250';slider.value=value;slider.setAttribute('aria-label','Regola la misura');wrap.append(slider);
    slider.addEventListener('input',()=>{value=Number(slider.value);if(config.mode==='diameter')user.style.width=user.style.height=`${value}px`;else user.style.height=`${value}px`;confirm.disabled=false;});
  }
  confirm.addEventListener('click',()=>{const error=Math.abs(value-config.target);challengeResult(accuracy(error,config.target*.13),`Scarto dalla misura: ${error.toFixed(1)} px.`);});
}

function renderAngle(config) {
  const dial=document.createElement('div');dial.className='angle-dial';
  const baseAngle=config.base||0;
  const targetMagnitude=smallestAngleBetween(config.target,baseAngle);
  const base=document.createElement('i');base.className='angle-arm base';base.style.transform=`rotate(${baseAngle}deg)`;
  const user=document.createElement('i');user.className='angle-arm user';user.style.transform='rotate(20deg)';
  dial.append(base,user);
  if(config.reference){const ref=document.createElement('i');ref.className='angle-arm reference';ref.style.transform=`rotate(${config.target}deg)`;dial.append(ref);}
  const center=document.createElement('i');center.className='angle-center';
  const valueLabel=document.createElement('span');valueLabel.className='angle-value';valueLabel.textContent=config.reference?'COPIA IL MODELLO':`TARGET ${config.base ? '90° RELATIVI' : config.target+'°'}`;
  dial.append(center,valueLabel);stage.append(dial);
  const confirm=makeButton('CONFERMA L’ANGOLO');confirm.disabled=true;controls.append(confirm);
  let value=20;
  const update=(event)=>{const rect=dial.getBoundingClientRect();let degrees=Math.atan2(event.clientY-(rect.top+rect.height/2),event.clientX-(rect.left+rect.width/2))*180/Math.PI;if(degrees<0)degrees+=360;value=degrees;user.style.transform=`rotate(${value}deg)`;confirm.disabled=false;};
  dial.addEventListener('pointerdown',(event)=>{dial.setPointerCapture(event.pointerId);update(event);});dial.addEventListener('pointermove',(event)=>{if(dial.hasPointerCapture(event.pointerId))update(event);});
  confirm.addEventListener('click',()=>{const chosenMagnitude=smallestAngleBetween(value,baseAngle);const error=Math.abs(chosenMagnitude-targetMagnitude);challengeResult(accuracy(error,12),`Scarto angolare: ${error.toFixed(1)}°.`);});
}

function smallestAngleBetween(first,second) {
  const difference=Math.abs(first-second)%360;
  return Math.min(difference,360-difference);
}

function renderPercent(config) {
  const wrap=document.createElement('div');wrap.className=`percent-stage mode-${config.mode}`;stage.append(wrap);
  const confirm=makeButton('CONFERMA LA STIMA');confirm.disabled=true;controls.append(confirm);
  let value=50;
  if(config.mode==='grid'){
    const grid=document.createElement('div');grid.className='percent-grid';grid.innerHTML=Array.from({length:100},()=>'<i></i>').join('');wrap.append(grid);
    const update=(event)=>{const cell=event.target.closest('i');if(!cell)return;value=[...grid.children].indexOf(cell)+1;[...grid.children].forEach((item,index)=>item.classList.toggle('fill',index<value));confirm.disabled=false;};
    grid.addEventListener('pointerover',(event)=>{if(event.buttons)update(event);});grid.addEventListener('pointerdown',update);
  }else if(config.mode==='pie'){
    const pie=document.createElement('div');pie.className='pie-control';pie.dataset.value='?';wrap.append(pie);
    const update=(event)=>{const rect=pie.getBoundingClientRect();let deg=Math.atan2(event.clientX-(rect.left+rect.width/2),-(event.clientY-(rect.top+rect.height/2)))*180/Math.PI;if(deg<0)deg+=360;value=deg/3.6;pie.style.setProperty('--pie',`${value}%`);confirm.disabled=false;};
    pie.addEventListener('pointerdown',(event)=>{pie.setPointerCapture(event.pointerId);update(event);});pie.addEventListener('pointermove',(event)=>{if(pie.hasPointerCapture(event.pointerId))update(event);});
  }else{
    const bar=document.createElement('div');bar.className=config.mode==='ratio'?'ratio-bar':'percent-bar';bar.innerHTML='<div class="percent-fill"></div><div class="percent-marker"></div><span class="percent-readout">?</span>';wrap.append(bar);
    if(config.mode==='ratio'){$('.percent-fill',bar).style.background='#ffc93d';bar.style.background='#7558ff';}
    const update=(event)=>{const rect=bar.getBoundingClientRect();value=clamp((event.clientX-rect.left)/rect.width*100,0,100);$('.percent-fill',bar).style.width=`${value}%`;$('.percent-marker',bar).style.left=`${value}%`;confirm.disabled=false;};
    bar.addEventListener('pointerdown',(event)=>{bar.setPointerCapture(event.pointerId);update(event);});bar.addEventListener('pointermove',(event)=>{if(bar.hasPointerCapture(event.pointerId))update(event);});
  }
  confirm.addEventListener('click',()=>{const error=Math.abs(value-config.target);challengeResult(accuracy(error,7.5),`Hai scelto ${value.toFixed(1)}% · scarto ${error.toFixed(1)} punti.`);});
}

function pathFor(type) {
  if(type==='line') return Array.from({length:101},(_,i)=>({x:90+i*7.2,y:165}));
  if(type==='s') return Array.from({length:151},(_,i)=>({x:90+i*4.8,y:165+Math.sin(i/150*Math.PI*2)*105}));
  if(type==='gates') return Array.from({length:151},(_,i)=>({x:90+i*4.8,y:165+Math.sin(i/150*Math.PI*3)*78}));
  return Array.from({length:180},(_,i)=>{const t=i/179*Math.PI*4.7;const r=145-i*.68;return{x:450+Math.cos(t)*r,y:165+Math.sin(t)*r};});
}

function drawTracePath(ctx, points, width) {
  ctx.clearRect(0,0,900,330);ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle='#171513';ctx.lineWidth=width+8;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  ctx.strokeStyle='#fff7e9';ctx.lineWidth=width;ctx.stroke();
  [points[0],points.at(-1)].forEach((p,index)=>{ctx.fillStyle=index?'#26c9a7':'#ff5b3d';ctx.beginPath();ctx.arc(p.x,p.y,width*.58,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#171513';ctx.lineWidth=3;ctx.stroke();});
}

function renderTrace(config) {
  const {canvas,ctx,pointFromEvent}=makeCanvas();const path=pathFor(config.path);const samples=[];let drawing=false;let trail=[];
  const draw=()=>{drawTracePath(ctx,path,config.width);if(config.path==='gates'){ctx.strokeStyle='#7558ff';ctx.lineWidth=7;[32,68,104,136].forEach(i=>{ctx.beginPath();ctx.arc(path[i].x,path[i].y,config.width*.55,0,Math.PI*2);ctx.stroke();});}if(trail.length){ctx.strokeStyle='#ff5b3d';ctx.lineWidth=7;ctx.beginPath();trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}};draw();
  const start=(event)=>{const p=pointFromEvent(event);if(distance(p,path[0])>config.width*1.4)return;drawing=true;trail=[p];samples.length=0;canvas.setPointerCapture(event.pointerId);};
  const move=(event)=>{if(!drawing)return;const p=pointFromEvent(event);trail.push(p);const nearest=Math.min(...path.filter((_,i)=>i%3===0).map(g=>distance(p,g)));samples.push(nearest);draw();};
  const end=()=>{if(!drawing)return;drawing=false;const progress=trail.length?1-distance(trail.at(-1),path.at(-1))/Math.max(500,distance(path[0],path.at(-1))):0;const outside=samples.filter(d=>d>config.width/2).length/Math.max(samples.length,1);const avg=mean(samples);const score=accuracy(avg,config.width*.7)*.65+clamp(progress,0,1)*25+(1-outside)*10;challengeResult(score,`Fuori dal percorso per il ${(outside*100).toFixed(1)}% del tragitto.`);};
  canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  const note=document.createElement('p');note.className='stage-note';note.textContent='PARTI DAL PUNTO ARANCIONE E RAGGIUNGI QUELLO VERDE';stage.append(note);
}

function renderSteady(config) {
  const {canvas,ctx,pointFromEvent}=makeCanvas();let pointer={x:-100,y:-100};let holding=false;let start=0;let raf;const samples=[];
  const radius=config.radius || 43;const amplitudeX=config.amplitudeX || 260;const speedY=config.speedY || 3.1;
  const targetAt=(now)=>{const t=(now-start)/1000;return{x:450+Math.sin(t*2.2)*amplitudeX,y:165+Math.sin(t*speedY)*92};};
  const draw=(now=performance.now())=>{ctx.clearRect(0,0,900,330);const target=targetAt(now);ctx.fillStyle='#26c9a7';ctx.beginPath();ctx.arc(target.x,target.y,radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#171513';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#ff5b3d';ctx.beginPath();ctx.arc(pointer.x,pointer.y,8,0,Math.PI*2);ctx.fill();if(holding){samples.push(distance(pointer,target));if(now-start>=config.duration){holding=false;const inside=samples.filter(d=>d<=radius).length/samples.length;challengeResult(inside*100,`Sei rimasto nel bersaglio per il ${(inside*100).toFixed(1)}% del tempo.`);return;}}raf=requestAnimationFrame(draw);};
  canvas.addEventListener('pointerdown',(event)=>{if(holding)return;pointer=pointFromEvent(event);holding=true;start=performance.now();samples.length=0;canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',(event)=>{pointer=pointFromEvent(event);});
  const release=()=>{if(holding){holding=false;challengeResult(mean(samples.map(d=>d<=radius?1:0))*70,`Hai rilasciato prima della fine.`);}};
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  raf=requestAnimationFrame(draw);registerCleanup(()=>cancelAnimationFrame(raf));
  const note=document.createElement('p');note.className='stage-note';note.textContent=`TIENI PREMUTO E SEGUI IL BERSAGLIO PER ${(config.duration/1000).toFixed(1).replace('.',',')} SECONDI`;stage.append(note);
}

function renderReaction(config) {
  const zone=document.createElement('button');zone.type='button';zone.className='reaction-zone';stage.append(zone);
  if(config.mode==='intercept') return renderIntercept(zone, config);
  zone.innerHTML='<strong>ASPETTA…</strong>';let ready=false;let readyTime=0;let timeout;
  const targetSymbol = config.targetSymbol || '★';
  const pace = config.pace || 520;
  const activate=()=>{ready=true;readyTime=performance.now();zone.classList.add('ready');$('strong',zone).textContent=config.mode==='symbol'?targetSymbol:'ORA!';tone(720);};
  if(config.mode==='green') timeout=setTimeout(activate,(config.pace || 1100)+random()*Math.max(500, 2800-(config.pace || 1100)));
  else{
    const symbols=['●','▲','◆','■','✚'].filter(symbol=>symbol!==targetSymbol);let count=0;const cycle=()=>{if(count++>=2+Math.floor(random()*3)){activate();return;}$('strong',zone).textContent=symbols[Math.floor(random()*symbols.length)];timeout=setTimeout(cycle,pace);};timeout=setTimeout(cycle,Math.max(420,pace));
  }
  registerCleanup(()=>clearTimeout(timeout));
  const react=()=>{if(state.locked)return;if(!ready){clearTimeout(timeout);challengeResult(0,'Falsa partenza: hai toccato troppo presto.');return;}const ms=performance.now()-readyTime;const score=accuracy(Math.max(0,ms-155),370);challengeResult(score,`Tempo di reazione: ${Math.round(ms)} ms.`);};
  zone.addEventListener('click',react);
  addKeyHandler(['Space'],react);
  $('#keyboard-hint').textContent='CLIC oppure SPAZIO per reagire';
}

function renderIntercept(zone, config = {}) {
  zone.innerHTML='<div class="hit-band"></div><i class="moving-dot"></i><strong></strong>';
  if (config.band) $('.hit-band', zone).style.cssText = `left:${50-config.band/2}%;width:${config.band}%`;
  const dot=$('.moving-dot',zone);let position=0;let start=performance.now();let raf;
  const duration=config.duration || 2350;
  const move=(now)=>{position=clamp((now-start)/duration,0,1);dot.style.left=`${position*100}%`;dot.style.top=`${50+Math.sin(position*Math.PI*2)*27}%`;if(position>=1){challengeResult(0,'Il punto è scappato oltre il bersaglio.');return;}raf=requestAnimationFrame(move);};
  const stop=()=>{if(state.locked)return;cancelAnimationFrame(raf);const error=Math.abs(position-.5);challengeResult(accuracy(error,(config.band || 14)*.0064),`Distanza dalla zona perfetta: ${(error*100).toFixed(1)}%.`);};
  zone.addEventListener('click',stop);
  addKeyHandler(['Space'],stop);
  $('#keyboard-hint').textContent='CLIC oppure SPAZIO per fermare il punto';
  raf=requestAnimationFrame(move);registerCleanup(()=>cancelAnimationFrame(raf));
}

function renderMemory(config) {
  const grid=document.createElement('div');grid.className='memory-grid';
  const cellCount=config.cells || 16;
  grid.innerHTML=Array.from({length:cellCount},(_,i)=>`<button class="memory-cell" type="button" aria-label="Cella ${i+1}"></button>`).join('');stage.append(grid);
  const cells=[...grid.children];const order=[];while(order.length<config.count){const n=Math.floor(random()*cellCount);if(!order.includes(n))order.push(n);}
  let accepting=false;let choices=[];
  if(config.mode==='grid'){
    order.forEach(i=>cells[i].classList.add('lit'));
    const id=setTimeout(()=>{cells.forEach(c=>c.classList.remove('lit'));accepting=true;},config.pace || 1550);registerCleanup(()=>clearTimeout(id));
  }else{
    cells.forEach(c=>c.disabled=true);
    const pace=config.pace || 480;
    order.forEach((cellIndex,index)=>{const id=setTimeout(()=>{cells[cellIndex].classList.add('lit');tone(480+index*45);setTimeout(()=>cells[cellIndex].classList.remove('lit'),Math.min(270,pace*.65));},450+index*pace);registerCleanup(()=>clearTimeout(id));});
    const id=setTimeout(()=>{cells.forEach(c=>c.disabled=false);accepting=true;},500+config.count*pace);registerCleanup(()=>clearTimeout(id));
  }
  grid.addEventListener('click',(event)=>{const cell=event.target.closest('.memory-cell');if(!cell||!accepting||cell.classList.contains('selected'))return;const index=cells.indexOf(cell);choices.push(index);cell.classList.add('selected');tone(410+choices.length*45);if(choices.length===config.count){accepting=false;let correct;if(config.mode==='grid')correct=choices.filter(i=>order.includes(i)).length;else correct=choices.filter((i,pos)=>i===order[pos]).length;choices.forEach((i,pos)=>{const isCorrect=config.mode==='grid'?order.includes(i):i===order[pos];if(!isCorrect)cells[i].classList.add('wrong');});const score=correct/config.count*100;setTimeout(()=>challengeResult(score,`${correct} elementi corretti su ${config.count}.`),320);}});
}

function renderPrecision(config) {
  const {canvas,ctx,pointFromEvent}=makeCanvas();
  const distractors=Array.from({length:config.distractors},(_,index)=>({
    x:70+((index*137+config.x*3)%760), y:42+((index*83+config.y*2)%245),
    radius:10+(index%4)*3,
  })).filter(point=>distance(point,{x:config.x,y:config.y})>65);
  ctx.fillStyle='rgba(255,255,255,.42)';ctx.fillRect(0,0,900,330);ctx.lineWidth=3;ctx.strokeStyle='#171513';
  distractors.forEach((point,index)=>{ctx.fillStyle=index%2?'#7558ff':'#ffc93d';ctx.beginPath();ctx.arc(point.x,point.y,point.radius,0,Math.PI*2);ctx.fill();ctx.stroke();});
  ctx.fillStyle='#ff5b3d';ctx.beginPath();ctx.arc(config.x,config.y,config.radius,0,Math.PI*2);ctx.fill();ctx.stroke();
  canvas.addEventListener('pointerdown',(event)=>{const selected=pointFromEvent(event);const error=distance(selected,{x:config.x,y:config.y});challengeResult(accuracy(error,config.radius*1.75),`Distanza dal centro del bersaglio: ${error.toFixed(1)} px.`);});
}

function renderSymmetry(config) {
  const {canvas,ctx,pointFromEvent}=makeCanvas();const source={x:config.x,y:config.y};let target;
  if(config.axis==='vertical')target={x:900-source.x,y:source.y};
  else if(config.axis==='horizontal')target={x:source.x,y:330-source.y};
  else target={x:source.y+285,y:source.x-285};
  target={x:clamp(target.x,45,855),y:clamp(target.y,35,295)};
  let selected=null;const confirm=makeButton('CONFERMA IL RIFLESSO');confirm.disabled=true;controls.append(confirm);
  const draw=()=>{ctx.clearRect(0,0,900,330);ctx.strokeStyle='#171513';ctx.lineWidth=4;ctx.setLineDash([13,11]);ctx.beginPath();if(config.axis==='vertical'){ctx.moveTo(450,15);ctx.lineTo(450,315);}else if(config.axis==='horizontal'){ctx.moveTo(35,165);ctx.lineTo(865,165);}else{ctx.moveTo(285,0);ctx.lineTo(615,330);}ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#7558ff';ctx.beginPath();ctx.arc(source.x,source.y,18,0,Math.PI*2);ctx.fill();ctx.stroke();if(selected){ctx.fillStyle='#ffc93d';ctx.beginPath();ctx.arc(selected.x,selected.y,13,0,Math.PI*2);ctx.fill();ctx.stroke();}};draw();
  canvas.addEventListener('pointerdown',(event)=>{selected=pointFromEvent(event);draw();confirm.disabled=false;});
  confirm.addEventListener('click',()=>{const error=distance(selected,target);challengeResult(accuracy(error,44),`Errore di simmetria: ${error.toFixed(1)} px.`);});
}

function renderBalance(config) {
  const {canvas,ctx,pointFromEvent}=makeCanvas();const total=config.weights.reduce((sum,[,weight])=>sum+weight,0);const ideal=config.weights.reduce((sum,[x,weight])=>sum+x*weight,0)/total;
  let fulcrum;
  do { fulcrum=120+random()*660; } while(Math.abs(fulcrum-ideal)<105);
  const confirm=makeButton('BILANCIA LA TRAVE');confirm.disabled=true;controls.append(confirm);
  const draw=()=>{ctx.clearRect(0,0,900,330);ctx.strokeStyle='#171513';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(90,175);ctx.lineTo(810,175);ctx.stroke();config.weights.forEach(([x,weight],index)=>{ctx.fillStyle=index%2?'#7558ff':'#ff5b3d';ctx.fillRect(x-22,175-weight*18,44,weight*18);ctx.strokeRect(x-22,175-weight*18,44,weight*18);ctx.fillStyle='#171513';ctx.font='900 18px system-ui';ctx.textAlign='center';ctx.fillText(`${weight}×`,x,205);});ctx.fillStyle='#ffc93d';ctx.beginPath();ctx.moveTo(fulcrum,185);ctx.lineTo(fulcrum-32,270);ctx.lineTo(fulcrum+32,270);ctx.closePath();ctx.fill();ctx.stroke();};draw();
  canvas.addEventListener('pointerdown',(event)=>{canvas.setPointerCapture(event.pointerId);fulcrum=clamp(pointFromEvent(event).x,100,800);confirm.disabled=false;draw();});canvas.addEventListener('pointermove',(event)=>{if(canvas.hasPointerCapture(event.pointerId)){fulcrum=clamp(pointFromEvent(event).x,100,800);draw();}});
  confirm.addEventListener('click',()=>{const error=Math.abs(fulcrum-ideal);challengeResult(accuracy(error,48),`Il fulcro ideale era a ${error.toFixed(1)} px dalla tua scelta.`);});
}

function renderColorMatch(config) {
  const wrap=document.createElement('div');wrap.className='color-match';const reference=document.createElement('div');const attempt=document.createElement('div');reference.className='color-swatch reference';attempt.className='color-swatch attempt';wrap.append(reference,attempt);stage.append(wrap);
  const slider=document.createElement('input');slider.type='range';slider.className='color-slider';slider.setAttribute('aria-label','Regola il colore');
  const target=config.mode==='hue'?config.hue:config.mode==='saturation'?config.saturation:config.lightness;slider.min='0';slider.max=config.mode==='hue'?'360':'100';slider.value=config.mode==='hue'?180:50;controls.append(slider);
  const color=(value)=>`hsl(${config.mode==='hue'?value:config.hue} ${config.mode==='saturation'?value:config.saturation}% ${config.mode==='lightness'?value:config.lightness}%)`;
  reference.style.background=color(target);const update=()=>attempt.style.background=color(Number(slider.value));update();
  const confirm=makeButton('CONFERMA IL COLORE');confirm.disabled=true;controls.append(confirm);
  slider.addEventListener('input',()=>{update();confirm.disabled=false;});
  confirm.addEventListener('click',()=>{let error=Math.abs(Number(slider.value)-target);if(config.mode==='hue')error=Math.min(error,360-error);challengeResult(accuracy(error,config.mode==='hue'?28:11),`Scarto ${config.mode==='hue'?'cromatico':'percettivo'}: ${error.toFixed(1)}${config.mode==='hue'?'°':' punti'}.`);});
}

function renderCountFlash(config) {
  const panel=document.createElement('div');panel.className='flash-panel';panel.innerHTML='<span>PREPARATI</span>';stage.append(panel);
  const answers=document.createElement('div');answers.className='count-answers';controls.append(answers);
  const count=Math.floor(config.minCount+random()*(config.maxCount-config.minCount+1));
  const pace=Math.round(config.minPace+random()*(config.maxPace-config.minPace));
  const distractors=random()<config.distractorChance;
  let step=0;let timeout;const totalSteps=distractors?count+Math.max(3,Math.round(count*.35)):count;
  const sequence=Array.from({length:totalSteps},(_,index)=>index<count?'target':'distractor');
  for(let index=sequence.length-1;index>0;index-=1){const swapWith=Math.floor(random()*(index+1));[sequence[index],sequence[swapWith]]=[sequence[swapWith],sequence[index]];}
  const flash=()=>{if(step>=sequence.length){panel.classList.remove('flash-target','flash-distractor');panel.innerHTML='<span>QUANTI ERANO?</span>';showAnswers();return;}const type=sequence[step++];panel.className=`flash-panel flash-${type}`;panel.innerHTML=`<i style="left:${18+random()*64}%;top:${22+random()*56}%"></i>`;tone(type==='target'?620:260,.045);timeout=setTimeout(()=>{panel.className='flash-panel';panel.replaceChildren();timeout=setTimeout(flash,Math.max(55,pace*.42));},Math.max(75,pace*.58));};
  const showAnswers=()=>{const options=[count-2,count-1,count,count+1,count+2].filter(value=>value>0).sort(()=>random()-.5);options.forEach(value=>{const button=makeButton(String(value),'count-answer');button.addEventListener('click',()=>{const error=Math.abs(value-count);challengeResult(error===0?100:accuracy(error,1.45),value===count?`Esatto: erano ${count}.`:`Erano ${count}, ne hai indicati ${value}.`);});answers.append(button);});};
  timeout=setTimeout(flash,650);registerCleanup(()=>clearTimeout(timeout));
}

function drawResultCard(score, grade) {
  const canvas=$('#result-canvas');const ctx=canvas.getContext('2d');const stars=state.results.filter(r=>r.score>=90).length;
  ctx.fillStyle='#fff7e9';ctx.fillRect(0,0,1080,1350);
  ctx.fillStyle='#171513';ctx.fillRect(0,0,1080,22);ctx.fillRect(0,1328,1080,22);
  ctx.fillStyle='#ff5b3d';ctx.beginPath();ctx.arc(930,160,190,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#171513';ctx.lineWidth=8;ctx.setLineDash([18,18]);ctx.beginPath();ctx.arc(930,160,145,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#171513';ctx.font='1000 82px system-ui';ctx.textAlign='left';ctx.fillText('QUASI!',70,115);
  const cardSubtitle=state.mode==='solo'?'RISULTATO UFFICIALE · 10 PROVE':state.mode==='challenge-guest'?`SFIDA · AVVERSARIO ${state.opponentScore}/100`:'SFIDA TRA AMICI · 10 PROVE';
  ctx.font='900 25px system-ui';ctx.letterSpacing='4px';ctx.fillText(cardSubtitle,72,174);
  ctx.font='1000 310px system-ui';ctx.fillStyle='#7558ff';ctx.fillText(String(score),54,500);
  ctx.fillStyle='#171513';ctx.font='1000 75px system-ui';ctx.fillText('/100',630,487);
  ctx.save();ctx.translate(930,160);ctx.fillStyle='#ffc93d';ctx.strokeStyle='#171513';ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,82,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#171513';ctx.font='1000 74px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(grade,0,5);ctx.restore();
  ctx.textAlign='left';ctx.fillStyle='#171513';ctx.font='1000 38px system-ui';ctx.fillText(scoreMessage(score),70,575);
  ctx.font='800 23px system-ui';ctx.fillStyle='rgba(23,21,19,.62)';ctx.fillText(`${stars} STELLE QUASI · BEST ${state.best}`,70,620);
  const top=690;state.results.forEach((result,index)=>{const y=top+index*54;ctx.fillStyle=index%2?'rgba(117,88,255,.08)':'rgba(255,91,61,.08)';roundRect(ctx,65,y-34,950,47,10);ctx.fill();ctx.fillStyle='#171513';ctx.font='800 21px system-ui';ctx.textAlign='left';ctx.fillText(`${String(index+1).padStart(2,'0')}  ${result.challenge.name.toUpperCase()}`,82,y-2);ctx.textAlign='right';ctx.font='1000 25px system-ui';ctx.fillStyle=result.score>=90?'#ff5b3d':'#171513';ctx.fillText(String(result.score),990,y-2);});
  ctx.textAlign='left';ctx.fillStyle='#171513';ctx.font='900 23px system-ui';ctx.fillText('NESSUNO È PERFETTO. TU QUANTO CI VAI VICINO?',70,1282);
}

function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}

async function resultBlob() {
  return new Promise((resolve)=>$('#result-canvas').toBlob(resolve,'image/png',1));
}

function buildChallengeUrl({ deck, seed, score = null, startAt = null }) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('challenge', encodeChallenge({
    deck: deck.map((challenge) => typeof challenge === 'string' ? challenge : challenge.id),
    seed,
    score,
    startAt,
  }));
  return url.toString();
}

function makeChallengeUrl(score) {
  return buildChallengeUrl({ deck: state.deck, seed: state.challengeSeed, score, startAt: state.startAt });
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* Safari may require the synchronous fallback below. */ }
  }

  const field = document.createElement('textarea');
  const activeElement = document.activeElement;
  field.value = text;
  field.readOnly = true;
  field.setAttribute('aria-hidden', 'true');
  Object.assign(field.style, {
    position: 'fixed',
    inset: '0 auto auto 0',
    width: '1px',
    height: '1px',
    padding: '0',
    border: '0',
    opacity: '0.01',
    fontSize: '16px',
    userSelect: 'text',
    WebkitUserSelect: 'text',
  });
  document.body.append(field);
  field.focus({ preventScroll: true });
  field.select();
  field.setSelectionRange(0, field.value.length);

  let copied = false;
  try { copied = document.execCommand('copy'); } catch { copied = false; }
  field.remove();
  activeElement?.focus?.({ preventScroll: true });
  return copied;
}

function isTouchShareDevice() {
  return window.matchMedia?.('(pointer: coarse)').matches === true;
}

function offerManualCopy(url) {
  window.prompt('Copia questo link e invialo al tuo amico:', url);
}

async function shareChallengeLink(shareData, copiedMessage) {
  if (isTouchShareDevice() && navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (error) {
      if (error.name === 'AbortError') return false;
    }
  }

  if (await copyText(shareData.url)) {
    showToast(copiedMessage);
    return true;
  }

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (error) {
      if (error.name === 'AbortError') return false;
    }
  }

  offerManualCopy(shareData.url);
  return true;
}

async function compareFriendResult() {
  const input = $('#compare-input');
  let value = input.value.trim();
  if (!value && navigator.clipboard?.readText) {
    try { value = (await navigator.clipboard.readText()).trim(); input.value = value; } catch { /* Manual paste remains available. */ }
  }
  const output = $('#compare-output');
  try {
    const url = new URL(value);
    const payload = decodeChallenge(url.searchParams.get('challenge') || '', new Set(challengeCatalog.keys()));
    if (!payload || payload.score === null) throw new Error('missing-result');
    if (payload.seed !== state.challengeSeed) throw new Error('different-match');
    const ownScore = Math.round(mean(state.results.map((result) => result.score)));
    const difference = ownScore - payload.score;
    output.className = `compare-output ${difference > 0 ? 'is-win' : difference < 0 ? 'is-loss' : 'is-draw'}`;
    output.innerHTML = `<strong>${difference > 0 ? `HAI VINTO DI ${difference}` : difference < 0 ? `HAI PERSO DI ${Math.abs(difference)}` : 'PARITÀ PERFETTA'}</strong><span>TU ${ownScore} · AMICO ${payload.score}</span>`;
    output.hidden = false;
  } catch (error) {
    output.className = 'compare-output is-error';
    output.innerHTML = `<strong>LINK NON VALIDO</strong><span>${error.message === 'different-match' ? 'Questo risultato appartiene a un’altra sfida.' : 'Incolla il link risultato condiviso dal tuo amico.'}</span>`;
    output.hidden = false;
  }
}

async function launchLiveChallenge() {
  const recentKinds = storedList('quasi-recent-kinds');
  const recentIds = storedList('quasi-recent-levels');
  const deck = buildDeck(10, { excludedKinds: recentKinds, excludedIds: recentIds });
  const seed = createChallengeSeed();
  const startAt = Date.now() + 60_000;
  const url = buildChallengeUrl({ deck, seed, startAt });
  const shareData = {
    title: 'Entra nella mia sfida live a QUASI!',
    text: 'Apri il link: affronteremo insieme gli stessi 10 livelli, con partenza sincronizzata.',
    url,
  };
  if (!await shareChallengeLink(shareData, 'Link copiato: invialo subito al tuo amico!')) return;
  startGame({ mode: 'challenge-live-host', deck, seed, startAt });
}

async function shareResult() {
  const blob=await resultBlob();const score=Math.round(mean(state.results.map(r=>r.score)));const grade=getGrade(score).grade;const file=new File([blob],`quasi-${score}.png`,{type:'image/png'});
  if (state.mode !== 'solo') {
    const url = makeChallengeUrl(score);
    const shareData = {
      title: 'Ti sfido a QUASI!',
      text: `Ho totalizzato ${score}/100. Riesci a battermi negli stessi 10 livelli?`,
      url,
    };
    if (isTouchShareDevice() && navigator.canShare?.({ files: [file] })) shareData.files = [file];
    await shareChallengeLink(shareData, 'Link della sfida copiato!');
    return;
  }
  if(navigator.share&&navigator.canShare?.({files:[file]})){
    try{await navigator.share({title:'Il mio risultato a QUASI!',text:`Ho totalizzato ${score}/100, grado ${grade}. Quanto ci vai vicino?`,files:[file]});return;}catch(error){if(error.name==='AbortError')return;}
  }
  downloadResult();showToast('Condivisione non disponibile: carta scaricata.');
}

async function downloadResult() {
  const blob=await resultBlob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`quasi-risultato-${Math.round(mean(state.results.map(r=>r.score)))}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

let toastTimer;
function showToast(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);}

function normalizedSearch(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function trainingBest(challenge) {
  const value = localStorage.getItem(`quasi-training-best:${challenge.id}`);
  return value === null ? null : Number(value);
}

function renderTrainingFilters() {
  const families = ['Tutte', ...new Set(CHALLENGES.map((challenge) => challenge.family))];
  const container = $('#training-filters');
  container.replaceChildren(...families.map((family) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `training-filter${family === trainingFamily ? ' is-active' : ''}`;
    button.textContent = family;
    button.dataset.family = family;
    button.setAttribute('aria-pressed', String(family === trainingFamily));
    return button;
  }));
}

function renderTrainingCatalog() {
  const query = normalizedSearch(trainingSearch.value);
  const matches = CHALLENGES.filter((challenge) => {
    if (trainingFamily !== 'Tutte' && challenge.family !== trainingFamily) return false;
    return !query || normalizedSearch(`${challenge.name} ${challenge.instruction} ${challenge.family}`).includes(query);
  });
  const grid = $('#training-grid');
  grid.replaceChildren(...matches.map((challenge) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'training-level';
    card.dataset.challengeId = challenge.id;
    card.style.setProperty('--level-color', FAMILY_COLORS[challenge.family]);

    const family = document.createElement('span');
    family.className = 'training-level-family';
    family.textContent = challenge.family;
    const title = document.createElement('strong');
    title.textContent = challenge.name;
    const instruction = document.createElement('small');
    instruction.textContent = challenge.instruction;
    const score = document.createElement('span');
    score.className = 'training-level-score';
    const best = trainingBest(challenge);
    score.textContent = best === null ? 'MAI PROVATO · ALLENATI →' : `RECORD ${best}/100 · RIPROVA →`;
    card.append(family, title, instruction, score);
    return card;
  }));
  grid.scrollTop = 0;
  grid.hidden = matches.length === 0;
  $('#training-empty').hidden = matches.length !== 0;
  $('#training-count').textContent = `${matches.length} ${matches.length === 1 ? 'LIVELLO DISPONIBILE' : 'LIVELLI DISPONIBILI'}`;
}

function openTrainingDialog() {
  trainingDialog.classList.remove('is-searching');
  renderTrainingFilters();
  renderTrainingCatalog();
  if (!trainingDialog.open) trainingDialog.showModal();
  $('#training-grid').scrollTop = 0;
}

function startTrainingLevel(challenge) {
  trainingSearch.blur();
  trainingDialog.classList.remove('is-searching');
  startGame({ mode: 'training', deck: [challenge], seed: createChallengeSeed() });
}

function returnToTrainingCatalog() {
  feedbackLayer.hidden = true;
  clearChallenge();
  showScreen(homeScreen);
  openTrainingDialog();
}

$('#start-button').addEventListener('click',()=>startGame({mode:'solo'}));
$('#training-button').addEventListener('click', openTrainingDialog);
trainingSearch.addEventListener('input', renderTrainingCatalog);
trainingSearch.addEventListener('focus', () => trainingDialog.classList.add('is-searching'));
trainingSearch.addEventListener('blur', () => trainingDialog.classList.remove('is-searching'));
trainingDialog.addEventListener('close', () => trainingDialog.classList.remove('is-searching'));
$('#training-filters').addEventListener('click', (event) => {
  const button = event.target.closest('.training-filter');
  if (!button) return;
  trainingFamily = button.dataset.family;
  renderTrainingFilters();
  renderTrainingCatalog();
});
$('#training-grid').addEventListener('click', (event) => {
  const card = event.target.closest('.training-level');
  if (!card) return;
  const challenge = challengeCatalog.get(card.dataset.challengeId);
  if (challenge) startTrainingLevel(challenge);
});
$('#challenge-button').addEventListener('click',()=>{
  if (incomingChallenge) {
    const hasLocalResult = localStorage.getItem(`quasi-live-result:${incomingChallenge.seed}`) !== null;
    if (hasLocalResult) { launchLiveChallenge(); return; }
    const live = incomingChallenge.score === null && incomingChallenge.startAt;
    startGame({
      mode: live ? 'challenge-live-guest' : 'challenge-guest',
      deck: incomingChallenge.deck.map((id) => challengeCatalog.get(id)),
      opponentScore: incomingChallenge.score,
      seed: incomingChallenge.seed,
      startAt: incomingChallenge.startAt,
    });
  } else launchLiveChallenge();
});
$('.dialog-start').addEventListener('click',()=>startGame({mode:'solo'}));
$('#restart-button').addEventListener('click',()=>{
  if (state.mode.startsWith('challenge-live')) launchLiveChallenge();
  else if (state.mode === 'challenge-guest') {
    startGame({mode:state.mode,deck:state.deck,opponentScore:state.opponentScore,seed:state.challengeSeed});
  } else startGame({mode:state.mode});
});
$('#how-button').addEventListener('click',()=>howDialog.showModal());
$$('.dialog-close').forEach((button)=>button.addEventListener('click',()=>button.closest('dialog').close()));
$('#next-button').addEventListener('click',()=>{
  feedbackLayer.hidden = true;
  if (state.mode === 'training') {
    startTrainingLevel(state.deck[0]);
  } else if (state.round === 9) finishGame();
  else { state.round += 1; renderChallenge(); }
});
$('#training-back-button').addEventListener('click', returnToTrainingCatalog);
$('#share-button').addEventListener('click',shareResult);
$('#compare-button').addEventListener('click',()=>{$('#compare-output').hidden=true;$('#compare-input').value='';compareDialog.showModal();$('#compare-input').focus();});
$('#compare-submit').addEventListener('click',compareFriendResult);
$('#compare-input').addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();compareFriendResult();}});
$('#download-button').addEventListener('click',downloadResult);
$('#sound-toggle').addEventListener('click',()=>{state.sound=!state.sound;localStorage.setItem('quasi-sound',state.sound?'on':'off');$('#sound-toggle').setAttribute('aria-pressed',String(state.sound));$('#sound-toggle').setAttribute('aria-label',state.sound?'Disattiva suoni':'Attiva suoni');if(state.sound)tone(600);});
$$('[data-go-home]').forEach(button=>button.addEventListener('click',()=>{clearChallenge();feedbackLayer.hidden=true;showScreen(homeScreen);}));

// Exposed only for lightweight automated smoke tests; it has no gameplay side effects.
window.QUASI = {
  challengeCount: CHALLENGES.length,
  challengeIds: CHALLENGES.map((challenge) => challenge.id),
  buildDeck,
  getGrade,
};

// Localhost-only entry point used by the responsive level-by-level audit.
if (qaLevelId && challengeCatalog.has(qaLevelId)) {
  startTrainingLevel(challengeCatalog.get(qaLevelId));

  const qaPicker = document.createElement('select');
  qaPicker.id = 'qa-level-picker';
  qaPicker.setAttribute('aria-label', 'QA level picker');
  qaPicker.innerHTML = CHALLENGES.map((challenge) =>
    `<option value="${challenge.id}">${challenge.name}</option>`
  ).join('');
  qaPicker.value = qaLevelId;
  qaPicker.addEventListener('change', () => {
    feedbackLayer.hidden = true;
    startTrainingLevel(challengeCatalog.get(qaPicker.value));
  });
  document.body.append(qaPicker);
}

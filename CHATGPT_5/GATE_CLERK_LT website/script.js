// === Theme handling ===
const htmlEl = document.documentElement;
const themeSelect = document.getElementById('themeSelect');

const storedTheme = localStorage.getItem('theme') || 'horror';
applyTheme(storedTheme);
themeSelect.value = storedTheme;

themeSelect.addEventListener('change', (e) => {
  applyTheme(e.target.value);
  localStorage.setItem('theme', e.target.value);
});

function applyTheme(theme) {
  htmlEl.classList.remove('theme-horror', 'theme-desi', 'theme-neon');
  htmlEl.classList.add(`theme-${theme}`);
}

// === Ambient sound (WebAudio drone/noise) ===
let audioCtx = null;
let ambientActive = false;
let noiseNode, filter, gain;
const ambientBtn = document.getElementById('ambientToggle');

ambientBtn.addEventListener('click', () => {
  if (!audioCtx) initAudio();
  ambientActive = !ambientActive;
  ambientBtn.setAttribute('aria-pressed', ambientActive ? 'true' : 'false');
  ambientBtn.textContent = `Ambient: ${ambientActive ? 'On' : 'Off'}`;
  gain.gain.linearRampToValueAtTime(ambientActive ? 0.08 : 0.0, audioCtx.currentTime + 0.2);
});

function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1; // white noise
  }
  noiseNode = audioCtx.createBufferSource();
  noiseNode.buffer = noiseBuffer;
  noiseNode.loop = true;

  filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400; // muffled rumble

  gain = audioCtx.createGain();
  gain.gain.value = 0.0;

  noiseNode.connect(filter).connect(gain).connect(audioCtx.destination);
  noiseNode.start();
}

// === Focus timer ===
const timeDisplay = document.getElementById('timeDisplay');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const sessionLength = document.getElementById('sessionLength');
const timerFace = document.getElementById('timerFace');

let totalSeconds = parseInt(sessionLength.value, 10) * 60;
let remaining = totalSeconds;
let ticking = false;
let tickInterval;

function renderTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  timeDisplay.textContent = `${m}:${s}`;
}

renderTime(remaining);

startPauseBtn.addEventListener('click', () => {
  if (!ticking) startTimer();
  else pauseTimer();
});

resetBtn.addEventListener('click', resetTimer);

sessionLength.addEventListener('change', () => {
  totalSeconds = parseInt(sessionLength.value, 10) * 60;
  remaining = totalSeconds;
  renderTime(remaining);
  stopTimer();
  pulseFace();
});

function startTimer() {
  if (remaining <= 0) remaining = totalSeconds;
  ticking = true;
  startPauseBtn.textContent = 'Pause';
  tickInterval = setInterval(() => {
    remaining--;
    renderTime(remaining);
    drainStamina(0.06); // gradual drain while focused
    if (remaining <= 0) {
      stopTimer();
      flashFace();
    }
  }, 1000);
}

function pauseTimer() {
  stopTimer();
  startPauseBtn.textContent = 'Start';
}

function stopTimer() {
  ticking = false;
  clearInterval(tickInterval);
}

function resetTimer() {
  stopTimer();
  remaining = totalSeconds;
  renderTime(remaining);
  startPauseBtn.textContent = 'Start';
  pulseFace();
}

function pulseFace() {
  timerFace.style.boxShadow = '0 0 0px transparent';
  setTimeout(() => { timerFace.style.boxShadow = 'var(--glow)'; }, 60);
}
function flashFace() {
  const orig = timerFace.style.filter;
  timerFace.style.filter = 'brightness(1.8)';
  setTimeout(() => (timerFace.style.filter = orig), 300);
}

// === Stamina system ===
const staminaFill = document.getElementById('staminaFill');
const staminaPct = document.getElementById('staminaPct');
const restoreBtn = document.getElementById('restoreBtn');
let stamina = parseFloat(localStorage.getItem('stamina') || '100');

function renderStamina() {
  const pct = Math.max(0, Math.min(100, stamina));
  staminaFill.style.width = `${pct}%`;
  staminaPct.textContent = `${Math.round(pct)}%`;
  localStorage.setItem('stamina', pct.toString());
}
renderStamina();

function drainStamina(amount) {
  stamina = Math.max(0, stamina - amount);
  renderStamina();
}
function restoreStamina(amount) {
  stamina = Math.min(100, stamina + amount);
  renderStamina();
}

restoreBtn.addEventListener('click', () => {
  // slow-breathe restore
  const steps = 20, amt = 0.6;
  let i = 0;
  const iv = setInterval(() => {
    i++; restoreStamina(amt);
    if (i >= steps) clearInterval(iv);
  }, 80);
});

// Drain faster if tab is hidden (context switching penalty)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) drainStamina(8);
});

// === Notes autosave ===
const notesEl = document.getElementById('studyNotes');
notesEl.value = localStorage.getItem('studyNotes') || '';
notesEl.addEventListener('input', (e) => {
  localStorage.setItem('studyNotes', e.target.value);
});

// === Flashcards ===
const decks = {
  dbms: [
    {
      q: 'ACID — What does each letter ensure?',
      a: 'Atomicity (all-or-nothing), Consistency (constraints preserved), Isolation (no interference), Durability (commits persist).'
    },
    {
      q: 'Dirty vs Non-repeatable vs Phantom reads',
      a: 'Dirty: read uncommitted; Non-repeatable: value changes between reads; Phantom: result set changes (new/deleted rows).'
    },
    {
      q: 'Strict 2PL — Why helpful?',
      a: 'Holds X-locks till commit → prevents cascading aborts, simplifies recovery using WAL.'
    },
    {
      q: 'WAL (Write-Ahead Logging) rule',
      a: 'Log record must be written before the corresponding data page is flushed to disk.'
    }
  ],
  cn: [
    {
      q: 'TCP vs UDP — key differences',
      a: 'TCP: connection, reliable, ordered, congestion control. UDP: connectionless, best-effort, low latency.'
    },
    {
      q: 'OSI vs TCP/IP layers',
      a: 'OSI (7): App, Pres, Sess, Trans, Net, DataLink, Phys. TCP/IP (4): App, Trans, Net, Link.'
    },
    {
      q: 'Congestion control (TCP)',
      a: 'Slow start, congestion avoidance, fast retransmit, fast recovery using cwnd and ssthresh.'
    },
    {
      q: 'Routing: Distance Vector vs Link State',
      a: 'DV (Bellman-Ford, periodic updates); LS (Dijkstra, global view).'
    }
  ],
  gs: [
    {
      q: 'Basic structure doctrine (Polity)',
      a: 'Supreme Court: Parliament cannot amend the “basic structure” of the Constitution (Kesavananda Bharati, 1973).'
    },
    {
      q: 'Fundamental Rights vs DPSP',
      a: 'FRs are justiciable; DPSPs are non-justiciable guiding principles for governance.'
    },
    {
      q: 'Separation of powers',
      a: 'Legislature, Executive, Judiciary with checks and balances; in India, it’s separation of functions, not rigid separation.'
    },
    {
      q: 'Finance Commission role',
      a: 'Recommends distribution of tax revenues between Centre and States and grants-in-aid.'
    }
  ]
};

const deckSelect = document.getElementById('deckSelect');
const flipCard = document.getElementById('flipCard');
const flipInner = document.getElementById('flipInner');
const cardFront = document.getElementById('cardFront');
const cardBack = document.getElementById('cardBack');
const prevCard = document.getElementById('prevCard');
const nextCard = document.getElementById('nextCard');
const flipBtn = document.getElementById('flipBtn');
const cardCounter = document.getElementById('cardCounter');

let currentDeckKey = localStorage.getItem('currentDeck') || 'dbms';
let idx = parseInt(localStorage.getItem('deckIndex') || '0', 10);

deckSelect.value = currentDeckKey;
renderCard();

deckSelect.addEventListener('change', (e) => {
  currentDeckKey = e.target.value;
  localStorage.setItem('currentDeck', currentDeckKey);
  idx = 0;
  flipCard.classList.remove('flipped');
  renderCard();
});

prevCard.addEventListener('click', () => {
  flipCard.classList.remove('flipped');
  idx = (idx - 1 + decks[currentDeckKey].length) % decks[currentDeckKey].length;
  renderCard();
});
nextCard.addEventListener('click', () => {
  flipCard.classList.remove('flipped');
  idx = (idx + 1) % decks[currentDeckKey].length;
  renderCard();
});
flipBtn.addEventListener('click', () => flipCard.classList.toggle('flipped'));

flipCard.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); flipCard.classList.toggle('flipped'); }
  if (e.code === 'ArrowRight') nextCard.click();
  if (e.code === 'ArrowLeft') prevCard.click();
});

function renderCard() {
  const deck = decks[currentDeckKey];
  const card = deck[idx];
  cardFront.innerHTML = `
    <h3>${sanitize(card.q)}</h3>
    <p>Focus, then flip.</p>
  `;
  cardBack.innerHTML = `
    <h3>Answer</h3>
    <p>${sanitize(card.a)}</p>
  `;
  cardCounter.textContent = `${idx + 1} / ${deck.length}`;
  localStorage.setItem('deckIndex', idx.toString());
}
function sanitize(str) {
  const div = document.createElement('div'); div.textContent = str; return div.innerHTML;
}

// === Error Graveyard ===
const errorForm = document.getElementById('errorForm');
const graveyardList = document.getElementById('graveyardList');
const filterExam = document.getElementById('filterExam');

let graves = JSON.parse(localStorage.getItem('graves') || '[]');

errorForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(errorForm);
  const item = {
    id: crypto.randomUUID(),
    exam: fd.get('exam'),
    topic: fd.get('topic'),
    type: fd.get('type'),
    cause: fd.get('cause') || '',
    fix: fd.get('fix') || '',
    date: new Date().toISOString()
  };
  graves.unshift(item);
  localStorage.setItem('graves', JSON.stringify(graves));
  errorForm.reset();
  renderGraves();
});

filterExam.addEventListener('change', renderGraves);

function renderGraves() {
  const f = filterExam.value;
  const list = f === 'all' ? graves : graves.filter(g => g.exam === f);
  graveyardList.innerHTML = list.map(g => tombstoneHTML(g)).join('');
  // attach actions
  graveyardList.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      graves = graves.filter(x => x.id !== id);
      localStorage.setItem('graves', JSON.stringify(graves));
      renderGraves();
    });
  });
}

function tombstoneHTML(g) {
  const d = new Date(g.date);
  const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  return `
    <article class="tombstone">
      <h4>${escapeHTML(g.topic)} <span class="badge">${g.exam}</span></h4>
      <p><strong>Type:</strong> ${escapeHTML(g.type)}</p>
      ${g.cause ? `<p><strong>Cause:</strong> ${escapeHTML(g.cause)}</p>` : ''}
      ${g.fix ? `<p><strong>Ritual:</strong> ${escapeHTML(g.fix)}</p>` : ''}
      <div class="actions">
        <small>${dateStr}</small>
        <button class="ghost-btn" data-action="delete" data-id="${g.id}">Delete</button>
      </div>
    </article>
  `;
}
function escapeHTML(str='') {
  const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
}

renderGraves();

// — End —
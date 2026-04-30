// =========================================================
// AUDIO — sons procéduraux légers (Web Audio API)
// Pas de fichiers externes : tout est synthétisé à la volée.
// Style : épuré, courts, doux. Volume maître réglable.
// =========================================================

let ctx = null;
let masterGain = null;
let muted = false;

// Persiste l'état mute entre les sessions
try {
  muted = localStorage.getItem('babel.muted') === '1';
} catch {}

function ensureCtx() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.45;
  masterGain.connect(ctx.destination);
  return ctx;
}

// Doit être appelé sur la première interaction utilisateur (politique navigateur)
export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(value) {
  muted = !!value;
  try { localStorage.setItem('babel.muted', muted ? '1' : '0'); } catch {}
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.45;
}

export function isMuted() { return muted; }

// Génère une enveloppe ADSR simple sur un oscillateur.
function tone({ freq = 440, dur = 0.18, type = 'sine', attack = 0.005, decay = 0.05, peak = 0.6, sustain = 0.3, release = 0.1, detune = 0 }) {
  const c = ensureCtx();
  if (!c || muted) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  osc.connect(g);
  g.connect(masterGain);

  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.linearRampToValueAtTime(sustain, t0 + attack + decay);
  g.gain.setValueAtTime(sustain, t0 + dur - release);
  g.gain.linearRampToValueAtTime(0, t0 + dur);

  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst({ dur = 0.25, freq = 1500, q = 6, peak = 0.4 }) {
  const c = ensureCtx();
  if (!c || muted) return;
  const t0 = c.currentTime;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.01);
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  src.connect(filter); filter.connect(g); g.connect(masterGain);
  src.start(t0); src.stop(t0 + dur);
}

// --- Sons publics (palette compacte) ----------------------

export const sfx = {
  // Clic feutré (UI buttons)
  click() {
    tone({ freq: 760, dur: 0.08, type: 'triangle', attack: 0.002, decay: 0.02, peak: 0.4, sustain: 0.0, release: 0.05 });
  },
  // Lancer de dé : roulement rapide + impact
  diceRoll() {
    noiseBurst({ dur: 0.4, freq: 800, q: 1.5, peak: 0.18 });
    setTimeout(() => tone({ freq: 220, dur: 0.18, type: 'square', peak: 0.3, sustain: 0.05, release: 0.1 }), 380);
  },
  // Pion qui avance d'une case
  step() {
    tone({ freq: 540, dur: 0.07, type: 'sine', peak: 0.25, sustain: 0.0, release: 0.05 });
  },
  // Bonne réponse (deux notes ascendantes)
  correct() {
    tone({ freq: 660, dur: 0.14, type: 'triangle', peak: 0.5, sustain: 0.2 });
    setTimeout(() => tone({ freq: 990, dur: 0.18, type: 'triangle', peak: 0.5, sustain: 0.2 }), 110);
  },
  // Mauvaise réponse (deux notes descendantes)
  wrong() {
    tone({ freq: 360, dur: 0.14, type: 'sawtooth', peak: 0.32, sustain: 0.15 });
    setTimeout(() => tone({ freq: 220, dur: 0.22, type: 'sawtooth', peak: 0.32, sustain: 0.15 }), 110);
  },
  // Carte chance / bonus
  chance() {
    tone({ freq: 880, dur: 0.12, type: 'triangle', peak: 0.4, sustain: 0.2 });
    setTimeout(() => tone({ freq: 1320, dur: 0.14, type: 'triangle', peak: 0.4, sustain: 0.2 }), 90);
    setTimeout(() => tone({ freq: 1760, dur: 0.18, type: 'triangle', peak: 0.4, sustain: 0.2 }), 180);
  },
  // Pioche / retournement de carte
  flip() {
    noiseBurst({ dur: 0.18, freq: 2400, q: 4, peak: 0.16 });
  },
  // Notification / toast
  ding() {
    tone({ freq: 1320, dur: 0.18, type: 'sine', peak: 0.42, sustain: 0.2 });
  },
  // Démarrage de partie : petit motif
  start() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.14, type: 'triangle', peak: 0.4, sustain: 0.2 }), i * 110));
  },
  // Fin de partie / victoire
  win() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.18, type: 'triangle', peak: 0.5, sustain: 0.25 }), i * 130));
  },
};

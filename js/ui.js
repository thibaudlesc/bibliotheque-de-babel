// =========================================================
// UI — rendu plateau (image Figma) + pions (pièces de monnaie)
//   - animatePawnMove() : anime un pion case par case
//   - setBoardView()    : zoom sur un joueur ou vue d'ensemble
//   - showChanceCard()  : carte chance avec choix Appliquer/Garder
//   - animateDice()     : dé 3D animé (cube qui tourne)
//   - icônes SVG inline pour catégories et cartes chance (pas d'émojis)
// =========================================================

import { CATEGORIES, BOARD_SIZE, PAWN_COINS, findChanceCardById } from './data.js';
import { BOARD } from './game.js';
import { TILE_POSITIONS, BOARD_RATIO, SPECIAL_COLORS } from './board-positions.js';
import { sfx } from './audio.js';

const VIEW_W = 1416;
const VIEW_H = 1000;
const TILE_R = 22;

const FULL_VIEWBOX = { x: 0, y: 0, w: VIEW_W, h: VIEW_H };
const ZOOM_LEVEL = 0.45;

let viewState = { mode: 'full', focusUid: null };
let viewAnimationId = null;

function pctToSvg(x, y) {
  return { sx: (x / 100) * VIEW_W, sy: (y / 100) * VIEW_H };
}

export function tilePositions() {
  return TILE_POSITIONS.map(({ x, y }) => {
    const { sx, sy } = pctToSvg(x, y);
    return { x: sx, y: sy };
  });
}
const POSITIONS = tilePositions();

// --- Animation viewBox ----------------------------------
function animateViewBox(svg, target, duration = 450) {
  if (viewAnimationId) cancelAnimationFrame(viewAnimationId);
  const cur = svg.viewBox.baseVal;
  const start = { x: cur.x, y: cur.y, w: cur.width || VIEW_W, h: cur.height || VIEW_H };
  const t0 = performance.now();
  function step(now) {
    const t = Math.min(1, (now - t0) / duration);
    const e = 0.5 - Math.cos(t * Math.PI) / 2;
    const x = start.x + (target.x - start.x) * e;
    const y = start.y + (target.y - start.y) * e;
    const w = start.w + (target.w - start.w) * e;
    const h = start.h + (target.h - start.h) * e;
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    if (t < 1) viewAnimationId = requestAnimationFrame(step);
    else viewAnimationId = null;
  }
  viewAnimationId = requestAnimationFrame(step);
}

function viewBoxAt(px, py, zoom = ZOOM_LEVEL) {
  const w = VIEW_W * zoom;
  const h = VIEW_H * zoom;
  let x = px - w / 2;
  let y = py - h / 2;
  x = Math.max(0, Math.min(VIEW_W - w, x));
  y = Math.max(0, Math.min(VIEW_H - h, y));
  return { x, y, w, h };
}

export function setBoardView(svg, mode, focus = null) {
  viewState.mode = mode;
  if (mode === 'full') {
    viewState.focusUid = null;
    animateViewBox(svg, FULL_VIEWBOX);
  } else if (mode === 'zoom' && focus) {
    viewState.focusUid = focus.uid || null;
    const p = POSITIONS[focus.position] || POSITIONS[0];
    animateViewBox(svg, viewBoxAt(p.x, p.y));
  }
}
export function getViewMode() { return viewState.mode; }
export function getFocusUid() { return viewState.focusUid; }

// =========================================================
// SVG DEFS partagés : 6 alliages métalliques pour les pions
// + icônes catégories + icônes cartes chance
// =========================================================
const COIN_GRADIENTS = `
  <radialGradient id="coinGold" cx="35%" cy="30%" r="70%">
    <stop offset="0%"  stop-color="#FFE9A5"/><stop offset="40%" stop-color="#E8B14F"/><stop offset="100%" stop-color="#A87A2C"/>
  </radialGradient>
  <radialGradient id="coinSilver" cx="35%" cy="30%" r="70%">
    <stop offset="0%"  stop-color="#FAFAFC"/><stop offset="40%" stop-color="#C8CDD6"/><stop offset="100%" stop-color="#7B8390"/>
  </radialGradient>
  <radialGradient id="coinBronze" cx="35%" cy="30%" r="70%">
    <stop offset="0%"  stop-color="#FFD0A8"/><stop offset="40%" stop-color="#D08A4B"/><stop offset="100%" stop-color="#7C4513"/>
  </radialGradient>
  <radialGradient id="coinGreen" cx="35%" cy="30%" r="70%">
    <stop offset="0%"  stop-color="#C8F5D8"/><stop offset="40%" stop-color="#3FAB72"/><stop offset="100%" stop-color="#15633E"/>
  </radialGradient>
  <radialGradient id="coinOrange" cx="35%" cy="30%" r="70%">
    <stop offset="0%"  stop-color="#FFE4B0"/><stop offset="40%" stop-color="#F49B2C"/><stop offset="100%" stop-color="#A0510B"/>
  </radialGradient>
  <radialGradient id="coinPlatinum" cx="35%" cy="30%" r="70%">
    <stop offset="0%"  stop-color="#F4F8FF"/><stop offset="40%" stop-color="#B8C4D8"/><stop offset="100%" stop-color="#5C6E88"/>
  </radialGradient>
`;

// Icônes de catégorie (chemins SVG dessinés à la main, viewBox 24x24, fill=currentColor)
const CATEGORY_ICONS = `
  <symbol id="cat-icon-crown" viewBox="0 0 24 24"><path d="M3 8l3 5 3-7 3 7 3-7 3 7 3-5v9H3z" fill="currentColor"/></symbol>
  <symbol id="cat-icon-mask" viewBox="0 0 24 24"><path d="M4 5c0-1 .8-1.5 2-1.5h2.5c1.5 0 2 1 2.5 2 1-1 1.5-1 2-1s1 0 2 1c.5-1 1-2 2.5-2H20c1.2 0 2 .5 2 1.5v6c0 5-4 9-10 9S2 16 2 11V5h2zm5 6.5a2 2 0 102-2 2 2 0 00-2 2zm6 0a2 2 0 102-2 2 2 0 00-2 2z" fill="currentColor"/></symbol>
  <symbol id="cat-icon-book" viewBox="0 0 24 24"><path d="M4 4h6c1.5 0 2 .5 2 2v14c0-1-.5-2-2-2H4zm16 0h-6c-1.5 0-2 .5-2 2v14c0-1 .5-2 2-2h6z" fill="currentColor"/></symbol>
  <symbol id="cat-icon-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18" stroke="currentColor" stroke-width="2"/></symbol>
  <symbol id="cat-icon-column" viewBox="0 0 24 24"><path d="M3 19h18v2H3zm1-2h16v-1H4zm2-2h2V7H6zm10 0h2V7h-2zm-6 0h4V7h-4zM3 5l9-3 9 3v1H3z" fill="currentColor"/></symbol>
  <symbol id="cat-icon-bolt" viewBox="0 0 24 24"><path d="M13 2L4 14h7l-2 8 9-12h-7z" fill="currentColor"/></symbol>
  <symbol id="cat-icon-die" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/><circle cx="16" cy="8" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="8" cy="16" r="1.6" fill="currentColor"/><circle cx="16" cy="16" r="1.6" fill="currentColor"/></symbol>
`;

// Icônes des cartes chance — illustrations compactes, fill=currentColor
const CARD_ICONS = `
  <symbol id="card-icon-gift" viewBox="0 0 24 24"><path d="M3 9h18v3H3zm2 4h14v8H5zM10 6c0-1.5 1-3 2-3s2 1.5 2 3-1 3-2 3-2-1.5-2-3zm5 3v12M9 9v12" fill="currentColor"/></symbol>
  <symbol id="card-icon-graduate" viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5zm5 4v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4l-5 2.5z" fill="currentColor"/></symbol>
  <symbol id="card-icon-train" viewBox="0 0 24 24"><path d="M5 4h14c1 0 2 1 2 2v9c0 1-1 2-2 2H5c-1 0-2-1-2-2V6c0-1 1-2 2-2zm0 4v3h14V8zM6 19l-2 3h4l1-2h6l1 2h4l-2-3z" fill="currentColor"/></symbol>
  <symbol id="card-icon-snow" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
  <symbol id="card-icon-cup" viewBox="0 0 24 24"><path d="M5 4h14l-1 12c0 2-2 4-6 4s-6-2-6-4zm0 4h14M16 4l1-3" stroke="currentColor" stroke-width="2" fill="none"/></symbol>
  <symbol id="card-icon-mask" viewBox="0 0 24 24"><path d="M4 5c0-1 .8-1.5 2-1.5h2.5c1.5 0 2 1 2.5 2 1-1 1.5-1 2-1s1 0 2 1c.5-1 1-2 2.5-2H20c1.2 0 2 .5 2 1.5v6c0 5-4 9-10 9S2 16 2 11V5h2zm5 6.5a2 2 0 102-2 2 2 0 00-2 2zm6 0a2 2 0 102-2 2 2 0 00-2 2z" fill="currentColor"/></symbol>
  <symbol id="card-icon-cake" viewBox="0 0 24 24"><path d="M3 12h18v9H3zm2-4h14v3H5zm2-3v3M12 5v3m5-3v3" stroke="currentColor" stroke-width="2" fill="currentColor"/></symbol>
  <symbol id="card-icon-bear" viewBox="0 0 24 24"><circle cx="12" cy="13" r="7" fill="currentColor"/><circle cx="6" cy="6" r="3" fill="currentColor"/><circle cx="18" cy="6" r="3" fill="currentColor"/><circle cx="9.5" cy="11" r="1" fill="#fff"/><circle cx="14.5" cy="11" r="1" fill="#fff"/><circle cx="12" cy="14.5" r="1.2" fill="#fff"/></symbol>
  <symbol id="card-icon-rocket" viewBox="0 0 24 24"><path d="M12 2c4 3 6 8 6 12l-3 3-3-2-3 2-3-3c0-4 2-9 6-12zm0 7a2 2 0 100 4 2 2 0 000-4zM6 18l-2 4h4l1-3M18 18l2 4h-4l-1-3" fill="currentColor"/></symbol>
  <symbol id="card-icon-crown" viewBox="0 0 24 24"><path d="M3 8l3 5 3-7 3 7 3-7 3 7 3-5v9H3z" fill="currentColor"/></symbol>
`;

// --- Rendu du plateau SVG --------------------------------
export function renderBoard(svg) {
  svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
  svg.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';

  const defs = document.createElementNS(ns, 'defs');
  defs.innerHTML = `
    <filter id="pawnShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#1a1a1a" flood-opacity="0.45"/>
    </filter>
    ${COIN_GRADIENTS}
    <radialGradient id="coinShine" cx="30%" cy="25%" r="40%">
      <stop offset="0%"  stop-color="#FFFFFF" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="seaBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#3DB7C2"/>
      <stop offset="100%" stop-color="#2A8FA0"/>
    </linearGradient>
    ${CATEGORY_ICONS}
    ${CARD_ICONS}
  `;
  svg.appendChild(defs);

  const bg = document.createElementNS(ns, 'rect');
  bg.setAttribute('width', VIEW_W);
  bg.setAttribute('height', VIEW_H);
  bg.setAttribute('fill', 'url(#seaBg)');
  svg.appendChild(bg);

  const img = document.createElementNS(ns, 'image');
  img.setAttribute('href', 'assets/board.jpg');
  img.setAttribute('x', 0);
  img.setAttribute('y', 0);
  img.setAttribute('width', VIEW_W);
  img.setAttribute('height', VIEW_H);
  img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  img.addEventListener('error', () => img.remove());
  svg.appendChild(img);

  const tilesLayer = document.createElementNS(ns, 'g');
  tilesLayer.setAttribute('id', 'tiles-layer');
  for (let i = 0; i < BOARD_SIZE; i++) {
    const t = BOARD[i];
    const p = POSITIONS[i];
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'tile');
    g.setAttribute('data-index', i);
    g.setAttribute('transform', `translate(${p.x}, ${p.y})`);

    if (t.special) {
      // Halo coloré pour repérer les cases événement (prison/musée/+2/-2/run/replay)
      const color = SPECIAL_COLORS[t.special] || '#ffffff';
      const halo = document.createElementNS(ns, 'circle');
      halo.setAttribute('r', TILE_R + 3);
      halo.setAttribute('fill', 'none');
      halo.setAttribute('stroke', color);
      halo.setAttribute('stroke-width', '4');
      halo.setAttribute('opacity', '0.85');
      g.appendChild(halo);
    } else if (t.type !== 'start' && t.type !== 'end') {
      const cat = CATEGORIES[t.category];
      if (cat) {
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('r', 4);
        dot.setAttribute('cy', -TILE_R - 2);
        dot.setAttribute('fill', cat.color);
        dot.setAttribute('opacity', '0.85');
        g.appendChild(dot);
      }
    }
    tilesLayer.appendChild(g);
  }
  svg.appendChild(tilesLayer);

  const pawns = document.createElementNS(ns, 'g');
  pawns.setAttribute('id', 'pawns-layer');
  svg.appendChild(pawns);
}

// --- Création d'un pion (pièce de monnaie distincte par devise) ---
function createPawnEl(pl, cx, cy, isCurrent) {
  const ns = 'http://www.w3.org/2000/svg';
  const coinIndex = pl.coinIndex ?? 0;
  const coin = PAWN_COINS[coinIndex % PAWN_COINS.length] || PAWN_COINS[0];

  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', 'pawn' + (isCurrent ? ' active' : ''));
  g.setAttribute('data-uid', pl.uid);
  g.style.transform = `translate(${cx}px, ${cy}px)`;
  g.setAttribute('filter', 'url(#pawnShadow)');

  const ring = document.createElementNS(ns, 'circle');
  ring.setAttribute('r', 19);
  ring.setAttribute('fill', coin.ring);
  ring.setAttribute('stroke', '#1a1a1a');
  ring.setAttribute('stroke-width', '2');
  g.appendChild(ring);

  const body = document.createElementNS(ns, 'circle');
  body.setAttribute('r', 16);
  body.setAttribute('fill', `url(#${coin.gradient})`);
  g.appendChild(body);

  const shine = document.createElementNS(ns, 'circle');
  shine.setAttribute('r', 12);
  shine.setAttribute('cx', -3);
  shine.setAttribute('cy', -3);
  shine.setAttribute('fill', 'url(#coinShine)');
  g.appendChild(shine);

  const tt = document.createElementNS(ns, 'text');
  tt.setAttribute('text-anchor', 'middle');
  tt.setAttribute('dominant-baseline', 'middle');
  tt.setAttribute('y', 1);
  tt.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
  tt.setAttribute('font-weight', '700');
  tt.setAttribute('font-size', '17');
  tt.setAttribute('fill', coin.ink);
  tt.textContent = coin.symbol;
  g.appendChild(tt);

  if (isCurrent) {
    const turnRing = document.createElementNS(ns, 'circle');
    turnRing.setAttribute('r', 24);
    turnRing.setAttribute('fill', 'none');
    turnRing.setAttribute('stroke', pl.color || '#7659FF');
    turnRing.setAttribute('stroke-width', '3');
    turnRing.setAttribute('stroke-dasharray', '5 4');
    turnRing.setAttribute('class', 'pawn-turn-ring');
    g.appendChild(turnRing);
  }

  return g;
}

function pawnOffsetIn(group, idx) {
  const n = group.length;
  if (n === 1) return { dx: 0, dy: 0 };
  // Aligne les pions côte à côte horizontalement (jusqu'à 3 par ligne, puis 2ᵉ rangée).
  const perRow = Math.min(n, 3);
  const spacing = 18;
  const row = Math.floor(idx / perRow);
  const col = idx % perRow;
  const cols = Math.min(n - row * perRow, perRow);
  const dx = -((cols - 1) * spacing) / 2 + col * spacing;
  const dy = row * 22;
  return { dx, dy };
}

export function renderPawns(svg, players, currentUid = null) {
  const ns = 'http://www.w3.org/2000/svg';
  let layer = svg.querySelector('#pawns-layer');
  if (!layer) {
    layer = document.createElementNS(ns, 'g');
    layer.setAttribute('id', 'pawns-layer');
    svg.appendChild(layer);
  }
  layer.innerHTML = '';

  const groupedByPos = new Map();
  players.forEach((pl) => {
    const arr = groupedByPos.get(pl.position) || [];
    arr.push(pl);
    groupedByPos.set(pl.position, arr);
  });

  groupedByPos.forEach((group, pos) => {
    const p = POSITIONS[pos] || POSITIONS[0];
    group.forEach((pl, k) => {
      const { dx, dy } = pawnOffsetIn(group, k);
      const el = createPawnEl(pl, p.x + dx, p.y + dy, pl.uid === currentUid);
      layer.appendChild(el);
    });
  });
}

export async function animatePawnMove(svg, uid, fromIdx, toIdx) {
  const layer = svg.querySelector('#pawns-layer');
  if (!layer) return;
  const pawn = layer.querySelector(`.pawn[data-uid="${uid}"]`);
  if (!pawn) return;

  const step = fromIdx < toIdx ? 1 : -1;
  pawn.classList.add('is-moving');
  layer.appendChild(pawn);

  for (let i = fromIdx + step; i !== toIdx + step; i += step) {
    const p = POSITIONS[i] || POSITIONS[0];
    pawn.style.transform = `translate(${p.x}px, ${p.y}px) scale(1.15)`;
    sfx.step();
    if (viewState.mode === 'zoom' && viewState.focusUid === uid) {
      animateViewBox(svg, viewBoxAt(p.x, p.y), 240);
    }
    await new Promise((r) => setTimeout(r, 260));
  }
  pawn.style.transform = pawn.style.transform.replace(' scale(1.15)', '');
  pawn.classList.remove('is-moving');
}

// --- Helper : mini-coin HTML/CSS d'un joueur (sidebar / classement) ---
function coinMiniHtml(coin, color) {
  // Le SVG inline rend la pièce avec son gradient propre (pas de globalisation CSS)
  return `<span class="coin-mini" style="--ring:${color}">
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <radialGradient id="cm-${coin.id}" cx="35%" cy="30%" r="70%">
          ${gradientStops(coin.gradient)}
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="${coin.ring}" stroke="#1a1a1a" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="11.5" fill="url(#cm-${coin.id})"/>
      <text x="16" y="17" text-anchor="middle" dominant-baseline="middle"
            font-family="Georgia,serif" font-weight="700" font-size="14" fill="${coin.ink}">${coin.symbol}</text>
    </svg>
  </span>`;
}

function gradientStops(gradId) {
  const stops = {
    coinGold:     ['#FFE9A5', '#E8B14F', '#A87A2C'],
    coinSilver:   ['#FAFAFC', '#C8CDD6', '#7B8390'],
    coinBronze:   ['#FFD0A8', '#D08A4B', '#7C4513'],
    coinGreen:    ['#C8F5D8', '#3FAB72', '#15633E'],
    coinOrange:   ['#FFE4B0', '#F49B2C', '#A0510B'],
    coinPlatinum: ['#F4F8FF', '#B8C4D8', '#5C6E88'],
  }[gradId] || ['#FFE9A5', '#E8B14F', '#A87A2C'];
  return `<stop offset="0%" stop-color="${stops[0]}"/><stop offset="40%" stop-color="${stops[1]}"/><stop offset="100%" stop-color="${stops[2]}"/>`;
}
export { coinMiniHtml };

// --- Liste des joueurs (sidebar) ------------------------
export function renderPlayers(container, players, currentTurnUid, selfUid) {
  container.innerHTML = '';
  players.forEach((p) => {
    const isTurn = p.uid === currentTurnUid;
    const isSelf = p.uid === selfUid;
    const coinIndex = p.coinIndex ?? 0;
    const coin = PAWN_COINS[coinIndex % PAWN_COINS.length] || PAWN_COINS[0];
    const handCount = (p.hand || []).length;
    const el = document.createElement('div');
    el.className = 'game-player' + (isTurn ? ' is-active' : '') + (isSelf ? ' is-me' : '');
    el.innerHTML = `
      ${coinMiniHtml(coin, p.color)}
      <span class="game-player-name">${escapeHtml(p.name)}</span>
      ${handCount ? `<span class="game-player-hand" title="Cartes en main">${handCount}</span>` : ''}
      <span class="game-player-score">${p.score}</span>
    `;
    container.appendChild(el);
  });
}

// --- Modal carte quiz ------------------------------------
export function showQuizCard(card, { canAnswer, onAnswer }) {
  const modal = document.getElementById('card-modal');
  const root = document.getElementById('game-card');
  const cat = CATEGORIES[card.cat];

  root.classList.remove('is-chance');
  root.style.setProperty('--card-bg', cat.color);
  root.innerHTML = `
    <span class="card-corner-tl"></span><span class="card-corner-tr"></span>
    <span class="card-corner-bl"></span><span class="card-corner-br"></span>
    <div class="card-head">
      <div class="card-globe">
        ${cat.logo
          ? `<img src="${cat.logo}" alt="" class="card-logo-img" />`
          : `<svg viewBox="0 0 24 24" style="color:${cat.color}"><use href="#${cat.iconId}"/></svg>`}
      </div>
      <span class="card-difficulty">${escapeHtml(cat.name)} — ${escapeHtml(card.difficulty)}</span>
    </div>
    <p class="card-question">${escapeHtml(card.question)}</p>
    <div class="card-choices">
      ${card.choices.map((c, i) => `
        <button class="card-choice" data-i="${i}" ${canAnswer ? '' : 'disabled'}>
          <strong>${String.fromCharCode(65 + i)}.</strong> ${escapeHtml(c)}
        </button>
      `).join('')}
    </div>
    <div class="card-answer"><strong>Explication</strong><span class="card-answer-text"></span></div>
    <div class="card-feedback" hidden></div>
    <div class="card-actions">
      <button class="btn btn-primary card-close" hidden>Continuer</button>
    </div>
  `;
  modal.classList.add('active');

  const choices = root.querySelectorAll('.card-choice');
  const feedback = root.querySelector('.card-feedback');
  const closeBtn = root.querySelector('.card-close');

  sfx.flip();

  choices.forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.i, 10);
      const correct = i === card.answer;
      if (correct) sfx.correct(); else sfx.wrong();
      choices.forEach((b, idx) => {
        b.disabled = true;
        if (idx === card.answer) b.classList.add('is-correct');
        else if (idx === i) b.classList.add('is-wrong');
      });
      const answerBlock = root.querySelector('.card-answer');
      answerBlock.querySelector('.card-answer-text').textContent = card.explanation;
      answerBlock.classList.add('show');

      feedback.hidden = false;
      feedback.innerHTML = `
        <div class="feedback-status ${correct ? 'ok' : 'ko'}">
          ${correct ? 'Bonne réponse !' : 'Mauvaise réponse'}
        </div>
      `;
      closeBtn.hidden = false;
      onAnswer?.(correct, card);
    });
  });

  return new Promise((resolve) => {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      root.classList.remove('is-chance');
      resolve();
    }, { once: true });
  });
}

// --- Modal carte chance ----------------------------------
// Si la carte est `keepable`, on propose deux choix : Appliquer / Garder.
// Sinon, un seul bouton "Appliquer".
// onChoice('apply'|'keep')
export function showChanceCard(card, { canKeep = false } = {}) {
  const modal = document.getElementById('card-modal');
  const root = document.getElementById('game-card');

  root.classList.add('is-chance');
  root.style.setProperty('--card-bg', CATEGORIES.chance.color);
  sfx.chance();
  root.innerHTML = `
    <div class="card-inner">
      <div class="card-icon-big">
        <img src="${CATEGORIES.chance.logo}" alt="" class="card-logo-img-big" />
      </div>
      <h3 class="card-title">${escapeHtml(card.title)}</h3>
      <p class="card-text">${escapeHtml(card.text)}</p>
      <div class="card-actions">
        <button class="btn btn-primary card-apply">Appliquer</button>
        ${canKeep ? '<button class="btn btn-secondary card-keep">Garder en main</button>' : ''}
      </div>
    </div>
  `;
  modal.classList.add('active');

  return new Promise((resolve) => {
    const close = (choice) => {
      modal.classList.remove('active');
      root.classList.remove('is-chance');
      resolve(choice);
    };
    root.querySelector('.card-apply').addEventListener('click', () => close('apply'), { once: true });
    if (canKeep) root.querySelector('.card-keep').addEventListener('click', () => close('keep'), { once: true });
  });
}

// --- Modal info simple (Départ/Arrivée/spéciale) ---
export function showInfoCard(title, text) {
  const modal = document.getElementById('card-modal');
  const root = document.getElementById('game-card');
  root.classList.remove('is-chance');
  root.style.setProperty('--card-bg', '#1B1A20');
  sfx.flip();
  root.innerHTML = `
    <div class="card-inner">
      <div class="card-icon-big">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="3" fill="currentColor"/><path d="M12 21c-5-6-7-9-7-12a7 7 0 0114 0c0 3-2 6-7 12z" fill="currentColor"/></svg>
      </div>
      <h3 class="card-title">${escapeHtml(title)}</h3>
      <p class="card-text">${escapeHtml(text)}</p>
      <div class="card-actions">
        <button class="btn btn-primary card-close">OK</button>
      </div>
    </div>
  `;
  modal.classList.add('active');
  return new Promise((resolve) => {
    root.querySelector('.card-close').addEventListener('click', () => {
      modal.classList.remove('active');
      resolve();
    }, { once: true });
  });
}

// --- Affichage de la main de cartes (sidebar) ----------
// Rendu compact, cliquable. onPlay(cardId) déclenché au clic.
export function renderHand(container, hand, { onPlay } = {}) {
  const cards = (hand || []).map(findChanceCardById).filter(Boolean);
  if (!cards.length) {
    container.innerHTML = '<p class="hand-empty">Aucune carte en main</p>';
    return;
  }
  container.innerHTML = cards.map((c) => `
    <button class="hand-card" data-id="${c.id}" type="button" title="${escapeHtml(c.text)}">
      <span class="hand-card-icon">
        <svg viewBox="0 0 24 24"><use href="#${c.iconId}"/></svg>
      </span>
      <span class="hand-card-title">${escapeHtml(c.title)}</span>
      <span class="hand-card-cta">Jouer</span>
    </button>
  `).join('');
  container.querySelectorAll('.hand-card').forEach((btn) => {
    btn.addEventListener('click', () => { sfx.click(); onPlay?.(btn.dataset.id); });
  });
}

// --- Toasts ----------------------------------------------
const TOAST_KINDS = { ok: 'success', error: 'error', warn: 'info', info: 'info' };
export function toast(message, kind = 'info') {
  const wrap = document.getElementById('toast-container');
  const css = TOAST_KINDS[kind] || 'info';
  const el = document.createElement('div');
  el.className = `toast ${css}`;
  el.textContent = message;
  wrap.appendChild(el);
  if (kind === 'ok' || kind === 'info') sfx.ding();
  setTimeout(() => el.remove(), 3100);
}

// --- Journal (sans émojis) -----------------------------
export function renderLog(container, players, lastEvent) {
  if (!lastEvent) return;
  const li = document.createElement('li');
  const name = lastEvent.name || lastEvent.winner || '';
  switch (lastEvent.type) {
    case 'start':  li.innerHTML = '<strong>Partie lancée.</strong>'; break;
    case 'move':   li.innerHTML = `<strong>${escapeHtml(name)}</strong> fait ${lastEvent.dice} → case ${lastEvent.position}`; break;
    case 'quiz':   li.innerHTML = lastEvent.correct
                      ? `<strong>${escapeHtml(name)}</strong> : +${lastEvent.points} savoir`
                      : `<strong>${escapeHtml(name)}</strong> : mauvaise réponse`; break;
    case 'chance': li.innerHTML = `<strong>${escapeHtml(name)}</strong> : ${escapeHtml(lastEvent.title)} (${escapeHtml(lastEvent.detail)})`; break;
    case 'keep':   li.innerHTML = `<strong>${escapeHtml(name)}</strong> garde « ${escapeHtml(lastEvent.title)} »`; break;
    case 'hand':   li.innerHTML = `<strong>${escapeHtml(name)}</strong> ${escapeHtml(lastEvent.detail)}`; break;
    case 'special':li.innerHTML = `<strong>${escapeHtml(name)}</strong> : ${escapeHtml(lastEvent.detail || lastEvent.special)}`; break;
    case 'skip':   li.innerHTML = `<strong>${escapeHtml(name)}</strong> passe son tour`; break;
    case 'end':    li.innerHTML = `<strong>${escapeHtml(lastEvent.winner)}</strong> arrive en premier`; break;
    default:       return;
  }
  container.prepend(li);
  while (container.children.length > 30) {
    container.removeChild(container.lastChild);
  }
}

// =========================================================
// DÉ 3D — cube qui tourne sur lui-même
// La structure HTML attendue est <div class="dice"><div class="dice-cube">
// avec 6 faces .dice-face.face-{1..6}. Si elle n'existe pas encore, on la crée.
// =========================================================
function ensureDiceCube(diceEl) {
  if (diceEl.querySelector('.dice-cube')) return diceEl.querySelector('.dice-cube');
  diceEl.innerHTML = '';
  const cube = document.createElement('div');
  cube.className = 'dice-cube';
  for (let i = 1; i <= 6; i++) {
    const f = document.createElement('div');
    f.className = `dice-face face-${i}`;
    // Pattern de points selon la face
    f.innerHTML = dotsForFace(i);
    cube.appendChild(f);
  }
  diceEl.appendChild(cube);
  return cube;
}
function dotsForFace(n) {
  // Positions des points dans une grille 3x3 pour chaque face
  const layouts = {
    1: ['c'],
    2: ['tl', 'br'],
    3: ['tl', 'c', 'br'],
    4: ['tl', 'tr', 'bl', 'br'],
    5: ['tl', 'tr', 'c', 'bl', 'br'],
    6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
  };
  return (layouts[n] || []).map((pos) => `<span class="dot dot-${pos}"></span>`).join('');
}

// Orientations cibles pour montrer chaque face vers l'avant
const FACE_ROTATIONS = {
  1: { x:    0, y:    0 },
  2: { x:  -90, y:    0 },
  3: { x:    0, y:   90 },
  4: { x:    0, y:  -90 },
  5: { x:   90, y:    0 },
  6: { x:  180, y:    0 },
};

export function animateDice(diceEl, finalValue) {
  return new Promise((resolve) => {
    const cube = ensureDiceCube(diceEl);
    diceEl.classList.add('is-rolling');
    sfx.diceRoll();

    // On ajoute des tours complets pour rendre le mouvement spectaculaire
    const target = FACE_ROTATIONS[finalValue] || FACE_ROTATIONS[1];
    const spinX = 360 * 3 + target.x;  // 3 tours sur X
    const spinY = 360 * 3 + target.y;  // 3 tours sur Y
    cube.style.transition = 'transform 1100ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    cube.style.transform = `rotateX(${spinX}deg) rotateY(${spinY}deg)`;

    setTimeout(() => {
      diceEl.classList.remove('is-rolling');
      // On normalise la rotation à la valeur finale (sans les tours en plus)
      cube.style.transition = 'none';
      cube.style.transform = `rotateX(${target.x}deg) rotateY(${target.y}deg)`;
      resolve();
    }, 1150);
  });
}

// --- utilitaires -----------------------------------------
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// =========================================================
// MAIN — entrée du site, routing entre écrans, événements
// =========================================================

import { ensureAuth, OFFLINE_MODE } from './firebase-config.js';
import { unlockAudio, sfx, setMuted, isMuted } from './audio.js';
import {
  createRoom, joinRoom, subscribeRoom, leaveRoom, roomExists
} from './multiplayer.js';
import {
  startGame, playDice, answerQuiz, applyChance, keepChanceCard, playHandCard,
  applySpecialTile, endTurn, startTurn, pickQuizCard, pickChanceCard,
  markQuizAsked, BOARD,
} from './game.js';
import {
  renderBoard, renderPawns, renderPlayers, renderLog, renderHand,
  showQuizCard, showChanceCard, showInfoCard,
  toast, animateDice, animatePawnMove, setBoardView, getViewMode,
  coinMiniHtml,
} from './ui.js';
import { CATEGORIES, BOARD_SIZE, PAWN_COINS } from './data.js';

// --- État local -----------------------------------------
const state = {
  user: null,           // {uid}
  name: '',
  code: null,           // code de salle courant
  roomUnsub: null,      // unsubscribe Firestore
  lastTurnIndex: -1,    // pour détecter changement de tour
  lastEventTs: 0,
  isHost: false,
  pendingAction: false, // bloque le double-clic
  awaitingPlay: false,  // un joueur a lancé le dé et doit jouer la carte
  positions: {},        // {uid: position} — pour détecter les mouvements et animer
  animatingMove: false, // bloque le ré-rendu pendant l'animation
  lastRoom: null,       // dernière snapshot room observée (askedQuizIds, etc.)
  idleTimerId: null,    // id du timer 30s d'inactivité
};

const IDLE_TIMEOUT_MS = 30000;

// --- Routing entre écrans -------------------------------
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

// --- Helpers DOM ----------------------------------------
const $ = (sel) => document.querySelector(sel);

// =========================================================
// HOME
// =========================================================
$('#btn-rules').addEventListener('click', () => showScreen('screen-rules'));
$('#btn-rules-back').addEventListener('click', () => showScreen('screen-home'));
$('#btn-join-back').addEventListener('click', () => showScreen('screen-home'));

$('#btn-create-room').addEventListener('click', async () => {
  const name = readPlayerName();
  if (!name) return toast('Saisis ton pseudo d\'abord', 'warn');
  state.user = state.user || await ensureAuth();
  state.name = name;
  try {
    const code = await createRoom({ uid: state.user.uid, name });
    state.code = code;
    state.isHost = true;
    enterRoom(code);
  } catch (e) {
    console.error(e);
    toast('Erreur de création : ' + e.message, 'error');
  }
});

$('#btn-join-room').addEventListener('click', () => {
  const name = readPlayerName();
  if (!name) return toast('Saisis ton pseudo d\'abord', 'warn');
  state.name = name;
  showScreen('screen-join');
});

$('#btn-join-confirm').addEventListener('click', async () => {
  const code = $('#join-code').value.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(code)) {
    $('#join-error').textContent = 'Code invalide';
    return;
  }
  $('#join-error').textContent = '';
  state.user = state.user || await ensureAuth();
  if (!(await roomExists(code))) {
    $('#join-error').textContent = 'Aucune salle avec ce code';
    return;
  }
  try {
    await joinRoom(code, { uid: state.user.uid, name: state.name });
    state.code = code;
    state.isHost = false;
    enterRoom(code);
  } catch (e) {
    console.error(e);
    $('#join-error').textContent = e.message || 'Erreur';
  }
});

function readPlayerName() {
  const raw = $('#player-name').value.trim();
  return raw.slice(0, 16);
}

// =========================================================
// LOBBY → GAME
// =========================================================
function enterRoom(code) {
  if (state.roomUnsub) state.roomUnsub();
  $('#room-code').textContent = code;
  $('#game-room-code').textContent = code;
  renderQrCode(code);
  showScreen('screen-lobby');

  state.roomUnsub = subscribeRoom(code, (snap) => {
    if (!snap.exists()) {
      toast('La salle a été fermée', 'warn');
      leaveCurrentRoom();
      return;
    }
    const room = snap.data();
    onRoomUpdate(room);
  });
}

function onRoomUpdate(room) {
  state.lastRoom = room;
  // Lobby ?
  if (room.status === 'lobby') {
    clearIdleTimer();
    renderLobby(room);
    return;
  }
  // Playing ?
  if (room.status === 'playing') {
    if (!isOnGameScreen()) {
      showScreen('screen-game');
      // Premier rendu du plateau
      renderBoard(document.getElementById('board-svg'));
    }
    renderGame(room);
    return;
  }
  // Ended ?
  if (room.status === 'ended') {
    clearIdleTimer();
    renderGame(room); // on garde le plateau visible derrière
    showEnd(room);
  }
}

function isOnGameScreen() {
  return document.getElementById('screen-game').classList.contains('active');
}

// --- Lobby --------------------------------------------------
function renderLobby(room) {
  const list = $('#players-list');
  list.innerHTML = '';
  room.players.forEach((p) => {
    const isHost = p.uid === room.hostUid;
    const coin = PAWN_COINS[(p.coinIndex ?? 0) % PAWN_COINS.length] || PAWN_COINS[0];
    const el = document.createElement('div');
    el.className = 'player-row' + (isHost ? ' is-host' : '');
    el.innerHTML = `
      ${coinMiniHtml(coin, p.color)}
      <span>${escapeHtml(p.name)}${p.uid === state.user?.uid ? ' (toi)' : ''}</span>
    `;
    list.appendChild(el);
  });

  const isHost = state.user && room.hostUid === state.user.uid;
  state.isHost = isHost;
  const hint = $('#lobby-hint');
  const startBtn = $('#btn-start-game');
  if (room.players.length < 2) {
    hint.textContent = `En attente d'autres joueurs… (${room.players.length}/6)`;
    startBtn.disabled = true;
  } else {
    hint.textContent = isHost
      ? `Prêt à lancer (${room.players.length}/6) — c'est toi qui démarres`
      : `En attente de l'hôte… (${room.players.length}/6)`;
    startBtn.disabled = !isHost;
  }
}

$('#btn-start-game').addEventListener('click', async () => {
  if (!state.code || !state.user) return;
  sfx.start();
  await startGame(state.code, state.user.uid);
});

$('#btn-leave-lobby').addEventListener('click', async () => {
  await leaveCurrentRoom();
});

$('#btn-quit-game').addEventListener('click', async () => {
  if (!confirm('Quitter la partie ?')) return;
  await leaveCurrentRoom();
});

$('#btn-end-home').addEventListener('click', async () => {
  await leaveCurrentRoom();
});

$('#btn-copy-code').addEventListener('click', () => {
  if (!state.code) return;
  navigator.clipboard?.writeText(state.code);
  toast('Code copié !', 'ok');
});

const btnCopyLink = document.getElementById('btn-copy-link');
if (btnCopyLink) {
  btnCopyLink.addEventListener('click', () => {
    if (!state.code) return;
    navigator.clipboard?.writeText(buildJoinUrl(state.code));
    toast('Lien copié !', 'ok');
  });
}

function buildJoinUrl(code) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('code', code);
  return url.toString();
}

let qrInstance = null;
function renderQrCode(code) {
  const canvas = document.getElementById('qr-canvas');
  if (!canvas || typeof QRCode === 'undefined') return;
  canvas.innerHTML = '';
  qrInstance = new QRCode(canvas, {
    text: buildJoinUrl(code),
    width: 180,
    height: 180,
    colorDark: '#1F1B16',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.M,
  });
}

async function leaveCurrentRoom() {
  clearIdleTimer();
  if (state.code && state.user) {
    try { await leaveRoom(state.code, state.user.uid); } catch {}
  }
  if (state.roomUnsub) state.roomUnsub();
  state.code = null;
  state.roomUnsub = null;
  state.lastTurnIndex = -1;
  state.lastEventTs = 0;
  state.awaitingPlay = false;
  state.lastRoom = null;
  $('#end-modal').classList.remove('active');
  $('#card-modal').classList.remove('active');
  showScreen('screen-home');
}

// --- Timer d'inactivité ----------------------------------
function clearIdleTimer() {
  if (state.idleTimerId) {
    clearTimeout(state.idleTimerId);
    state.idleTimerId = null;
  }
}
function armIdleTimer() {
  clearIdleTimer();
  state.idleTimerId = setTimeout(async () => {
    state.idleTimerId = null;
    toast('30 s sans action : tu as été déconnecté', 'warn');
    await leaveCurrentRoom();
  }, IDLE_TIMEOUT_MS);
}

// =========================================================
// GAME RENDER
// =========================================================
function renderGame(room) {
  state.lastPlayers = room.players;
  const me = room.players.find((p) => p.uid === state.user?.uid);
  const cur = room.players[room.turnIndex];
  const svg = document.getElementById('board-svg');

  // Détecte si un joueur s'est déplacé : si oui, on anime au lieu d'un saut.
  const movedUid = detectMove(room.players);
  if (movedUid && !state.animatingMove) {
    animateMoveFromState(svg, room.players, movedUid, cur?.uid);
    // Le ré-rendu final se fait à la fin de l'animation
    return;
  }
  // Si pas d'animation en cours, on stocke les positions et on rend
  if (!state.animatingMove) {
    storePositions(room.players);
  }

  // Pions
  renderPawns(svg, room.players, cur?.uid);
  // Suivi du zoom : si on est en mode zoom et que le focus joueur a bougé, on recale
  if (getViewMode() === 'zoom' && me) setBoardView(svg, 'zoom', me);
  // Liste joueurs
  renderPlayers($('#game-players'), room.players, cur?.uid, state.user?.uid);
  // Main du joueur courant (cartes gardées, jouables à tout moment)
  const handContainer = $('#hand-cards');
  if (handContainer) {
    renderHand(handContainer, me?.hand || [], {
      onPlay: async (cardId) => {
        if (state.pendingAction) return;
        try {
          await playHandCard(state.code, state.user.uid, cardId);
          toast('Carte jouée', 'ok');
        } catch (e) {
          console.error(e);
          toast('Impossible de jouer la carte', 'error');
        }
      },
    });
  }
  // Tour
  $('#current-player-name').textContent = cur?.name || '—';
  $('#current-player-name').style.color = cur?.color || '';

  // Bouton dé : actif uniquement pour le joueur courant
  const myTurn = cur?.uid === state.user?.uid;
  const rollBtn = $('#btn-roll-dice');
  rollBtn.disabled = !myTurn || state.pendingAction || state.awaitingPlay;
  rollBtn.textContent = myTurn ? 'Lancer le dé' : `Tour de ${cur?.name || '...'}`;

  // Journal — on déduplique par timestamp
  if (room.lastEvent && room.lastEvent.ts !== state.lastEventTs) {
    state.lastEventTs = room.lastEvent.ts;
    renderLog($('#log-entries'), room.players, room.lastEvent);
  }

  // Détection de changement de tour : si c'est notre tour et qu'on doit
  // automatiquement passer (skip), on déclenche startTurn pour le décrémenter.
  if (state.lastTurnIndex !== room.turnIndex) {
    state.lastTurnIndex = room.turnIndex;
    state.awaitingPlay = false;
    if (myTurn && me?.skipNext > 0) {
      // C'est notre tour mais on doit passer
      startTurn(state.code);
      toast('Tu passes ce tour', 'warn');
    }
  }

  // Timer d'inactivité : armé uniquement pour le joueur dont c'est le tour.
  // Si 30s sans action -> auto-déconnexion (leaveRoom).
  if (myTurn && !state.awaitingPlay && !state.pendingAction) {
    armIdleTimer();
  } else {
    clearIdleTimer();
  }
}

// --- Détection de mouvement + animation ------------------
function storePositions(players) {
  players.forEach((p) => { state.positions[p.uid] = p.position; });
}
function detectMove(players) {
  for (const p of players) {
    const prev = state.positions[p.uid];
    if (prev != null && prev !== p.position) return p.uid;
  }
  return null;
}
async function animateMoveFromState(svg, players, movedUid, currentUid) {
  state.animatingMove = true;
  try {
    const player = players.find((p) => p.uid === movedUid);
    const prev = state.positions[movedUid] ?? 0;
    const dest = player.position;
    // Si le saut est trop grand (carte qui téléporte) : pas d'animation step-by-step
    const stepCount = Math.abs(dest - prev);
    if (stepCount > 0 && stepCount <= 12) {
      await animatePawnMove(svg, movedUid, prev, dest);
    }
    // Refresh final : positions à jour + pions correctement empilés
    storePositions(players);
    renderPawns(svg, players, currentUid);
    // Maintien du zoom si actif
    const me = players.find((p) => p.uid === state.user?.uid);
    if (getViewMode() === 'zoom' && me) setBoardView(svg, 'zoom', me);
    renderPlayers($('#game-players'), players, currentUid, state.user?.uid);
  } finally {
    state.animatingMove = false;
  }
}

// --- Bouton vue d'ensemble / zoom ------------------------
function bindBoardViewToggle() {
  const btn = $('#btn-toggle-view');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const svg = document.getElementById('board-svg');
    if (getViewMode() === 'full') {
      const me = currentRoomPlayers().find((p) => p.uid === state.user?.uid);
      if (me) {
        setBoardView(svg, 'zoom', me);
        btn.textContent = 'Vue d\'ensemble';
        btn.classList.add('is-zoomed');
      }
    } else {
      setBoardView(svg, 'full');
      btn.textContent = 'Zoomer sur moi';
      btn.classList.remove('is-zoomed');
    }
  });
}
function currentRoomPlayers() {
  // Récupère les joueurs depuis l'état global (placeholder — read from sidebar render)
  // Plus simple : tracker la dernière room observée
  return state.lastPlayers || [];
}

// --- Lancer le dé ----------------------------------------
$('#btn-roll-dice').addEventListener('click', async () => {
  if (state.pendingAction) return;
  clearIdleTimer();
  state.pendingAction = true;
  const rollBtn = $('#btn-roll-dice');
  rollBtn.disabled = true;

  try {
    const res = await playDice(state.code, state.user.uid);
    if (!res) { state.pendingAction = false; return; }
    state.awaitingPlay = true;

    await animateDice(document.getElementById('dice'), res.dice);

    // En fonction de la case, on déclenche la carte
    if (res.tile.type === 'start') {
      await showInfoCard('START', 'Tu es au départ ! Lance le dé pour avancer.');
    } else if (res.tile.type === 'end') {
      await showInfoCard('FINISH', 'Tu es arrivé ! Le tour se termine pour les autres joueurs, puis on compte les points.');
    } else if (res.tile.special) {
      const labels = {
        plus2:  { title: '+2 Cases',      text: 'Tu prends de l\'avance : avance de 2 cases !' },
        minus2: { title: '-2 Cases',      text: 'Petit retour en arrière : recule de 2 cases.' },
        run:    { title: 'Course',        text: 'Tu prends de l\'élan : avance de 2 cases !' },
        replay: { title: 'Rejoue',        text: 'Tu rejoues ce tour ! Lance le dé à nouveau.' },
        prison: { title: 'Prison',        text: 'Tu es en prison : tu passeras ton prochain tour.' },
        museum: { title: 'Musée',         text: 'Visite du musée : +1 point de savoir.' },
      };
      const info = labels[res.tile.special] || { title: 'Case spéciale', text: '' };
      await showInfoCard(info.title, info.text);
      await applySpecialTile(state.code, state.user.uid, res.tile.special);
    } else if (res.tile.category === 'chance') {
      const card = pickChanceCard();
      const choice = await showChanceCard(card, { canKeep: !!card.keepable });
      if (choice === 'keep') {
        await keepChanceCard(state.code, state.user.uid, card);
      } else {
        await applyChance(state.code, state.user.uid, card);
      }
    } else if (res.tile.category) {
      const askedIds = state.lastRoom?.askedQuizIds || [];
      const card = pickQuizCard(res.tile.category, null, askedIds);
      await markQuizAsked(state.code, card.id);
      const points = card.difficulty === 'Difficile' ? 2 : 1;
      let answeredCorrect = false;
      await showQuizCard(card, {
        canAnswer: true,
        onAnswer: (correct) => { answeredCorrect = correct; },
      });
      await answerQuiz(state.code, state.user.uid, answeredCorrect, points);
    }

    state.awaitingPlay = false;
    await endTurn(state.code);
  } catch (e) {
    console.error(e);
    toast('Erreur de tour : ' + e.message, 'error');
  } finally {
    state.pendingAction = false;
  }
});

// =========================================================
// FIN DE PARTIE
// =========================================================
function showEnd(room) {
  const modal = $('#end-modal');
  if (!modal.classList.contains('active')) sfx.win();
  const ol = $('#ranking');
  ol.innerHTML = '';
  (room.ranking || []).forEach((p, i) => {
    const coin = PAWN_COINS[(p.coinIndex ?? 0) % PAWN_COINS.length] || PAWN_COINS[0];
    const li = document.createElement('li');
    li.className = `rank-${i + 1}`;
    li.setAttribute('data-rank', i + 1);
    li.innerHTML = `
      ${coinMiniHtml(coin, p.color)}
      <span style="flex:1">${escapeHtml(p.name)}</span>
      <strong>${p.score} pts</strong>
    `;
    ol.appendChild(li);
  });
  modal.classList.add('active');
}

// =========================================================
// INIT
// =========================================================
(async function init() {
  // Bandeau si on est en mode local (pas de Firebase configuré)
  if (OFFLINE_MODE) {
    const banner = document.createElement('div');
    banner.className = 'offline-banner';
    banner.innerHTML = `Mode local : pour activer le multi en ligne, configure Firebase dans <code>js/firebase-config.js</code>. <br/>En mode local, partage l'URL et joue dans plusieurs onglets pour tester.`;
    document.body.prepend(banner);
  }

  state.user = await ensureAuth();
  // Pré-remplit le pseudo si dispo
  const saved = localStorage.getItem('babel.name');
  if (saved) $('#player-name').value = saved;
  $('#player-name').addEventListener('change', (e) => {
    localStorage.setItem('babel.name', e.target.value);
  });
  bindBoardViewToggle();

  // Déverrouille l'audio dès la première interaction (politique navigateur)
  const unlockOnce = () => {
    unlockAudio();
    document.removeEventListener('click', unlockOnce);
    document.removeEventListener('keydown', unlockOnce);
  };
  document.addEventListener('click', unlockOnce);
  document.addEventListener('keydown', unlockOnce);

  // Bouton mute sur la home
  installMuteButton();

  // Auto-jonction depuis ?code=ABCDEF (QR scan ou lien partagé)
  const url = new URL(window.location.href);
  const sharedCode = (url.searchParams.get('code') || '').trim().toUpperCase();
  if (/^[A-Z0-9]{4,8}$/.test(sharedCode)) {
    state.pendingShareCode = sharedCode;
    const joinInput = document.getElementById('join-code');
    if (joinInput) joinInput.value = sharedCode;
    // Sur la home : on cache le bouton "Créer" et on met en avant "Rejoindre"
    const createBtn = document.getElementById('btn-create-room');
    if (createBtn) createBtn.style.display = 'none';
    const joinBtn = document.getElementById('btn-join-room');
    if (joinBtn) joinBtn.textContent = `Rejoindre la partie ${sharedCode}`;
    // Petit bandeau explicatif
    const home = document.querySelector('.home-inner');
    if (home && !document.getElementById('share-banner')) {
      const b = document.createElement('div');
      b.id = 'share-banner';
      b.className = 'share-banner';
      b.textContent = `Tu as été invité à la partie ${sharedCode}. Saisis ton pseudo puis rejoins !`;
      home.insertBefore(b, home.querySelector('.home-actions'));
    }
    document.getElementById('player-name')?.focus();
  }
})();

// Si l'utilisateur clique sur "Rejoindre" alors qu'un code partagé est présent,
// on saute la saisie du code et on rejoint directement.
const _origJoinHandler = document.getElementById('btn-join-room');
if (_origJoinHandler) {
  _origJoinHandler.addEventListener('click', async () => {
    if (!state.pendingShareCode) return;
    const name = readPlayerName();
    if (!name) return;
    state.user = state.user || await ensureAuth();
    state.name = name;
    if (!(await roomExists(state.pendingShareCode))) {
      toast('Cette partie n\'existe plus', 'error');
      state.pendingShareCode = null;
      // Rétablit l'UI normale
      const createBtn = document.getElementById('btn-create-room');
      if (createBtn) createBtn.style.display = '';
      document.getElementById('share-banner')?.remove();
      return;
    }
    try {
      await joinRoom(state.pendingShareCode, { uid: state.user.uid, name });
      state.code = state.pendingShareCode;
      state.isHost = false;
      state.pendingShareCode = null;
      enterRoom(state.code);
    } catch (e) {
      console.error(e);
      toast(e.message || 'Erreur', 'error');
    }
  });
}

// --- Bouton mute -----------------------------------------
function installMuteButton() {
  if (document.getElementById('btn-mute')) return;
  const btn = document.createElement('button');
  btn.id = 'btn-mute';
  btn.type = 'button';
  btn.className = 'btn-mute';
  btn.setAttribute('aria-label', 'Activer / couper le son');
  const sync = () => {
    btn.textContent = isMuted() ? '♪ off' : '♪ on';
    btn.classList.toggle('is-muted', isMuted());
  };
  sync();
  btn.addEventListener('click', () => {
    setMuted(!isMuted());
    sync();
  });
  document.body.appendChild(btn);
}

// --- utilitaires -----------------------------------------
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

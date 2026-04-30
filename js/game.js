// =========================================================
// GAME LOGIC — règles, dé, mouvement, cartes, victoire
// Toutes les actions sont écrites via transactRoom() pour
// garantir la cohérence multi-joueurs.
// =========================================================

import { transactRoom, updateRoom } from './multiplayer.js';
import {
  buildBoard, BOARD_SIZE, QUIZ_CARDS, CHANCE_CARDS, CATEGORIES, findChanceCardById
} from './data.js';

const BOARD = buildBoard();

// --- Sélection de cartes ---------------------------------
// `askedIds` = ids des cartes déjà tirées dans la salle (pour éviter les redites).
// Si tout le pool a été posé, on relâche les filtres pour ne pas planter.
export function pickQuizCard(category, difficulty = null, askedIds = []) {
  const asked = new Set(askedIds);
  const filterCat = (c) => c.cat === category;
  const filterDiff = (c) => !difficulty || c.difficulty === difficulty;
  const filterFresh = (c) => !asked.has(c.id);

  let pool = QUIZ_CARDS.filter((c) => filterCat(c) && filterDiff(c) && filterFresh(c));
  if (!pool.length) pool = QUIZ_CARDS.filter((c) => filterCat(c) && filterFresh(c));
  if (!pool.length) pool = QUIZ_CARDS.filter(filterCat);
  if (!pool.length) pool = QUIZ_CARDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickChanceCard() {
  return CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
}

// Marque une carte quiz comme posée (côté room, partagé entre joueurs)
export async function markQuizAsked(code, cardId) {
  if (!cardId) return;
  await transactRoom(code, (room) => {
    const asked = Array.isArray(room.askedQuizIds) ? room.askedQuizIds : [];
    if (asked.includes(cardId)) return null;
    return { ...room, askedQuizIds: [...asked, cardId] };
  });
}

// --- Dé ---------------------------------------------------
// Dé à 4 faces (1-4) pour rallonger un peu la partie.
export function rollDie() {
  return 1 + Math.floor(Math.random() * 4);
}

// --- Mouvement -------------------------------------------
function clampPosition(p) {
  if (p < 0) return 0;
  if (p >= BOARD_SIZE) return BOARD_SIZE - 1;
  return p;
}

export function tileAt(position) {
  return BOARD[clampPosition(position)];
}

// --- Tour de jeu : démarrage du tour ---------------------
// Décrémente skipNext si > 0 et passe automatiquement au suivant.
export async function startTurn(code) {
  await transactRoom(code, (room) => {
    if (room.status !== 'playing') return null;
    const cur = room.players[room.turnIndex];
    if (!cur) return null;
    if (cur.skipNext > 0) {
      cur.skipNext = Math.max(0, cur.skipNext - 1);
      const nextIndex = (room.turnIndex + 1) % room.players.length;
      return {
        ...room,
        players: room.players,
        turnIndex: nextIndex,
        lastEvent: { type: 'skip', by: cur.uid, name: cur.name, ts: Date.now() },
      };
    }
    return null;
  });
}

// --- Lancer le dé + bouger -------------------------------
export async function playDice(code, uid) {
  const dice = rollDie();
  let landedCategory = null;
  let landedType = null;
  let landedSpecial = null;
  let actorName = '';
  let firstFinisher = null;

  await transactRoom(code, (room) => {
    if (room.status !== 'playing') return null;
    const cur = room.players[room.turnIndex];
    if (!cur || cur.uid !== uid) return null;

    const newPos = clampPosition(cur.position + dice);
    cur.position = newPos;
    actorName = cur.name;

    const tile = BOARD[newPos];
    landedType = tile.type;
    landedCategory = tile.category || null;
    landedSpecial = tile.special || null;

    // Premier joueur arrivé : on note l'index pour finir le tour
    if (tile.type === 'end' && room.firstFinisherIndex == null) {
      room.firstFinisherIndex = room.turnIndex;
      firstFinisher = cur.name;
    }

    return {
      ...room,
      lastDice: dice,
      lastEvent: {
        type: 'move', by: uid, name: cur.name,
        dice, position: newPos, tile: tile.type,
        category: tile.category || null,
        special: tile.special || null,
        firstFinisher,
        ts: Date.now(),
      },
    };
  });

  return {
    dice,
    tile: { type: landedType, category: landedCategory, special: landedSpecial },
    actorName,
    firstFinisher,
  };
}

// --- Effet d'une case spéciale (déclenché quand on tombe dessus)
export async function applySpecialTile(code, uid, special) {
  await transactRoom(code, (room) => {
    const cur = room.players.find((p) => p.uid === uid);
    if (!cur) return null;
    let detail = '';

    switch (special) {
      case 'plus2':
        cur.position = clampPosition(cur.position + 2);
        if (BOARD[cur.position].type === 'end' && room.firstFinisherIndex == null) {
          room.firstFinisherIndex = room.turnIndex;
        }
        detail = 'avance de 2 cases';
        break;
      case 'minus2':
        cur.position = clampPosition(cur.position - 2);
        detail = 'recule de 2 cases';
        break;
      case 'run':
        cur.position = clampPosition(cur.position + 2);
        if (BOARD[cur.position].type === 'end' && room.firstFinisherIndex == null) {
          room.firstFinisherIndex = room.turnIndex;
        }
        detail = 'avance de 2 cases';
        break;
      case 'replay':
        // Permet de rejouer (se traduit par : on ne change pas turnIndex à la fin)
        cur.replay = true;
        detail = 'rejoue !';
        break;
      case 'prison':
        cur.skipNext = (cur.skipNext || 0) + 1;
        detail = 'en prison : passe le prochain tour';
        break;
      case 'museum':
        cur.score += 1;
        detail = '+1 savoir (musée)';
        break;
    }

    return {
      ...room,
      lastEvent: {
        type: 'special', by: uid, name: cur.name,
        special, detail, ts: Date.now(),
      },
    };
  });
}

// --- Réponse à une question ------------------------------
export async function answerQuiz(code, uid, isCorrect, points) {
  await transactRoom(code, (room) => {
    const cur = room.players.find((p) => p.uid === uid);
    if (!cur) return null;
    if (isCorrect) cur.score += points;
    return {
      ...room,
      lastEvent: {
        type: 'quiz', by: uid, name: cur.name,
        correct: isCorrect, points: isCorrect ? points : 0,
        ts: Date.now(),
      },
    };
  });
}

// --- Application d'une carte chance ----------------------
// Logique pure : applique l'effet sur le joueur `cur` dans `room`.
// Renvoie un détail texte décrivant ce qui s'est passé. Mute room/cur en place.
function applyChanceEffect(room, cur, card) {
  let detail = '';
  switch (card.effect) {
    case 'gainPoints':
      cur.score += card.value;
      detail = `+${card.value} savoir`;
      break;
    case 'movePawn':
      cur.position = clampPosition(cur.position + card.value);
      if (BOARD[cur.position].type === 'end' && room.firstFinisherIndex == null) {
        room.firstFinisherIndex = room.players.findIndex((p) => p.uid === cur.uid);
      }
      detail = `${card.value > 0 ? '+' : ''}${card.value} cases`;
      break;
    case 'stealPoints': {
      const others = room.players.filter((p) => p.uid !== cur.uid);
      const target = others.sort((a, b) => a.score - b.score)[0];
      if (target) {
        const taken = Math.min(card.value, cur.score);
        cur.score = Math.max(0, cur.score - taken);
        target.score += taken;
        detail = `${target.name} vole ${taken} points`;
      }
      break;
    }
    case 'skipTurn':
      cur.skipNext = (cur.skipNext || 0) + card.value;
      detail = `passe ${card.value} tour(s)`;
      break;
    case 'moveToCategory': {
      let p = cur.position;
      for (let i = 1; i <= BOARD_SIZE; i++) {
        const idx = clampPosition(p + i);
        if (BOARD[idx].category === card.value) { p = idx; break; }
      }
      cur.position = p;
      detail = `vers prochaine ${card.value}`;
      break;
    }
  }
  return detail;
}

// Effet immédiat d'une carte chance (joueur a choisi "Appliquer maintenant"
// ou la carte n'est pas keepable)
export async function applyChance(code, uid, card) {
  await transactRoom(code, (room) => {
    const cur = room.players.find((p) => p.uid === uid);
    if (!cur) return null;
    const detail = applyChanceEffect(room, cur, card);
    return {
      ...room,
      lastEvent: {
        type: 'chance', by: uid, name: cur.name,
        title: card.title, detail, ts: Date.now(),
      },
    };
  });
}

// Stocke la carte dans la main du joueur (utilisable plus tard)
export async function keepChanceCard(code, uid, card) {
  await transactRoom(code, (room) => {
    const cur = room.players.find((p) => p.uid === uid);
    if (!cur) return null;
    cur.hand = Array.isArray(cur.hand) ? cur.hand : [];
    cur.hand.push(card.id);
    return {
      ...room,
      lastEvent: {
        type: 'keep', by: uid, name: cur.name,
        title: card.title, detail: 'gardée pour plus tard', ts: Date.now(),
      },
    };
  });
}

// Joue une carte gardée en main : on la retire et on applique son effet.
// Le joueur peut jouer hors de son tour (effets bonus instantanés).
export async function playHandCard(code, uid, cardId) {
  const card = findChanceCardById(cardId);
  if (!card) return;
  await transactRoom(code, (room) => {
    const cur = room.players.find((p) => p.uid === uid);
    if (!cur) return null;
    const idx = (cur.hand || []).indexOf(cardId);
    if (idx === -1) return null;
    cur.hand.splice(idx, 1);
    const detail = applyChanceEffect(room, cur, card);
    return {
      ...room,
      lastEvent: {
        type: 'hand', by: uid, name: cur.name,
        title: card.title, detail: `joue ${card.title} (${detail})`, ts: Date.now(),
      },
    };
  });
}

// --- Fin de tour : passe au joueur suivant ---------------
export async function endTurn(code) {
  await transactRoom(code, (room) => {
    if (room.status !== 'playing') return null;
    const cur = room.players[room.turnIndex];

    // Cas "rejoue" : on garde le même joueur, on consomme le flag
    if (cur && cur.replay) {
      cur.replay = false;
      return { ...room };
    }

    const next = (room.turnIndex + 1) % room.players.length;

    // Si quelqu'un est arrivé et qu'on revient à lui : fin de partie
    if (room.firstFinisherIndex != null && next === room.firstFinisherIndex) {
      const ranked = [...room.players].sort((a, b) => b.score - a.score);
      return {
        ...room,
        status: 'ended',
        ranking: ranked.map((p) => ({
          name: p.name, score: p.score, color: p.color, coinIndex: p.coinIndex
        })),
        lastEvent: { type: 'end', winner: ranked[0]?.name, ts: Date.now() },
      };
    }
    return { ...room, turnIndex: next };
  });
}

// --- Démarrer la partie (host only) ----------------------
export async function startGame(code, hostUid) {
  await transactRoom(code, (room) => {
    if (room.hostUid !== hostUid) return null;
    if (room.players.length < 2) return null;
    return {
      ...room,
      status: 'playing',
      turnIndex: 0,
      firstFinisherIndex: null,
      lastEvent: { type: 'start', ts: Date.now() },
    };
  });
}

export { BOARD };

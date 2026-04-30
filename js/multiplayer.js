// =========================================================
// MULTIPLAYER — Firestore room sync
// Modèle de données :
//
//   /rooms/{code} = {
//     code,          // String
//     hostUid,       // UID du créateur (peut lancer la partie)
//     status,        // 'lobby' | 'playing' | 'ended'
//     createdAt,     // serverTimestamp
//     turnIndex,     // index du joueur courant
//     players: [
//       { uid, name, color, position, score, skipNext, joinedAt }
//     ],
//     lastDice,      // dernier résultat du dé
//     lastEvent,     // {type, by, payload, ts} pour rejouer dans le journal
//   }
//
// =========================================================

import {
  db, doc, setDoc, getDoc, updateDoc, onSnapshot,
  serverTimestamp, deleteDoc, runTransaction, OFFLINE_MODE
} from './firebase-config.js';
import { generateRoomCode, PAWN_COLORS } from './data.js';

// --------- Mode hors-ligne (fallback) ---------------------
const offlineRooms = new Map();
const offlineSubs  = new Map(); // code -> Set<callback>

function offlineEmit(code) {
  const subs = offlineSubs.get(code);
  if (!subs) return;
  const data = offlineRooms.get(code);
  subs.forEach((cb) => cb({ exists: () => !!data, data: () => data }));
}

// --------- API publique -----------------------------------

export async function createRoom(player) {
  const code = generateRoomCode();
  const room = {
    code,
    hostUid: player.uid,
    status: 'lobby',
    turnIndex: 0,
    lastDice: 0,
    lastEvent: null,
    players: [{
      uid: player.uid,
      name: player.name,
      color: PAWN_COLORS[0],
      coinIndex: 0,
      position: 0,
      score: 0,
      skipNext: 0,
      hand: [],
      joinedAt: Date.now(),
    }],
    createdAt: Date.now(),
  };

  if (OFFLINE_MODE) {
    offlineRooms.set(code, room);
  } else {
    await setDoc(doc(db, 'rooms', code), { ...room, createdAt: serverTimestamp() });
  }
  return code;
}

export async function joinRoom(code, player) {
  if (OFFLINE_MODE) {
    const room = offlineRooms.get(code);
    if (!room) throw new Error('Salle introuvable');
    if (room.status !== 'lobby') throw new Error('Partie déjà commencée');
    if (room.players.length >= 6) throw new Error('Salle pleine');
    if (room.players.some((p) => p.uid === player.uid)) return; // déjà dedans
    const usedColors = room.players.map((p) => p.color);
    const usedCoins = room.players.map((p) => p.coinIndex);
    const color = PAWN_COLORS.find((c) => !usedColors.includes(c)) || PAWN_COLORS[0];
    const coinIndex = [0,1,2,3,4,5].find((i) => !usedCoins.includes(i)) ?? 0;
    room.players.push({
      uid: player.uid, name: player.name, color, coinIndex,
      position: 0, score: 0, skipNext: 0, hand: [], joinedAt: Date.now(),
    });
    offlineEmit(code);
    return;
  }

  const ref = doc(db, 'rooms', code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Salle introuvable');
    const room = snap.data();
    if (room.status !== 'lobby') throw new Error('Partie déjà commencée');
    if (room.players.length >= 6) throw new Error('Salle pleine');
    if (room.players.some((p) => p.uid === player.uid)) return;
    const usedColors = room.players.map((p) => p.color);
    const usedCoins = room.players.map((p) => p.coinIndex);
    const color = PAWN_COLORS.find((c) => !usedColors.includes(c)) || PAWN_COLORS[0];
    const coinIndex = [0,1,2,3,4,5].find((i) => !usedCoins.includes(i)) ?? 0;
    const newPlayer = {
      uid: player.uid, name: player.name, color, coinIndex,
      position: 0, score: 0, skipNext: 0, hand: [], joinedAt: Date.now(),
    };
    tx.update(ref, { players: [...room.players, newPlayer] });
  });
}

export function subscribeRoom(code, callback) {
  if (OFFLINE_MODE) {
    if (!offlineSubs.has(code)) offlineSubs.set(code, new Set());
    offlineSubs.get(code).add(callback);
    queueMicrotask(() => offlineEmit(code));
    return () => offlineSubs.get(code)?.delete(callback);
  }
  const ref = doc(db, 'rooms', code);
  return onSnapshot(ref, (snap) => {
    callback({ exists: () => snap.exists(), data: () => snap.data() });
  });
}

export async function updateRoom(code, patch) {
  if (OFFLINE_MODE) {
    const room = offlineRooms.get(code);
    if (!room) return;
    Object.assign(room, patch);
    offlineEmit(code);
    return;
  }
  await updateDoc(doc(db, 'rooms', code), patch);
}

export async function transactRoom(code, mutator) {
  if (OFFLINE_MODE) {
    const room = offlineRooms.get(code);
    if (!room) return;
    const next = mutator({ ...room, players: room.players.map((p) => ({ ...p })) });
    if (next) {
      offlineRooms.set(code, next);
      offlineEmit(code);
    }
    return;
  }
  const ref = doc(db, 'rooms', code);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const room = snap.data();
    const next = mutator({ ...room, players: room.players.map((p) => ({ ...p })) });
    if (next) tx.update(ref, next);
  });
}

export async function leaveRoom(code, uid) {
  await transactRoom(code, (room) => {
    const players = room.players.filter((p) => p.uid !== uid);
    if (players.length === 0) {
      // Plus personne : on supprime la salle
      if (OFFLINE_MODE) offlineRooms.delete(code);
      else deleteDoc(doc(db, 'rooms', code));
      return null;
    }
    let { hostUid, turnIndex } = room;
    if (hostUid === uid) hostUid = players[0].uid;
    if (turnIndex >= players.length) turnIndex = 0;
    return { ...room, players, hostUid, turnIndex };
  });
}

export async function roomExists(code) {
  if (OFFLINE_MODE) return offlineRooms.has(code);
  const snap = await getDoc(doc(db, 'rooms', code));
  return snap.exists();
}

// =========================================================
// FIREBASE CONFIG — projet "bibliotheque-de-babel"
// =========================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot,
  serverTimestamp, deleteDoc, runTransaction
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyDM4mtBYJthCWhqWMro0vcTqcqei69v908",
  authDomain: "bibliotheque-de-babel.firebaseapp.com",
  projectId: "bibliotheque-de-babel",
  storageBucket: "bibliotheque-de-babel.firebasestorage.app",
  messagingSenderId: "979183931683",
  appId: "1:979183931683:web:92d2020e582adfa979fc96",
  measurementId: "G-N1RHME2QQM"
};

export const OFFLINE_MODE = false;

export const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

export {
  doc, setDoc, getDoc, updateDoc, onSnapshot,
  serverTimestamp, deleteDoc, runTransaction,
  signInAnonymously, onAuthStateChanged,
};

// Authentification anonyme : chaque joueur a un UID stable pendant la session
export function ensureAuth() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) resolve(user);
    });
    signInAnonymously(auth).catch(reject);
  });
}

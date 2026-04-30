# Bibliothèque de Babel — Europe & Russie

Jeu de plateau pédagogique multijoueur, sur les cultures, l'histoire et la géographie d'Europe et de Russie. Inspiré du Trivial Pursuit et du Monopoly.

## Stack

- **Front** : HTML / CSS / JS vanilla (modules ES6, aucun framework)
- **Multi temps réel** : Firebase Firestore + Auth anonyme
- **Hébergement** : Firebase Hosting (statique)

## Démarrage local

```bash
# 1) Sert le site sur http://localhost:5173
npm run dev
```

Le site fonctionne immédiatement en **mode local** (sans Firebase) : tu peux jouer en ouvrant deux onglets côte-à-côte (les salles vivent en mémoire dans chaque onglet).

## Configuration Firebase (multi en ligne)

1. Crée un projet sur https://console.firebase.google.com
2. Active **Firestore Database** (mode test ou règles `firestore.rules`)
3. Active **Authentication** > Sign-in method > **Anonyme**
4. Va dans **Paramètres du projet** > **Tes apps** > **Web** > Récupère la config
5. Ouvre `js/firebase-config.js` et remplace `firebaseConfig` par tes valeurs

Le mode hors-ligne se désactive automatiquement dès que la clé API est valide.

## Déploiement

```bash
# Première fois
firebase login
firebase use --add        # sélectionne ton projet

# Règles Firestore + hosting
firebase deploy
```

## Structure

```
.
├── index.html
├── css/style.css
├── js/
│   ├── data.js              # questions, cartes, plateau
│   ├── firebase-config.js   # init Firebase + mode offline
│   ├── multiplayer.js       # API Firestore (rooms, sync)
│   ├── game.js              # règles, dé, mouvement, cartes
│   ├── ui.js                # SVG plateau, modales, toasts
│   └── main.js              # routing écrans + événements
├── firebase.json
├── firestore.rules
└── .firebaserc
```

## Règles du jeu

- 2 à 6 joueurs
- Lance le dé, avance ton pion, pioche une carte selon la couleur de la case :
  - **Pouvoir** (rouge), **Culture** (rose), **Savoir** (jaune), **Espace** (vert), **Histoire** (bleu), **Difficile** (violet)
  - **Chance** (orange) : effet aléatoire (bonus, malus, vol)
- Bonne réponse = +1 point (Facile) ou +3 points (Difficile)
- Le premier arrivé à la case Arrivée déclenche le **dernier tour**
- Le **vainqueur** = celui qui a le plus de points de savoir à la fin du tour

## Crédits

Conception pédagogique : adapté du jeu original « Bibliothèque de Babel — Europe & Russie ».

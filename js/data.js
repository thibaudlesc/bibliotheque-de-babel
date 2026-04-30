// =========================================================
// DATA — Questions, plateau, configuration
// Contenu adapté des cartes Figma "EUROPE-ET-RUSSIE"
// =========================================================

// Chaque catégorie a son logo coloré (PNG dans logocarde/) + un fallback SVG iconId.
// Le logo coloré s'affiche en gros sur les cartes question correspondantes.
export const CATEGORIES = {
  pouvoir:   { color: '#D72B26', name: 'Pouvoir',   iconId: 'cat-icon-crown',  logo: 'logocarde/redlogo.png' },
  culture:   { color: '#F472B6', name: 'Culture',   iconId: 'cat-icon-mask',   logo: 'logocarde/pinklogo.png' },
  savoir:    { color: '#F6BB4F', name: 'Savoir',    iconId: 'cat-icon-book',   logo: 'logocarde/yellowlogo.png' },
  espace:    { color: '#10A977', name: 'Espace',    iconId: 'cat-icon-globe',  logo: 'logocarde/greenlogo.png' },
  histoire:  { color: '#7DD3FC', name: 'Histoire',  iconId: 'cat-icon-column', logo: 'logocarde/bluelogo.png' },
  difficile: { color: '#7659FF', name: 'Difficile', iconId: 'cat-icon-bolt',   logo: 'logocarde/purplelogo.png' },
  chance:    { color: '#FF8A1E', name: 'Chance',    iconId: 'cat-icon-die',    logo: 'logocarde/orangelogo.png' },
};

// 6 pions = 6 pièces de monnaie. Chaque pion a son propre alliage métallique
// pour rester visuellement distinct sur le plateau.
// gradient = id du <radialGradient> défini dans ui.js (defs du SVG du plateau).
export const PAWN_COINS = [
  { id: 'euro',    symbol: '€',  name: 'Euro',           gradient: 'coinGold',     ink: '#5D3F12', ring: '#A87A2C' },
  { id: 'yen',     symbol: '¥',  name: 'Yen Chinois',    gradient: 'coinSilver',   ink: '#2E3239', ring: '#7B8390' },
  { id: 'won',     symbol: '₩',  name: 'Won sud-coréen', gradient: 'coinBronze',   ink: '#4A2A12', ring: '#8E5424' },
  { id: 'dollar',  symbol: '$',  name: 'Dollar',         gradient: 'coinGreen',    ink: '#0E3B27', ring: '#1F7C53' },
  { id: 'bitcoin', symbol: '₿',  name: 'Bitcoin',        gradient: 'coinOrange',   ink: '#5C2A05', ring: '#C26309' },
  { id: 'rouble',  symbol: '₽',  name: 'Rouble Russe',   gradient: 'coinPlatinum', ink: '#22324A', ring: '#7A8DA8' },
];
// Conservé pour compat : couleurs distinctes pour halo / contour de pion
export const PAWN_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#A855F7', '#EC4899'];

import { TILE_POSITIONS } from './board-positions.js';
export { TILE_POSITIONS };

// Plateau : nombre de cases dérivé directement des positions visuelles
export const BOARD_SIZE = TILE_POSITIONS.length;

// Construit la liste des cases en s'appuyant sur les positions du plateau Figma.
// Les cases spéciales (special: 'plus2', 'minus2', 'run', 'replay', 'museum')
// ont un effet immédiat. Les cases normales tirent une carte quiz.
export function buildBoard() {
  const cycle = ['pouvoir', 'culture', 'savoir', 'espace', 'histoire', 'difficile'];
  return TILE_POSITIONS.map((pos, i) => {
    if (pos.type === 'start') {
      return { index: i, type: 'start', label: 'START', x: pos.x, y: pos.y };
    }
    if (pos.type === 'end') {
      return { index: i, type: 'end', label: 'FINISH', x: pos.x, y: pos.y };
    }
    if (pos.special) {
      return { index: i, type: 'special', special: pos.special, x: pos.x, y: pos.y };
    }
    // Case normale : on alterne les catégories quiz
    const cat = cycle[i % cycle.length];
    return { index: i, type: 'tile', category: cat, x: pos.x, y: pos.y };
  });
}

// =========================================================
// CARTES QUIZ — extraites/adaptées des designs Figma
// =========================================================
export const QUIZ_CARDS = [
  // ----- POUVOIR (rouge) -----
  {
    id: 'pou-f1', cat: 'pouvoir', difficulty: 'Facile',
    question: "Dans quelle culture offrir de l'argent en nombre pair lors d'un mariage est-il un symbole de pouvoir et de prospérité partagée ?",
    choices: ["La culture japonaise", "La culture chinoise", "La culture russe"],
    answer: 1,
    explanation: "En Chine, les nombres pairs symbolisent l'équilibre et l'abondance. Offrir de l'argent en enveloppe rouge est une façon de transmettre une forme de pouvoir économique."
  },
  {
    id: 'pou-f2', cat: 'pouvoir', difficulty: 'Facile',
    question: "En Russie, qui est traditionnellement vu comme le détenteur principal du pouvoir économique dans les négociations ?",
    choices: ["Le plus jeune de l'équipe", "Le décideur le plus ancien", "Celui qui parle le plus"],
    answer: 1,
    explanation: "En Russie, l'ancienneté et la hiérarchie comptent énormément. Les vraies décisions sont souvent prises par le plus ancien, même si d'autres personnes parlent davantage."
  },
  {
    id: 'pou-d1', cat: 'pouvoir', difficulty: 'Difficile',
    question: "Quelle est la signification d'un cadeau d'affaires offert avec les deux mains au Japon ?",
    choices: ["Marque de respect et de pouvoir partagé", "Demande de réciprocité immédiate", "Signe de soumission"],
    answer: 0,
    explanation: "Au Japon, offrir un cadeau à deux mains symbolise le respect mutuel et établit un pouvoir relationnel équilibré entre les parties."
  },

  // ----- CULTURE (rose) -----
  {
    id: 'cul-f1', cat: 'culture', difficulty: 'Facile',
    question: "En Russie lors d'une première rencontre professionnelle, quelle est l'attitude habituelle concernant le sourire ?",
    choices: [
      "Sourire en permanence pour être accueillant",
      "Garder un visage sérieux, ne sourire que si c'est justifié",
      "Sourire uniquement avec les yeux"
    ],
    answer: 1,
    explanation: "Un proverbe russe dit que « le rire sans raison est le signe d'un idiot ». Le sourire n'est pas une politesse de base mais une récompense qui signifie que la glace est rompue."
  },
  {
    id: 'cul-f2', cat: 'culture', difficulty: 'Facile',
    question: "Que signifie traditionnellement offrir des fleurs en nombre pair en Russie ?",
    choices: ["Bonne fortune", "Cadeau funéraire", "Demande en mariage"],
    answer: 1,
    explanation: "En Russie, on n'offre des fleurs en nombre pair que pour les enterrements. Pour toute autre occasion, on choisit toujours un nombre impair."
  },
  {
    id: 'cul-d1', cat: 'culture', difficulty: 'Difficile',
    question: "Que symbolise la coutume russe du « pain-sel » (хлеб-соль) lors d'un accueil ?",
    choices: [
      "Un avertissement à l'invité",
      "L'hospitalité la plus chaleureuse",
      "Un défi à relever"
    ],
    answer: 1,
    explanation: "Le pain-sel est l'un des symboles les plus puissants d'hospitalité russe : on accueille les invités d'honneur avec un pain rond et un récipient de sel posé dessus."
  },

  // ----- SAVOIR (jaune) -----
  {
    id: 'sav-f1', cat: 'savoir', difficulty: 'Facile',
    question: "Quelle est la capitale de la Russie ?",
    choices: ["Saint-Pétersbourg", "Moscou", "Kiev"],
    answer: 1,
    explanation: "Moscou est la capitale de la Russie depuis 1918 (puis à nouveau après une période où Saint-Pétersbourg a tenu ce rôle de 1712 à 1918)."
  },
  {
    id: 'sav-f2', cat: 'savoir', difficulty: 'Facile',
    question: "Combien de fuseaux horaires couvre la Russie ?",
    choices: ["7", "11", "15"],
    answer: 1,
    explanation: "La Russie s'étend sur 11 fuseaux horaires, du Kaliningrad à l'ouest jusqu'au Kamtchatka à l'est."
  },
  {
    id: 'sav-d1', cat: 'savoir', difficulty: 'Difficile',
    question: "Quel fleuve est le plus long entièrement situé en Europe ?",
    choices: ["Le Danube", "La Volga", "Le Rhin"],
    answer: 1,
    explanation: "La Volga, longue de 3 530 km, est le plus long fleuve d'Europe et coule entièrement en Russie."
  },

  // ----- ESPACE (vert) -----
  {
    id: 'esp-f1', cat: 'espace', difficulty: 'Facile',
    question: "Quel pays a lancé le premier satellite artificiel de l'Histoire ?",
    choices: ["Les États-Unis", "L'URSS", "La France"],
    answer: 1,
    explanation: "L'URSS a lancé Spoutnik 1 le 4 octobre 1957, marquant le début de la conquête spatiale."
  },
  {
    id: 'esp-f2', cat: 'espace', difficulty: 'Facile',
    question: "Qui fut le premier humain dans l'espace ?",
    choices: ["Neil Armstrong", "Iouri Gagarine", "Valentina Terechkova"],
    answer: 1,
    explanation: "Iouri Gagarine, cosmonaute soviétique, a effectué le premier vol orbital habité le 12 avril 1961."
  },
  {
    id: 'esp-d1', cat: 'espace', difficulty: 'Difficile',
    question: "Quel était le nom du programme spatial ayant envoyé la première femme dans l'espace ?",
    choices: ["Vostok", "Soyouz", "Apollo"],
    answer: 0,
    explanation: "Valentina Terechkova a volé à bord de Vostok 6 en 1963, devenant la première femme dans l'espace."
  },

  // ----- HISTOIRE (bleu) -----
  {
    id: 'his-f1', cat: 'histoire', difficulty: 'Facile',
    question: "En quelle année est tombé le mur de Berlin ?",
    choices: ["1985", "1989", "1991"],
    answer: 1,
    explanation: "Le mur de Berlin est tombé le 9 novembre 1989, symbole de la fin de la Guerre froide."
  },
  {
    id: 'his-f2', cat: 'histoire', difficulty: 'Facile',
    question: "Qui était le dernier tsar de Russie ?",
    choices: ["Pierre le Grand", "Nicolas II", "Ivan le Terrible"],
    answer: 1,
    explanation: "Nicolas II Romanov, dernier empereur de Russie, a abdiqué en 1917 lors de la Révolution russe."
  },
  {
    id: 'his-d1', cat: 'histoire', difficulty: 'Difficile',
    question: "Quelle ville fut la capitale de la Russie de 1712 à 1918 ?",
    choices: ["Moscou", "Saint-Pétersbourg", "Novgorod"],
    answer: 1,
    explanation: "Pierre le Grand a déplacé la capitale à Saint-Pétersbourg en 1712. Elle l'est restée jusqu'en 1918."
  },

  // ----- DIFFICILE (violet) — questions de négociation et culture business -----
  {
    id: 'dif-1', cat: 'difficile', difficulty: 'Difficile',
    question: "Dans le milieu des affaires en Russie, que signifie une longue période de silence durant une négociation ?",
    choices: [
      "L'interlocuteur s'ennuie et veut terminer la réunion",
      "Invitation à continuer de parler pour combler le vide",
      "Marque de réflexion profonde et de considération sérieuse"
    ],
    answer: 2,
    explanation: "Les Russes valorisent le silence comme outil de communication. Un négociateur qui comble le silence en parlant trop passera pour quelqu'un d'insécure, affaiblissant sa position."
  },
  {
    id: 'dif-2', cat: 'difficile', difficulty: 'Difficile',
    question: "Lors d'un rendez-vous d'affaires en Russie, que signifie un toast solennel avec de la vodka ?",
    choices: [
      "Une simple politesse, on peut refuser",
      "Un acte de scellement de la relation, à honorer",
      "Une mise à l'épreuve du nouveau partenaire"
    ],
    answer: 1,
    explanation: "Le toast russe (« nazdrovié ») n'est pas qu'une convivialité : il scelle la confiance. Le refuser sans raison de santé peut être perçu comme un manque d'engagement."
  },
  {
    id: 'dif-3', cat: 'difficile', difficulty: 'Difficile',
    question: "En affaires russes, que signifie l'expression « договоренность важнее договора » ?",
    choices: [
      "Le contrat prime sur tout",
      "L'accord moral compte plus que le contrat écrit",
      "Le silence vaut accord"
    ],
    answer: 1,
    explanation: "Cette expression — « l'entente vaut plus que le contrat » — illustre l'importance du lien personnel et de la parole donnée dans les affaires russes, plus que le formalisme juridique occidental."
  },
  {
    id: 'dif-4', cat: 'difficile', difficulty: 'Difficile',
    question: "Que signifie offrir des chocolats à son contact russe avant une négociation ?",
    choices: [
      "Tentative de corruption",
      "Marque de respect et d'attention personnelle",
      "Faux pas culturel à éviter"
    ],
    answer: 1,
    explanation: "Apporter de petits présents (chocolats, vin) avant une négociation est très bien vu : cela montre l'attention portée à la relation, fondement de la confiance en Russie."
  },
];

// =========================================================
// CARTES CHANCE — événements aléatoires
// `iconId` = id d'un <symbol> défini dans ui.js (defs du SVG du plateau)
// `keepable: true` = carte bonus que le joueur peut garder dans sa main pour la jouer plus tard
// `keepable: false` = effet immédiat (malus, vol, déplacement forcé)
// =========================================================
export const CHANCE_CARDS = [
  { id: 'cc1',  iconId: 'card-icon-gift',     title: 'Bonus de savoir',       text: "Tu viens d'arriver à l'office de tourisme et tu te renseignes sur la ville. Empoche 3 points de savoir !", effect: 'gainPoints',     value: 3,        keepable: true  },
  { id: 'cc2',  iconId: 'card-icon-graduate', title: "Cours d'Eric Cattelain", text: "Un cours bien préparé t'apporte 2 points de savoir.",                                                       effect: 'gainPoints',     value: 2,        keepable: true  },
  { id: 'cc3',  iconId: 'card-icon-train',    title: 'Trans-Sibérien',         text: "Tu prends le Trans-Sibérien ! Avance de 4 cases.",                                                          effect: 'movePawn',       value: 4,        keepable: true  },
  { id: 'cc4',  iconId: 'card-icon-snow',     title: 'Tempête de neige',       text: "Une tempête te ralentit. Recule de 2 cases.",                                                               effect: 'movePawn',       value: -2,       keepable: false },
  { id: 'cc5',  iconId: 'card-icon-cup',      title: 'Toast à la vodka',       text: "Le doyen porte un toast en ton honneur. Gagne 5 points de savoir !",                                        effect: 'gainPoints',     value: 5,        keepable: true  },
  { id: 'cc6',  iconId: 'card-icon-mask',     title: 'Coup bas',               text: "Le joueur ayant le moins de points de savoir te vole 3 de tes points.",                                     effect: 'stealPoints',    value: 3,        keepable: false },
  { id: 'cc7',  iconId: 'card-icon-cake',     title: 'Mariage chinois',        text: "On t'invite à un mariage : reçois une enveloppe rouge de 2 points.",                                        effect: 'gainPoints',     value: 2,        keepable: true  },
  { id: 'cc8',  iconId: 'card-icon-bear',     title: "Rencontre d'un ours",    text: "Un ours te bloque le passage. Passe ton prochain tour.",                                                    effect: 'skipTurn',       value: 1,        keepable: false },
  { id: 'cc9',  iconId: 'card-icon-rocket',   title: 'Spoutnik !',             text: "Tu décolles avec Spoutnik ! Avance jusqu'à la prochaine case Espace.",                                       effect: 'moveToCategory', value: 'espace', keepable: true  },
  { id: 'cc10', iconId: 'card-icon-crown',    title: 'Audience au Kremlin',    text: "Tu es reçu au Kremlin. Bonus de pouvoir : +4 points !",                                                      effect: 'gainPoints',     value: 4,        keepable: true  },
];

// Lookup utilitaire : retrouve une carte chance depuis son id (pour rejouer une carte gardée)
export function findChanceCardById(id) {
  return CHANCE_CARDS.find((c) => c.id === id) || null;
}

// Génère un identifiant de salle court (6 caractères)
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

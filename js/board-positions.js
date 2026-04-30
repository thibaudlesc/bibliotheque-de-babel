// =========================================================
// BOARD POSITIONS — coordonnées des cases (en % de l'image)
// Détecté via OpenCV (segmentation HSV par couleur + Hough)
// + ordering nearest-neighbor + 2-opt + interpolation des gaps.
// Couleur → effet :
//   green  → plus2  (avance de 2 cases bonus)
//   red    → minus2 (recule de 2 cases)
//   yellow → run    (avance de 2 cases, type course)
//   blue   → replay (rejoue le tour)
//   purple → prison (passe 1 tour)
//   orange → museum (+1 savoir)
//   white  → quiz (catégorie attribuée par cycle dans data.js)
// =========================================================

const COLOR_TO_SPECIAL = {
  green:  'plus2',
  red:    'minus2',
  yellow: 'run',
  blue:   'replay',
  purple: 'prison',
  orange: 'museum',
};

// 105 cases internes + START prepended + END appended = 107 cases au total.
// L'ordre suit le tracé serpentin du plateau START → FINISH.
const _PATH = [
  { x:   6.37, y:  93.52, color: 'white' },
  { x:   8.74, y:  90.53, color: 'white' },
  { x:  11.87, y:  88.80, color: 'white' },
  { x:  14.79, y:  91.91, color: 'orange' },
  { x:  20.38, y:  89.87, color: 'white' },
  { x:  25.97, y:  87.84, color: 'white' },
  { x:  31.57, y:  85.80, color: 'white' },
  { x:  37.16, y:  83.76, color: 'white' },
  { x:  41.60, y:  84.66, color: 'white' },
  { x:  39.32, y:  78.76, color: 'white' },
  { x:  37.05, y:  72.87, color: 'white' },
  { x:  34.77, y:  66.97, color: 'orange' },
  { x:  30.62, y:  69.04, color: 'white' },
  { x:  25.36, y:  67.89, color: 'white' },
  { x:  20.10, y:  66.73, color: 'white' },
  { x:  14.84, y:  65.58, color: 'white' },
  { x:  10.55, y:  67.80, color: 'orange' },
  { x:   6.64, y:  66.28, color: 'white' },
  { x:   7.58, y:  61.16, color: 'white' },
  { x:   8.53, y:  56.05, color: 'white' },
  { x:   9.47, y:  50.93, color: 'white' },
  { x:  13.72, y:  48.65, color: 'white' },
  { x:  18.75, y:  48.79, color: 'white' },
  { x:  23.78, y:  48.93, color: 'white' },
  { x:  28.81, y:  49.07, color: 'white' },
  { x:  33.84, y:  49.21, color: 'white' },
  { x:  35.45, y:  44.23, color: 'white' },
  { x:  37.06, y:  39.26, color: 'white' },
  { x:  38.67, y:  34.28, color: 'red' },
  { x:  43.31, y:  29.30, color: 'white' },
  { x:  38.82, y:  27.16, color: 'white' },
  { x:  34.33, y:  29.37, color: 'white' },
  { x:  29.83, y:  31.58, color: 'white' },
  { x:  25.34, y:  33.79, color: 'orange' },
  { x:  20.40, y:  31.48, color: 'white' },
  { x:  15.46, y:  29.16, color: 'white' },
  { x:  10.51, y:  26.84, color: 'white' },
  { x:   5.57, y:  24.53, color: 'white' },
  { x:   2.98, y:  21.01, color: 'white' },
  { x:   7.88, y:  17.68, color: 'white' },
  { x:  12.77, y:  14.34, color: 'white' },
  { x:  17.66, y:  11.01, color: 'white' },
  { x:  22.56, y:   7.67, color: 'white' },
  { x:  27.88, y:  10.23, color: 'blue' },
  { x:  32.94, y:  10.23, color: 'white' },
  { x:  37.99, y:  10.23, color: 'red' },
  { x:  42.19, y:   8.64, color: 'orange' },
  { x:  45.69, y:  12.63, color: 'white' },
  { x:  49.18, y:  16.63, color: 'white' },
  { x:  52.68, y:  20.62, color: 'white' },
  { x:  56.17, y:  24.62, color: 'white' },
  { x:  59.67, y:  28.61, color: 'white' },
  { x:  56.10, y:  31.44, color: 'red' },
  { x:  56.18, y:  36.35, color: 'white' },
  { x:  56.27, y:  41.25, color: 'white' },
  { x:  56.35, y:  46.16, color: 'white' },
  { x:  59.72, y:  49.21, color: 'orange' },
  { x:  63.13, y:  47.13, color: 'white' },
  { x:  69.38, y:  47.34, color: 'white' },
  { x:  66.17, y:  51.99, color: 'white' },
  { x:  62.96, y:  56.64, color: 'white' },
  { x:  59.75, y:  61.28, color: 'white' },
  { x:  56.54, y:  65.93, color: 'white' },
  { x:  57.97, y:  71.60, color: 'white' },
  { x:  59.41, y:  77.26, color: 'white' },
  { x:  60.84, y:  82.93, color: 'red' },
  { x:  62.45, y:  89.08, color: 'white' },
  { x:  68.36, y:  88.91, color: 'white' },
  { x:  74.27, y:  88.74, color: 'white' },
  { x:  79.43, y:  85.42, color: 'white' },
  { x:  84.59, y:  82.10, color: 'white' },
  { x:  89.75, y:  78.78, color: 'orange' },
  { x:  93.99, y:  80.65, color: 'white' },
  { x:  96.92, y:  76.85, color: 'white' },
  { x:  92.00, y:  73.64, color: 'white' },
  { x:  87.08, y:  70.44, color: 'white' },
  { x:  82.15, y:  67.23, color: 'white' },
  { x:  77.23, y:  64.03, color: 'white' },
  { x:  72.31, y:  60.82, color: 'white' },
  { x:  76.90, y:  59.85, color: 'red' },
  { x:  82.67, y:  63.03, color: 'purple' },
  { x:  86.60, y:  61.92, color: 'white' },
  { x:  90.53, y:  60.82, color: 'red' },
  { x:  94.73, y:  58.67, color: 'white' },
  { x:  94.96, y:  53.53, color: 'white' },
  { x:  95.18, y:  48.40, color: 'white' },
  { x:  95.41, y:  43.26, color: 'white' },
  { x:  95.29, y:  36.45, color: 'white' },
  { x:  95.17, y:  29.65, color: 'orange' },
  { x:  91.34, y:  30.75, color: 'white' },
  { x:  87.50, y:  31.86, color: 'white' },
  { x:  83.89, y:  34.69, color: 'white' },
  { x:  79.15, y:  34.62, color: 'white' },
  { x:  74.41, y:  34.55, color: 'orange' },
  { x:  71.68, y:  30.20, color: 'white' },
  { x:  69.20, y:  25.69, color: 'white' },
  { x:  66.73, y:  21.18, color: 'white' },
  { x:  64.25, y:  16.67, color: 'white' },
  { x:  61.77, y:  12.16, color: 'purple' },
  { x:  66.13, y:  10.09, color: 'white' },
  { x:  70.49, y:   8.01, color: 'white' },
  { x:  74.85, y:   5.94, color: 'white' },
  { x:  78.47, y:   7.12, color: 'white' },
  { x:  84.48, y:   5.91, color: 'white' },
  { x:  90.49, y:   4.71, color: 'white' },
];

// Construction finale : START + tuiles détectées + END
export const TILE_POSITIONS = [
  { x:  4.00, y: 96.50, type: 'start' },
  ..._PATH.map((t) => {
    const sp = COLOR_TO_SPECIAL[t.color];
    return sp ? { x: t.x, y: t.y, special: sp } : { x: t.x, y: t.y };
  }),
  { x: 96.50, y:  3.50, type: 'end' },
];

export const SPECIAL_COLORS = {
  plus2:  '#28C76F',
  minus2: '#EF4444',
  run:    '#F6BB4F',
  replay: '#7DD3FC',
  prison: '#7659FF',
  museum: '#FF8A1E',
};

export const BOARD_RATIO = 1.415;

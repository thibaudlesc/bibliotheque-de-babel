// =========================================================
// BOARD POSITIONS — coordonnées des cases (en % de l'image)
// Détecté via OpenCV (Hough + gap-filling entre ancres connues).
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

// 90 cases internes + START prepended + END appended = 92 cases au total.
// L'ordre suit le tracé détecté par OpenCV + gap-filling entre ancres.
const _PATH = [
  { x:   7.08, y:  94.75, color: 'blue'   },
  { x:  10.45, y:  96.61, color: 'white'  },
  { x:  19.24, y:  93.30, color: 'orange' },
  { x:  22.90, y:  91.50, color: 'orange' },
  { x:  25.49, y:  86.94, color: 'blue'   },
  { x:  29.15, y:  85.90, color: 'yellow' },
  { x:  32.42, y:  86.87, color: 'green'  },
  { x:  35.06, y:  82.38, color: 'blue'   },
  { x:  37.21, y:  83.76, color: 'white'  },
  { x:  41.70, y:  84.73, color: 'white'  },
  { x:  44.58, y:  85.97, color: 'blue'   },
  { x:  49.85, y:  83.07, color: 'green'  },
  { x:  54.69, y:  84.17, color: 'blue'   },
  { x:  60.94, y:  83.07, color: 'orange' },
  { x:  62.50, y:  89.15, color: 'white'  },
  { x:  66.31, y:  87.35, color: 'green'  },
  { x:  69.53, y:  89.36, color: 'yellow' },
  { x:  74.32, y:  88.74, color: 'white'  },
  { x:  78.22, y:  86.45, color: 'yellow' },
  { x:  83.35, y:  83.28, color: 'yellow' },
  { x:  85.45, y:  80.30, color: 'yellow' },
  { x:  89.75, y:  78.78, color: 'yellow' },
  { x:  94.04, y:  80.72, color: 'white'  },
  { x:  96.97, y:  76.85, color: 'white'  },
  { x:  95.41, y:  67.04, color: 'yellow' },
  { x:  94.73, y:  58.74, color: 'white'  },
  { x:  90.53, y:  60.82, color: 'purple' },
  { x:  90.62, y:  55.56, color: 'blue'   },
  { x:  95.51, y:  43.26, color: 'white'  },
  { x:  92.87, y:  37.18, color: 'green'  },
  { x:  87.60, y:  31.93, color: 'white'  },
  { x:  83.98, y:  34.69, color: 'white'  },
  { x:  80.76, y:  36.01, color: 'yellow' },
  { x:  78.08, y:  33.52, color: 'yellow' },
  { x:  74.41, y:  34.55, color: 'orange' },
  { x:  71.68, y:  30.27, color: 'white'  },
  { x:  68.51, y:  30.06, color: 'blue'   },
  { x:  66.26, y:  27.02, color: 'orange' },
  { x:  63.13, y:  27.37, color: 'blue'   },
  { x:  61.23, y:  24.19, color: 'green'  },
  { x:  59.67, y:  28.75, color: 'white'  },
  { x:  56.15, y:  31.51, color: 'red'    },
  { x:  56.45, y:  46.16, color: 'white'  },
  { x:  63.18, y:  47.13, color: 'white'  },
  { x:  59.77, y:  49.34, color: 'orange' },
  { x:  56.54, y:  65.93, color: 'white'  },
  { x:  52.64, y:  64.41, color: 'blue'   },
  { x:  50.83, y:  60.54, color: 'blue'   },
  { x:  47.46, y:  59.16, color: 'yellow' },
  { x:  41.36, y:  51.76, color: 'yellow' },
  { x:  37.89, y:  50.31, color: 'green'  },
  { x:  33.89, y:  49.21, color: 'white'  },
  { x:  35.01, y:  56.39, color: 'blue'   },
  { x:  34.77, y:  67.04, color: 'orange' },
  { x:  30.66, y:  69.11, color: 'white'  },
  { x:  27.10, y:  68.62, color: 'blue'   },
  { x:  24.56, y:  66.34, color: 'yellow' },
  { x:  17.43, y:  66.21, color: 'blue'   },
  { x:  14.94, y:  65.65, color: 'white'  },
  { x:  10.55, y:  67.86, color: 'orange' },
  { x:   6.64, y:  66.34, color: 'white'  },
  { x:   6.45, y:  60.40, color: 'yellow' },
  { x:   8.59, y:  54.04, color: 'blue'   },
  { x:   9.47, y:  51.00, color: 'white'  },
  { x:  13.77, y:  48.65, color: 'white'  },
  { x:  17.19, y:  51.97, color: 'blue'   },
  { x:  22.27, y:  37.46, color: 'blue'   },
  { x:  25.39, y:  33.86, color: 'orange' },
  { x:  29.20, y:  31.79, color: 'yellow' },
  { x:  34.13, y:  30.96, color: 'yellow' },
  { x:  38.87, y:  27.23, color: 'white'  },
  { x:  43.36, y:  29.30, color: 'white'  },
  { x:  37.99, y:  10.23, color: 'red'    },
  { x:  42.19, y:   8.57, color: 'orange' },
  { x:  35.30, y:   7.26, color: 'blue'   },
  { x:  29.10, y:   7.74, color: 'yellow' },
  { x:  24.90, y:   9.12, color: 'blue'   },
  { x:  22.56, y:   7.74, color: 'white'  },
  { x:  18.46, y:   7.88, color: 'blue'   },
  { x:  14.36, y:  11.06, color: 'yellow' },
  { x:   5.66, y:  24.46, color: 'white'  },
  { x:   3.03, y:  21.01, color: 'white'  },
  { x:  46.97, y:  14.10, color: 'blue'   },
  { x:  54.30, y:  12.99, color: 'red'    },
  { x:  61.82, y:  12.16, color: 'purple' },
  { x:  66.70, y:  11.13, color: 'yellow' },
  { x:  70.90, y:   7.33, color: 'green'  },
  { x:  74.90, y:   5.94, color: 'white'  },
  { x:  78.52, y:   7.05, color: 'white'  },
  { x:  87.06, y:   7.26, color: 'blue'   },
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

// ── Constants — shared configuration values extracted from the monolith ──

/** Pixel scale factor for sprite drawing */
export const S = 4;

/** Tile size in pixels */
export const TILE = 42;

/** Number of tiles per generated world chunk */
export const CHUNK = 20;

/** Fixed ground row in tile coordinates */
export const GROUND_ROW = 20;

/** Font used for the "?" on question blocks (Bug 5 fix — centralised) */
export const QUESTION_FONT = 'bold 24px "Arial Black", Arial, sans-serif';

/** Block / tile colour palette */
export const COL = {
  sky: '#6b8cff',
  brick: '#c84c0c',
  brickDark: '#a03000',
  brickLine: '#e09050',
  question: '#e0a020',
  questionDark: '#b07810',
  questionMark: '#fff',
  ground: '#c84c0c',
  groundTop: '#5a9e3a',
  groundDark: '#a03000',
  pipe: '#30a030',
  pipeDark: '#1a7a1a',
  pipeLight: '#50d050',
  coin: '#ffd700',
  coinDark: '#cca800',
  cloud: 'rgba(255,255,255,0.85)',
  hillGreen: '#5a9e3a',
  hillLight: '#7abe5a',
};

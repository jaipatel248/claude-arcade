// ── Central mutable game state ──
// Every piece of mutable data that was previously a top-level `let` / `const`
// in the monolith lives here so that all modules share a single source of truth.

import { GROUND_ROW } from './constants.js';

/**
 * All mutable game state, grouped by concern.
 * Modules import this object and read / write its properties directly.
 */
export const gameState = {
  // ── SSE data (populated by the EventSource handler) ──
  totalTokens: 0,
  totalInput: 0,
  totalOutput: 0,
  tokPerSec: 0,
  costUSD: 0,
  contextPct: 0,
  model: 'Unknown',
  startedAt: 0,

  // ── Timing / rate tracking ──
  prevTotalTokens: 0,
  prevTs: 0,
  lastUpdateTime: 0,

  // ── Scroll position ──
  scrollX: 0,

  // ── Player ──
  player: { x: 120, y: 0, vy: 0, grounded: false, groundY: 0 },

  // ── Animation ──
  animFrame: 0,
  animTimer: 0,

  // ── Coins & particles ──
  coinsCollected: 0,
  coinParticles: [],
  fireworks: [],

  // ── Timers ──
  thinkingTimer: 0,
  boostTimer: 0,
  boostSpeed: 0,
  waitingForUser: false,
  waitingTimer: 0,
  resumeBoostTimer: 0,
  resumeFlashTimer: 0,
  victoryTimer: 0,
  damageTimer: 0,
  damageCount: 0,
  introTimer: -1,
  gameOverTimer: 0,
  compactTimer: 0,
  compactingActive: false,
  taskCelebTimer: 0,
  promptBoostTimer: 0,
  promptPowerTimer: 0,
  promptCount: 0,

  // ── Subagents ──
  miniMarios: [],
  checkpointFlags: [],

  // ── Title flash (waiting-for-user tab animation) ──
  titleFlashInterval: null,
  originalTitle: document.title,
};

// ── Canvas references ──
// Kept as module-level variables so modules can import them directly.

export let canvas = null;
export let ctx = null;

/**
 * Initialise (or re-initialise) the canvas and its 2D context.
 * Call once on startup after the DOM is ready.
 *
 * @param {HTMLCanvasElement} c - The game canvas element
 */
export function initCanvas(c) {
  canvas = c;
  ctx = c.getContext('2d');
}

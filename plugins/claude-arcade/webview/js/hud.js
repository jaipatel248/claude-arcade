// ── HUD (Heads-Up Display) — DOM updates for the score / stats bar ──

import { gameState } from './state.js';

/** Cached DOM element references (populated by initHUD) */
let hudRefs = null;

/**
 * Cache DOM element references for the HUD.
 * Must be called once after the DOM is ready.
 */
export function initHUD() {
  hudRefs = {
    score: document.getElementById('hud-score'),
    tokIn: document.getElementById('hud-in'),
    tokOut: document.getElementById('hud-out'),
    speed: document.getElementById('hud-speed'),
    coins: document.getElementById('hud-coins'),
    cost: document.getElementById('hud-cost'),
    ctx: document.getElementById('hud-ctx'),
    time: document.getElementById('hud-time'),
    model: document.getElementById('hud-model'),
    waiting: document.getElementById('waiting'),
    prompts: document.getElementById('hud-prompts'),
  };
}

/**
 * Update all HUD elements from current game state.
 * Called once per frame from the game loop, after rendering.
 *
 * @param {number} tok - Current tokens-per-second (already computed by the loop)
 * @param {{ shirt: string, pants: string }} pal - Player palette (used for model badge colour)
 */
export function updateHUD(tok, pal) {
  if (!hudRefs) return;

  hudRefs.score.textContent = fmtTok(gameState.totalTokens);
  hudRefs.tokIn.textContent = fmtTok(gameState.totalInput);
  hudRefs.tokOut.textContent = fmtTok(gameState.totalOutput);
  hudRefs.speed.textContent = Math.round(tok) + ' tok/s';
  hudRefs.coins.textContent = gameState.coinsCollected;
  hudRefs.cost.textContent = '$' + (gameState.costUSD || 0).toFixed(2);
  hudRefs.ctx.textContent = Math.round(gameState.contextPct) + '%';

  // Cost colour escalation
  if (gameState.costUSD > 10) hudRefs.cost.style.color = '#ff4444';
  else if (gameState.costUSD > 5) hudRefs.cost.style.color = '#ff8844';
  else hudRefs.cost.style.color = '#ffd700';

  hudRefs.time.textContent = fmtDur(gameState.startedAt);
  hudRefs.model.textContent = fmtModel(gameState.model);
  hudRefs.model.style.background = pal.shirt;
  hudRefs.prompts.textContent = gameState.promptCount;
}

// ── Formatting helpers ──

/**
 * Format a token count for display (e.g. 1500 → "1.5K", 2000000 → "2.0M").
 *
 * @param {number} n - Raw token count
 * @returns {string}
 */
export function fmtTok(n) {
  return n >= 1e6
    ? (n / 1e6).toFixed(1) + 'M'
    : n >= 1e3
      ? (n / 1e3).toFixed(1) + 'K'
      : String(n);
}

/**
 * Format a duration from a Unix-epoch start time to "now".
 * Returns "m:ss" or "h:mm:ss".
 *
 * @param {number} s - Start timestamp (seconds since epoch)
 * @returns {string}
 */
export function fmtDur(s) {
  if (!s) return '0:00';
  const e = Math.floor(Date.now() / 1000 - s);
  const m = Math.floor(e / 60);
  const h = Math.floor(m / 60);
  return h > 0
    ? h + ':' + String(m % 60).padStart(2, '0') + ':' + String(e % 60).padStart(2, '0')
    : m + ':' + String(e % 60).padStart(2, '0');
}

/**
 * Format a model identifier string for the HUD badge.
 * Extracts the model family (Opus / Sonnet / Haiku) and version when present.
 *
 * @param {string} m - Raw model string (e.g. "claude-3-5-sonnet-20241022")
 * @returns {string}
 */
export function fmtModel(m) {
  if (!m || m === 'Unknown') return '?';
  const l = m.toLowerCase();
  for (const [k, n] of Object.entries({ opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku' })) {
    if (l.includes(k)) {
      const v = l.match(/(\d+)-(\d+)/);
      return v ? n + ' ' + v[1] + '.' + v[2] : n;
    }
  }
  return m.substring(0, 12);
}

// ── Physics — speed calculation, scrolling, collision, and coin collection ──

import { S, TILE, GROUND_ROW } from './constants.js';
import { gameState, canvas } from './state.js';
import { getTileAt, getWorldCoins } from './world.js';
import { playJumpSound, playCoinSound } from './sound.js';

/**
 * Computes and returns the current horizontal speed based on the token
 * throughput (`gameState.tokPerSec`) and all active speed modifiers.
 *
 * Consolidates every speed source in a single function so callers never
 * need to reason about boost / resume / prompt stacking themselves.
 *
 * @param {number} dt - Frame delta time in seconds
 * @returns {number} Final speed in pixels per second
 */
export function calculateSpeed(dt) {
  const tok = gameState.tokPerSec;

  // Base speed from tok/s thresholds
  let speed = 0;
  if (tok > 500) speed = 400;
  else if (tok > 250) speed = 320;
  else if (tok > 100) speed = 240;
  else if (tok > 50) speed = 180;
  else if (tok > 10) speed = 120;
  else if (tok > 0) speed = 70;

  // Boost from thinking burst (thinking -> token burst transition)
  if (gameState.boostTimer > 0) {
    speed += gameState.boostSpeed;
    gameState.boostTimer -= dt;
    gameState.boostSpeed *= 0.97;
  }

  // Resume boost (Bug 3 fix — after user answers a question)
  if (gameState.resumeBoostTimer > 0) {
    speed += 250;
  }

  // Prompt boost (Bug 2 fix — after user submits a new prompt)
  if (gameState.promptBoostTimer > 0) {
    speed += 150;
  }

  return speed;
}

/**
 * Advances the horizontal scroll position by `speed * dt`, checking for
 * wall / pipe collisions along the player's front edge.  Also advances
 * the walk animation timer.
 *
 * @param {number} speed - Current speed in pixels/second
 * @param {number} dt    - Frame delta time in seconds
 * @returns {boolean} `true` if the player is blocked by a solid tile
 */
export function advanceScroll(speed, dt) {
  const player = gameState.player;
  let proposedScrollX = gameState.scrollX + speed * dt;

  // Check if the player's front edge would overlap a solid tile
  const frontEdge = proposedScrollX + player.x + 9 * S;
  const bodyTopTileY = Math.floor((player.y + 2 * S) / TILE);
  const bodyBottomTileY = Math.floor((player.y + 13 * S) / TILE);
  const frontTileX = Math.floor(frontEdge / TILE);

  let blockedByWall = false;
  for (let ty = bodyTopTileY; ty <= bodyBottomTileY; ty++) {
    const tile = getTileAt(frontTileX, ty);
    if (tile && (tile.type === 'pipe' || tile.type === 'pipeTop' || tile.type === 'brick')) {
      // Snap so player sits right at the tile edge
      proposedScrollX = tile.x * TILE - player.x - 9 * S - 1;
      blockedByWall = true;
      break;
    }
  }

  gameState.scrollX = proposedScrollX;

  // Walk animation
  gameState.animTimer += dt;
  if (gameState.animTimer > 0.12) {
    gameState.animTimer = 0;
    gameState.animFrame++;
  }

  return blockedByWall;
}

/**
 * Applies gravity, ground collision, fall-off-screen reset, and auto-jump
 * logic to the player.
 *
 * @param {number}  dt            - Frame delta time in seconds
 * @param {number}  speed         - Current horizontal speed in px/s
 * @param {boolean} blockedByWall - Whether advanceScroll found a wall
 */
export function updatePlayerPhysics(dt, speed, blockedByWall) {
  const player = gameState.player;
  const H = canvas.height;

  // World offset so ground sits near the bottom of the screen (3 tiles up)
  const groundPixelY = H - 3 * TILE;
  const worldOffsetY = groundPixelY - GROUND_ROW * TILE;

  const playerWorldX = gameState.scrollX + player.x;
  const playerTileX = Math.floor(playerWorldX / TILE);
  const playerTileXR = Math.floor((playerWorldX + 8 * S) / TILE);

  // ── Gravity ──
  if (!player.grounded) {
    player.vy += 1200 * dt;
    player.y += player.vy * dt;
  }

  // ── Ground collision ──
  const feetTileY = Math.floor((player.y + 15 * S) / TILE);
  const groundCheck = getTileAt(playerTileX, feetTileY) || getTileAt(playerTileXR, feetTileY);
  if (groundCheck && player.vy >= 0) {
    player.y = groundCheck.y * TILE - 15 * S;
    player.vy = 0;
    player.grounded = true;
    player.groundY = player.y;
  }

  // ── Fall off screen reset ──
  if (player.y + worldOffsetY > H + 100) {
    player.y = GROUND_ROW * TILE - 15 * S - 50;
    player.vy = 0;
    player.grounded = false;
  }

  // ── Auto-jump: look ahead for obstacles (or blocked by wall) ──
  const tok = gameState.tokPerSec;
  if (player.grounded && (speed > 0 || blockedByWall)) {
    const lookAhead = 3;
    let shouldJump = blockedByWall;

    for (let dx = 1; dx <= lookAhead; dx++) {
      const checkX = playerTileX + dx;
      const atGround = getTileAt(checkX, feetTileY);
      const aboveGround = getTileAt(checkX, feetTileY - 1);

      // Obstacle directly above ground level
      if (aboveGround && (aboveGround.type === 'pipe' || aboveGround.type === 'pipeTop' || aboveGround.type === 'brick')) {
        shouldJump = true;
      }

      // Jump for gaps (missing ground with nothing below)
      if (!atGround && dx <= 2) {
        const belowGap = getTileAt(checkX, feetTileY + 1);
        if (!belowGap) shouldJump = true;
      }
    }

    // Also jump to reach floating blocks/coins (rare, random)
    const aboveCheck = getTileAt(playerTileX, feetTileY - 5) || getTileAt(playerTileX + 1, feetTileY - 5);
    if (aboveCheck && Math.random() < 0.02) shouldJump = true;

    if (shouldJump) {
      // Jump power scales with tok/s
      let jumpPower = tok > 500 ? -580
        : tok > 250 ? -540
        : tok > 100 ? -500
        : tok > 50 ? -460
        : tok > 10 ? -420
        : -380;

      // Wall boost: stronger jump to clear the obstacle
      if (blockedByWall) jumpPower = Math.min(jumpPower, -580);

      player.vy = jumpPower;
      player.grounded = false;
      playJumpSound();
    }
  }
}

/**
 * Checks every world coin for proximity to the player, marks collected
 * coins, increments the counter, plays the coin sound, and spawns
 * gold celebration particles.
 */
export function collectCoins() {
  const player = gameState.player;
  const H = canvas.height;
  const groundPixelY = H - 3 * TILE;
  const worldOffsetY = groundPixelY - GROUND_ROW * TILE;

  for (const coin of getWorldCoins()) {
    if (coin.collected) continue;

    const dx = (gameState.scrollX + player.x + 5 * S) - coin.x;
    const dy = (player.y + 7 * S) - coin.y;

    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      coin.collected = true;
      gameState.coinsCollected++;
      playCoinSound();

      // Spawn 6 gold celebration particles
      for (let p = 0; p < 6; p++) {
        gameState.coinParticles.push({
          x: coin.x - gameState.scrollX,
          y: coin.y + worldOffsetY,
          vx: (Math.random() - 0.5) * 120,
          vy: -60 - Math.random() * 80,
          life: 0.5 + Math.random() * 0.3,
        });
      }
    }
  }
}

/**
 * Decays the token-per-second rate when no SSE updates have arrived
 * for more than 3 seconds.  Preserves the thinking timer so the thought
 * bubble remains visible during extended reasoning gaps.
 *
 * @param {number} dt - Frame delta time in seconds
 */
export function decayIdleSpeed(dt) {
  if (gameState.lastUpdateTime > 0 && Date.now() - gameState.lastUpdateTime > 3000) {
    gameState.tokPerSec = Math.max(0, gameState.tokPerSec * 0.9);
    if (gameState.tokPerSec < 1) gameState.tokPerSec = 0;
    gameState.boostTimer = 0;

    // Keep thinkingTimer alive so the thought bubble stays visible
    // during extended reasoning gaps -- only grow it so Mario looks
    // like he's "deep in thought" rather than standing idle
    if (gameState.thinkingTimer > 0) gameState.thinkingTimer += dt;
  }
}

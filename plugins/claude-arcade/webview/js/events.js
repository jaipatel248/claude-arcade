// ── Events — SSE connection and all event routing ──

import { S, TILE, GROUND_ROW } from './constants.js';
import { gameState, canvas } from './state.js';
import {
  playWaitingSound,
  playResumeSound,
  playErrorSound,
  playPopSound,
  playFanfareSound,
  playCoinSound,
  playJumpSound,
  playBoostSound,
  closeAudio,
} from './sound.js';
// ── Internal reference to the live EventSource (for cleanup) ──
let eventSource = null;

// ── Title-flash helpers ──

/**
 * Starts alternating the document title between the original value and a
 * "waiting" prompt so the browser tab draws the user's attention.
 */
export function startTitleFlash() {
  if (gameState.titleFlashInterval) return;
  gameState.titleFlashInterval = setInterval(() => {
    document.title = document.title === gameState.originalTitle
      ? '\u26A1 Waiting for you!'
      : gameState.originalTitle;
  }, 800);
}

/**
 * Stops the title flash and restores the original document title.
 */
export function stopTitleFlash() {
  if (gameState.titleFlashInterval) {
    clearInterval(gameState.titleFlashInterval);
    gameState.titleFlashInterval = null;
  }
  document.title = gameState.originalTitle;
}

// ── Resume from waiting state ──

/**
 * Clears the waiting state, fires a coin-shower celebration, and optionally
 * launches fireworks when the user was kept waiting for 8+ seconds.
 */
export function resumeFromWaiting() {
  const waited = gameState.waitingTimer;
  const player = gameState.player;

  gameState.waitingForUser = false;
  gameState.waitingTimer = 0;
  stopTitleFlash();

  gameState.resumeFlashTimer = 0.4;
  gameState.resumeBoostTimer = Math.min(3, 1.5 + waited * 0.1);

  // Coin shower
  const groundPixelY = canvas.height - 3 * TILE;
  const worldOffsetY = groundPixelY - GROUND_ROW * TILE;
  const burstCount = Math.min(40, 15 + Math.floor(waited * 2));
  for (let p = 0; p < burstCount; p++) {
    gameState.coinParticles.push({
      x: player.x + 5 * S + (Math.random() - 0.5) * 80,
      y: player.y + worldOffsetY - 30 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 250,
      vy: -120 - Math.random() * 150,
      life: 0.8 + Math.random() * 0.6,
    });
  }

  // Fireworks for long waits
  if (waited >= 8) {
    for (let i = 0; i < 15; i++) {
      gameState.fireworks.push({
        x: player.x + Math.random() * canvas.width * 0.5,
        y: canvas.height * 0.2 + Math.random() * canvas.height * 0.3,
        vx: (Math.random() - 0.5) * 180,
        vy: -80 - Math.random() * 120,
        life: 1.0 + Math.random() * 1.0,
        color: ['#ff0', '#f44', '#4f4', '#44f', '#f4f', '#ff8'][Math.floor(Math.random() * 6)],
        size: 3 + Math.random() * 4,
      });
    }
  }

  playResumeSound();
}

// ── SSE initialisation ──

/**
 * Creates an EventSource for the given session ID, wires up the full
 * event-routing handler (tool events, hook-driven events, status updates),
 * and registers a `beforeunload` listener for cleanup.
 *
 * @param {string} sessionId - The session identifier from location.hash
 * @returns {EventSource} The live EventSource instance (for external cleanup)
 */
export function initSSE(sessionId) {
  const es = new EventSource('/events?session=' + encodeURIComponent(sessionId));
  eventSource = es;

  // ── Cached references to HUD DOM node used only inside this handler ──
  const waitingOverlay = document.getElementById('waiting');

  es.onmessage = (evt) => {
    let data;
    try { data = JSON.parse(evt.data); } catch { return; }

    // Hide the initial "connecting..." overlay on the very first message
    if (waitingOverlay) waitingOverlay.classList.add('hidden');

    const player = gameState.player;

    // ── Tool events (subagent running, etc.) ──
    // No token data, but keep Mario alive by refreshing the update time.
    if (data.type === 'tool') {
      gameState.lastUpdateTime = Date.now();
      gameState.thinkingTimer += 0.5;
      return;
    }

    // ── Hook-driven events ──

    if (data.type === 'tool_failure') {
      gameState.damageTimer = 0.5;
      gameState.damageCount++;
      playErrorSound();
      return;
    }

    if (data.type === 'subagent_start') {
      const tints = ['#e52521', '#21a5e5', '#21e55a', '#e5c821', '#c821e5'];
      gameState.miniMarios.push({
        id: data.agentId || ('a' + gameState.miniMarios.length),
        y: 0,
        vy: 0,
        alpha: 1,
        tint: tints[gameState.miniMarios.length % tints.length],
        fading: false,
      });
      playPopSound();
      return;
    }

    if (data.type === 'subagent_stop') {
      const mm = gameState.miniMarios.find(m => m.id === data.agentId && !m.fading)
        || gameState.miniMarios.find(m => !m.fading);
      if (mm) {
        mm.fading = true;
        mm.vy = -200;
        mm.y = player.y + (canvas.height - 3 * TILE) - GROUND_ROW * TILE + 20;
      }
      playCoinSound();
      return;
    }

    if (data.type === 'session_start') {
      gameState.introTimer = 3.0;
      playFanfareSound();
      return;
    }

    if (data.type === 'session_end') {
      gameState.gameOverTimer = 5.0;
      return;
    }

    if (data.type === 'compact_start') {
      gameState.compactingActive = true;
      return;
    }

    if (data.type === 'compact_end') {
      gameState.compactingActive = false;
      gameState.boostTimer = 1.0;
      gameState.boostSpeed = 200;
      return;
    }

    if (data.type === 'user_prompt') {
      gameState.promptCount++;
      gameState.promptPowerTimer = 3.0;   // 3 seconds of colour-change power
      gameState.promptBoostTimer = 2.0;
      // Force a big forward jump (always, even mid-air)
      player.vy = -700;
      player.grounded = false;
      gameState.boostTimer = 1.5;
      gameState.boostSpeed = 400;
      playJumpSound();
      return;
    }

    if (data.type === 'task_created') {
      gameState.checkpointFlags.push({
        x: gameState.scrollX + player.x + 100,
        waving: false,
      });
      return;
    }

    if (data.type === 'task_completed') {
      gameState.taskCelebTimer = 2.0;
      // Wave the most recent flag
      const lastFlag = gameState.checkpointFlags[gameState.checkpointFlags.length - 1];
      if (lastFlag) lastFlag.waving = true;
      // Coin burst
      for (let p = 0; p < 10; p++) {
        gameState.coinParticles.push({
          x: player.x + 5 * S,
          y: player.y + (canvas.height - 3 * TILE) - GROUND_ROW * TILE,
          vx: (Math.random() - 0.5) * 150,
          vy: -80 - Math.random() * 100,
          life: 0.6 + Math.random() * 0.4,
        });
      }
      playCoinSound();
      return;
    }

    // ── Handle task completion (stop event with delayed victory fireworks) ──
    if (data.type === 'stop') {
      setTimeout(() => {
        gameState.victoryTimer = 5.0;
        const cw = canvas.width;
        const ch = canvas.height;
        for (let i = 0; i < 30; i++) {
          gameState.fireworks.push({
            x: player.x + Math.random() * cw * 0.6,
            y: ch * 0.3 + Math.random() * ch * 0.3,
            vx: (Math.random() - 0.5) * 200,
            vy: -100 - Math.random() * 150,
            life: 1.0 + Math.random() * 1.5,
            color: ['#ff0', '#f44', '#4f4', '#44f', '#f4f', '#ff8'][Math.floor(Math.random() * 6)],
            size: 3 + Math.random() * 4,
          });
        }
      }, 3000);
      return;
    }

    // ── Handle waiting events (permission / question) ──
    if (data.type === 'waiting') {
      if (!gameState.waitingForUser) {
        gameState.waitingForUser = true;
        gameState.waitingTimer = 0;
        gameState.thinkingTimer = 0;
        gameState.boostTimer = 0;
        playWaitingSound();
        startTitleFlash();
      }
      return;
    }

    // ── Explicit resume (AskUserQuestion answered) ──
    if (data.type === 'resume') {
      if (gameState.waitingForUser) resumeFromWaiting();
      return;
    }

    // ── Normal status update ──
    // Clears waiting only when tokens actually increased
    if (gameState.waitingForUser) {
      const incomingTotal = (data.totalInput || 0) + (data.totalOutput || 0);
      if (incomingTotal > gameState.prevTotalTokens && gameState.prevTotalTokens > 0) {
        resumeFromWaiting();
      } else {
        return; // still waiting, don't process this status event
      }
    }

    // ── Token rate calculation ──
    const now = Date.now() / 1000;
    const newTotal = (data.totalInput || 0) + (data.totalOutput || 0);
    const oldTotal = gameState.prevTotalTokens; // capture BEFORE mutation
    const idleGap = gameState.prevTs > 0 && (now - gameState.prevTs) > 5;

    if (idleGap) {
      gameState.prevTotalTokens = newTotal;
      gameState.prevTs = now;
      gameState.tokPerSec = 300;
    } else if (gameState.prevTs > 0 && now - gameState.prevTs > 0.3) {
      const delta = newTotal - gameState.prevTotalTokens;
      if (delta > 0) {
        gameState.tokPerSec = delta / (now - gameState.prevTs);
        gameState.prevTotalTokens = newTotal;
        gameState.prevTs = now;
      }
    } else if (gameState.prevTs === 0) {
      gameState.prevTotalTokens = newTotal;
      gameState.prevTs = now;
      if (newTotal > 0) gameState.tokPerSec = 300;
    }

    gameState.lastUpdateTime = Date.now();

    // ── Thinking detection ──
    // Compare against oldTotal (before mutation) to detect thinking vs burst
    const tokChanged = newTotal !== oldTotal;
    if (!tokChanged && oldTotal > 0) {
      gameState.thinkingTimer += 0.5;
    } else if (tokChanged && gameState.thinkingTimer > 1) {
      // Was thinking, now tokens burst -- trigger boost!
      gameState.boostTimer = 1.5;
      gameState.boostSpeed = 300;
      gameState.thinkingTimer = 0;
      playBoostSound();
    } else if (tokChanged) {
      gameState.thinkingTimer = 0;
    }

    // ── Persist latest stats into shared state ──
    gameState.totalTokens = newTotal;
    gameState.totalInput = data.totalInput || 0;
    gameState.totalOutput = data.totalOutput || 0;
    gameState.costUSD = data.costUSD || 0;
    gameState.contextPct = data.contextPct || 0;
    gameState.model = data.model || 'Unknown';
    gameState.startedAt = data.startedAt || 0;
  };

  es.onerror = () => {
    gameState.tokPerSec = 0;
  };

  // ── Page unload cleanup ──
  window.addEventListener('beforeunload', () => {
    es.close();
    closeAudio();
  });

  return es;
}

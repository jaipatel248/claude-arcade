// ── Game loop — update + render split into a single requestAnimationFrame loop ──

import { S, TILE, GROUND_ROW } from './constants.js';
import { gameState, canvas, ctx } from './state.js';
import { getWorldTiles, getWorldCoins, ensureChunksGenerated, cleanupWorld } from './world.js';
import { drawBlock, drawCoin, drawBackground } from './renderer.js';
import { drawPlayer, drawPlayerSitting, drawPlayerSupervising, drawSupervisorBubble } from './player.js';
import { updateAndDrawParticles, updateAndDrawFireworks, spawnDangerParticles } from './particles.js';
import { calculateSpeed, advanceScroll, updatePlayerPhysics, collectCoins, decayIdleSpeed } from './physics.js';
import { updateHUD, fmtTok } from './hud.js';

/**
 * Starts the main game loop.  Call once after all subsystems are initialised.
 * Uses `requestAnimationFrame` for smooth 60 fps rendering.
 */
export function startGameLoop() {
  let lastTime = 0;

  function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    // ── UPDATE PHASE ──
    decayIdleSpeed(dt);
    const speed = calculateSpeed(dt);
    const blockedByWall = advanceScroll(speed, dt);
    ensureChunksGenerated(Math.ceil((gameState.scrollX + canvas.width) / TILE) + 5);
    updatePlayerPhysics(dt, speed, blockedByWall);
    collectCoins();
    cleanupWorld(gameState.scrollX);

    // ── RENDER PHASE ──
    const W = canvas.width;
    const H = canvas.height;
    const tok = gameState.tokPerSec;
    const pal = { shirt: '#e52521', pants: '#3030c0' };
    const player = gameState.player;

    // Offset so ground sits near the bottom of the screen (3 tiles from bottom)
    const groundPixelY = H - 3 * TILE;
    const worldOffsetY = groundPixelY - GROUND_ROW * TILE;

    // ── 1. Screen shake at 90%+ context ──
    const ctxPct = gameState.contextPct || 0;
    let screenShaking = false;
    if (ctxPct > 90) {
      ctx.save();
      screenShaking = true;
      ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
    }

    // ── 2. Background (sky, clouds, hills) ──
    drawBackground(gameState.scrollX, W, H, groundPixelY, ctxPct);

    // ── 3. Tiles ──
    const startTile = Math.floor(gameState.scrollX / TILE) - 1;
    const endTile = Math.ceil((gameState.scrollX + W) / TILE) + 1;
    for (const tile of getWorldTiles()) {
      if (tile.x < startTile || tile.x > endTile) continue;
      const px = tile.x * TILE - gameState.scrollX;
      const py = tile.y * TILE + worldOffsetY;
      drawBlock(tile.type, px, py);
    }

    // ── 4. Coins ──
    for (const coin of getWorldCoins()) {
      if (coin.collected) continue;
      const cx = coin.x - gameState.scrollX;
      if (cx < -TILE || cx > W + TILE) continue;
      drawCoin(cx, coin.y + worldOffsetY, timestamp / 1000);
    }

    // ── 5. Waiting state (permission / question) ──
    if (gameState.waitingForUser) {
      gameState.waitingTimer += dt;
      // speed is already calculated but we suppress motion in events;
      // the waitingForUser flag is checked elsewhere for speed override.

      // Escalating impatience phases
      // 0-3s: foot tap  |  3-8s: impatient jumping  |  8s+: sits down
      const phase = gameState.waitingTimer < 3 ? 'tap'
        : gameState.waitingTimer < 8 ? 'jump'
        : 'sit';

      // Impatient jump: small bounces
      if (phase === 'jump') {
        const jumpCycle = (gameState.waitingTimer - 3) % 0.8;
        if (jumpCycle < 0.3) {
          player.y = player.groundY - Math.sin(jumpCycle / 0.3 * Math.PI) * 3 * TILE;
        } else {
          player.y = player.groundY;
        }
      } else if (phase === 'sit') {
        player.y = player.groundY;
      }

      // Thought bubble with ?
      const pulseRate = phase === 'tap' ? 3 : phase === 'jump' ? 5 : 1.5;
      const pulseAmp = phase === 'sit' ? 2 : 5;
      const bx = player.x + 5 * S;
      const by = player.y + worldOffsetY - 25
        - Math.min(15, gameState.waitingTimer * 3)
        + Math.sin(gameState.waitingTimer * pulseRate) * pulseAmp;

      // Glow (intensifies over time)
      const glowIntensity = Math.min(1, gameState.waitingTimer / 3);
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10 + glowIntensity * 12 + Math.sin(gameState.waitingTimer * 4) * 5;

      // Small connecting circles (thought trail)
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(bx - 2, by + 22, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx + 2, by + 14, 5, 0, Math.PI * 2); ctx.fill();

      // Main bubble (larger than thinking bubble to fit ?)
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.ellipse(bx + 5, by, 26, 18, 0, 0, Math.PI * 2); ctx.fill();

      // ? mark inside bubble (animated size)
      const fontSize = 22 + Math.sin(gameState.waitingTimer * 4) * 2;
      ctx.fillStyle = '#e0a020';
      ctx.font = 'bold ' + Math.round(fontSize) + 'px "Arial Black", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', bx + 5, by + 1);
      ctx.textBaseline = 'alphabetic';
      ctx.shadowBlur = 0;

      // Big banner text
      const bannerAlpha = Math.min(1, gameState.waitingTimer * 0.5);
      ctx.fillStyle = 'rgba(255,215,0,' + bannerAlpha + ')';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      const bannerY = H * 0.25 + Math.sin(gameState.waitingTimer * 2) * 3;
      if (phase === 'sit') {
        ctx.fillText('WAITING FOR YOU!', W / 2, bannerY);
        // Elapsed time with dark outline for visibility
        const mins = Math.floor(gameState.waitingTimer / 60);
        const secs = Math.floor(gameState.waitingTimer % 60);
        const timeStr = (mins > 0 ? mins + 'm ' : '') + secs + 's';
        ctx.font = 'bold 20px monospace';
        // Dark outline
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillText(timeStr, W / 2 + 1, bannerY + 28 + 1);
        // White text
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(timeStr, W / 2, bannerY + 28);
      } else {
        const dots = '.'.repeat(Math.floor(gameState.waitingTimer * 2) % 4);
        ctx.fillText('WAITING' + dots, W / 2, bannerY);
      }

      // Floating ? particles (escalate over time)
      if (gameState.waitingTimer > 2 && Math.random() < 0.08) {
        gameState.coinParticles.push({
          x: player.x + 5 * S + (Math.random() - 0.5) * 60,
          y: player.y + worldOffsetY - 20,
          vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 30,
          life: 0.8 + Math.random() * 0.5,
        });
      }
    }

    // ── 6. Supervisor mode ──
    const hasActiveSubagents = gameState.miniMarios.some(m => !m.fading);
    const supervisorMode = hasActiveSubagents && speed === 0 && !gameState.waitingForUser;

    // ── 7. Thinking state (Claude processing, no tokens yet) ──
    if (gameState.thinkingTimer > 0.5 && !supervisorMode) {
      const glowIntensity = Math.min(1, (gameState.thinkingTimer - 0.5) / 3);
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 20 + glowIntensity * 15;

      // Thought bubble above player
      const bx = player.x + 5 * S;
      const by = player.y + worldOffsetY - 20 - glowIntensity * 10;
      // Small connecting circles
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(bx - 2, by + 18, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx + 2, by + 12, 5, 0, Math.PI * 2); ctx.fill();
      // Main bubble
      ctx.beginPath(); ctx.ellipse(bx + 5, by, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
      // "..." dots inside bubble (animated)
      ctx.fillStyle = '#555';
      const dotPhase = Math.floor(Date.now() / 400) % 4;
      for (let d = 0; d < 3; d++) {
        const show = d <= dotPhase;
        if (show) ctx.fillRect(bx - 5 + d * 8, by - 2, 4, 4);
      }

      // Sparkle particles
      if (Math.random() < glowIntensity * 0.3) {
        gameState.coinParticles.push({
          x: player.x + 5 * S + (Math.random() - 0.5) * 30,
          y: player.y + worldOffsetY + 5 * S + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 40,
          life: 0.4 + Math.random() * 0.3,
        });
      }
    }

    // ── 8. Boost star effect (after thinking burst) ──
    if (gameState.boostTimer > 0) {
      ctx.shadowColor = '#ff0';
      ctx.shadowBlur = 25;
      // Rainbow flash
      const hue = (Date.now() / 30) % 360;
      ctx.shadowColor = 'hsl(' + hue + ', 100%, 60%)';
    }

    // ── 9. Prompt power-up ──
    if (gameState.promptPowerTimer > 0) gameState.promptPowerTimer -= dt;

    // Color-change glow during prompt power-up
    if (gameState.promptPowerTimer > 0) {
      const powerHue = (Date.now() / 50) % 360;
      ctx.shadowColor = 'hsl(' + powerHue + ', 100%, 60%)';
      ctx.shadowBlur = 20;
      ctx.filter = 'hue-rotate(' + powerHue + 'deg) saturate(1.5)';
    }

    // ── 10. Player rendering ──
    if (supervisorMode) {
      // Supervisor: Mario faces backward, barking orders at mini-Marios
      const tapFrame = Math.floor(Date.now() / 500) % 2;
      drawPlayerSupervising(player.x, player.y + worldOffsetY, pal, tapFrame);
      drawSupervisorBubble(player.x, player.y + worldOffsetY);
    } else if (gameState.waitingForUser && gameState.waitingTimer >= 8) {
      // Sitting pose
      drawPlayerSitting(player.x, player.y + worldOffsetY, pal);
    } else {
      const playerFrame = gameState.waitingForUser
        ? (gameState.waitingTimer < 3
          ? (Math.floor(gameState.waitingTimer * 4) % 2 === 0 ? 1 : 3)   // foot tap
          : (Math.floor(gameState.waitingTimer * 6) % 2 === 0 ? 1 : 3))  // faster tap (impatient)
        : (speed > 0 ? gameState.animFrame : 0);
      const isGrounded = gameState.waitingForUser && gameState.waitingTimer >= 3
        ? player.y >= player.groundY  // jumping phase: respect airborne state
        : player.grounded;
      drawPlayer(player.x, player.y + worldOffsetY, pal, playerFrame, isGrounded);
    }

    // ── 11. Reset filter / shadow ──
    ctx.filter = 'none';
    ctx.shadowBlur = 0;

    // End screen shake before overlays (so text doesn't jitter)
    if (screenShaking) { ctx.restore(); screenShaking = false; }

    // ── 12. Resume effects ──
    if (gameState.resumeFlashTimer > 0) {
      gameState.resumeFlashTimer -= dt;
      const flashAlpha = gameState.resumeFlashTimer * 0.8;
      ctx.fillStyle = 'rgba(255,255,200,' + Math.max(0, flashAlpha) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (gameState.resumeBoostTimer > 0) {
      gameState.resumeBoostTimer -= dt;
      // "LET'S GO!" text
      const goAlpha = Math.min(1, gameState.resumeBoostTimer / 1.0);
      ctx.fillStyle = 'rgba(100,255,100,' + goAlpha + ')';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText("LET'S GO!", W / 2, H * 0.25);
    }

    // ── 13. Victory celebration (task complete) ──
    if (gameState.victoryTimer > 0) {
      gameState.victoryTimer -= dt;
      // "COMPLETE!" text
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, gameState.victoryTimer) + ')';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('COMPLETE!', W / 2, H * 0.3);
      // Fireworks
      updateAndDrawFireworks(dt);
    }

    // ── 14. Coin particles ──
    updateAndDrawParticles(dt);

    // ── 15. Danger particles ──
    spawnDangerParticles(ctxPct, W, groundPixelY);

    // ── 16. Mini-Marios (subagents) ──
    for (let i = gameState.miniMarios.length - 1; i >= 0; i--) {
      const mm = gameState.miniMarios[i];
      if (mm.fading) {
        mm.alpha -= dt * 0.8;
        mm.vy -= 300 * dt;
        mm.y += mm.vy * dt;
        if (mm.alpha <= 0) { gameState.miniMarios.splice(i, 1); continue; }
      }
      ctx.globalAlpha = mm.alpha * 0.5;
      const mmx = player.x - 30 - i * 25;
      const mmy = mm.fading ? mm.y : player.y + worldOffsetY + 20;
      ctx.save();
      ctx.translate(mmx, mmy);
      ctx.scale(0.6, 0.6);
      // Tinted mini player
      ctx.fillStyle = mm.tint;
      ctx.fillRect(3 * S, -2 * S, 5 * S, 2 * S);
      ctx.fillRect(2 * S, 0, 7 * S, S);
      ctx.fillStyle = '#FFB88C';
      ctx.fillRect(3 * S, S, 5 * S, 4 * S);
      ctx.fillStyle = mm.tint;
      ctx.fillRect(2 * S, 5 * S, 7 * S, 3 * S);
      ctx.fillStyle = '#3030c0';
      ctx.fillRect(2 * S, 8 * S, 7 * S, 4 * S);
      ctx.fillRect(2 * S, 12 * S, 3 * S, 2 * S);
      ctx.fillRect(6 * S, 12 * S, 3 * S, 2 * S);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // ── 17. Damage flash (tool failure) ──
    if (gameState.damageTimer > 0) {
      gameState.damageTimer -= dt;
      ctx.fillStyle = 'rgba(255,0,0,' + Math.min(0.4, gameState.damageTimer * 0.8) + ')';
      ctx.fillRect(0, 0, W, H);
      // X particle at player
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('X', player.x + 5 * S, player.y + worldOffsetY - 10);
    }

    // ── 18. Compaction vignette ──
    if (gameState.compactTimer > 0 || gameState.compactingActive) {
      if (gameState.compactingActive) gameState.compactTimer = Math.min(gameState.compactTimer + dt, 1);
      else gameState.compactTimer -= dt * 0.5;
      const vigAlpha = Math.min(0.5, gameState.compactTimer * 0.5);
      const gradient = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
      gradient.addColorStop(0, 'rgba(100,0,200,0)');
      gradient.addColorStop(1, 'rgba(100,0,200,' + vigAlpha + ')');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
      if (gameState.compactingActive) {
        ctx.fillStyle = 'rgba(200,150,255,0.9)';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('COMPACTING...', W / 2, H * 0.2);
      }
    }

    // ── 19. Prompt boost glow ──
    if (gameState.promptBoostTimer > 0) {
      gameState.promptBoostTimer -= dt;
      // Green glow bar at the bottom of the screen
      ctx.shadowColor = '#0f0';
      ctx.shadowBlur = 15;
      const glowAlpha = Math.min(1, gameState.promptBoostTimer / 1.0);
      ctx.fillStyle = 'rgba(0,255,0,' + (glowAlpha * 0.15) + ')';
      ctx.fillRect(0, H - 6, W, 6);
      ctx.shadowBlur = 0;
    }

    // ── 20. Checkpoint flags ──
    for (const flag of gameState.checkpointFlags) {
      const fx = flag.x - gameState.scrollX;
      if (fx < -TILE || fx > W + TILE) continue;
      const fy = groundPixelY - 30;
      // Pole
      ctx.fillStyle = '#888';
      ctx.fillRect(fx, fy, 3, 30);
      // Flag
      ctx.fillStyle = flag.waving ? '#4f4' : '#ffd700';
      ctx.beginPath();
      ctx.moveTo(fx + 3, fy);
      ctx.lineTo(fx + 20 + (flag.waving ? Math.sin(Date.now() / 200) * 3 : 0), fy + 6);
      ctx.lineTo(fx + 3, fy + 12);
      ctx.fill();
    }

    // ── 21. Task celebration ──
    if (gameState.taskCelebTimer > 0) {
      gameState.taskCelebTimer -= dt;
      ctx.fillStyle = 'rgba(100,255,100,' + Math.min(1, gameState.taskCelebTimer) + ')';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TASK COMPLETE!', W / 2, H * 0.35);
    }

    // ── 22. Session intro ──
    if (gameState.introTimer > 0) {
      gameState.introTimer -= dt;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      if (gameState.introTimer > 2) ctx.fillText('GAME START', W / 2, H * 0.4);
      else if (gameState.introTimer > 1.5) ctx.fillText('3', W / 2, H * 0.4);
      else if (gameState.introTimer > 1) ctx.fillText('2', W / 2, H * 0.4);
      else if (gameState.introTimer > 0.5) ctx.fillText('1', W / 2, H * 0.4);
      else ctx.fillText('GO!', W / 2, H * 0.4);
    }

    // ── 23. Game over ──
    if (gameState.gameOverTimer > 0) {
      gameState.gameOverTimer -= dt;
      ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.8, (5 - gameState.gameOverTimer) * 0.2) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', W / 2, H * 0.3);
      ctx.font = '16px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText(
        'Tokens: ' + fmtTok(gameState.totalTokens)
        + '  |  Coins: ' + gameState.coinsCollected
        + '  |  Cost: $' + (gameState.costUSD || 0).toFixed(2),
        W / 2, H * 0.4,
      );
    }

    // ── 25. HUD update ──
    updateHUD(tok, pal);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

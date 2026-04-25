// ── Main entry point — wires up canvas, subsystems, SSE, and kicks off the loop ──

import { initCanvas, gameState } from './state.js';
import { initWorld } from './world.js';
import { initHUD } from './hud.js';
import { initSSE } from './events.js';
import { initSoundControls, toggleMusic, toggleSfx, playJumpSound, startMusic, getAudioCtx } from './sound.js';
import { startGameLoop } from './game-loop.js';

const canvasEl = document.getElementById('game');
initCanvas(canvasEl);

function resize() { canvasEl.width = window.innerWidth; canvasEl.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

initHUD();
initSoundControls();
initWorld();
initSSE(location.hash.slice(1) || '');

// ── Start splash — one click unlocks AudioContext, starts music + SFX ──
const splash = document.getElementById('start-splash');
splash.addEventListener('click', () => {
  splash.classList.add('hidden');
  // This click is the user gesture that unlocks AudioContext
  getAudioCtx();
  startMusic();
});

// ── Keyboard controls ──
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  // Space → manual jump (when grounded)
  if (key === ' ' || key === 'spacebar') {
    e.preventDefault();
    const p = gameState.player;
    if (p.grounded) {
      p.vy = -500;
      p.grounded = false;
      playJumpSound();
    }
  }

  // M → toggle music
  if (key === 'm') toggleMusic();

  // S → toggle SFX
  if (key === 's') toggleSfx();

  // C → screenshot (capture full page: HUD + canvas)
  if (key === 'c') captureScreenshot();
});

// ── Screenshot: composites HUD bar + game canvas into one image ──
function captureScreenshot() {
  const hud = document.getElementById('hud');
  const hudH = hud.offsetHeight;
  const W = canvasEl.width;
  const H = canvasEl.height;

  const offscreen = document.createElement('canvas');
  offscreen.width = W;
  offscreen.height = H;
  const oc = offscreen.getContext('2d');

  // Draw the game canvas
  oc.drawImage(canvasEl, 0, 0);

  // Draw the HUD bar on top (semi-transparent dark background)
  oc.fillStyle = 'rgba(0,0,0,0.6)';
  oc.fillRect(0, 0, W, hudH);

  // Render HUD text from DOM onto the canvas
  oc.font = 'bold 18px "Courier New", monospace';
  oc.fillStyle = '#fff';
  const left = [];
  const right = [];
  hud.querySelectorAll('.hud-group').forEach((group, gi) => {
    group.querySelectorAll('.hud-item').forEach((item) => {
      const label = item.querySelector('.hud-label');
      const value = item.querySelector('.hud-value');
      if (label && value) {
        (gi === 0 ? left : right).push({ label: label.textContent, value: value.textContent, color: value.style.color || '#fff' });
      }
    });
  });

  // Model badge
  const badge = document.getElementById('hud-model');
  if (badge) {
    oc.fillStyle = badge.style.background || '#3794ff';
    oc.fillRect(14, 8, oc.measureText(badge.textContent).width + 20, 26);
    oc.fillStyle = '#fff';
    oc.font = 'bold 14px "Courier New", monospace';
    oc.fillText(badge.textContent, 24, 26);
  }

  // Left group
  let lx = badge ? 14 + oc.measureText(badge.textContent).width + 40 : 24;
  oc.font = '12px "Courier New", monospace';
  for (const item of left) {
    oc.fillStyle = 'rgba(255,255,255,0.5)';
    oc.fillText(item.label.toUpperCase(), lx, 16);
    oc.fillStyle = item.color || '#fff';
    oc.font = 'bold 18px "Courier New", monospace';
    oc.fillText(item.value, lx, 36);
    lx += Math.max(oc.measureText(item.value).width, oc.measureText(item.label).width) + 24;
    oc.font = '12px "Courier New", monospace';
  }

  // Right group
  let rx = W - 20;
  oc.font = '12px "Courier New", monospace';
  for (const item of right.reverse()) {
    oc.font = 'bold 18px "Courier New", monospace';
    const vw = oc.measureText(item.value).width;
    oc.font = '12px "Courier New", monospace';
    const lw = oc.measureText(item.label.toUpperCase()).width;
    const iw = Math.max(vw, lw);
    rx -= iw;
    oc.fillStyle = 'rgba(255,255,255,0.5)';
    oc.fillText(item.label.toUpperCase(), rx, 16);
    oc.fillStyle = item.color || '#fff';
    oc.font = 'bold 18px "Courier New", monospace';
    oc.fillText(item.value, rx, 36);
    rx -= 24;
    oc.font = '12px "Courier New", monospace';
  }

  offscreen.toBlob((blob) => {
    if (!blob) return;
    if (navigator.clipboard && window.ClipboardItem) {
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).catch(() => {});
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mario-runner-' + Date.now() + '.png';
    a.click();
    URL.revokeObjectURL(url);
    showScreenshotFlash();
  }, 'image/png');
}

// ── Screenshot flash overlay ──
function showScreenshotFlash() {
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;border:4px solid #fff;pointer-events:none;z-index:100;' +
    'display:flex;align-items:center;justify-content:center;transition:opacity 0.6s;';
  flash.innerHTML = '<span style="background:rgba(0,0,0,0.7);color:#fff;padding:8px 20px;' +
    'border-radius:6px;font:bold 16px monospace;">CAPTURED!</span>';
  document.body.appendChild(flash);
  setTimeout(() => { flash.style.opacity = '0'; }, 100);
  setTimeout(() => { flash.remove(); }, 700);
}

startGameLoop();

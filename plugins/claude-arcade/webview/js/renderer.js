import { TILE, COL, QUESTION_FONT } from './constants.js';
import { ctx } from './state.js';

// ── Hills & clouds (background, generated once) ──
const hills = [];
for (let i = 0; i < 10; i++) hills.push({ x: i * 300 + Math.random() * 100, w: 80 + Math.random() * 120, h: 30 + Math.random() * 50 });
const clouds = [];
for (let i = 0; i < 8; i++) clouds.push({ x: i * 250 + Math.random() * 150, y: 30 + Math.random() * 80, w: 40 + Math.random() * 60 });

export function drawBlock(type, px, py) {
  const x = px, y = py;
  if (type === 'ground' || type === 'groundTop') {
    ctx.fillStyle = COL.ground;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = COL.groundDark;
    ctx.fillRect(x, y + TILE - 2, TILE, 2);
    ctx.fillRect(x + TILE - 2, y, 2, TILE);
    if (type === 'groundTop') {
      ctx.fillStyle = '#a03000';
      ctx.fillRect(x, y, TILE, 6);
    }
  } else if (type === 'brick') {
    ctx.fillStyle = COL.brick;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = COL.brickDark;
    ctx.fillRect(x, y, TILE, 2);
    ctx.fillRect(x, y, 2, TILE);
    ctx.fillRect(x + TILE / 2 - 1, y, 2, TILE);
    ctx.fillRect(x, y + TILE / 2 - 1, TILE, 2);
    ctx.fillStyle = COL.brickLine;
    ctx.fillRect(x + 2, y + 2, TILE / 2 - 3, TILE / 2 - 3);
    ctx.fillRect(x + TILE / 2 + 1, y + 2, TILE / 2 - 3, TILE / 2 - 3);
  } else if (type === 'question') {
    // Dark border outline
    ctx.fillStyle = '#7a4a08';
    ctx.fillRect(x, y, TILE, TILE);
    // Golden body (inset)
    ctx.fillStyle = '#e8b020';
    ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
    // Light bevel top-left
    ctx.fillStyle = '#f8d848';
    ctx.fillRect(x + 3, y + 3, TILE - 6, 3);
    ctx.fillRect(x + 3, y + 3, 3, TILE - 6);
    // Dark bevel bottom-right
    ctx.fillStyle = '#a06810';
    ctx.fillRect(x + 3, y + TILE - 6, TILE - 6, 3);
    ctx.fillRect(x + TILE - 6, y + 3, 3, TILE - 6);
    // Corner rivets (4 bolts)
    ctx.fillStyle = '#7a4a08';
    ctx.fillRect(x + 6, y + 6, 4, 4);
    ctx.fillRect(x + TILE - 10, y + 6, 4, 4);
    ctx.fillRect(x + 6, y + TILE - 10, 4, 4);
    ctx.fillRect(x + TILE - 10, y + TILE - 10, 4, 4);
    // ? shadow
    ctx.fillStyle = '#a06810';
    ctx.font = QUESTION_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x + TILE / 2 + 1, y + TILE / 2 + 2);
    // ? mark (white, bold)
    ctx.fillStyle = '#fff';
    ctx.fillText('?', x + TILE / 2, y + TILE / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'start';
  } else if (type === 'pipe' || type === 'pipeTop') {
    ctx.fillStyle = COL.pipe;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = COL.pipeDark;
    ctx.fillRect(x, y, 4, TILE);
    ctx.fillStyle = COL.pipeLight;
    ctx.fillRect(x + TILE - 6, y, 3, TILE);
    if (type === 'pipeTop') {
      ctx.fillStyle = COL.pipe;
      ctx.fillRect(x - 4, y, TILE + 8, 8);
      ctx.fillStyle = COL.pipeLight;
      ctx.fillRect(x - 4, y, TILE + 8, 3);
    }
  }
}

export function drawCoin(cx, cy, t) {
  const stretch = Math.abs(Math.sin(t * 3));
  const w = 10 * stretch + 3;
  const h = 14;
  const rOuter = Math.max(1, w / 2);
  const rInner = Math.max(1, w / 2 - 2);
  const rCore = Math.max(1, w / 2 - 3);
  // Outer gold circle
  ctx.fillStyle = COL.coin;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rOuter, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Inner darker ring
  ctx.fillStyle = COL.coinDark;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rInner, Math.max(1, h / 2 - 2), 0, 0, Math.PI * 2);
  ctx.fill();
  // Inner gold fill
  ctx.fillStyle = '#ffe44d';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rCore, Math.max(1, h / 2 - 3), 0, 0, Math.PI * 2);
  ctx.fill();
  // Shine highlight
  if (stretch > 0.3) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx - 1, cy - 2, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillRect(cx - w / 2, cy - 6, 2, 12);
}

export function drawBackground(scrollX, W, H, groundPixelY, ctxPct) {
  // Sky color shifts with context % (danger!)
  let skyColor = COL.sky;
  let earthColor = '#8B4513';
  if (ctxPct > 90) { skyColor = '#1a0000'; earthColor = '#4a0000'; }
  else if (ctxPct > 80) { skyColor = '#4a1a1a'; earthColor = '#5a1a00'; }
  else if (ctxPct > 60) { skyColor = '#3a3a5a'; earthColor = '#6a3a1a'; }
  else if (ctxPct > 30) { skyColor = '#5a6a8a'; earthColor = '#7a4a23'; }
  ctx.fillStyle = skyColor;
  ctx.fillRect(0, 0, W, groundPixelY);
  // Earth below ground
  ctx.fillStyle = earthColor;
  ctx.fillRect(0, groundPixelY, W, H - groundPixelY);

  // Clouds
  ctx.fillStyle = COL.cloud;
  for (const c of clouds) {
    const cx = ((c.x - scrollX * 0.1) % (W + 200));
    const drawX = cx < -100 ? cx + W + 200 : cx;
    ctx.beginPath();
    ctx.ellipse(drawX, c.y, c.w, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(drawX - c.w * 0.3, c.y + 5, c.w * 0.6, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(drawX + c.w * 0.3, c.y + 5, c.w * 0.5, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hills
  for (const h of hills) {
    const hx = ((h.x - scrollX * 0.15) % (W + 400));
    const drawX = hx < -200 ? hx + W + 400 : hx;
    ctx.fillStyle = COL.hillGreen;
    ctx.beginPath();
    ctx.ellipse(drawX, groundPixelY - scrollX % 1, h.w, h.h, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = COL.hillLight;
    ctx.beginPath();
    ctx.ellipse(drawX - h.w * 0.2, groundPixelY - h.h * 0.3, h.w * 0.3, h.h * 0.4, 0, Math.PI, 0);
    ctx.fill();
  }
}

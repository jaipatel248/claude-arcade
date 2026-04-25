import { ctx, gameState } from './state.js';

export function updateAndDrawParticles(dt) {
  const coinParticles = gameState.coinParticles;
  for (let i = coinParticles.length - 1; i >= 0; i--) {
    const p = coinParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 200 * dt;
    p.life -= dt;
    if (p.life <= 0) { coinParticles.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, p.life / 0.5);
    ctx.fillStyle = p.color || '#ffd700';
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

export function updateAndDrawFireworks(dt) {
  const fireworks = gameState.fireworks;
  for (let i = fireworks.length - 1; i >= 0; i--) {
    const fw = fireworks[i];
    fw.x += fw.vx * dt;
    fw.y += fw.vy * dt;
    fw.vy += 100 * dt;
    fw.life -= dt;
    if (fw.life <= 0) { fireworks.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, fw.life);
    ctx.fillStyle = fw.color;
    ctx.fillRect(fw.x - fw.size / 2, fw.y - fw.size / 2, fw.size, fw.size);
  }
  ctx.globalAlpha = 1;
}

export function spawnDangerParticles(ctxPct, W, groundPixelY) {
  if (ctxPct > 60 && Math.random() < (ctxPct - 60) / 100) {
    if (ctxPct > 85) {
      // Fire embers
      gameState.coinParticles.push({
        x: Math.random() * W, y: groundPixelY + Math.random() * 10,
        vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 60,
        life: 0.5 + Math.random() * 0.5, color: Math.random() > 0.5 ? '#ff4400' : '#ff8800',
      });
    } else {
      // Rain
      gameState.coinParticles.push({
        x: Math.random() * W, y: -5,
        vx: -20, vy: 200 + Math.random() * 100,
        life: 0.8, color: 'rgba(150,180,255,0.4)',
      });
    }
  }
}

export function spawnCoinBurst(x, y, count) {
  for (let p = 0; p < count; p++) {
    gameState.coinParticles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 80,
      life: 0.5 + Math.random() * 0.3,
    });
  }
}

export function spawnFireworkBurst(x, y, count) {
  const colors = ['#ff0', '#f0f', '#0ff', '#f44', '#4f4', '#44f', '#ffa500'];
  for (let p = 0; p < count; p++) {
    gameState.fireworks.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 300, vy: -100 - Math.random() * 200,
      life: 0.8 + Math.random() * 0.6,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 4,
    });
  }
}

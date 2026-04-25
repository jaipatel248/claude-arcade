// ── World generation — chunk-based procedural tile world ──

import { TILE, CHUNK, GROUND_ROW } from './constants.js';

let worldTiles = [];
const tileMap = new Map(); // spatial hash: "x,y" -> tile
let worldCoins = [];
let nextChunkX = 0;

/**
 * Generates a single chunk of world tiles starting at the given X tile
 * coordinate.  Each chunk contains ground blocks and random features
 * (pipes, floating brick rows with coins, staircases).
 *
 * If `startX` is not provided, uses the internal `nextChunkX` cursor.
 */
export function generateChunk(startX) {
  if (startX === undefined) startX = nextChunkX;

  const groundY = GROUND_ROW;
  // Ground blocks
  for (let x = startX; x < startX + CHUNK; x++) {
    for (let y = groundY; y < groundY + 3; y++) {
      const tile = { type: y === groundY ? 'groundTop' : 'ground', x, y };
      worldTiles.push(tile);
      tileMap.set(x + ',' + y, tile);
    }
  }

  // Randomly place features
  let x = startX + 2;
  while (x < startX + CHUNK - 2) {
    const r = Math.random();
    if (r < 0.2) {
      // Pipe
      const pipeH = 2 + Math.floor(Math.random() * 2);
      for (let py = 0; py < pipeH; py++) {
        const t1 = { type: py === 0 ? 'pipeTop' : 'pipe', x, y: groundY - pipeH + py };
        const t2 = { type: py === 0 ? 'pipeTop' : 'pipe', x: x+1, y: groundY - pipeH + py };
        worldTiles.push(t1); tileMap.set(t1.x + ',' + t1.y, t1);
        worldTiles.push(t2); tileMap.set(t2.x + ',' + t2.y, t2);
      }
      x += 4;
    } else if (r < 0.45) {
      // Floating brick row with coins
      const brickY = groundY - 4 - Math.floor(Math.random() * 2);
      const len = 2 + Math.floor(Math.random() * 3);
      for (let bx = 0; bx < len; bx++) {
        const t = { type: (bx === 1) ? 'question' : 'brick', x: x+bx, y: brickY };
        worldTiles.push(t); tileMap.set(t.x + ',' + t.y, t);
      }
      // Coins above bricks
      for (let bx = 0; bx < len; bx++) {
        worldCoins.push({ x: (x+bx) * TILE + TILE/2, y: (brickY-1) * TILE + TILE/2, collected: false });
      }
      x += len + 2;
    } else if (r < 0.6) {
      // Staircase
      for (let s = 0; s < 4; s++) {
        for (let sy = 0; sy <= s; sy++) {
          const t = { type: 'brick', x: x+s, y: groundY - 1 - sy };
          worldTiles.push(t); tileMap.set(t.x + ',' + t.y, t);
        }
      }
      worldCoins.push({ x: (x+3) * TILE + TILE/2, y: (groundY - 6) * TILE, collected: false });
      x += 6;
    } else {
      x += 2 + Math.floor(Math.random() * 2);
    }
  }
  nextChunkX = startX + CHUNK;
}

/**
 * Returns the tile at the given tile coordinates, or `undefined` if empty.
 */
export function getTileAt(tx, ty) {
  return tileMap.get(tx + ',' + ty);
}

/**
 * Removes tiles and collected coins that have scrolled far off-screen to the
 * left, freeing memory.  The `scrollX` parameter is the current pixel scroll
 * offset.
 *
 * Includes Bug 6 fix: only retains coins that are both uncollected AND still
 * ahead of the cleanup boundary.
 */
export function cleanupWorld(scrollX) {
  const cleanupX = Math.floor(scrollX / TILE) - 10;
  worldTiles = worldTiles.filter(t => {
    if (t.x <= cleanupX) { tileMap.delete(t.x + ',' + t.y); return false; }
    return true;
  });
  worldCoins = worldCoins.filter(c => !c.collected && c.x / TILE > cleanupX);
}

/** Returns a reference to the live worldTiles array. */
export function getWorldTiles() {
  return worldTiles;
}

/** Returns a reference to the live worldCoins array. */
export function getWorldCoins() {
  return worldCoins;
}

/** Returns the X tile coordinate where the next chunk will begin. */
export function getNextChunkX() {
  return nextChunkX;
}

/**
 * Generates the initial 5 chunks of the world.
 * Call once at game startup.
 */
export function initWorld() {
  for (let i = 0; i < 5; i++) generateChunk();
}

/**
 * Ensures enough chunks have been generated so the world extends past
 * `screenEndTile` (in tile coordinates).
 */
export function ensureChunksGenerated(screenEndTile) {
  while (nextChunkX < screenEndTile) generateChunk(nextChunkX);
}

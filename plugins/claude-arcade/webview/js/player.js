import { S } from './constants.js';
import { ctx } from './state.js';

export function drawPlayer(px, py, pal, frame, grounded) {
  const R = '#e52521', B = '#3030c0', SK = '#FFB88C', BR = '#6B3A1F';
  // Cap
  ctx.fillStyle = R;
  ctx.fillRect(px + 3 * S, py - 2 * S, 5 * S, 2 * S); // cap top
  ctx.fillRect(px + 2 * S, py, 7 * S, S);                // cap brim
  // Hair (sides)
  ctx.fillStyle = BR;
  ctx.fillRect(px + 1 * S, py + S, 2 * S, 2 * S);       // sideburn left
  ctx.fillRect(px + 8 * S, py + S, 2 * S, S);            // sideburn right
  // Face
  ctx.fillStyle = SK;
  ctx.fillRect(px + 3 * S, py + S, 5 * S, 4 * S);
  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(px + 4 * S, py + 2 * S, S, S);
  ctx.fillRect(px + 7 * S, py + 2 * S, S, S);
  // Nose
  ctx.fillStyle = SK;
  ctx.fillRect(px + 8 * S, py + 2 * S, 2 * S, 2 * S);
  // Mustache
  ctx.fillStyle = BR;
  ctx.fillRect(px + 4 * S, py + 4 * S, 5 * S, S);
  // Shirt
  ctx.fillStyle = R;
  ctx.fillRect(px + 2 * S, py + 5 * S, 7 * S, 3 * S);
  // Arms (4-frame swing, opposite to legs for natural run)
  ctx.fillStyle = SK;
  const runFrame = frame % 4;
  if (!grounded) {
    // Jump: left arm up, right arm down
    ctx.fillRect(px + 0 * S, py + 4 * S, 2 * S, 2 * S);
    ctx.fillRect(px + 9 * S, py + 7 * S, 2 * S, 2 * S);
  } else if (runFrame === 0) {
    // Left arm forward-high, right arm back-low
    ctx.fillRect(px + 0 * S, py + 4 * S, 2 * S, 3 * S);
    ctx.fillRect(px + 9 * S, py + 7 * S, 2 * S, 2 * S);
  } else if (runFrame === 1) {
    // Both arms mid (transition)
    ctx.fillRect(px + 0 * S, py + 5 * S, 2 * S, 2 * S);
    ctx.fillRect(px + 9 * S, py + 6 * S, 2 * S, 2 * S);
  } else if (runFrame === 2) {
    // Right arm forward-high, left arm back-low
    ctx.fillRect(px + 0 * S, py + 7 * S, 2 * S, 2 * S);
    ctx.fillRect(px + 9 * S, py + 4 * S, 2 * S, 3 * S);
  } else {
    // Both arms mid (transition back)
    ctx.fillRect(px + 0 * S, py + 6 * S, 2 * S, 2 * S);
    ctx.fillRect(px + 9 * S, py + 5 * S, 2 * S, 2 * S);
  }
  // Overalls
  ctx.fillStyle = B;
  ctx.fillRect(px + 2 * S, py + 8 * S, 7 * S, 4 * S);
  // Overall straps
  ctx.fillRect(px + 3 * S, py + 6 * S, S, 2 * S);
  ctx.fillRect(px + 7 * S, py + 6 * S, S, 2 * S);
  // Buttons
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(px + 3 * S, py + 8 * S, S, S);
  ctx.fillRect(px + 7 * S, py + 8 * S, S, S);
  // Legs (4-frame run cycle, opposite to arms)
  ctx.fillStyle = B;
  if (!grounded) {
    ctx.fillRect(px + 1 * S, py + 11 * S, 3 * S, 2 * S);
    ctx.fillRect(px + 7 * S, py + 10 * S, 3 * S, 2 * S);
  } else if (runFrame === 0) {
    // Left leg forward, right leg back
    ctx.fillRect(px + 1 * S, py + 11 * S, 3 * S, 2 * S);
    ctx.fillRect(px + 7 * S, py + 12 * S, 3 * S, 2 * S);
  } else if (runFrame === 1) {
    // Legs passing (close together)
    ctx.fillRect(px + 3 * S, py + 12 * S, 2 * S, 2 * S);
    ctx.fillRect(px + 6 * S, py + 12 * S, 2 * S, 2 * S);
  } else if (runFrame === 2) {
    // Right leg forward, left leg back
    ctx.fillRect(px + 2 * S, py + 12 * S, 3 * S, 2 * S);
    ctx.fillRect(px + 6 * S, py + 11 * S, 3 * S, 2 * S);
  } else {
    // Legs passing (close together)
    ctx.fillRect(px + 3 * S, py + 12 * S, 2 * S, 2 * S);
    ctx.fillRect(px + 6 * S, py + 12 * S, 2 * S, 2 * S);
  }
  // Shoes (follow leg positions)
  ctx.fillStyle = BR;
  if (!grounded) {
    ctx.fillRect(px + 0 * S, py + 13 * S, 4 * S, S);
    ctx.fillRect(px + 7 * S, py + 12 * S, 4 * S, S);
  } else if (runFrame === 0) {
    ctx.fillRect(px + 0 * S, py + 13 * S, 4 * S, S);
    ctx.fillRect(px + 7 * S, py + 13 * S, 3 * S, S);
  } else if (runFrame === 1) {
    ctx.fillRect(px + 2 * S, py + 13 * S, 3 * S, S);
    ctx.fillRect(px + 6 * S, py + 13 * S, 3 * S, S);
  } else if (runFrame === 2) {
    ctx.fillRect(px + 1 * S, py + 13 * S, 4 * S, S);
    ctx.fillRect(px + 6 * S, py + 13 * S, 4 * S, S);
  } else {
    ctx.fillRect(px + 2 * S, py + 13 * S, 3 * S, S);
    ctx.fillRect(px + 6 * S, py + 13 * S, 3 * S, S);
  }
}

export function drawPlayerSitting(px, py, pal) {
  const R = '#e52521', B = '#3030c0', SK = '#FFB88C', BR = '#6B3A1F';
  // Cap (tilted slightly)
  ctx.fillStyle = R;
  ctx.fillRect(px + 3 * S, py - 2 * S, 5 * S, 2 * S);
  ctx.fillRect(px + 2 * S, py, 7 * S, S);
  // Hair
  ctx.fillStyle = BR;
  ctx.fillRect(px + 1 * S, py + S, 2 * S, 2 * S);
  ctx.fillRect(px + 8 * S, py + S, 2 * S, S);
  // Face
  ctx.fillStyle = SK;
  ctx.fillRect(px + 3 * S, py + S, 5 * S, 4 * S);
  // Sleepy eyes (closed lines)
  ctx.fillStyle = '#000';
  ctx.fillRect(px + 4 * S, py + 3 * S, S, S);
  ctx.fillRect(px + 7 * S, py + 3 * S, S, S);
  // Nose
  ctx.fillStyle = SK;
  ctx.fillRect(px + 8 * S, py + 2 * S, 2 * S, 2 * S);
  // Mustache
  ctx.fillStyle = BR;
  ctx.fillRect(px + 4 * S, py + 4 * S, 5 * S, S);
  // Shirt
  ctx.fillStyle = R;
  ctx.fillRect(px + 2 * S, py + 5 * S, 7 * S, 3 * S);
  // Arms resting on lap
  ctx.fillStyle = SK;
  ctx.fillRect(px + 1 * S, py + 7 * S, 2 * S, 2 * S);
  ctx.fillRect(px + 8 * S, py + 7 * S, 2 * S, 2 * S);
  // Overalls (shorter, sitting)
  ctx.fillStyle = B;
  ctx.fillRect(px + 2 * S, py + 8 * S, 7 * S, 3 * S);
  ctx.fillRect(px + 3 * S, py + 6 * S, S, 2 * S);
  ctx.fillRect(px + 7 * S, py + 6 * S, S, 2 * S);
  // Buttons
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(px + 3 * S, py + 8 * S, S, S);
  ctx.fillRect(px + 7 * S, py + 8 * S, S, S);
  // Legs (extended forward, sitting)
  ctx.fillStyle = B;
  ctx.fillRect(px + 2 * S, py + 11 * S, 8 * S, 2 * S);
  // Shoes
  ctx.fillStyle = BR;
  ctx.fillRect(px + 9 * S, py + 12 * S, 2 * S, S);
  ctx.fillRect(px + 1 * S, py + 12 * S, 2 * S, S);
}

export function drawPlayerSupervising(px, py, pal, frame) {
  // Mario facing LEFT (flipped) -- watching his mini-Marios work
  const R = '#e52521', B = '#3030c0', SK = '#FFB88C', BR = '#6B3A1F';
  const W = 11 * S; // total player width for mirror math
  // Use save/restore + horizontal flip
  ctx.save();
  ctx.translate(px + W / 2, 0);
  ctx.scale(-1, 1);
  const fpx = -W / 2; // flipped px origin

  // Cap
  ctx.fillStyle = R;
  ctx.fillRect(fpx + 3 * S, py - 2 * S, 5 * S, 2 * S);
  ctx.fillRect(fpx + 2 * S, py, 7 * S, S);
  // Hair
  ctx.fillStyle = BR;
  ctx.fillRect(fpx + 1 * S, py + S, 2 * S, 2 * S);
  ctx.fillRect(fpx + 8 * S, py + S, 2 * S, S);
  // Face
  ctx.fillStyle = SK;
  ctx.fillRect(fpx + 3 * S, py + S, 5 * S, 4 * S);
  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(fpx + 4 * S, py + 2 * S, S, S);
  ctx.fillRect(fpx + 7 * S, py + 2 * S, S, S);
  // Nose
  ctx.fillStyle = SK;
  ctx.fillRect(fpx + 8 * S, py + 2 * S, 2 * S, 2 * S);
  // Mustache
  ctx.fillStyle = BR;
  ctx.fillRect(fpx + 4 * S, py + 4 * S, 5 * S, S);
  // Shirt
  ctx.fillStyle = R;
  ctx.fillRect(fpx + 2 * S, py + 5 * S, 7 * S, 3 * S);
  // Arms -- one hand on hip, other pointing back
  ctx.fillStyle = SK;
  const tap = frame % 2;
  if (tap === 0) {
    ctx.fillRect(fpx + 0 * S, py + 5 * S, 2 * S, 3 * S); // hand on hip
    ctx.fillRect(fpx + 9 * S, py + 5 * S, 2 * S, 2 * S); // arm crossed
  } else {
    ctx.fillRect(fpx + 0 * S, py + 6 * S, 2 * S, 2 * S); // hand on hip (lower)
    ctx.fillRect(fpx + 9 * S, py + 4 * S, 2 * S, 2 * S); // arm pointing
  }
  // Overalls
  ctx.fillStyle = B;
  ctx.fillRect(fpx + 2 * S, py + 8 * S, 7 * S, 4 * S);
  ctx.fillRect(fpx + 3 * S, py + 6 * S, S, 2 * S);
  ctx.fillRect(fpx + 7 * S, py + 6 * S, S, 2 * S);
  // Buttons
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(fpx + 3 * S, py + 8 * S, S, S);
  ctx.fillRect(fpx + 7 * S, py + 8 * S, S, S);
  // Legs -- slight impatient foot tap
  ctx.fillStyle = B;
  ctx.fillRect(fpx + 2 * S, py + 12 * S, 3 * S, 2 * S);
  ctx.fillRect(fpx + 6 * S, py + (tap === 0 ? 12 : 11) * S, 3 * S, 2 * S);
  // Shoes
  ctx.fillStyle = BR;
  ctx.fillRect(fpx + 1 * S, py + 13 * S, 4 * S, S);
  ctx.fillRect(fpx + 6 * S, py + 13 * S, 4 * S, S);
  ctx.restore();
}

const supervisorPhrases = [
  'Work fast!', 'Hurry up!', 'Come on!', 'Faster!', 'Go go go!', 'Move it!'
];

export function drawSupervisorBubble(px, py) {
  // Speech bubble (not thought bubble) -- pointing LEFT toward mini-Marios
  const phraseIdx = Math.floor(Date.now() / 2000) % supervisorPhrases.length;
  const phrase = supervisorPhrases[phraseIdx];

  ctx.font = 'bold ' + (S * 3) + 'px monospace';
  const textW = ctx.measureText(phrase).width;
  const bw = textW + 12;
  const bh = S * 4 + 4;
  const by = py - 25;

  // Position bubble to the left; flip to right if it would go off-screen
  let bx = px - bw - 8;
  const flipped = bx < 8;
  if (flipped) bx = px + 12 * S;

  // Bubble background
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.roundRect(bx, by - bh / 2, bw, bh, 6);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Speech tail pointing toward Mario
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  if (flipped) {
    // Tail on the left edge, pointing left toward Mario
    ctx.beginPath();
    ctx.moveTo(bx, by - 2);
    ctx.lineTo(bx - 8, by + 4);
    ctx.lineTo(bx, by + 6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx, by - 2);
    ctx.lineTo(bx - 8, by + 4);
    ctx.lineTo(bx, by + 6);
    ctx.strokeStyle = '#333';
    ctx.stroke();
  } else {
    // Tail on the right edge, pointing right toward Mario
    ctx.beginPath();
    ctx.moveTo(bx + bw, by - 2);
    ctx.lineTo(bx + bw + 8, by + 4);
    ctx.lineTo(bx + bw, by + 6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx + bw, by - 2);
    ctx.lineTo(bx + bw + 8, by + 4);
    ctx.lineTo(bx + bw, by + 6);
    ctx.strokeStyle = '#333';
    ctx.stroke();
  }

  // Text
  ctx.fillStyle = '#d32f2f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(phrase, bx + bw / 2, by);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

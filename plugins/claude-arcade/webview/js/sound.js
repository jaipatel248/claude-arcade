// ── Sound system — audio context, SFX, and procedural chiptune music ──

let audioCtx = null;
let musicEnabled = true;
let sfxEnabled = true;
let musicPlaying = false;

/**
 * Lazily creates (or resumes) the shared AudioContext.
 * Must be called from a user-gesture handler the first time.
 */
export function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/** Returns whether sound effects are currently enabled. */
export function isSfxEnabled() {
  return sfxEnabled;
}

/** Returns whether background music is currently enabled. */
export function isMusicEnabled() {
  return musicEnabled;
}

/**
 * Wires up click listeners on the `btn-music` and `btn-sfx` HUD buttons.
 * Call once after the DOM is ready.
 */
export function initSoundControls() {
  const btnMusic = document.getElementById('btn-music');
  const btnSfx = document.getElementById('btn-sfx');

  btnMusic.addEventListener('click', () => {
    musicEnabled = !musicEnabled;
    btnMusic.textContent = musicEnabled ? '\u266B On' : '\u266B Off';
    btnMusic.classList.toggle('active', musicEnabled);
    if (musicEnabled) startMusic();
    else stopMusic();
  });

  btnSfx.addEventListener('click', () => {
    sfxEnabled = !sfxEnabled;
    btnSfx.textContent = sfxEnabled ? 'SFX On' : 'SFX Off';
    btnSfx.classList.toggle('active', sfxEnabled);
  });
}

/**
 * Toggle music on/off. Updates button state and starts/stops music.
 * Can be called from keyboard shortcuts.
 */
export function toggleMusic() {
  const btn = document.getElementById('btn-music');
  musicEnabled = !musicEnabled;
  if (btn) {
    btn.textContent = musicEnabled ? '\u266B On' : '\u266B Off';
    btn.classList.toggle('active', musicEnabled);
  }
  if (musicEnabled) startMusic();
  else stopMusic();
}

/**
 * Toggle SFX on/off. Updates button state.
 * Can be called from keyboard shortcuts.
 */
export function toggleSfx() {
  const btn = document.getElementById('btn-sfx');
  sfxEnabled = !sfxEnabled;
  if (btn) {
    btn.textContent = sfxEnabled ? 'SFX On' : 'SFX Off';
    btn.classList.toggle('active', sfxEnabled);
  }
}

// ── SFX play functions ──

export function playWaitingSound() {
  if (!sfxEnabled) return;
  try {
    const ac = getAudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.frequency.value = 660;
    gain.gain.value = 0.15;
    osc.start(); osc.stop(ac.currentTime + 0.15);
    setTimeout(() => {
      const osc2 = ac.createOscillator();
      const gain2 = ac.createGain();
      osc2.connect(gain2); gain2.connect(ac.destination);
      osc2.frequency.value = 880;
      gain2.gain.value = 0.15;
      osc2.start(); osc2.stop(ac.currentTime + 0.2);
    }, 180);
  } catch {}
}

export function playResumeSound() {
  if (!sfxEnabled) return;
  try {
    const ac = getAudioCtx();
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.12;
      const t = ac.currentTime + i * 0.1;
      osc.start(t);
      osc.stop(t + 0.15);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.15);
    });
  } catch {}
}

export function playJumpSound() {
  if (!sfxEnabled) return;
  try {
    const ac = getAudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.connect(gain); gain.connect(ac.destination);
    osc.frequency.setValueAtTime(350, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(700, ac.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.1);
    osc.start(); osc.stop(ac.currentTime + 0.1);
  } catch {}
}

export function playCoinSound() {
  if (!sfxEnabled) return;
  try {
    const ac = getAudioCtx();
    // Classic 2-note coin ding: B5 -> E6
    [988, 1319].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.connect(gain); gain.connect(ac.destination);
      osc.frequency.value = freq;
      const t = ac.currentTime + i * 0.07;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.15);
      osc.start(t); osc.stop(t + 0.15);
    });
  } catch {}
}

export function playBoostSound() {
  if (!sfxEnabled) return;
  try {
    const ac = getAudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.connect(gain); gain.connect(ac.destination);
    osc.frequency.setValueAtTime(200, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ac.currentTime + 0.3);
    gain.gain.setValueAtTime(0.06, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.35);
    osc.start(); osc.stop(ac.currentTime + 0.35);
  } catch {}
}

export function playErrorSound() {
  if (!sfxEnabled) return;
  try {
    const ac = getAudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.connect(gain); gain.connect(ac.destination);
    osc.frequency.setValueAtTime(200, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(80, ac.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.25);
    osc.start(); osc.stop(ac.currentTime + 0.25);
  } catch {}
}

export function playPopSound() {
  if (!sfxEnabled) return;
  try {
    const ac = getAudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.connect(gain); gain.connect(ac.destination);
    osc.frequency.setValueAtTime(600, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(900, ac.currentTime + 0.06);
    gain.gain.setValueAtTime(0.1, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.08);
    osc.start(); osc.stop(ac.currentTime + 0.08);
  } catch {}
}

export function playFanfareSound() {
  if (!sfxEnabled) return;
  try {
    const ac = getAudioCtx();
    const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.connect(gain); gain.connect(ac.destination);
      osc.frequency.value = freq;
      const t = ac.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);
      osc.start(t); osc.stop(t + 0.2);
    });
  } catch {}
}

// ── Background music (procedural chiptune) ──

// Master gain node for music — disconnecting it kills all playing oscillators instantly
let musicMasterGain = null;
let musicGeneration = 0; // incremented on each start to invalidate old scheduleBar chains

/**
 * Starts the procedural chiptune background music loop.
 * All oscillators route through a master GainNode so stopMusic() can
 * kill everything instantly by disconnecting it.
 */
export function startMusic() {
  if (musicPlaying) return;
  try {
    const ac = getAudioCtx();
    if (ac.state === 'suspended') ac.resume();
    musicPlaying = true;
    musicGeneration++;
    const gen = musicGeneration;

    // Create a master gain node — all music oscillators connect through this
    musicMasterGain = ac.createGain();
    musicMasterGain.gain.value = 1.0;
    musicMasterGain.connect(ac.destination);
    const master = musicMasterGain;

    const bpm = 140;
    const beat = 60 / bpm;
    const barLen = beat * 4;

    const bassNotes = [131, 131, 98, 110];
    const melodyNotes = [330, 392, 523, 494, 440, 392, 330, 294];

    function scheduleBar(startTime) {
      // Stop if music was stopped or a newer generation started
      if (!musicPlaying || gen !== musicGeneration) return;

      // Bass
      bassNotes.forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'square';
        osc.connect(gain); gain.connect(master);
        osc.frequency.value = freq;
        const t = startTime + i * beat;
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.setValueAtTime(0, t + beat * 0.8);
        osc.start(t); osc.stop(t + beat * 0.8);
      });

      // Melody (8 eighth notes per bar)
      melodyNotes.forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'square';
        osc.connect(gain); gain.connect(master);
        osc.frequency.value = freq;
        const t = startTime + i * beat * 0.5;
        gain.gain.setValueAtTime(0.03, t);
        gain.gain.linearRampToValueAtTime(0, t + beat * 0.4);
        osc.start(t); osc.stop(t + beat * 0.45);
      });

      setTimeout(() => scheduleBar(startTime + barLen), (barLen - 0.1) * 1000);
    }

    scheduleBar(ac.currentTime + 0.1);
  } catch {}
}

/** Stops the music loop instantly — disconnects all playing oscillators. */
export function stopMusic() {
  musicPlaying = false;
  if (musicMasterGain) {
    try { musicMasterGain.disconnect(); } catch {}
    musicMasterGain = null;
  }
}

/**
 * Closes the AudioContext for cleanup (e.g. on beforeunload).
 */
export function closeAudio() {
  if (audioCtx) audioCtx.close();
}

// Lightweight Web Audio API sound effects

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.08) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  } catch {}
}

function playNoise(duration: number, volume = 0.06) {
  try {
    const c = getCtx();
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = c.createBufferSource();
    source.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    source.connect(gain);
    gain.connect(c.destination);
    source.start();
  } catch {}
}

export function sfxHit() {
  playNoise(0.08, 0.1);
  playTone(200, 0.1, 'square', 0.06);
}

export function sfxPlayerHit() {
  playTone(150, 0.15, 'sawtooth', 0.08);
  playNoise(0.1, 0.08);
}

export function sfxKill() {
  playTone(400, 0.08, 'square', 0.06);
  setTimeout(() => playTone(600, 0.12, 'square', 0.05), 80);
}

export function sfxPickup() {
  playTone(500, 0.06, 'sine', 0.07);
  setTimeout(() => playTone(700, 0.08, 'sine', 0.06), 60);
}

export function sfxLevelUp() {
  playTone(400, 0.1, 'sine', 0.07);
  setTimeout(() => playTone(500, 0.1, 'sine', 0.07), 100);
  setTimeout(() => playTone(700, 0.15, 'sine', 0.08), 200);
}

export function sfxDescend() {
  playTone(300, 0.15, 'sine', 0.06);
  setTimeout(() => playTone(200, 0.2, 'sine', 0.05), 120);
}

export function sfxDodge() {
  playTone(800, 0.06, 'sine', 0.04);
}

export function sfxCrit() {
  playNoise(0.05, 0.12);
  playTone(350, 0.08, 'square', 0.08);
  setTimeout(() => playTone(500, 0.1, 'square', 0.06), 60);
}

export function sfxNoEnergy() {
  playTone(200, 0.1, 'sine', 0.05);
  setTimeout(() => playTone(150, 0.15, 'sine', 0.04), 100);
}

export function sfxHeal() {
  playTone(500, 0.08, 'sine', 0.06);
  setTimeout(() => playTone(600, 0.1, 'sine', 0.06), 80);
  setTimeout(() => playTone(700, 0.08, 'sine', 0.05), 160);
}

export function sfxCast() {
  playTone(600, 0.06, 'sine', 0.06);
  playTone(800, 0.08, 'sine', 0.04);
  setTimeout(() => playTone(1000, 0.1, 'sine', 0.05), 60);
  setTimeout(() => playTone(1200, 0.06, 'sine', 0.03), 120);
}

export function sfxThrow() {
  playNoise(0.04, 0.06);
  playTone(400, 0.06, 'square', 0.04);
  setTimeout(() => playTone(300, 0.08, 'square', 0.03), 50);
}

export function sfxFireball() {
  playNoise(0.12, 0.1);
  playTone(200, 0.15, 'sawtooth', 0.07);
  setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.06), 80);
}

export function sfxIceBlast() {
  playTone(1200, 0.08, 'sine', 0.05);
  playNoise(0.06, 0.04);
  setTimeout(() => playTone(900, 0.1, 'sine', 0.04), 60);
}

/**
 * Game Sound Effects — synthesised via Web Audio API.
 * No external audio files are required; every sound is generated on-the-fly
 * using oscillators and gain envelopes, which keeps bundle-size at zero and
 * guarantees instant playback with no network latency.
 *
 * Usage:
 *   import { playCorrectSFX, playWrongSFX, … } from "@/lib/services/game-sfx";
 *   playCorrectSFX();
 *
 * Call `cleanupSFX()` when the component unmounts to release the AudioContext.
 */

// ─── Singleton AudioContext ──────────────────────────────────────────────────

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

// ─── Low-level helpers ───────────────────────────────────────────────────────

/** Play a single tone with an attack-release envelope. */
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3,
  delay: number = 0,
) {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);

    // Soft attack → sustain → exponential release
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.015);
    gain.gain.setValueAtTime(volume, t + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  } catch {
    /* Fail silently – audio should never break game flow */
  }
}

/** Play a short noise burst (cymbal / "shh" texture). */
function playNoiseBurst(
  duration: number,
  volume: number = 0.08,
  delay: number = 0,
) {
  try {
    const ctx = getAudioContext();
    const t = ctx.currentTime + delay;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;

    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    // Bandpass to make it shimmer-ish rather than harsh
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(6000, t);
    filter.Q.setValueAtTime(0.8, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(t);
    src.stop(t + duration);
  } catch {
    /* Fail silently */
  }
}

// ─── Public SFX ──────────────────────────────────────────────────────────────

/** ✅ Correct — quick ascending two-note chime */
export function playCorrectSFX() {
  playTone(659.25, 0.12, "sine", 0.2, 0); // E5
  playTone(880.0, 0.18, "sine", 0.25, 0.09); // A5
}

/** ❌ Wrong — short dissonant buzz */
export function playWrongSFX() {
  playTone(311.13, 0.18, "square", 0.1, 0); // Eb4
  playTone(233.08, 0.25, "square", 0.08, 0.12); // Bb3
}

/** 🚀 Level Up — triumphant ascending arpeggio */
export function playLevelUpSFX() {
  // C5 → E5 → G5 → C6  (major arpeggio)
  playTone(523.25, 0.14, "sine", 0.18, 0);
  playTone(659.25, 0.14, "sine", 0.2, 0.11);
  playTone(783.99, 0.14, "sine", 0.22, 0.22);
  playTone(1046.5, 0.28, "triangle", 0.28, 0.33);
  // Shimmer at the top
  playNoiseBurst(0.15, 0.06, 0.35);
}

/** 💀 Game Over — descending sad tones */
export function playGameOverSFX() {
  // G4 → F4 → D4 → C4
  playTone(392.0, 0.22, "sine", 0.18, 0);
  playTone(349.23, 0.22, "sine", 0.15, 0.2);
  playTone(293.66, 0.22, "sine", 0.12, 0.4);
  playTone(261.63, 0.4, "triangle", 0.1, 0.6);
}

/** 🏆 Win / Yeaay — celebratory fanfare with sparkle */
export function playWinSFX() {
  // ── Main melody: ascending fanfare ──
  playTone(523.25, 0.12, "sine", 0.18, 0); // C5
  playTone(659.25, 0.1, "sine", 0.2, 0.1); // E5
  playTone(783.99, 0.1, "sine", 0.22, 0.18); // G5
  playTone(1046.5, 0.22, "sine", 0.26, 0.28); // C6

  // ── Sparkle layer ──
  playTone(1318.51, 0.1, "sine", 0.12, 0.48); // E6
  playTone(1567.98, 0.1, "sine", 0.1, 0.56); // G6
  playTone(2093.0, 0.25, "triangle", 0.15, 0.64); // C7

  // ── Harmony pad underneath ──
  playTone(523.25, 0.5, "sine", 0.07, 0.28); // C5 sustained
  playTone(659.25, 0.5, "sine", 0.07, 0.28); // E5 sustained
  playTone(783.99, 0.5, "sine", 0.07, 0.28); // G5 sustained

  // ── Shimmer / crowd-cheer texture ──
  playNoiseBurst(0.25, 0.08, 0.5);
  playNoiseBurst(0.35, 0.06, 0.7);
}

/** 🔇 Release the AudioContext (call on unmount). */
export function cleanupSFX() {
  if (audioContext && audioContext.state !== "closed") {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
}

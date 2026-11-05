/**
 * Audio confirmation utility for Milk Tracker.
 * Plays a subtle, gentle, two-note "ding-ding" chime when milk entries are saved.
 *
 * Characteristics:
 * - Two ascending bell-like tones (G5 -> C6).
 * - Smooth attack (prevents clicks) and gentle exponential fade out.
 * - Total duration: ~550ms.
 * - Guarded against double submissions, re-renders, and mobile autoplay restrictions.
 */

let audioContextInstance: AudioContext | null = null;
let preloadedAudio: HTMLAudioElement | null = null;
let lastPlayedAt = 0;
const PLAYBACK_COOLDOWN_MS = 1200;

/**
 * Returns a singleton AudioContext instance in browser environments.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!audioContextInstance || audioContextInstance.state === "closed") {
      audioContextInstance = new AudioContextClass();
    }
    return audioContextInstance;
  } catch {
    return null;
  }
}

/**
 * Initializes/resumes audio context and preloads the audio asset on user gesture.
 * Call this in user-initiated events (e.g. submit button click) to unlock audio on iOS Safari.
 */
export function warmupSuccessChime(): void {
  if (typeof window === "undefined") return;

  try {
    // 1. Preload HTML5 Audio asset
    if (!preloadedAudio) {
      preloadedAudio = new Audio("/sounds/success-chime.wav");
      preloadedAudio.preload = "auto";
      preloadedAudio.volume = 0.55;
      preloadedAudio.load();
    }

    // 2. Resume Web Audio Context if suspended (iOS requirement)
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  } catch {
    // Audio unlock is best-effort; fail silently
  }
}

/**
 * Synthesizes the warm, glass-bell two-note chime using the Web Audio API.
 * Used as an ultra-reliable fallback if the audio file is unavailable or blocked.
 *
 * Characteristics:
 * - Opening: Warm, rounded mallet strike at E5 (659.25 Hz).
 * - Ascending note: Clear, bright bell tone at B5 (987.77 Hz) with upper chime resonance (E6 1318.5 Hz).
 * - Total duration: ~820ms with natural singing decay.
 */
function playWebAudioChime(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(0.36, now);

  const playWarmBellNote = (
    freq: number,
    startTime: number,
    duration: number,
    volume: number,
    hasChimeLayer = false,
  ) => {
    // 1. Fundamental tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq, startTime);

    // 2. Second harmonic (body & warmth)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2.002, startTime);

    // 3. Third harmonic (clarity and shimmer)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(freq * 3.006, startTime);

    const attackTime = 0.012; // 12ms smooth attack prevents clicks

    // Fundamental envelope
    gain1.gain.setValueAtTime(0.0001, startTime);
    gain1.gain.exponentialRampToValueAtTime(volume, startTime + attackTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    // Harmonic envelopes
    gain2.gain.setValueAtTime(0.0001, startTime);
    gain2.gain.exponentialRampToValueAtTime(volume * 0.30, startTime + attackTime);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.85);

    gain3.gain.setValueAtTime(0.0001, startTime);
    gain3.gain.exponentialRampToValueAtTime(volume * 0.12, startTime + attackTime);
    gain3.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.65);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);

    gain1.connect(masterGain);
    gain2.connect(masterGain);
    gain3.connect(masterGain);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    const stopTime = startTime + duration + 0.05;

    // Optional 4th layer: Glass chime harmonic resonance on the second note
    if (hasChimeLayer) {
      const oscChime = ctx.createOscillator();
      const gainChime = ctx.createGain();
      oscChime.type = "sine";
      oscChime.frequency.setValueAtTime(1318.51, startTime); // E6 harmonic layer

      gainChime.gain.setValueAtTime(0.0001, startTime);
      gainChime.gain.exponentialRampToValueAtTime(volume * 0.22, startTime + attackTime);
      gainChime.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.75);

      oscChime.connect(gainChime);
      gainChime.connect(masterGain);

      oscChime.start(startTime);
      oscChime.stop(stopTime);
    }

    osc1.stop(stopTime);
    osc2.stop(stopTime);
    osc3.stop(stopTime);
  };

  // Note 1: E5 (659.25 Hz), warm opening note, ~450ms sustain
  playWarmBellNote(659.25, now, 0.45, 0.55, false);

  // Note 2: B5 (987.77 Hz), clear bright ascending note with E6 glass layer, starts at +165ms, ~650ms sustain
  playWarmBellNote(987.77, now + 0.165, 0.65, 0.68, true);
}

/**
 * Plays the success chime once.
 * Ensures:
 * - No duplicate plays within cooldown period.
 * - Never throws or interrupts normal application flow.
 * - Supports iOS Safari, Android Chrome, and Desktop browsers.
 */
export async function playSuccessChime(): Promise<void> {
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (now - lastPlayedAt < PLAYBACK_COOLDOWN_MS) {
    // Prevent duplicate playback on fast clicks
    return;
  }
  lastPlayedAt = now;

  try {
    // Attempt 1: Try playing local preloaded audio element
    if (!preloadedAudio) {
      preloadedAudio = new Audio("/sounds/success-chime.wav");
      preloadedAudio.volume = 0.55;
    }

    preloadedAudio.currentTime = 0;
    const playPromise = preloadedAudio.play();

    if (playPromise !== undefined) {
      await playPromise;
      return;
    }
  } catch {
    // Attempt 2: Fallback to Web Audio API synthesis
    try {
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === "suspended") {
          await ctx.resume();
        }
        playWebAudioChime(ctx);
      }
    } catch {
      // Audio is completely optional; fail silently without affecting UI
    }
  }
}


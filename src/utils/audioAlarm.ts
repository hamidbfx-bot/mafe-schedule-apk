import { AlarmTone } from '../types';

let audioCtx: AudioContext | null = null;
let loopTimer: number | null = null;
let durationTimeout: number | null = null;
let countdownInterval: number | null = null;
let wakeLockSentinel: WakeLockSentinel | null = null;
let isPlaying = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isAlarmPlaying(): boolean {
  return isPlaying;
}

/**
 * Play a single musical iteration of the selected tone
 */
export function playTone(tone: AlarmTone, volume = 0.8): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.05, Math.min(volume, 1)), now);
    masterGain.connect(ctx.destination);

    if (tone === 'radar') {
      // High-visibility dual-frequency radar alert bursts
      [0, 0.16, 0.32, 0.8, 0.96, 1.12].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(960, now + offset);
        osc.frequency.exponentialRampToValueAtTime(1480, now + offset + 0.09);

        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.85, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now + offset);
        osc.stop(now + offset + 0.13);
      });
    } else if (tone === 'gentle-bell') {
      // Rich acoustic meditation bell with deep harmonic reverberation
      const chordSets = [
        { start: 0, freqs: [523.25, 1046.5, 1567.98] }, // C5
        { start: 0.9, freqs: [659.25, 1318.51, 1975.53] }, // E5
        { start: 1.8, freqs: [783.99, 1567.98, 2093.0] }, // G5
      ];

      chordSets.forEach(({ start, freqs }) => {
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + start;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteTime);

          const decay = 1.8 - idx * 0.3;
          gain.gain.setValueAtTime(0.65 / (idx + 1), noteTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + decay);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(noteTime);
          osc.stop(noteTime + decay);
        });
      });
    } else {
      // Default: 'chime' - melodic multi-note ascending sequence
      const notes = [
        { freq: 523.25, delay: 0 }, // C5
        { freq: 659.25, delay: 0.15 }, // E5
        { freq: 783.99, delay: 0.3 }, // G5
        { freq: 1046.5, delay: 0.45 }, // C6
        { freq: 1318.51, delay: 0.6 }, // E6
        { freq: 1046.5, delay: 0.8 }, // C6 resolve
      ];

      notes.forEach(({ freq, delay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + delay;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(0.7, noteStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.85);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(noteStart);
        osc.stop(noteStart + 0.9);
      });
    }

    // Trigger device vibration if supported
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([150, 80, 150]);
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

/**
 * Start playing alarm for a full duration (default 30 seconds)
 * Loops the musical pattern every 2.4s and automatically stops after durationSeconds.
 */
export function startLoopingAlarm(
  tone: AlarmTone,
  volume = 0.8,
  durationSeconds = 30,
  onTick?: (remainingSeconds: number) => void,
  onComplete?: () => void
): void {
  stopLoopingAlarm();
  isPlaying = true;

  let remaining = durationSeconds;
  if (onTick) onTick(remaining);

  // Play immediately
  playTone(tone, volume);

  // Repeat cycle every 2.4 seconds
  loopTimer = window.setInterval(() => {
    playTone(tone, volume);
  }, 2400);

  // Countdown timer per second
  countdownInterval = window.setInterval(() => {
    remaining -= 1;
    if (onTick) onTick(Math.max(0, remaining));
  }, 1000);

  // Auto-stop after durationSeconds (e.g. 30 seconds)
  durationTimeout = window.setTimeout(() => {
    stopLoopingAlarm();
    if (onComplete) onComplete();
  }, durationSeconds * 1000);
}

/**
 * Stop alarm immediately
 */
export function stopLoopingAlarm(): void {
  isPlaying = false;

  if (loopTimer !== null) {
    window.clearInterval(loopTimer);
    loopTimer = null;
  }
  if (durationTimeout !== null) {
    window.clearTimeout(durationTimeout);
    durationTimeout = null;
  }
  if (countdownInterval !== null) {
    window.clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

export async function requestWakeLock(): Promise<boolean> {
  if ('wakeLock' in navigator) {
    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      return true;
    } catch (err) {
      console.warn('Wake Lock error:', err);
      return false;
    }
  }
  return false;
}

export async function releaseWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch {
      // ignore
    }
    wakeLockSentinel = null;
  }
}

import logoClipUrl from '../../audio/kidsudoku-japanese.mp3';

export type HapticKind = 'tap' | 'wrong' | 'correct' | 'setComplete';

const HAPTIC_PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 10,
  wrong: [16, 36, 16],
  correct: [14, 28, 22],
  setComplete: [18, 36, 18, 36, 42],
};

export function triggerHaptic(kind: HapticKind): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    navigator.vibrate(HAPTIC_PATTERNS[kind]);
  } catch {
    // Ignore restricted/unsupported vibration calls
  }
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private logoAudio: HTMLAudioElement | null = null;
  private logoBuffer: AudioBuffer | null = null;
  private logoBufferPromise: Promise<AudioBuffer | null> | null = null;
  private logoSource: AudioBufferSourceNode | null = null;
  private logoPlayToken = 0;
  private enabled = true;

  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) {
      this.stopLogoClip();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Call on first user pointer interaction to unlock iOS Safari AudioContext
   * and preload/decode the logo MP3 for zero-latency playback.
   */
  unlock() {
    const ctx = this.getContext();
    if (ctx) {
      void this.preloadLogoBuffer(ctx);
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    return this.ctx;
  }

  private preloadLogoBuffer(ctx: AudioContext): Promise<AudioBuffer | null> {
    if (this.logoBuffer) return Promise.resolve(this.logoBuffer);
    if (this.logoBufferPromise) return this.logoBufferPromise;

    this.logoBufferPromise = fetch(logoClipUrl)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((arr) => (arr ? ctx.decodeAudioData(arr) : null))
      .then((decoded) => {
        this.logoBuffer = decoded;
        return decoded;
      })
      .catch(() => null);

    return this.logoBufferPromise;
  }

  private stopLogoClip() {
    this.logoPlayToken++;
    if (this.logoSource) {
      try {
        this.logoSource.onended = null;
        this.logoSource.stop();
      } catch {
        // Ignore already-stopped source
      }
      this.logoSource.disconnect();
      this.logoSource = null;
    }
    if (this.logoAudio) {
      this.logoAudio.pause();
      this.logoAudio.currentTime = 0;
    }
  }

  private playMarimbaNote(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    volume = 0.14,
  ) {
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();
    const overtoneGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Subtle wooden harmonic decays quickly like a marimba bar
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    overtoneGain.gain.setValueAtTime(0.0001, startTime);
    overtoneGain.gain.exponentialRampToValueAtTime(volume * 0.22, startTime + 0.008);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.35);

    osc.connect(gain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    overtone.start(startTime);
    osc.stop(startTime + duration + 0.02);
    overtone.stop(startTime + duration + 0.02);
  }

  playTap() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.045);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  playCorrect(streak: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes =
      streak >= 3
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
        : [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, i) => {
      this.playMarimbaNote(ctx, freq, now + i * 0.065, 0.36, 0.13);
    });
  }

  playSetComplete() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const melody = [
      { freq: 523.25, at: 0, dur: 0.25 },
      { freq: 659.25, at: 0.075, dur: 0.25 },
      { freq: 783.99, at: 0.15, dur: 0.25 },
      { freq: 1046.5, at: 0.24, dur: 0.55 },
      { freq: 1318.5, at: 0.26, dur: 0.55 },
      { freq: 1567.98, at: 0.34, dur: 0.6 },
    ];

    for (const note of melody) {
      this.playMarimbaNote(ctx, note.freq, now + note.at, note.dur, 0.12);
    }
  }

  playWrong() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this.playMarimbaNote(ctx, 261.63, now, 0.18, 0.1);
    this.playMarimbaNote(ctx, 220.0, now + 0.09, 0.22, 0.09);
  }

  playHint() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this.playMarimbaNote(ctx, 698.46, now, 0.28, 0.08);
    this.playMarimbaNote(ctx, 880.0, now + 0.08, 0.32, 0.09);
  }

  playLogoClip(onFinish?: () => void): boolean {
    if (!this.enabled || typeof window === 'undefined') {
      return false;
    }

    this.stopLogoClip();
    const token = this.logoPlayToken;

    const finish = () => {
      if (this.logoPlayToken === token) {
        onFinish?.();
      }
    };

    // Fast path: play pre-decoded AudioBuffer via Web Audio API (zero latency on iOS Safari)
    const ctx = this.getContext();
    if (ctx && this.logoBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = this.logoBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (this.logoSource === source) {
          this.logoSource = null;
        }
        finish();
      };
      this.logoSource = source;
      source.start(0);
      return true;
    }

    // Start decoding in background for subsequent instant plays
    if (ctx) {
      void this.preloadLogoBuffer(ctx);
    }

    // Immediate fallback via HTMLAudioElement on very first tap before decode finishes
    if (typeof Audio === 'undefined') {
      return false;
    }

    if (!this.logoAudio) {
      this.logoAudio = new Audio(logoClipUrl);
      this.logoAudio.preload = 'auto';
    }

    const audio = this.logoAudio;
    audio.onended = finish;
    audio.onerror = finish;
    if (audio.readyState >= 1) {
      audio.currentTime = 0;
    }

    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        finish();
      });
    }

    return true;
  }
}

export const soundEngine = new SoundEngine();

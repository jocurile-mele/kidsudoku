class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  setEnabled(value: boolean) {
    this.enabled = value;
  }

  isEnabled(): boolean {
    return this.enabled;
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

    // Subtle wooden harmonic (4x frequency decays very fast like a marimba bar)
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
    // C5, E5, G5, C6 (and extra sparkle E6 on streaks >= 3)
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
    // Gentle soft wooden double-nudge (never harsh)
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
}

export const soundEngine = new SoundEngine();

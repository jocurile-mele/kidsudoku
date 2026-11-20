import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { soundEngine } from "./sound";

interface RecordedRamp {
  value: number;
  endTime: number;
}

class FakeAudioParam {
  values: Array<{ value: number; time: number }> = [];
  ramps: RecordedRamp[] = [];

  setValueAtTime(value: number, time: number) {
    this.values.push({ value, time });
  }

  exponentialRampToValueAtTime(value: number, endTime: number) {
    this.ramps.push({ value, endTime });
  }
}

class FakeGainNode {
  gain = new FakeAudioParam();
  connections: unknown[] = [];

  connect(target: unknown) {
    this.connections.push(target);
  }
}

class FakeOscillatorNode {
  type: OscillatorType = "sine";
  frequency = new FakeAudioParam();
  connections: unknown[] = [];
  startedAt: number | null = null;
  stoppedAt: number | null = null;

  connect(target: unknown) {
    this.connections.push(target);
  }

  start(time = 0) {
    this.startedAt = time;
  }

  stop(time = 0) {
    this.stoppedAt = time;
  }
}

class FakeAudioContext {
  currentTime = 1.0;
  state: AudioContextState = "running";
  destination = { kind: "destination" };
  oscillators: FakeOscillatorNode[] = [];
  gains: FakeGainNode[] = [];

  createOscillator() {
    const osc = new FakeOscillatorNode();
    this.oscillators.push(osc);
    return osc;
  }

  createGain() {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain;
  }

  resume() {
    this.state = "running";
    return Promise.resolve();
  }
}

function resetSoundContext(fakeCtx: FakeAudioContext | null) {
  // Rebind internal AudioContext cleanly across tests without leaking globals
  Reflect.set(soundEngine, "ctx", fakeCtx);
}

function peakGainFor(gainNode: FakeGainNode): number {
  return Math.max(0, ...gainNode.gain.ramps.map((r) => r.value));
}

describe("soundEngine Web Audio invariants", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    soundEngine.setEnabled(true);
    Object.defineProperty(globalThis, "window", {
      value: {
        AudioContext: FakeAudioContext,
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    resetSoundContext(null);
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });

  it("routes playWrong 2nd harmonics in parallel to destination with audible loudness and safe headroom", () => {
    const ctx = new FakeAudioContext();
    resetSoundContext(ctx);

    soundEngine.playWrong();

    // 2 notes × (sine fundamental + triangle 2nd harmonic) = 4 oscillators, 4 gain nodes
    expect(ctx.oscillators).toHaveLength(4);
    expect(ctx.gains).toHaveLength(4);

    // Every gain node in playWrong must connect directly to ctx.destination (no serial gain multiplication)
    for (const gainNode of ctx.gains) {
      expect(gainNode.connections).toContain(ctx.destination);
    }

    // Triangle overtones must have audible peak gain (>= 0.1) and sit at 2× fundamental frequency
    const harmonicPairs = [
      { osc: ctx.oscillators[1], fundamental: ctx.oscillators[0], gain: ctx.gains[1] },
      { osc: ctx.oscillators[3], fundamental: ctx.oscillators[2], gain: ctx.gains[3] },
    ];
    for (const pair of harmonicPairs) {
      expect(pair.osc.type).toBe("triangle");
      expect(pair.osc.frequency.values[0]?.value).toBeCloseTo(
        (pair.fundamental.frequency.values[0]?.value ?? 0) * 2,
        2,
      );
      expect(peakGainFor(pair.gain)).toBeGreaterThanOrEqual(0.1);
    }

    // Per-note combined amplitude stays well below 0.8 clipping ceiling
    const firstNotePeak = peakGainFor(ctx.gains[0]) + peakGainFor(ctx.gains[1]);
    const secondNotePeak = peakGainFor(ctx.gains[2]) + peakGainFor(ctx.gains[3]);
    expect(firstNotePeak).toBeLessThan(0.8);
    expect(secondNotePeak).toBeLessThan(0.8);
  });

  it("boosts low-pitched playWrong fundamental gain above higher-pitched playCorrect per-note gain", () => {
    const wrongCtx = new FakeAudioContext();
    resetSoundContext(wrongCtx);
    soundEngine.playWrong();
    const wrongFundamentalPeak = peakGainFor(wrongCtx.gains[0]);

    const correctCtx = new FakeAudioContext();
    resetSoundContext(correctCtx);
    soundEngine.playCorrect(1);
    const correctFundamentalPeak = peakGainFor(correctCtx.gains[0]);

    expect(wrongFundamentalPeak).toBeGreaterThan(correctFundamentalPeak * 1.8);
  });

  it("emits zero oscillators when sound is disabled", () => {
    const ctx = new FakeAudioContext();
    resetSoundContext(ctx);
    soundEngine.setEnabled(false);

    soundEngine.playWrong();
    soundEngine.playCorrect(3);
    soundEngine.playTap();

    expect(ctx.oscillators).toHaveLength(0);
  });
});

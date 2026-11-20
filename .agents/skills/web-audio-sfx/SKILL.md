---
name: web-audio-sfx
description: Synthesize and balance Web Audio API sound effects (OscillatorNode + GainNode) without audio files. Use when adding game UI SFX, fixing loudness imbalance across pitches or small speakers, debugging silent harmonics, or wiring iOS Safari AudioContext unlock and pre-decoded audio clips.
---

# Web Audio SFX

Reference and recipe for procedural Web Audio API sound effects in this repo (`src/platform/sound.ts`).

## Synthesized SFX vs. audio files

- **Synthesize with Web Audio API** for short UI and gameplay cues (taps, correct chimes, wrong/error cues, hints, set fanfares). Zero bundle weight, zero decode latency, full pitch/gain control.
- **Ship an audio file** only for voice/recorded clips (e.g., `audio/kidsudoku-japanese.mp3`). Pre-fetch and `decodeAudioData` into an `AudioBuffer` on first user pointer interaction for zero-latency playback on iOS Safari, keeping an `HTMLAudioElement` fallback for the very first tap before decode completes.

## Marimba note synthesis

Build warm, non-harsh wooden tones from a sine fundamental plus a short triangle 2nd harmonic (`freq * 2`):

```ts
const osc = ctx.createOscillator();
const overtone = ctx.createOscillator();
const gain = ctx.createGain();
const overtoneGain = ctx.createGain();

osc.type = "sine";
osc.frequency.setValueAtTime(freq, startTime);

overtone.type = "triangle";
overtone.frequency.setValueAtTime(freq * 2, startTime);

// Exponential ramps require a positive non-zero floor (never 0)
gain.gain.setValueAtTime(0.0001, startTime);
gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

overtoneGain.gain.setValueAtTime(0.0001, startTime);
overtoneGain.gain.exponentialRampToValueAtTime(harmonicVolume, startTime + 0.008);
overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.55);

// Route in PARALLEL to destination (or a shared master GainNode)
osc.connect(gain);
gain.connect(ctx.destination);

overtone.connect(overtoneGain);
overtoneGain.connect(ctx.destination);

osc.start(startTime);
overtone.start(startTime);
osc.stop(startTime + duration + 0.02);
overtone.stop(startTime + duration + 0.02);
```

### Parallel routing rule

Connect `overtoneGain` directly to `ctx.destination` (or a shared master bus) rather than into the fundamental's `gain` node. Chaining `overtoneGain -> gain` multiplies the two amplitudes (`0.10 * 0.022 = 0.0022`, ~-53 dBFS), silently collapsing the harmonic and leaving a bare sine wave.

## Loudness balancing across pitch and small speakers

Equal `GainNode` values do **not** produce equal perceived loudness across frequencies:

- **High arpeggios** (e.g., success chimes at `523–1318 Hz`, 4–5 overlapping notes `0.065s` apart, `0.36s` decay) sit at peak human hearing sensitivity and full phone/laptop speaker efficiency, and their overlapping tails sum together. Gains of `0.12–0.13` per note already sound crisp and prominent.
- **Low cues** (e.g., error/wrong notes at `220–262 Hz`, 1–2 notes) lose ~10–15 dB on phone/laptop speakers and sit in a less sensitive ear band.

Balance low cues against high cues by adjusting all three levers together:

1. **Fundamental gain**: Raise low-note gain (`~0.28–0.30` vs. `0.12–0.13` for high multi-note chords).
2. **Parallel 2nd harmonic**: Mix an audible triangle harmonic at `freq * 2` (`440–524 Hz`, `~0.11–0.12` gain) in parallel so small speakers reproduce the cue clearly without buzziness.
3. **Decay length**: Give low cues enough body (`0.24–0.30s`) before exponential decay drops below audibility.
4. **Headroom**: Keep the summed peak of all simultaneously ringing oscillators below `0.8` to avoid clipping on mobile speakers.

## Mobile & iOS Safari lifecycle

1. **Unlock on first gesture**: Create/resume `AudioContext` (supporting `webkitAudioContext`) inside a `pointerdown` handler, and start pre-decoding any static audio clips there.
2. **Resume before playback**: Call `void ctx.resume()` whenever `ctx.state === "suspended"`.
3. **Clean stop**: Stop oscillators `0.02s` past envelope end so exponential tails finish cleanly without clicks and nodes are garbage-collected.
4. **Mute immediately**: When sound is disabled, skip new synthesis and actively stop/disconnect any playing `AudioBufferSourceNode` or `HTMLAudioElement`.
5. **Haptics**: Guard `navigator.vibrate(...)` with feature detection and `try/catch` (browsers may throw without user activation).

## Verification

Before finishing any audio change:

- Verify parallel routing for harmonics that need to be audible (no unintended serial gain multiplication).
- Check peak summed amplitude of overlapping notes stays `< 0.8`.
- Compare perceived loudness of every cue (`tap`, `wrong`, `correct`, `hint`, `setComplete`) against each other on both headphones and a laptop/phone speaker.
- Run `just check` and `just build` so typecheck, lint, formatting, and tests pass.

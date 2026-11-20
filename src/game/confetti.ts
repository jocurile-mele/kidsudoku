import confetti from "canvas-confetti";

const PALETTE = [
  "#E9A83A", // honey amber
  "#4E9F7D", // sage mint
  "#E06D53", // warm terracotta
  "#5A8BB5", // soft sky slate
  "#F2C96B", // sunlit gold
  "#7BB99E", // meadow leaf
];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function fireSolvedConfetti(origin = { x: 0.5, y: 0.45 }) {
  if (prefersReducedMotion()) return;

  void confetti({
    particleCount: 38,
    startVelocity: 28,
    decay: 0.91,
    scalar: 0.9,
    ticks: 130,
    colors: PALETTE,
    origin,
    disableForReducedMotion: true,
  });
}

export function fireSetCompleteConfetti() {
  if (prefersReducedMotion()) return;

  const defaults = {
    colors: PALETTE,
    disableForReducedMotion: true,
    ticks: 180,
  };

  void confetti({
    ...defaults,
    particleCount: 45,
    angle: 60,
    spread: 62,
    startVelocity: 40,
    origin: { x: 0.12, y: 0.68 },
  });

  void confetti({
    ...defaults,
    particleCount: 45,
    angle: 120,
    spread: 62,
    startVelocity: 40,
    origin: { x: 0.88, y: 0.68 },
  });

  window.setTimeout(() => {
    void confetti({
      ...defaults,
      particleCount: 28,
      spread: 85,
      startVelocity: 30,
      scalar: 1.15,
      shapes: ["star", "circle"],
      origin: { x: 0.5, y: 0.42 },
    });
  }, 180);
}

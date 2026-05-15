const BASE = "/wheel-assets/sounds/";

function playOnce(file: string, volume: number): void {
  try {
    const a = new Audio(BASE + file);
    a.volume = volume;
    a.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

export function playMalletGrab(): void {
  playOnce("armGrab.mp3", 0.4);
}

export function playMalletSwing(): void {
  playOnce("armDown.mp3", 1.0);
  playOnce("click.mp3", 0.5);
}

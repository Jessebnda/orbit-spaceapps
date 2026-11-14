/** Two short pulses. Browsers may keep the context suspended until the captain interacts with the page. */
export function beep() {
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    [0, 0.25].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.2, t + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.18);
      osc.start(t + offset);
      osc.stop(t + offset + 0.2);
    });
    setTimeout(() => void ctx.close(), 600);
  } catch {
    // No audio device: the banner still shows the emergency.
  }
}

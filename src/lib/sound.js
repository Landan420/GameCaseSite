// Tiny synthesized sounds, so there are no audio files to ship or license.
// Browsers only allow an AudioContext after a user gesture, so unlock() runs
// from the spin button's click handler before anything tries to play.

let ctx = null;

export function unlock() {
    try {
        ctx ??= new AudioContext();
        if (ctx.state === 'suspended') ctx.resume();
    } catch {
        ctx = null;
    }
}

function blip(freq, start, length, volume, type = 'triangle', endFreq = freq) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(endFreq, start + length);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + length + 0.02);
}

// The click as each card passes the marker.
export function tick() {
    if (!ctx) return;
    blip(1500, ctx.currentTime, 0.045, 0.09, 'triangle', 700);
}

// Rising arpeggio on the reveal.
export function reveal() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip(f, t + i * 0.07, 0.35, 0.08, 'sine'));
}

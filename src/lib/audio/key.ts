export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export type KeyMode = "major" | "minor";

export type KeyResult = {
  root: number;
  mode: KeyMode;
  name: string;
  confidence: number;
};

/** Krumhansl–Kessler key profiles. */
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.29, 3.17];

export function formatKey(root: number | null | undefined, mode: KeyMode | null | undefined): string {
  if (root == null || mode == null || root < 0 || root > 11) return "—";
  const note = NOTE_NAMES[root]!;
  return mode === "minor" ? `${note}m` : note;
}

export function transposeRoot(root: number, semitones: number): number {
  return (((root + Math.round(semitones)) % 12) + 12) % 12;
}

/**
 * Chromagram + KK correlation. Uses a ~20 s window so import stays snappy.
 */
export function detectKey(buffer: AudioBuffer): KeyResult {
  const chroma = chromagram(buffer);
  let best = { root: 0, mode: "major" as KeyMode, score: -Infinity, second: -Infinity };

  for (let root = 0; root < 12; root++) {
    const maj = correlate(chroma, MAJOR_PROFILE, root);
    const min = correlate(chroma, MINOR_PROFILE, root);
    if (maj > best.score) {
      best = { root, mode: "major", score: maj, second: best.score };
    } else if (maj > best.second) {
      best.second = maj;
    }
    if (min > best.score) {
      best = { root, mode: "minor", score: min, second: best.score };
    } else if (min > best.second) {
      best.second = min;
    }
  }

  const conf = best.score <= 0 ? 0.2 : Math.min(1, (best.score - Math.max(0, best.second)) / (best.score + 1e-6) + 0.35);
  return {
    root: best.root,
    mode: best.mode,
    name: formatKey(best.root, best.mode),
    confidence: conf,
  };
}

function correlate(chroma: Float32Array, profile: number[], root: number): number {
  let dot = 0;
  let nA = 0;
  let nB = 0;
  for (let i = 0; i < 12; i++) {
    const a = chroma[i]!;
    const b = profile[(i - root + 12) % 12]!;
    dot += a * b;
    nA += a * a;
    nB += b * b;
  }
  const denom = Math.sqrt(nA * nB) + 1e-9;
  return dot / denom;
}

function chromagram(buffer: AudioBuffer): Float32Array {
  const sr = buffer.sampleRate;
  const targetSr = 11025;
  const step = Math.max(1, Math.round(sr / targetSr));
  const hop = 1024;
  const nfft = 2048;
  const start = Math.floor(buffer.length * 0.12);
  const maxSamples = Math.min(buffer.length - start, Math.floor(12 * sr));
  const src0 = buffer.getChannelData(0);
  const src1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
  const chroma = new Float32Array(12);
  const re = new Float32Array(nfft);
  const im = new Float32Array(nfft);
  const win = hann(nfft);
  const bins = nfft / 2;
  let frames = 0;

  for (let off = start; off + nfft * step < start + maxSamples; off += hop * step) {
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < nfft; i++) {
      const idx = off + i * step;
      const a = src0[idx] ?? 0;
      const b = src1 ? src1[idx] ?? 0 : a;
      re[i] = ((a + b) * 0.5) * win[i]!;
    }
    fftRadix2(re, im);
    for (let k = 1; k < bins; k++) {
      const hz = (k * (sr / step)) / nfft;
      if (hz < 55 || hz > 5000) continue;
      const midi = 69 + 12 * Math.log2(hz / 440);
      const pc = ((Math.round(midi) % 12) + 12) % 12;
      const mag = Math.hypot(re[k]!, im[k]!);
      chroma[pc]! += mag * mag;
    }
    frames++;
    if (frames > 80) break;
  }

  let max = 1e-9;
  for (let i = 0; i < 12; i++) if (chroma[i]! > max) max = chroma[i]!;
  for (let i = 0; i < 12; i++) chroma[i] = Math.sqrt(chroma[i]! / max);
  return chroma;
}

function hann(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  return w;
}

function fftRadix2(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]!;
      re[i] = re[j]!;
      re[j] = tr;
      const ti = im[i]!;
      im[i] = im[j]!;
      im[j] = ti;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const ang = (-2 * Math.PI) / size;
    const wr0 = Math.cos(ang);
    const wi0 = Math.sin(ang);
    for (let i = 0; i < n; i += size) {
      let wr = 1;
      let wi = 0;
      for (let j = 0; j < half; j++) {
        const ur = re[i + j]!;
        const ui = im[i + j]!;
        const vr = re[i + j + half]! * wr - im[i + j + half]! * wi;
        const vi = re[i + j + half]! * wi + im[i + j + half]! * wr;
        re[i + j] = ur + vr;
        im[i + j] = ui + vi;
        re[i + j + half] = ur - vr;
        im[i + j + half] = ui - vi;
        const nwr = wr * wr0 - wi * wi0;
        wi = wr * wi0 + wi * wr0;
        wr = nwr;
      }
    }
  }
}

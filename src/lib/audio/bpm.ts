import { mixToMono } from "./buffers";

export type BpmResult = {
  bpm: number;
  confidence: number;
  candidates: { bpm: number; score: number }[];
};

/**
 * Energy-envelope autocorrelation BPM detector.
 * Uses a ~12 s window so adding tracks never freezes the UI.
 */
export function detectBpm(buffer: AudioBuffer): BpmResult {
  const sr = buffer.sampleRate;
  const windowSamples = Math.min(buffer.length, Math.floor(sr * 12));
  const start = Math.min(
    Math.floor(buffer.length * 0.08),
    Math.max(0, buffer.length - windowSamples),
  );
  const monoFull = mixToMono(buffer);
  const mono = monoFull.subarray(start, start + windowSamples);
  const hop = 1024;
  const env = onsetEnvelope(mono, hop);
  const envSr = sr / hop;

  const minBpm = 70;
  const maxBpm = 180;
  const minLag = Math.max(2, Math.floor((60 / maxBpm) * envSr));
  const maxLag = Math.min(env.length - 2, Math.floor((60 / minBpm) * envSr));

  const corr = new Float32Array(maxLag + 1);
  let corrMax = 1e-9;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    const n = env.length - lag;
    for (let i = 0; i < n; i++) sum += env[i]! * env[i + lag]!;
    corr[lag] = n > 0 ? sum / n : 0;
    if (corr[lag]! > corrMax) corrMax = corr[lag]!;
  }

  const peaks: { lag: number; score: number }[] = [];
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    const v = corr[lag]!;
    if (v > corr[lag - 1]! && v >= corr[lag + 1]! && v > corrMax * 0.35) {
      peaks.push({ lag, score: v / corrMax });
    }
  }
  peaks.sort((a, b) => b.score - a.score);

  const scored = new Map<number, number>();
  for (const p of peaks.slice(0, 12)) {
    let bpm = 60 / (p.lag / envSr);
    while (bpm < minBpm) bpm *= 2;
    while (bpm > maxBpm) bpm /= 2;
    const key = Math.round(bpm * 2) / 2;
    scored.set(key, (scored.get(key) ?? 0) + p.score);
  }

  const candidates = [...scored.entries()]
    .map(([bpm, score]) => ({ bpm, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (candidates.length === 0) {
    return { bpm: 120, confidence: 0.15, candidates: [{ bpm: 120, score: 0.15 }] };
  }

  const top = candidates[0]!;
  const total = candidates.reduce((s, c) => s + c.score, 0) || 1;
  return {
    bpm: Math.round(top.bpm * 10) / 10,
    confidence: Math.min(1, top.score / total + 0.15),
    candidates,
  };
}

function onsetEnvelope(samples: Float32Array, hop: number): Float32Array {
  const n = Math.max(1, Math.floor(samples.length / hop));
  const env = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    let energy = 0;
    const start = i * hop;
    const end = Math.min(samples.length, start + hop);
    for (let k = start; k < end; k++) {
      const v = samples[k] ?? 0;
      energy += v * v;
    }
    const mag = Math.sqrt(energy / Math.max(1, end - start));
    const flux = Math.max(0, mag - prev);
    env[i] = flux;
    prev = mag;
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = env[i - 1] ?? env[i]!;
    const b = env[i]!;
    const c = env[i + 1] ?? env[i]!;
    out[i] = 0.25 * a + 0.5 * b + 0.25 * c;
  }
  return out;
}

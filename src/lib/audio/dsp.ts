import { yieldToMain } from "@/lib/utils";
import { createBufferFromChannels } from "./buffers";
import { fft, hann } from "./fft";

const NFFT = 2048;
const HOP = 512;

export type ProgressFn = (p: number) => void;

function applyGainCurve(channel: Float32Array, fadeIn: number, fadeOut: number, sr: number) {
  const n = channel.length;
  const inN = Math.min(n, Math.floor(fadeIn * sr));
  const outN = Math.min(n, Math.floor(fadeOut * sr));
  for (let i = 0; i < inN; i++) channel[i]! *= i / inN;
  for (let i = 0; i < outN; i++) {
    const idx = n - 1 - i;
    channel[idx]! *= i / outN;
  }
}

export function applyFades(buffer: AudioBuffer, ctx: BaseAudioContext, fadeIn: number, fadeOut: number): AudioBuffer {
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = new Float32Array(buffer.getChannelData(c));
    applyGainCurve(data, fadeIn, fadeOut, buffer.sampleRate);
    channels.push(data);
  }
  return createBufferFromChannels(ctx, channels, buffer.sampleRate);
}

export function scaleGain(buffer: AudioBuffer, ctx: BaseAudioContext, gain: number): AudioBuffer {
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const data = new Float32Array(src.length);
    for (let i = 0; i < src.length; i++) data[i] = src[i]! * gain;
    channels.push(data);
  }
  return createBufferFromChannels(ctx, channels, buffer.sampleRate);
}

function resampleChannel(input: Float32Array, ratio: number): Float32Array {
  if (Math.abs(ratio - 1) < 1e-6) return new Float32Array(input);
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const frac = x - i0;
    const a = input[i0] ?? 0;
    const b = input[i0 + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

/** Overlap-add time stretch. rate>1 makes the buffer longer (slower). */
function olaStretch(input: Float32Array, rate: number, sr: number): Float32Array {
  if (Math.abs(rate - 1) < 0.01) return new Float32Array(input);
  const grain = Math.max(64, Math.round(0.04 * sr));
  const analysisHop = Math.max(16, Math.round(grain / 2));
  const synthesisHop = Math.max(8, Math.round(analysisHop * rate));
  const outLen = Math.max(grain, Math.floor(input.length * rate) + grain);
  const out = new Float32Array(outLen);
  const win = hann(grain);
  let read = 0;
  let write = 0;
  while (read + grain < input.length && write + grain < outLen) {
    for (let i = 0; i < grain; i++) {
      out[write + i]! += input[read + i]! * win[i]!;
    }
    read += analysisHop;
    write += synthesisHop;
  }
  // Normalize overlap
  const norm = grain / (2 * synthesisHop);
  if (norm > 0.01) {
    const g = 1 / Math.max(norm, 0.5);
    for (let i = 0; i < out.length; i++) out[i]! *= g;
  }
  return out.subarray(0, Math.max(1, Math.floor(input.length * rate)));
}

export async function pitchShiftBuffer(
  buffer: AudioBuffer,
  ctx: BaseAudioContext,
  semitones: number,
  onProgress?: ProgressFn,
): Promise<AudioBuffer> {
  const ratio = 2 ** (semitones / 12);
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    if (onProgress) onProgress(c / buffer.numberOfChannels);
    await yieldToMain();
    const src = buffer.getChannelData(c);
    const resampled = resampleChannel(src, ratio);
    const stretched = olaStretch(resampled, ratio, buffer.sampleRate);
    // Match original length
    const matched = new Float32Array(src.length);
    const copyN = Math.min(matched.length, stretched.length);
    matched.set(stretched.subarray(0, copyN));
    channels.push(matched);
  }
  onProgress?.(1);
  return createBufferFromChannels(ctx, channels, buffer.sampleRate);
}

type Spec = { mag: Float32Array[]; phase: Float32Array[]; nFrames: number; bins: number; hop: number };

async function stftChannel(data: Float32Array, onProgress?: ProgressFn, start = 0, end = 1, hop = HOP): Promise<Spec> {
  const n = data.length;
  const nFrames = Math.max(1, Math.floor((n - NFFT) / hop) + 1);
  const bins = NFFT / 2 + 1;
  const mag: Float32Array[] = new Array(nFrames);
  const phase: Float32Array[] = new Array(nFrames);
  const win = hann(NFFT);
  const re = new Float32Array(NFFT);
  const im = new Float32Array(NFFT);

  for (let f = 0; f < nFrames; f++) {
    const off = f * hop;
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < NFFT; i++) {
      re[i] = (data[off + i] ?? 0) * win[i]!;
    }
    fft(re, im, false);
    const m = new Float32Array(bins);
    const p = new Float32Array(bins);
    for (let k = 0; k < bins; k++) {
      const r = re[k]!;
      const ii = im[k]!;
      m[k] = Math.hypot(r, ii);
      p[k] = Math.atan2(ii, r);
    }
    mag[f] = m;
    phase[f] = p;
    if (f % 24 === 0) {
      onProgress?.(start + ((f + 1) / nFrames) * (end - start));
      await yieldToMain();
    }
  }
  return { mag, phase, nFrames, bins, hop };
}

async function istftChannel(spec: Spec, length: number, onProgress?: ProgressFn, start = 0, end = 1): Promise<Float32Array> {
  const out = new Float32Array(length);
  const win = hann(NFFT);
  const re = new Float32Array(NFFT);
  const im = new Float32Array(NFFT);
  const { nFrames, bins } = spec;
  const hop = spec.hop || HOP;

  for (let f = 0; f < nFrames; f++) {
    const m = spec.mag[f]!;
    const p = spec.phase[f]!;
    re.fill(0);
    im.fill(0);
    for (let k = 0; k < bins; k++) {
      re[k] = m[k]! * Math.cos(p[k]!);
      im[k] = m[k]! * Math.sin(p[k]!);
      if (k > 0 && k < bins - 1) {
        re[NFFT - k] = re[k]!;
        im[NFFT - k] = -im[k]!;
      }
    }
    fft(re, im, true);
    const off = f * hop;
    for (let i = 0; i < NFFT; i++) {
      const idx = off + i;
      if (idx < length) out[idx]! += re[i]! * win[i]!;
    }
    if (f % 24 === 0) {
      onProgress?.(start + ((f + 1) / nFrames) * (end - start));
      await yieldToMain();
    }
  }

  // Hann COLA: hop n/4 → 1.5, hop n/2 → 1.0
  const cola = hop <= NFFT / 4 + 1 ? 1.5 : 1.0;
  const g = 1 / cola;
  for (let i = 0; i < out.length; i++) out[i]! *= g;
  return out;
}

function hzToBin(hz: number, sr: number): number {
  return Math.max(0, Math.min(NFFT / 2, Math.round((hz / sr) * NFFT)));
}

export async function denoiseBuffer(
  buffer: AudioBuffer,
  ctx: BaseAudioContext,
  amount = 0.7,
  onProgress?: ProgressFn,
): Promise<AudioBuffer> {
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    const spec = await stftChannel(data, onProgress, c / buffer.numberOfChannels, (c + 0.55) / buffer.numberOfChannels);
    const { nFrames, bins } = spec;

    const noise = new Float32Array(bins);
    const frameEnergy = spec.mag.map((m, i) => {
      let e = 0;
      for (let k = 0; k < bins; k++) e += m[k]!;
      return { i, e };
    });
    frameEnergy.sort((a, b) => a.e - b.e);
    const quietN = Math.max(4, Math.floor(nFrames * 0.12));
    for (let q = 0; q < quietN; q++) {
      const m = spec.mag[frameEnergy[q]!.i]!;
      for (let k = 0; k < bins; k++) noise[k]! += m[k]!;
    }
    for (let k = 0; k < bins; k++) noise[k]! /= quietN;

    const over = 1 + amount * 2.2;
    const floor = 0.05 + (1 - amount) * 0.15;
    for (let f = 0; f < nFrames; f++) {
      const m = spec.mag[f]!;
      for (let k = 0; k < bins; k++) {
        const sub = Math.max(m[k]! - noise[k]! * over, m[k]! * floor);
        m[k] = sub;
      }
    }
    channels.push(
      await istftChannel(spec, data.length, onProgress, (c + 0.55) / buffer.numberOfChannels, (c + 1) / buffer.numberOfChannels),
    );
  }
  onProgress?.(1);
  return createBufferFromChannels(ctx, channels, buffer.sampleRate);
}

export async function enhanceBuffer(
  buffer: AudioBuffer,
  ctx: BaseAudioContext,
  onProgress?: ProgressFn,
): Promise<AudioBuffer> {
  const sr = buffer.sampleRate;
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    const spec = await stftChannel(data, onProgress, c / buffer.numberOfChannels, (c + 0.55) / buffer.numberOfChannels);
    const { nFrames, bins } = spec;
    const mud = hzToBin(280, sr);
    const presence = hzToBin(3500, sr);
    const air = hzToBin(9000, sr);
    for (let f = 0; f < nFrames; f++) {
      const m = spec.mag[f]!;
      for (let k = 0; k < bins; k++) {
        let g = 1;
        if (k < mud) g *= 0.82;
        if (k > presence && k < air) g *= 1.28;
        if (k >= air) g *= 1.45;
        m[k]! *= g;
      }
    }
    const out = await istftChannel(
      spec,
      data.length,
      onProgress,
      (c + 0.55) / buffer.numberOfChannels,
      (c + 1) / buffer.numberOfChannels,
    );
    // Soft saturation + makeup
    for (let i = 0; i < out.length; i++) {
      const x = out[i]! * 1.12;
      out[i] = Math.tanh(x * 1.15) * 0.92;
    }
    channels.push(out);
  }
  onProgress?.(1);
  return createBufferFromChannels(ctx, channels, buffer.sampleRate);
}

export { NFFT, HOP, stftChannel, istftChannel, hzToBin };

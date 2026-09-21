import { yieldToMain } from "@/lib/utils";
import { createBufferFromChannels, extractSlice } from "./buffers";
import { hzToBin, istftChannel, stftChannel, type ProgressFn, NFFT } from "./dsp";

export type SplitMode = "vocals-instrumental" | "four-stems";

export type StemResult = {
  name: string;
  role: "vocals" | "instrumental" | "drums" | "bass" | "other";
  buffer: AudioBuffer;
};

export class SplitCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "SplitCancelled";
  }
}

const CHUNK_SEC = 8;
const OVERLAP_SEC = 0.2;

/**
 * Browser stem splitter.
 *
 * Vocals: center energy × harmonic mask in the speech band, Wiener-refined so
 * words leave the minus. Four stems then split the residual with HPSS:
 * drums = percussive, bass = low harmonic, other = leftover.
 */
export async function splitStems(
  buffer: AudioBuffer,
  ctx: BaseAudioContext,
  mode: SplitMode,
  onProgress?: ProgressFn,
  signal?: AbortSignal,
): Promise<StemResult[]> {
  const sr = buffer.sampleRate;
  const duration = buffer.duration;
  const hop = CHUNK_SEC - OVERLAP_SEC;
  const nChunks = Math.max(1, Math.ceil(Math.max(0, duration - OVERLAP_SEC) / hop));

  const acc: Record<string, { L: Float32Array; R: Float32Array; name: string; role: StemResult["role"] }> = {};
  const outN = buffer.length;
  const overlapN = Math.max(32, Math.floor(OVERLAP_SEC * sr));

  let t = 0;
  let chunkIndex = 0;
  while (t < duration - 0.01) {
    if (signal?.aborted) throw new SplitCancelled();
    const sliceDur = Math.min(CHUNK_SEC, duration - t);
    const slice = extractSlice(buffer, ctx, t, sliceDur);
    const p0 = chunkIndex / nChunks;
    const p1 = (chunkIndex + 1) / nChunks;
    const stems = await splitChunk(slice, ctx, mode, (p) => onProgress?.(p0 + p * (p1 - p0) * 0.98), signal);
    const startSample = Math.floor(t * sr);

    for (const stem of stems) {
      let slot = acc[stem.role];
      if (!slot) {
        slot = {
          L: new Float32Array(outN),
          R: new Float32Array(outN),
          name: stem.name,
          role: stem.role,
        };
        acc[stem.role] = slot;
      }
      const sL = stem.buffer.getChannelData(0);
      const sR = stem.buffer.numberOfChannels > 1 ? stem.buffer.getChannelData(1) : sL;
      const n = Math.min(sL.length, outN - startSample);
      if (startSample === 0) {
        slot.L.set(sL.subarray(0, n), 0);
        slot.R.set(sR.subarray(0, n), 0);
      } else {
        const ov = Math.min(overlapN, n);
        for (let i = 0; i < ov; i++) {
          const w = i / ov;
          const a = Math.cos((w * Math.PI) / 2);
          const b = Math.sin((w * Math.PI) / 2);
          const idx = startSample + i;
          slot.L[idx] = slot.L[idx]! * a * a + sL[i]! * b * b;
          slot.R[idx] = slot.R[idx]! * a * a + sR[i]! * b * b;
        }
        if (n > ov) {
          slot.L.set(sL.subarray(ov, n), startSample + ov);
          slot.R.set(sR.subarray(ov, n), startSample + ov);
        }
      }
    }

    if (t + sliceDur >= duration - 0.01) break;
    t += hop;
    chunkIndex++;
    await yieldToMain();
  }

  onProgress?.(1);
  const order: StemResult["role"][] =
    mode === "vocals-instrumental" ? ["vocals", "instrumental"] : ["vocals", "drums", "bass", "other"];
  return order
    .map((role) => acc[role])
    .filter(Boolean)
    .map((slot) => ({
      name: slot!.name,
      role: slot!.role,
      buffer: createBufferFromChannels(ctx, [slot!.L, slot!.R], sr),
    }));
}

async function splitChunk(
  buffer: AudioBuffer,
  ctx: BaseAudioContext,
  mode: SplitMode,
  onProgress?: ProgressFn,
  signal?: AbortSignal,
): Promise<StemResult[]> {
  if (signal?.aborted) throw new SplitCancelled();
  const sr = buffer.sampleRate;
  const n = buffer.length;
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;

  const mid = new Float32Array(n);
  const side = new Float32Array(n);
  const center = new Float32Array(n);
  let sideEnergy = 0;
  let midEnergy = 0;
  for (let i = 0; i < n; i++) {
    const l = left[i]!;
    const r = right[i]!;
    const m = 0.5 * (l + r);
    const s = 0.5 * (l - r);
    mid[i] = m;
    side[i] = s;
    const denom = Math.abs(l) + Math.abs(r) + 1e-8;
    const sim = 1 - Math.abs(l - r) / denom;
    center[i] = m * sim * sim;
    midEnergy += m * m;
    sideEnergy += s * s;
  }
  const stereoWidth = Math.sqrt(sideEnergy / (midEnergy + 1e-9));
  const isStereo = stereoWidth > 0.035 && buffer.numberOfChannels > 1;

  onProgress?.(0.06);
  const midSpec = await stftChannel(mid, onProgress, 0.06, 0.28);
  if (signal?.aborted) throw new SplitCancelled();
  const centerSpec = await stftChannel(center, onProgress, 0.28, 0.46);
  if (signal?.aborted) throw new SplitCancelled();
  const { nFrames, bins } = midSpec;

  const vocalW = new Float32Array(bins);
  const speechW = new Float32Array(bins);
  const bassW = new Float32Array(bins);
  const subW = new Float32Array(bins);
  const airW = new Float32Array(bins);
  for (let k = 0; k < bins; k++) {
    const hz = (k * sr) / NFFT;
    vocalW[k] = bandWeight(hz, 110, 180, 4800, 8200);
    speechW[k] = bandWeight(hz, 200, 280, 3200, 4600);
    bassW[k] = hz < 160 ? 1 : hz < 250 ? 1 - (hz - 160) / 90 : 0;
    subW[k] = hz < 80 ? 1 : hz < 120 ? 1 - (hz - 80) / 40 : 0;
    airW[k] = hz > 10000 ? 1 : hz > 8200 ? (hz - 8200) / 1800 : 0;
  }

  const { harmonic, percussive } = hpss(midSpec.mag);
  onProgress?.(0.52);
  await yieldToMain();

  const vocalMask: Float32Array[] = new Array(nFrames);
  const instMask: Float32Array[] = new Array(nFrames);

  for (let f = 0; f < nFrames; f++) {
    const magM = midSpec.mag[f]!;
    const magC = centerSpec.mag[f]!;
    const p = percussive[f]!;
    const h = harmonic[f]!;
    const v = new Float32Array(bins);
    const ins = new Float32Array(bins);
    for (let k = 0; k < bins; k++) {
      const m = magM[k]! + 1e-9;
      const c = magC[k]!;
      const ratio = Math.min(1, c / m);
      const harm = h[k]! / (h[k]! + p[k]! + 1e-9);
      const perc = p[k]! / (h[k]! + p[k]! + 1e-9);
      const vw = vocalW[k]!;
      const sw = speechW[k]!;
      let vocal: number;
      if (isStereo) {
        vocal = ratio * vw * (0.35 + 0.65 * harm) * (1 - 0.78 * perc);
        vocal *= 0.75 + 0.7 * sw;
        vocal *= 1 - 0.92 * subW[k]!;
      } else {
        const floor = Math.max(m * 0.32, 1e-6);
        const residual = Math.max(0, 1 - floor / m);
        vocal = residual * vw * (0.45 + 0.55 * harm) * (1 - 0.45 * perc);
      }
      vocal = Math.min(1, Math.max(0, vocal));
      const cut = Math.min(0.99, vocal * (1.2 + 0.5 * sw));
      let inst = 1 - cut;
      inst = inst * (1 - bassW[k]!) + 1 * bassW[k]!;
      inst = Math.max(inst, airW[k]! * 0.88);
      inst = Math.max(inst, perc * 0.72);
      v[k] = cut;
      ins[k] = Math.min(1, Math.max(0.015, inst));
    }
    vocalMask[f] = v;
    instMask[f] = ins;
  }

  smoothMasks(vocalMask, instMask);
  wienerRefine(vocalMask, instMask);
  onProgress?.(0.58);
  await yieldToMain();

  for (let f = 0; f < nFrames; f++) {
    const magM = midSpec.mag[f]!;
    const magC = centerSpec.mag[f]!;
    const v = vocalMask[f]!;
    const ins = instMask[f]!;
    for (let k = 0; k < bins; k++) {
      const remain = magM[k]! * ins[k]!;
      const leftover = Math.min(1, (magC[k]! * speechW[k]!) / (remain + 1e-9));
      const extra = leftover * speechW[k]! * 0.9 * (1 - bassW[k]!);
      v[k] = Math.min(1, v[k]! + extra * 0.92);
      ins[k] = Math.max(0.012, ins[k]! * (1 - extra));
    }
  }

  const vocalsMono = await reconstructMasked(midSpec, vocalMask, n, onProgress, 0.6, 0.76);
  if (signal?.aborted) throw new SplitCancelled();
  const instMono = await reconstructMasked(midSpec, instMask, n, onProgress, 0.76, 0.88);
  if (signal?.aborted) throw new SplitCancelled();

  const vocL = new Float32Array(n);
  const vocR = new Float32Array(n);
  const instL = new Float32Array(n);
  const instR = new Float32Array(n);
  const sideKeep = isStereo ? 1 : 0.12;
  for (let i = 0; i < n; i++) {
    const v = vocalsMono[i]!;
    const ins = instMono[i]!;
    const s = side[i]!;
    vocL[i] = v + s * 0.05;
    vocR[i] = v - s * 0.05;
    instL[i] = ins + s * sideKeep;
    instR[i] = ins - s * sideKeep;
  }

  const vocals = createBufferFromChannels(ctx, [vocL, vocR], sr);
  const instrumental = createBufferFromChannels(ctx, [instL, instR], sr);

  if (mode === "vocals-instrumental") {
    onProgress?.(1);
    return [
      { name: "Акапелла", role: "vocals", buffer: vocals },
      { name: "Минус", role: "instrumental", buffer: instrumental },
    ];
  }

  const frames = nFrames;
  const binsN = bins;
  const bassHi = hzToBin(230, sr);
  const kickHi = hzToBin(90, sr);
  const drumMask: Float32Array[] = new Array(frames);
  const bassMask: Float32Array[] = new Array(frames);
  const otherMask: Float32Array[] = new Array(frames);

  for (let f = 0; f < frames; f++) {
    const d = new Float32Array(binsN);
    const b = new Float32Array(binsN);
    const o = new Float32Array(binsN);
    const p = percussive[f]!;
    const h = harmonic[f]!;
    const inst = instMask[f]!;
    for (let k = 0; k < binsN; k++) {
      const harm = h[k]! / (h[k]! + p[k]! + 1e-9);
      const perc = p[k]! / (h[k]! + p[k]! + 1e-9);
      let drums = perc * inst[k]!;
      if (k <= kickHi) drums = Math.max(drums, perc * 0.85);
      let bass = k <= bassHi ? harm * (1 - perc * 0.65) * inst[k]! * 0.98 : 0;
      if (k <= kickHi) bass *= 0.45;
      let other = Math.max(0, inst[k]! - drums - bass);
      other = Math.max(other, (1 - perc) * inst[k]! * (k > bassHi ? 1 : 0.15));
      const sum = drums + bass + other + 1e-9;
      d[k] = drums / sum;
      b[k] = bass / sum;
      o[k] = other / sum;
    }
    drumMask[f] = d;
    bassMask[f] = b;
    otherMask[f] = o;
  }

  onProgress?.(0.9);
  const drumsMono = await reconstructMasked(midSpec, mulMasks(instMask, drumMask), n, onProgress, 0.9, 0.94);
  if (signal?.aborted) throw new SplitCancelled();
  const bassMono = await reconstructMasked(midSpec, mulMasks(instMask, bassMask), n, onProgress, 0.94, 0.97);
  if (signal?.aborted) throw new SplitCancelled();
  const otherMono = await reconstructMasked(midSpec, mulMasks(instMask, otherMask), n, onProgress, 0.97, 1);

  const drums = stereoFromMono(ctx, drumsMono, side, sr, 0.32);
  const bass = stereoFromMono(ctx, bassMono, side, sr, 0.05);
  const other = stereoFromMono(ctx, otherMono, side, sr, 0.92);
  onProgress?.(1);
  return [
    { name: "Вокал", role: "vocals", buffer: vocals },
    { name: "Ударные", role: "drums", buffer: drums },
    { name: "Бас", role: "bass", buffer: bass },
    { name: "Остальное", role: "other", buffer: other },
  ];
}

function mulMasks(a: Float32Array[], b: Float32Array[]): Float32Array[] {
  return a.map((row, f) => {
    const out = new Float32Array(row.length);
    const other = b[f]!;
    for (let k = 0; k < row.length; k++) out[k] = row[k]! * other[k]!;
    return out;
  });
}

async function reconstructMasked(
  spec: { mag: Float32Array[]; phase: Float32Array[]; nFrames: number; bins: number; hop: number },
  masks: Float32Array[],
  length: number,
  onProgress?: ProgressFn,
  p0 = 0,
  p1 = 1,
): Promise<Float32Array> {
  const { bins, nFrames, hop } = spec;
  const masked = {
    mag: spec.mag.map((m, f) => {
      const out = new Float32Array(bins);
      const mask = masks[f]!;
      for (let k = 0; k < bins; k++) out[k] = m[k]! * mask[k]!;
      return out;
    }),
    phase: spec.phase,
    nFrames,
    bins,
    hop,
  };
  return istftChannel(masked, length, onProgress, p0, p1);
}

function stereoFromMono(
  ctx: BaseAudioContext,
  mono: Float32Array,
  side: Float32Array,
  sr: number,
  sideGain: number,
): AudioBuffer {
  const n = mono.length;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    L[i] = mono[i]! + side[i]! * sideGain;
    R[i] = mono[i]! - side[i]! * sideGain;
  }
  return createBufferFromChannels(ctx, [L, R], sr);
}

function bandWeight(hz: number, a0: number, a1: number, b0: number, b1: number): number {
  if (hz <= a0 || hz >= b1) return 0;
  if (hz < a1) return (hz - a0) / Math.max(1, a1 - a0);
  if (hz > b0) return 1 - (hz - b0) / Math.max(1, b1 - b0);
  return 1;
}

function hpss(mag: Float32Array[]): { harmonic: Float32Array[]; percussive: Float32Array[] } {
  const nFrames = mag.length;
  const bins = mag[0]!.length;
  const timeR = 9;
  const freqR = 5;
  const harmonic: Float32Array[] = new Array(nFrames);
  const percussive: Float32Array[] = new Array(nFrames);
  const tWin = new Float32Array(timeR * 2 + 1);
  const fWin = new Float32Array(freqR * 2 + 1);

  for (let f = 0; f < nFrames; f++) {
    const hRow = new Float32Array(bins);
    const pRow = new Float32Array(bins);
    const f0 = Math.max(0, f - timeR);
    const f1 = Math.min(nFrames - 1, f + timeR);
    for (let k = 0; k < bins; k++) {
      let tn = 0;
      for (let ff = f0; ff <= f1; ff++) tWin[tn++] = mag[ff]![k]!;
      const hMed = medianSmall(tWin, tn);
      const k0 = Math.max(0, k - freqR);
      const k1 = Math.min(bins - 1, k + freqR);
      let fn = 0;
      const row = mag[f]!;
      for (let kk = k0; kk <= k1; kk++) fWin[fn++] = row[kk]!;
      const pMed = medianSmall(fWin, fn);
      hRow[k] = hMed;
      pRow[k] = pMed;
    }
    harmonic[f] = hRow;
    percussive[f] = pRow;
  }
  return { harmonic, percussive };
}

function medianSmall(src: Float32Array, n: number): number {
  const tmp = src.slice(0, n);
  tmp.sort();
  const mid = n >> 1;
  return n % 2 ? tmp[mid]! : 0.5 * (tmp[mid - 1]! + tmp[mid]!);
}

function wienerRefine(vocal: Float32Array[], inst: Float32Array[]) {
  const nFrames = vocal.length;
  const bins = vocal[0]!.length;
  for (let f = 0; f < nFrames; f++) {
    const v = vocal[f]!;
    const ins = inst[f]!;
    for (let k = 0; k < bins; k++) {
      const vp = v[k]! * v[k]!;
      const ip = ins[k]! * ins[k]!;
      const sum = vp + ip + 1e-12;
      v[k] = vp / sum;
      ins[k] = ip / sum;
    }
  }
}

function smoothMasks(vocal: Float32Array[], inst: Float32Array[]) {
  const nFrames = vocal.length;
  const bins = vocal[0]!.length;
  const tmpV = vocal.map((row) => new Float32Array(row));
  const tmpI = inst.map((row) => new Float32Array(row));
  for (let f = 0; f < nFrames; f++) {
    const f0 = Math.max(0, f - 1);
    const f1 = Math.min(nFrames - 1, f + 1);
    for (let k = 0; k < bins; k++) {
      const k0 = Math.max(0, k - 1);
      const k1 = Math.min(bins - 1, k + 1);
      let vs = 0;
      let is = 0;
      let c = 0;
      for (let ff = f0; ff <= f1; ff++) {
        for (let kk = k0; kk <= k1; kk++) {
          vs += tmpV[ff]![kk]!;
          is += tmpI[ff]![kk]!;
          c++;
        }
      }
      vocal[f]![k] = vs / c;
      inst[f]![k] = is / c;
    }
  }
}

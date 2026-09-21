import { idbDel, idbGet, idbSet, STORE_BUFFERS } from "@/lib/idb";

const buffers = new Map<string, AudioBuffer>();
const peaksCache = new Map<string, { peaks: Float32Array; bins: number }>();

export function setAudioBuffer(id: string, buffer: AudioBuffer): void {
  buffers.set(id, buffer);
  peaksCache.delete(id);
}

export function getAudioBuffer(id: string): AudioBuffer | undefined {
  return buffers.get(id);
}

export function hasAudioBuffer(id: string): boolean {
  return buffers.has(id);
}

export function cloneAudioBuffer(buffer: AudioBuffer, ctx: BaseAudioContext): AudioBuffer {
  const copy = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    copy.copyToChannel(buffer.getChannelData(c), c);
  }
  return copy;
}

export function mixToMono(buffer: AudioBuffer): Float32Array {
  const n = buffer.length;
  const out = new Float32Array(n);
  const ch = buffer.numberOfChannels;
  for (let c = 0; c < ch; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < n; i++) out[i]! += data[i]! / ch;
  }
  return out;
}

export function createBufferFromChannels(
  ctx: BaseAudioContext,
  channels: Float32Array[],
  sampleRate: number,
): AudioBuffer {
  const length = channels[0]?.length ?? 0;
  const buffer = ctx.createBuffer(channels.length, length, sampleRate);
  for (let c = 0; c < channels.length; c++) {
    buffer.getChannelData(c).set(channels[c]!);
  }
  return buffer;
}

export function extractSlice(buffer: AudioBuffer, ctx: BaseAudioContext, startSec: number, durationSec: number): AudioBuffer {
  const sr = buffer.sampleRate;
  const start = Math.max(0, Math.floor(startSec * sr));
  const length = Math.max(1, Math.min(buffer.length - start, Math.floor(durationSec * sr)));
  const out = ctx.createBuffer(buffer.numberOfChannels, length, sr);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c).subarray(start, start + length);
    out.getChannelData(c).set(src);
  }
  return out;
}

export function reverseBuffer(buffer: AudioBuffer, ctx: BaseAudioContext): AudioBuffer {
  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    for (let i = 0, j = src.length - 1; i < src.length; i++, j--) {
      dst[i] = src[j]!;
    }
  }
  return out;
}

const PEAK_BINS = 768;

export function getWaveformPeaks(id: string, bins = PEAK_BINS): Float32Array | null {
  const cached = peaksCache.get(id);
  if (cached && cached.bins === bins) return cached.peaks;
  const buffer = buffers.get(id);
  if (!buffer) return null;
  const peaks = computePeaks(buffer, bins);
  peaksCache.set(id, { peaks, bins });
  return peaks;
}

/** Interleaved min/max pairs, length = bins * 2. */
export function computePeaks(buffer: AudioBuffer, bins: number): Float32Array {
  const peaks = new Float32Array(bins * 2);
  const n = buffer.length;
  const ch = buffer.numberOfChannels;
  const samplesPerBin = n / bins;
  const data0 = buffer.getChannelData(0);
  const data1 = ch > 1 ? buffer.getChannelData(1) : null;
  for (let b = 0; b < bins; b++) {
    const start = Math.floor(b * samplesPerBin);
    const end = Math.min(n, Math.floor((b + 1) * samplesPerBin));
    let min = 0;
    let max = 0;
    const step = Math.max(1, Math.floor((end - start) / 48));
    for (let i = start; i < end; i += step) {
      const v0 = data0[i]!;
      if (v0 < min) min = v0;
      if (v0 > max) max = v0;
      if (data1) {
        const v1 = data1[i]!;
        if (v1 < min) min = v1;
        if (v1 > max) max = v1;
      }
    }
    peaks[b * 2] = min;
    peaks[b * 2 + 1] = max;
  }
  return peaks;
}

type StoredBuffer = { sampleRate: number; channels: Float32Array[] };

let persistChain: Promise<void> = Promise.resolve();

export async function persistBuffer(id: string, buffer: AudioBuffer): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const sampleRate = buffer.sampleRate;
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }
  persistChain = persistChain
    .then(async () => {
      try {
        await idbSet(STORE_BUFFERS, id, { sampleRate, channels } satisfies StoredBuffer);
      } catch {
        /* quota / timeout — RAM still holds the buffer */
      }
    })
    .catch(() => undefined);
  return persistChain;
}

export async function restoreBuffer(id: string, ctx: BaseAudioContext): Promise<AudioBuffer | null> {
  if (typeof indexedDB === "undefined") return null;
  if (buffers.has(id)) return buffers.get(id)!;
  try {
    const rec = await idbGet<StoredBuffer>(STORE_BUFFERS, id);
    if (!rec) return null;
    const channels = rec.channels.map((c) => (c instanceof Float32Array ? c : new Float32Array(c)));
    const buffer = createBufferFromChannels(ctx, channels, rec.sampleRate);
    setAudioBuffer(id, buffer);
    return buffer;
  } catch {
    return null;
  }
}

export async function deleteBuffer(id: string): Promise<void> {
  buffers.delete(id);
  peaksCache.delete(id);
  if (typeof indexedDB === "undefined") return;
  try {
    await idbDel(STORE_BUFFERS, id);
  } catch {
    /* ignore */
  }
}

export async function persistAll(ids: string[]): Promise<void> {
  for (const id of ids) {
    const buf = buffers.get(id);
    if (buf) await persistBuffer(id, buf);
  }
}

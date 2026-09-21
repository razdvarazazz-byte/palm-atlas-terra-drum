import { Mp3Encoder } from "@breezystack/lamejs";
import { yieldToMain } from "@/lib/utils";
import { downloadBlob } from "./wav";

function floatTo16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!));
    out[i] = s < 0 ? (s * 0x8000) | 0 : (s * 0x7fff) | 0;
  }
  return out;
}

export async function encodeMp3(
  buffer: AudioBuffer,
  bitrate = 192,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const channels = Math.min(2, Math.max(1, buffer.numberOfChannels));
  const encoder = new Mp3Encoder(channels, buffer.sampleRate, bitrate);
  const left = floatTo16(buffer.getChannelData(0));
  const right = channels > 1 ? floatTo16(buffer.getChannelData(1)) : undefined;
  const block = 1152;
  const parts: ArrayBuffer[] = [];
  for (let i = 0; i < left.length; i += block) {
    const l = left.subarray(i, Math.min(left.length, i + block));
    const r = right?.subarray(i, Math.min(right.length, i + block));
    const mp3 = channels > 1 && r ? encoder.encodeBuffer(l, r) : encoder.encodeBuffer(l);
    if (mp3.length) parts.push(mp3.buffer.slice(mp3.byteOffset, mp3.byteOffset + mp3.byteLength) as ArrayBuffer);
    if (i % (block * 40) === 0) {
      onProgress?.(i / left.length);
      await yieldToMain();
    }
  }
  const end = encoder.flush();
  if (end.length) parts.push(end.buffer.slice(end.byteOffset, end.byteOffset + end.byteLength) as ArrayBuffer);
  onProgress?.(1);
  return new Blob(parts, { type: "audio/mpeg" });
}

export async function downloadMp3(buffer: AudioBuffer, filename: string, onProgress?: (p: number) => void) {
  const blob = await encodeMp3(buffer, 192, onProgress);
  const name = filename.toLowerCase().endsWith(".mp3") ? filename : `${filename}.mp3`;
  downloadBlob(blob, name);
}

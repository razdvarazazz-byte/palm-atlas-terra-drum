import { clamp } from "./utils";
import type { Clip } from "./studio-types";

export const RATE_MIN = 0.25;
export const RATE_MAX = 4;
export const BPM_MIN = 20;
export const BPM_MAX = 400;

export function clipRate(clip: Pick<Clip, "rate">): number {
  const r = clip.rate ?? 1;
  return clamp(Number.isFinite(r) && r > 0 ? r : 1, RATE_MIN, RATE_MAX);
}

export function sourceLength(clip: Pick<Clip, "duration" | "rate">): number {
  return Math.max(0.01, clip.duration * clipRate(clip));
}

export function clipBpm(clip: Pick<Clip, "rate" | "nativeBpm">, fallback = 120): number {
  const native = clip.nativeBpm && clip.nativeBpm > 0 ? clip.nativeBpm : fallback;
  return Math.round(native * clipRate(clip) * 10) / 10;
}

export function applyTempo(clip: Clip, targetBpm: number, nativeBpm: number): Partial<Clip> {
  const native = clamp(nativeBpm, BPM_MIN, BPM_MAX);
  const target = clamp(targetBpm, BPM_MIN, BPM_MAX);
  const src = sourceLength(clip);
  const rate = clamp(target / native, RATE_MIN, RATE_MAX);
  return {
    nativeBpm: native,
    rate,
    duration: src / rate,
    preservePitch: true,
  };
}

export function applyRate(clip: Clip, nextRate: number): Partial<Clip> {
  const src = sourceLength(clip);
  const rate = clamp(nextRate, RATE_MIN, RATE_MAX);
  return {
    rate,
    duration: src / rate,
    preservePitch: false,
  };
}

export function stretchToDuration(clip: Clip, nextDuration: number): Partial<Clip> {
  const src = sourceLength(clip);
  const dur = Math.max(0.05, nextDuration);
  const rate = clamp(src / dur, RATE_MIN, RATE_MAX);
  return {
    rate,
    duration: src / rate,
    preservePitch: false,
  };
}

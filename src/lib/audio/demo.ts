import { uid } from "@/lib/utils";
import { persistBuffer, setAudioBuffer } from "./buffers";
import type { Clip, LaneColor, Track } from "@/lib/studio-types";

function env(t: number, attack: number, decay: number): number {
  if (t < 0) return 0;
  if (t < attack) return t / attack;
  return Math.exp(-3.2 * ((t - attack) / decay));
}

function renderOffline(
  sr: number,
  duration: number,
  stereo: boolean,
  fill: (L: Float32Array, R: Float32Array, sr: number) => void,
): AudioBuffer {
  const n = Math.floor(duration * sr);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  fill(L, R, sr);
  const ctx = new OfflineAudioContext(stereo ? 2 : 1, n, sr);
  const buf = ctx.createBuffer(stereo ? 2 : 1, n, sr);
  buf.copyToChannel(L, 0);
  if (stereo) buf.copyToChannel(R, 1);
  return buf;
}

function kick(L: Float32Array, R: Float32Array, sr: number, at: number) {
  const n = Math.floor(0.28 * sr);
  const start = Math.floor(at * sr);
  for (let i = 0; i < n && start + i < L.length; i++) {
    const t = i / sr;
    const f = 140 * Math.exp(-18 * t) + 38;
    const s = Math.sin(2 * Math.PI * f * t) * env(t, 0.004, 0.22) * 0.95;
    L[start + i]! += s;
    R[start + i]! += s;
  }
}

function snare(L: Float32Array, R: Float32Array, sr: number, at: number) {
  const n = Math.floor(0.22 * sr);
  const start = Math.floor(at * sr);
  let noise = 0;
  for (let i = 0; i < n && start + i < L.length; i++) {
    const t = i / sr;
    noise = Math.random() * 2 - 1;
    const tone = Math.sin(2 * Math.PI * 196 * t);
    const s = (noise * 0.72 + tone * 0.28) * env(t, 0.002, 0.16) * 0.55;
    L[start + i]! += s * 0.92;
    R[start + i]! += s * 1.05;
  }
}

function hat(L: Float32Array, R: Float32Array, sr: number, at: number, open = false) {
  const n = Math.floor((open ? 0.18 : 0.045) * sr);
  const start = Math.floor(at * sr);
  let prev = 0;
  for (let i = 0; i < n && start + i < L.length; i++) {
    const t = i / sr;
    const white = Math.random() * 2 - 1;
    const hp = white - prev;
    prev = white;
    const s = hp * env(t, 0.001, open ? 0.14 : 0.035) * (open ? 0.22 : 0.16);
    L[start + i]! += s * 1.1;
    R[start + i]! += s * 0.85;
  }
}

function bassNote(L: Float32Array, R: Float32Array, sr: number, at: number, dur: number, freq: number) {
  const n = Math.floor(dur * sr);
  const start = Math.floor(at * sr);
  for (let i = 0; i < n && start + i < L.length; i++) {
    const t = i / sr;
    const saw = 2 * ((t * freq) % 1) - 1;
    const sine = Math.sin(2 * Math.PI * freq * t);
    const s = (sine * 0.7 + saw * 0.18) * env(t, 0.01, dur) * 0.55;
    L[start + i]! += s;
    R[start + i]! += s;
  }
}

function chord(L: Float32Array, R: Float32Array, sr: number, at: number, dur: number, freqs: number[]) {
  const n = Math.floor(dur * sr);
  const start = Math.floor(at * sr);
  for (let i = 0; i < n && start + i < L.length; i++) {
    const t = i / sr;
    let l = 0;
    let r = 0;
    freqs.forEach((f, idx) => {
      const det = f * (1 + (idx - 1) * 0.004);
      const saw = 2 * ((t * det) % 1) - 1;
      const g = env(t, 0.03, dur) * 0.14;
      if (idx % 2 === 0) l += saw * g;
      else r += saw * g;
      l += Math.sin(2 * Math.PI * f * t) * g * 0.4;
      r += Math.sin(2 * Math.PI * f * 1.002 * t) * g * 0.4;
    });
    L[start + i]! += l;
    R[start + i]! += r;
  }
}

function lead(L: Float32Array, R: Float32Array, sr: number, at: number, dur: number, freq: number) {
  const n = Math.floor(dur * sr);
  const start = Math.floor(at * sr);
  for (let i = 0; i < n && start + i < L.length; i++) {
    const t = i / sr;
    const vib = freq * (1 + 0.012 * Math.sin(2 * Math.PI * 5.2 * t));
    const osc = Math.sin(2 * Math.PI * vib * t) + 0.35 * Math.sin(2 * Math.PI * vib * 2 * t);
    const formant = 0.5 + 0.5 * Math.sin(2 * Math.PI * 680 * t);
    const s = osc * formant * env(t, 0.02, dur) * 0.28;
    L[start + i]! += s;
    R[start + i]! += s;
  }
}

const BPM = 120;
const BEAT = 60 / BPM;
const BARS = 4;
const DURATION = BARS * 4 * BEAT;

export type DemoMix = {
  tracks: Track[];
  clips: Clip[];
  bpm: number;
  mixed: { bufferId: string; duration: number; name: string };
};

export async function buildDemoMix(): Promise<DemoMix> {
  const sr = 22050;

  const drumsBuf = renderOffline(sr, DURATION, true, (L, R, s) => {
    for (let bar = 0; bar < BARS; bar++) {
      const t0 = bar * 4 * BEAT;
      kick(L, R, s, t0);
      kick(L, R, s, t0 + 2 * BEAT);
      if (bar % 2 === 1) kick(L, R, s, t0 + 2.5 * BEAT);
      snare(L, R, s, t0 + BEAT);
      snare(L, R, s, t0 + 3 * BEAT);
      for (let i = 0; i < 8; i++) hat(L, R, s, t0 + i * (BEAT / 2), i % 4 === 3);
    }
  });

  const bassBuf = renderOffline(sr, DURATION, true, (L, R, s) => {
    const notes = [55, 55, 65.4, 49, 55, 55, 73.4, 82.4];
    notes.forEach((f, i) => {
      bassNote(L, R, s, i * 4 * BEAT, 3.6 * BEAT, f);
      bassNote(L, R, s, i * 4 * BEAT + 1.5 * BEAT, 0.4 * BEAT, f * 1.5);
    });
  });

  const keysBuf = renderOffline(sr, DURATION, true, (L, R, s) => {
    const chords = [
      [220, 277.2, 329.6],
      [196, 246.9, 293.7],
      [174.6, 220, 261.6],
      [196, 246.9, 311.1],
    ];
    for (let bar = 0; bar < BARS; bar++) {
      chord(L, R, s, bar * 4 * BEAT, 3.8 * BEAT, chords[bar % 4]!);
    }
  });

  const vocalBuf = renderOffline(sr, DURATION, true, (L, R, s) => {
    const melody = [440, 493.9, 523.3, 493.9, 440, 392, 349.2, 392];
    melody.forEach((f, i) => {
      lead(L, R, s, i * 4 * BEAT + 0.05, 3.2 * BEAT, f);
      lead(L, R, s, i * 4 * BEAT + 2 * BEAT, 1.4 * BEAT, f * 1.25);
    });
  });

  const mixed = renderOffline(sr, DURATION, true, (L, R) => {
    mixIn(L, R, drumsBuf, 1);
    mixIn(L, R, bassBuf, 0.95);
    mixIn(L, R, keysBuf, 0.85);
    mixIn(L, R, vocalBuf, 1);
  });

  const ids = {
    drums: uid("buf"),
    bass: uid("buf"),
    keys: uid("buf"),
    vocal: uid("buf"),
    mix: uid("buf"),
  };
  setAudioBuffer(ids.drums, drumsBuf);
  setAudioBuffer(ids.bass, bassBuf);
  setAudioBuffer(ids.keys, keysBuf);
  setAudioBuffer(ids.vocal, vocalBuf);
  setAudioBuffer(ids.mix, mixed);
  void Promise.all([
    persistBuffer(ids.drums, drumsBuf),
    persistBuffer(ids.bass, bassBuf),
    persistBuffer(ids.keys, keysBuf),
    persistBuffer(ids.vocal, vocalBuf),
    persistBuffer(ids.mix, mixed),
  ]).catch(() => undefined);

  const mkTrack = (name: string, color: LaneColor, i: number): Track => ({
    id: uid("trk"),
    name,
    color,
    volume: 1,
    pan: i === 1 ? -0.15 : i === 2 ? 0.2 : 0,
    mute: false,
    solo: false,
    armed: false,
  });

  const tracks = [
    mkTrack("Ударные", "lane-coral", 0),
    mkTrack("Бас", "lane-teal", 1),
    mkTrack("Синты", "lane-blue", 2),
    mkTrack("Вокал", "lane-sage", 3),
  ];

  const clips: Clip[] = tracks.map((track, i) => ({
    id: uid("clip"),
    trackId: track.id,
    bufferId: [ids.drums, ids.bass, ids.keys, ids.vocal][i]!,
    name: track.name,
    start: 0,
    offset: 0,
    duration: DURATION,
    gain: 1,
    reverse: false,
    fadeIn: 0.01,
    fadeOut: 0.08,
    pitch: 0,
    muted: false,
    rate: 1,
    nativeBpm: BPM,
    preservePitch: false,
  }));

  return {
    tracks,
    clips,
    bpm: BPM,
    mixed: { bufferId: ids.mix, duration: DURATION, name: "Демо-микс" },
  };
}

function mixIn(L: Float32Array, R: Float32Array, buf: AudioBuffer, g: number) {
  const l = buf.getChannelData(0);
  const r = buf.numberOfChannels > 1 ? buf.getChannelData(1) : l;
  const n = Math.min(L.length, buf.length);
  for (let i = 0; i < n; i++) {
    L[i]! += l[i]! * g;
    R[i]! += r[i]! * g;
  }
}

export async function buildMixedDemoClip(): Promise<{ bufferId: string; duration: number; name: string }> {
  const demo = await buildDemoMix();
  return demo.mixed;
}

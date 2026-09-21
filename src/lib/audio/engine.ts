import { clamp } from "@/lib/utils";
import { clipRate } from "@/lib/clip-time";
import { getAudioBuffer } from "./buffers";
import type { Clip, Track } from "@/lib/studio-types";

export type MixSnapshot = {
  tracks: Track[];
  clips: Clip[];
  bpm: number;
  nativeBpm: number;
  masterGain: number;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
};

type SourceSlot = {
  source: AudioBufferSourceNode;
  fadeGain: GainNode;
  clipGain: GainNode;
  clipId: string;
};

const listeners = new Set<(t: number) => void>();
const playListeners = new Set<(playing: boolean) => void>();

export function tempoRate(bpm: number, nativeBpm: number): number {
  const native = Math.max(20, nativeBpm || bpm || 120);
  return clamp((bpm || native) / native, 0.25, 4);
}

function playbackOf(clip: Clip): { rate: number; detune: number } {
  const rate = clipRate(clip);
  const detune = clip.preservePitch && Math.abs(rate - 1) > 0.001 ? -1200 * Math.log2(rate) : 0;
  return { rate, detune };
}

class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  compressor: DynamicsCompressorNode | null = null;
  metronomeGain: GainNode | null = null;
  playing = false;
  recording = false;
  metronome = false;
  playhead = 0;
  private originPlayhead = 0;
  private startedAt = 0;
  private sources: SourceSlot[] = [];
  private timer: number | null = null;
  private snapshot: MixSnapshot | null = null;
  private recChunks: Blob[] = [];
  private rec: MediaRecorder | null = null;
  private recStream: MediaStream | null = null;
  private trackGain = new Map<string, GainNode>();
  private trackPan = new Map<string, StereoPannerNode>();
  recStartedAt = 0;
  recTrackId: string | null = null;

  private wallOrigin = 0;

  ensure(): AudioContext {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -1;
      this.compressor.knee.value = 1.5;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.002;
      this.compressor.release.value = 0.08;
      this.metronomeGain = this.ctx.createGain();
      this.metronomeGain.gain.value = 0.22;
      this.master.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
      this.metronomeGain.connect(this.master);
    }
    return this.ctx;
  }

  chainFor(track: Track): GainNode {
    const ctx = this.ensure();
    let gain = this.trackGain.get(track.id);
    let pan = this.trackPan.get(track.id);
    if (!gain || !pan) {
      gain = ctx.createGain();
      pan = ctx.createStereoPanner();
      gain.connect(pan);
      pan.connect(this.master!);
      this.trackGain.set(track.id, gain);
      this.trackPan.set(track.id, pan);
    }
    const soloed = this.snapshot?.tracks.some((t) => t.solo) ?? false;
    const silent = track.mute || (soloed && !track.solo);
    const vol = silent ? 0 : clamp(track.volume, 0, 2);
    gain.gain.setTargetAtTime(vol, ctx.currentTime, 0.015);
    pan.pan.setTargetAtTime(clamp(track.pan, -1, 1), ctx.currentTime, 0.02);
    return gain;
  }

  refreshTracks() {
    if (!this.snapshot) return;
    for (const track of this.snapshot.tracks) this.chainFor(track);
  }

  applyTrack(track: Track) {
    if (!this.ctx) return;
    if (this.snapshot) {
      this.snapshot.tracks = this.snapshot.tracks.map((t) => (t.id === track.id ? { ...track } : t));
    }
    if (this.trackGain.has(track.id) || this.playing) this.chainFor(track);
    else if (this.ctx) this.chainFor(track);
  }

  applyClipGain(clipId: string, gain: number) {
    if (this.snapshot) {
      this.snapshot.clips = this.snapshot.clips.map((c) => (c.id === clipId ? { ...c, gain } : c));
    }
    const ctx = this.ctx;
    if (!ctx) return;
    for (const slot of this.sources) {
      if (slot.clipId === clipId) {
        slot.clipGain.gain.setTargetAtTime(clamp(gain, 0, 4), ctx.currentTime, 0.015);
      }
    }
  }

  applyClipMute(clipId: string, muted: boolean) {
    if (this.snapshot) {
      this.snapshot.clips = this.snapshot.clips.map((c) => (c.id === clipId ? { ...c, muted } : c));
    }
    const ctx = this.ctx;
    if (!ctx) return;
    const clip = this.snapshot?.clips.find((c) => c.id === clipId);
    const g = muted ? 0 : (clip?.gain ?? 0);
    for (const slot of this.sources) {
      if (slot.clipId === clipId) {
        slot.clipGain.gain.setTargetAtTime(g, ctx.currentTime, 0.01);
      }
    }
  }

  setMasterGain(v: number) {
    if (this.snapshot) this.snapshot.masterGain = v;
    const ctx = this.ensure();
    if (this.master) this.master.gain.setTargetAtTime(clamp(v, 0, 2), ctx.currentTime, 0.015);
  }

  setTempo(bpm: number, nativeBpm: number) {
    if (this.snapshot) {
      this.snapshot.bpm = bpm;
      this.snapshot.nativeBpm = nativeBpm;
    }
  }

  async resume() {
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();
  }

  getPlayhead(): number {
    if (!this.playing) {
      return Number.isFinite(this.playhead) ? Math.max(0, this.playhead) : 0;
    }
    const wall = performance.now() / 1000 - this.wallOrigin;
    const ctx = this.ctx;
    const audioElapsed =
      ctx && ctx.state === "running" ? Math.max(0, ctx.currentTime - this.startedAt) : 0;
    let elapsed = ctx && ctx.state === "running" && audioElapsed > 0.03 ? audioElapsed : wall;
    if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 12 * 3600) elapsed = 0;
    this.playhead = Math.max(0, this.originPlayhead + elapsed);
    if (this.snapshot?.loopEnabled) {
      const { loopStart, loopEnd } = this.snapshot;
      const span = Math.max(0.05, loopEnd - loopStart);
      if (this.playhead >= loopEnd) {
        this.playhead = loopStart + ((this.playhead - loopStart) % span);
      }
    }
    if (!Number.isFinite(this.playhead)) this.playhead = Math.max(0, this.originPlayhead);
    return this.playhead;
  }

  subscribe(fn: (t: number) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  subscribePlay(fn: (playing: boolean) => void): () => void {
    playListeners.add(fn);
    fn(this.playing);
    return () => playListeners.delete(fn);
  }

  private emit() {
    const t = this.getPlayhead();
    listeners.forEach((fn) => fn(t));
  }

  private emitPlay() {
    playListeners.forEach((fn) => fn(this.playing));
  }

  seek(time: number) {
    const was = this.playing;
    const snap = this.snapshot;
    if (was) this.stopInternal(false);
    this.playhead = Math.max(0, Number.isFinite(time) ? time : 0);
    this.originPlayhead = this.playhead;
    if (was && snap) void this.play(snap);
    this.emit();
  }

  async play(snapshot: MixSnapshot) {
    await this.resume();
    this.snapshot = snapshot;
    if (this.master) this.master.gain.value = clamp(snapshot.masterGain, 0, 2);
    this.stopInternal(false);
    this.playing = true;
    this.emitPlay();
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
    this.startedAt = ctx.currentTime;
    this.wallOrigin = performance.now() / 1000;
    this.originPlayhead = Number.isFinite(this.playhead) ? Math.max(0, this.playhead) : 0;
    this.playhead = this.originPlayhead;
    this.schedule(snapshot, this.playhead, ctx.currentTime);
    this.armClock();
    this.emit();
  }

  pause() {
    const t = this.getPlayhead();
    this.playhead = Number.isFinite(t) ? Math.max(0, t) : Math.max(0, this.originPlayhead);
    this.originPlayhead = this.playhead;
    this.stopInternal(false);
    this.playing = false;
    this.emitPlay();
    this.emit();
  }

  stop() {
    this.stopInternal(true);
    this.playing = false;
    this.playhead = 0;
    this.originPlayhead = 0;
    this.emitPlay();
    this.emit();
  }

  private stopInternal(_reset: boolean) {
    for (const slot of this.sources) {
      try {
        slot.source.stop();
      } catch {
        /* already stopped */
      }
      try {
        slot.source.disconnect();
        slot.fadeGain.disconnect();
        slot.clipGain.disconnect();
      } catch {
        /* noop */
      }
    }
    this.sources = [];
    if (this.timer != null) {
      cancelAnimationFrame(this.timer);
      this.timer = null;
    }
  }

  private armClock() {
    const tick = () => {
      if (!this.playing) return;
      const t = this.getPlayhead();
      if (
        this.snapshot?.loopEnabled &&
        t + 0.02 >= this.snapshot.loopEnd &&
        this.snapshot.loopEnd > this.snapshot.loopStart
      ) {
        this.seek(this.snapshot.loopStart);
        return;
      }
      this.emit();
      this.timer = requestAnimationFrame(tick);
    };
    this.timer = requestAnimationFrame(tick);
  }

  private schedule(snapshot: MixSnapshot, from: number, when: number) {
    const ctx = this.ensure();
    const trackMap = new Map(snapshot.tracks.map((t) => [t.id, t]));

    for (const clip of snapshot.clips) {
      const track = trackMap.get(clip.trackId);
      if (!track) continue;
      const buf = getAudioBuffer(clip.bufferId);
      if (!buf) continue;

      const clipStart = clip.start;
      const clipEnd = clip.start + clip.duration;
      if (clipEnd <= from) continue;

      const localOffset = Math.max(0, from - clipStart);
      const remaining = clip.duration - localOffset;
      if (remaining <= 0.005) continue;

      const { rate, detune } = playbackOf(clip);
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.playbackRate.value = rate;
      if (detune) source.detune.value = detune;
      const fadeGain = ctx.createGain();
      const clipGain = ctx.createGain();
      const dest = this.chainFor(track);

      const vol = 1;
      clipGain.gain.value = clip.muted ? 0 : clamp(clip.gain, 0, 4);
      const startAt = when + Math.max(0, clipStart - from);
      const offset = clip.offset + localOffset * rate;
      const fadeIn = clip.fadeIn;
      const fadeOut = clip.fadeOut;

      const absClipStart = startAt - localOffset;
      fadeGain.gain.setValueAtTime(
        localOffset < fadeIn ? vol * (localOffset / Math.max(fadeIn, 0.001)) : vol,
        startAt,
      );
      if (fadeIn > 0.001 && localOffset < fadeIn) {
        fadeGain.gain.linearRampToValueAtTime(vol, absClipStart + fadeIn);
      }
      if (fadeOut > 0.001) {
        const tOutStart = absClipStart + clip.duration - fadeOut;
        const startFade = Math.max(startAt, tOutStart);
        fadeGain.gain.setValueAtTime(vol, startFade);
        fadeGain.gain.linearRampToValueAtTime(0.0001, absClipStart + clip.duration);
      }

      source.connect(fadeGain);
      fadeGain.connect(clipGain);
      clipGain.connect(dest);
      try {
        source.start(startAt, Math.min(offset, Math.max(0, buf.duration - 0.001)), remaining * rate);
      } catch {
        continue;
      }
      this.sources.push({ source, fadeGain, clipGain, clipId: clip.id });
    }

    this.refreshTracks();
    if (this.metronome) this.scheduleMetronome(snapshot.bpm, from, when);
  }

  private scheduleMetronome(bpm: number, from: number, when: number) {
    const ctx = this.ensure();
    const beat = 60 / Math.max(20, bpm);
    const startBeat = Math.ceil(from / beat - 0.0001);
    const until = from + 180;
    for (let i = startBeat; i * beat < until; i++) {
      const t = when + (i * beat - from);
      if (t < when - 0.01) continue;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const accent = i % 4 === 0;
      osc.frequency.value = accent ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(accent ? 0.28 : 0.14, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.connect(g);
      g.connect(this.metronomeGain!);
      osc.start(t);
      osc.stop(t + 0.07);
    }
  }

  async startRecording(trackId: string, onClip: (blob: Blob, startedAt: number, trackId: string) => void) {
    await this.resume();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.recStream = stream;
    this.recChunks = [];
    const rec = new MediaRecorder(stream);
    this.rec = rec;
    this.recording = true;
    this.recTrackId = trackId;
    this.recStartedAt = this.getPlayhead();
    rec.ondataavailable = (e) => {
      if (e.data.size) this.recChunks.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(this.recChunks, { type: rec.mimeType || "audio/webm" });
      onClip(blob, this.recStartedAt, trackId);
      this.recStream?.getTracks().forEach((t) => t.stop());
      this.recStream = null;
      this.recording = false;
    };
    rec.start();
  }

  stopRecording() {
    if (this.rec && this.rec.state !== "inactive") this.rec.stop();
    this.rec = null;
  }

  async bounce(snapshot: MixSnapshot, duration: number): Promise<AudioBuffer> {
    const sr = 44100;
    const length = Math.max(1, Math.ceil(duration * sr));
    const offline = new OfflineAudioContext(2, length, sr);
    const master = offline.createGain();
    master.gain.value = clamp(snapshot.masterGain, 0, 2);
    master.connect(offline.destination);
    const soloed = snapshot.tracks.some((t) => t.solo);
    const trackMap = new Map(snapshot.tracks.map((t) => [t.id, t]));

    for (const clip of snapshot.clips) {
      const track = trackMap.get(clip.trackId);
      if (!track || track.mute || clip.muted) continue;
      if (soloed && !track.solo) continue;
      const buf = getAudioBuffer(clip.bufferId);
      if (!buf) continue;
      const { rate, detune } = playbackOf(clip);
      const source = offline.createBufferSource();
      source.buffer = buf;
      source.playbackRate.value = rate;
      if (detune) source.detune.value = detune;
      const gain = offline.createGain();
      const pan = offline.createStereoPanner();
      pan.pan.value = clamp(track.pan, -1, 1);
      const vol = clamp(track.volume, 0, 2) * clamp(clip.gain, 0, 4);
      const fadeIn = clip.fadeIn;
      const fadeOut = clip.fadeOut;
      const t0 = Math.max(0, clip.start);
      const dur = clip.duration;
      gain.gain.setValueAtTime(fadeIn > 0 ? 0.0001 : vol, t0);
      if (fadeIn > 0) gain.gain.linearRampToValueAtTime(vol, t0 + fadeIn);
      if (fadeOut > 0) {
        gain.gain.setValueAtTime(vol, Math.max(0, t0 + dur - fadeOut));
        gain.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      }
      source.connect(gain);
      gain.connect(pan);
      pan.connect(master);
      try {
        source.start(t0, clip.offset, clip.duration * rate);
      } catch {
        /* skip */
      }
    }
    return offline.startRendering();
  }
}

export const engine = new AudioEngine();

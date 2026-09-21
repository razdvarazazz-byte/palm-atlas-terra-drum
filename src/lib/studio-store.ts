import { create } from "zustand";
import { uid } from "./utils";
import { engine } from "./audio/engine";
import { getAudioBuffer, persistBuffer, setAudioBuffer } from "./audio/buffers";
import { createEmptyProject, projectDuration, saveProject } from "./projects";
import { applyRate, applyTempo, BPM_MAX, BPM_MIN, clipRate, sourceLength } from "./clip-time";
import type {
  BusyState,
  Clip,
  GapHint,
  HistoryFrame,
  KeyMode,
  LaneColor,
  ProjectData,
  StudioTool,
  Track,
} from "./studio-types";
import { LANE_COLORS, SPARE_LANES } from "./studio-types";

export type BottomTab = "mixer" | "clip" | "cut" | "split";

type MutateOpts = { snapshot?: boolean };

type StudioState = ProjectData & {
  selectedClipId: string | null;
  selectedTrackId: string | null;
  busy: BusyState;
  busyHidden: boolean;
  dragging: boolean;
  bottomTab: BottomTab;
  panelOpen: boolean;
  hydrated: boolean;
  undoStack: HistoryFrame[];
  redoStack: HistoryFrame[];
  markA: number | null;
  markB: number | null;
  lastGap: GapHint | null;
  tool: StudioTool;
  snap: boolean;

  load: (data: ProjectData, opts?: { keepHistory?: boolean }) => void;
  persist: () => void;
  snapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setName: (name: string) => void;
  setBpm: (bpm: number, opts?: MutateOpts) => void;
  setNativeBpm: (nativeBpm: number) => void;
  setClipTempo: (id: string, bpm: number, opts?: MutateOpts) => void;
  setTrackTempo: (trackId: string, bpm: number, opts?: MutateOpts) => void;
  setClipRate: (id: string, rate: number, duration?: number, opts?: MutateOpts) => void;
  setKey: (root: number | null, mode: KeyMode | null) => void;
  setZoom: (zoom: number) => void;
  setMaster: (v: number) => void;
  setLoop: (partial: Partial<Pick<ProjectData, "loopEnabled" | "loopStart" | "loopEnd">>) => void;
  setBusy: (busy: BusyState) => void;
  hideBusy: () => void;
  setDragging: (dragging: boolean) => void;
  setBottomTab: (tab: BottomTab) => void;
  setPanelOpen: (open: boolean) => void;
  selectClip: (id: string | null) => void;
  selectTrack: (id: string | null) => void;
  setTool: (tool: StudioTool) => void;
  setSnap: (snap: boolean) => void;
  setMarkA: (t: number | null) => void;
  setMarkB: (t: number | null) => void;
  clearMarks: () => void;
  clearLastGap: () => void;

  addTrack: (name?: string, color?: LaneColor, opts?: MutateOpts) => string;
  insertTrack: (index: number, name?: string, color?: LaneColor, opts?: MutateOpts) => string;
  acquireTrack: (name?: string, color?: LaneColor) => string;
  ensureSpareTracks: (min?: number) => void;
  compactOccupied: () => void;
  updateTrack: (id: string, patch: Partial<Track>) => void;
  removeTrack: (id: string, opts?: MutateOpts) => void;
  moveTrack: (id: string, toIndex: number, opts?: MutateOpts) => void;

  addClip: (clip: Omit<Clip, "id"> & { id?: string }) => string;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  moveClip: (id: string, patch: { start?: number; trackId?: string }, opts?: MutateOpts) => void;
  removeClip: (id: string, opts?: MutateOpts) => void;
  splitClipAt: (clipId: string, time: number) => string | null;
  splitAtPlayhead: (time: number) => string | null;
  duplicateClip: (clipId: string) => void;
  cutRegion: (a: number, b: number) => boolean;
  liftRegion: (a: number, b: number) => boolean;

  importBuffer: (
    buffer: AudioBuffer,
    name: string,
    trackId?: string,
    start?: number,
    sourceKind?: Clip["sourceKind"],
    detectedBpm?: number,
    detectedKey?: { root: number; mode: KeyMode } | null,
  ) => Promise<string>;
};

const UNDO_KEY = (id: string) => `pulse:undo:${id}`;

function persistHistory(id: string, undo: HistoryFrame[], redo: HistoryFrame[]) {
  try {
    sessionStorage.setItem(
      UNDO_KEY(id),
      JSON.stringify({ undo: undo.slice(-24), redo: redo.slice(-12) }),
    );
  } catch {
    /* quota */
  }
}

function readHistory(id: string): { undo: HistoryFrame[]; redo: HistoryFrame[] } {
  try {
    const raw = sessionStorage.getItem(UNDO_KEY(id));
    if (!raw) return { undo: [], redo: [] };
    const parsed = JSON.parse(raw) as { undo?: HistoryFrame[]; redo?: HistoryFrame[] };
    return { undo: parsed.undo ?? [], redo: parsed.redo ?? [] };
  } catch {
    return { undo: [], redo: [] };
  }
}

function serial(state: StudioState | ProjectData): ProjectData {
  const s = state as ProjectData;
  return {
    id: s.id,
    name: s.name,
    bpm: s.bpm,
    nativeBpm: s.nativeBpm ?? s.bpm ?? 120,
    keyRoot: s.keyRoot ?? null,
    keyMode: s.keyMode ?? null,
    tracks: s.tracks.map((t) => ({ ...t })),
    clips: s.clips.map((c) => ({ ...c })),
    masterGain: s.masterGain,
    loopEnabled: s.loopEnabled,
    loopStart: s.loopStart,
    loopEnd: s.loopEnd,
    zoom: s.zoom,
  };
}

function capture(state: StudioState): HistoryFrame {
  return {
    project: serial(state),
    markA: state.markA,
    markB: state.markB,
    selectedClipId: state.selectedClipId,
    selectedTrackId: state.selectedTrackId,
    lastGap: state.lastGap ? { ...state.lastGap } : null,
  };
}

function applyFrame(frame: HistoryFrame) {
  return {
    ...frame.project,
    markA: frame.markA,
    markB: frame.markB,
    selectedClipId: frame.selectedClipId,
    selectedTrackId: frame.selectedTrackId,
    lastGap: frame.lastGap,
  };
}

function nextColor(count: number): LaneColor {
  return LANE_COLORS[count % LANE_COLORS.length] as LaneColor;
}

function clipAtTime(clips: Clip[], time: number, preferredId: string | null, trackId: string | null): Clip | undefined {
  const inside = (c: Clip) => time >= c.start && time <= c.start + c.duration;
  if (preferredId) {
    const sel = clips.find((c) => c.id === preferredId);
    if (sel && inside(sel)) return sel;
  }
  if (trackId) {
    const onTrack = clips.find((c) => c.trackId === trackId && inside(c));
    if (onTrack) return onTrack;
  }
  return clips.find(inside);
}

function replayMix(state: StudioState) {
  if (!engine.playing) return;
  void engine.play({
    tracks: state.tracks,
    clips: state.clips,
    bpm: state.bpm,
    nativeBpm: state.nativeBpm,
    masterGain: state.masterGain,
    loopEnabled: state.loopEnabled,
    loopStart: state.loopStart,
    loopEnd: state.loopEnd,
  });
}

function makeTrack(index: number, name?: string, color?: LaneColor): Track {
  return {
    id: uid("trk"),
    name: name ?? `Дорожка ${index + 1}`,
    color: color ?? nextColor(index),
    volume: 1,
    pan: 0,
    mute: false,
    solo: false,
    armed: false,
  };
}

function occupiedIds(clips: Clip[]): Set<string> {
  return new Set(clips.map((c) => c.trackId));
}

function withClipDefaults(clip: Clip): Clip {
  return {
    ...clip,
    rate: clip.rate && clip.rate > 0 ? clip.rate : 1,
    nativeBpm: clip.nativeBpm ?? null,
    preservePitch: clip.preservePitch ?? false,
  };
}

export const useStudio = create<StudioState>((set, get) => ({
  ...createEmptyProject(),
  selectedClipId: null,
  selectedTrackId: null,
  busy: null,
  busyHidden: false,
  dragging: false,
  bottomTab: "cut",
  panelOpen: false,
  hydrated: false,
  undoStack: [],
  redoStack: [],
  markA: null,
  markB: null,
  lastGap: null,
  tool: "pointer",
  snap: false,

  load: (data, opts) => {
    const hist = opts?.keepHistory
      ? { undo: get().undoStack, redo: get().redoStack }
      : readHistory(data.id);
    set({
      ...data,
      clips: (data.clips ?? []).map(withClipDefaults),
      nativeBpm: data.nativeBpm ?? data.bpm ?? 120,
      keyRoot: data.keyRoot ?? null,
      keyMode: data.keyMode ?? null,
      selectedClipId: get().id === data.id ? get().selectedClipId : null,
      selectedTrackId: data.tracks[0]?.id ?? null,
      hydrated: true,
      undoStack: hist.undo,
      redoStack: hist.redo,
      markA: get().id === data.id ? get().markA : null,
      markB: get().id === data.id ? get().markB : null,
      lastGap: get().id === data.id ? get().lastGap : null,
      tool: "pointer",
      busy: null,
      busyHidden: false,
      dragging: false,
    });
    get().ensureSpareTracks(SPARE_LANES);
  },

  persist: () => {
    const s = get();
    if (!s.hydrated || s.dragging) return;
    const data = serial(s);
    saveProject(data, projectDuration(data));
    persistHistory(s.id, s.undoStack, s.redoStack);
  },

  snapshot: () => {
    const frame = capture(get());
    set((s) => {
      const undoStack = [...s.undoStack.slice(-80), frame];
      persistHistory(s.id, undoStack, []);
      return { undoStack, redoStack: [] };
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  undo: () => {
    const { undoStack } = get();
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1]!;
    const current = capture(get());
    const nextUndo = undoStack.slice(0, -1);
    const nextRedo = [...get().redoStack, current];
    set({
      ...applyFrame(prev),
      undoStack: nextUndo,
      redoStack: nextRedo,
    });
    persistHistory(get().id, nextUndo, nextRedo);
    replayMix(get());
  },

  redo: () => {
    const { redoStack } = get();
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1]!;
    const current = capture(get());
    const nextRedo = redoStack.slice(0, -1);
    const nextUndo = [...get().undoStack, current];
    set({
      ...applyFrame(next),
      redoStack: nextRedo,
      undoStack: nextUndo,
    });
    persistHistory(get().id, nextUndo, nextRedo);
    replayMix(get());
  },

  setName: (name) => set({ name }),
  setBpm: (bpm, opts) => {
    const next = Math.max(BPM_MIN, Math.min(BPM_MAX, bpm));
    if (opts?.snapshot !== false) {
      const s = get();
      if (Math.round(s.bpm) !== Math.round(next)) get().snapshot();
    }
    set({ bpm: next });
    engine.setTempo(next, get().nativeBpm);
  },
  setNativeBpm: (nativeBpm) => {
    const next = Math.max(BPM_MIN, Math.min(BPM_MAX, nativeBpm));
    set({ nativeBpm: next });
    engine.setTempo(get().bpm, next);
  },
  setClipTempo: (id, bpm, opts) => {
    const clip = get().clips.find((c) => c.id === id);
    if (!clip) return;
    const native = clip.nativeBpm && clip.nativeBpm > 0 ? clip.nativeBpm : get().bpm;
    const patch = applyTempo(clip, bpm, native);
    if (opts?.snapshot !== false) get().snapshot();
    set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    replayMix(get());
  },
  setTrackTempo: (trackId, bpm, opts) => {
    const s = get();
    const targets = s.clips.filter((c) => c.trackId === trackId);
    if (!targets.length) return;
    if (opts?.snapshot !== false) get().snapshot();
    set((st) => ({
      clips: st.clips.map((c) => {
        if (c.trackId !== trackId) return c;
        const native = c.nativeBpm && c.nativeBpm > 0 ? c.nativeBpm : st.bpm;
        return { ...c, ...applyTempo(c, bpm, native) };
      }),
    }));
    replayMix(get());
  },
  setClipRate: (id, rate, duration, opts) => {
    const clip = get().clips.find((c) => c.id === id);
    if (!clip) return;
    const patch =
      duration != null
        ? { rate, duration, preservePitch: false as const }
        : applyRate(clip, rate);
    if (opts?.snapshot !== false) get().snapshot();
    set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    replayMix(get());
  },
  setKey: (root, mode) => set({ keyRoot: root, keyMode: mode }),
  setZoom: (zoom) => set({ zoom: Math.max(16, Math.min(320, zoom)) }),
  setMaster: (v) => {
    const next = Math.max(0, Math.min(2, v));
    set({ masterGain: next });
    engine.setMasterGain(next);
  },
  setLoop: (partial) => set(partial),
  setBusy: (busy) =>
    set((s) => ({
      busy,
      busyHidden: busy ? s.busyHidden : false,
    })),
  hideBusy: () => set({ busyHidden: true }),
  setDragging: (dragging) => set({ dragging }),
  setBottomTab: (bottomTab) => set({ bottomTab, panelOpen: true }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  selectClip: (selectedClipId) => {
    const clip = get().clips.find((c) => c.id === selectedClipId);
    set({
      selectedClipId,
      selectedTrackId: clip?.trackId ?? get().selectedTrackId,
    });
  },
  selectTrack: (selectedTrackId) => set({ selectedTrackId, selectedClipId: null }),
  setTool: (tool) => set({ tool }),
  setSnap: (snap) => set({ snap }),
  setMarkA: (markA) => {
    get().snapshot();
    set({ markA });
  },
  setMarkB: (markB) => {
    get().snapshot();
    set({ markB });
  },
  clearMarks: () => {
    if (get().markA == null && get().markB == null) return;
    get().snapshot();
    set({ markA: null, markB: null });
  },
  clearLastGap: () => set({ lastGap: null }),

  addTrack: (name, color, opts) => {
    if (opts?.snapshot !== false) get().snapshot();
    const i = get().tracks.length;
    const track = makeTrack(i, name, color);
    set((s) => ({ tracks: [...s.tracks, track], selectedTrackId: track.id }));
    return track.id;
  },

  insertTrack: (index, name, color, opts) => {
    if (opts?.snapshot !== false) get().snapshot();
    const track = makeTrack(get().tracks.length, name, color);
    set((s) => {
      const tracks = [...s.tracks];
      const i = Math.max(0, Math.min(tracks.length, index));
      tracks.splice(i, 0, track);
      return { tracks, selectedTrackId: track.id };
    });
    return track.id;
  },

  acquireTrack: (name, color) => {
    const s = get();
    const used = occupiedIds(s.clips);
    const empty = s.tracks.find((t) => !used.has(t.id));
    if (empty) {
      if (name || color) {
        get().updateTrack(empty.id, {
          ...(name ? { name } : {}),
          ...(color ? { color } : {}),
        });
      }
      return empty.id;
    }
    return get().addTrack(name, color, { snapshot: false });
  },

  compactOccupied: () => {
    set((s) => {
      const used = occupiedIds(s.clips);
      if (!used.size) return s;
      const occupied = s.tracks.filter((t) => used.has(t.id));
      const empty = s.tracks.filter((t) => !used.has(t.id));
      const tracks = [...occupied, ...empty];
      const same =
        tracks.length === s.tracks.length && tracks.every((t, i) => t.id === s.tracks[i]?.id);
      if (same) return s;
      return { tracks };
    });
  },

  ensureSpareTracks: (min = SPARE_LANES) => {
    set((s) => {
      const used = occupiedIds(s.clips);
      const emptyCount = s.tracks.filter((t) => !used.has(t.id)).length;
      if (emptyCount >= min) return s;
      const extra: Track[] = [];
      for (let i = emptyCount; i < min; i++) extra.push(makeTrack(s.tracks.length + extra.length));
      return { tracks: [...s.tracks, ...extra] };
    });
  },

  updateTrack: (id, patch) => {
    set((s) => {
      const tracks = s.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t));
      const next = tracks.find((t) => t.id === id);
      if (next) engine.applyTrack(next);
      return { tracks };
    });
  },

  removeTrack: (id, opts) => {
    if (opts?.snapshot !== false) get().snapshot();
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== id),
      clips: s.clips.filter((c) => c.trackId !== id),
      selectedTrackId: s.selectedTrackId === id ? (s.tracks.find((t) => t.id !== id)?.id ?? null) : s.selectedTrackId,
    }));
    get().ensureSpareTracks(SPARE_LANES);
    replayMix(get());
  },

  moveTrack: (id, toIndex, opts) => {
    const from = get().tracks.findIndex((t) => t.id === id);
    if (from < 0) return;
    const clamped = Math.max(0, Math.min(get().tracks.length - 1, toIndex));
    if (from === clamped) return;
    if (opts?.snapshot !== false) get().snapshot();
    set((s) => {
      const tracks = [...s.tracks];
      const idx = tracks.findIndex((t) => t.id === id);
      if (idx < 0) return s;
      const [item] = tracks.splice(idx, 1);
      if (!item) return s;
      tracks.splice(clamped, 0, item);
      return { tracks };
    });
  },

  addClip: (clip) => {
    const id = clip.id ?? uid("clip");
    const full = withClipDefaults({ ...clip, id } as Clip);
    set((s) => ({ clips: [...s.clips, full], selectedClipId: id }));
    return id;
  },

  updateClip: (id, patch) => {
    set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    const clip = get().clips.find((c) => c.id === id);
    if (!clip) return;
    if (patch.gain != null || patch.muted != null) {
      engine.applyClipGain(id, clip.muted ? 0 : clip.gain);
    }
    if (patch.muted != null) engine.applyClipMute(id, clip.muted);
    if (patch.rate != null || patch.duration != null || patch.preservePitch != null) {
      replayMix(get());
    }
  },

  moveClip: (id, patch, opts) => {
    if (opts?.snapshot !== false) {
      /* live drag already snapshotted on arm */
    }
    set((s) => ({
      clips: s.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },

  removeClip: (id, opts) => {
    const clip = get().clips.find((c) => c.id === id);
    if (opts?.snapshot !== false) get().snapshot();
    set((s) => ({
      clips: s.clips.filter((c) => c.id !== id),
      selectedClipId: s.selectedClipId === id ? null : s.selectedClipId,
      lastGap: clip ? { start: clip.start, duration: clip.duration, trackId: clip.trackId } : s.lastGap,
    }));
    get().ensureSpareTracks(SPARE_LANES);
    replayMix(get());
  },

  splitClipAt: (clipId, time) => {
    const clip = get().clips.find((c) => c.id === clipId);
    if (!clip) return null;
    const rel = time - clip.start;
    if (rel < 0.04 || rel > clip.duration - 0.04) return null;
    get().snapshot();
    const r = clipRate(clip);
    const left: Clip = { ...clip, duration: rel, fadeOut: Math.min(clip.fadeOut, rel * 0.4) };
    const right: Clip = {
      ...clip,
      id: uid("clip"),
      start: clip.start + rel,
      offset: clip.offset + rel * r,
      duration: clip.duration - rel,
      fadeIn: Math.min(clip.fadeIn, (clip.duration - rel) * 0.4),
    };
    set((s) => ({
      clips: s.clips.flatMap((c) => (c.id === clipId ? [left, right] : [c])),
      selectedClipId: right.id,
    }));
    replayMix(get());
    return right.id;
  },

  splitAtPlayhead: (time) => {
    const s = get();
    const clip = clipAtTime(s.clips, time, s.selectedClipId, s.selectedTrackId);
    if (!clip) return null;
    return get().splitClipAt(clip.id, time);
  },

  duplicateClip: (clipId) => {
    const clip = get().clips.find((c) => c.id === clipId);
    if (!clip) return;
    get().snapshot();
    const copy: Clip = { ...clip, id: uid("clip"), start: clip.start + clip.duration + 0.05 };
    set((s) => ({ clips: [...s.clips, copy], selectedClipId: copy.id }));
  },

  cutRegion: (a, b) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (hi - lo < 0.03) return false;
    const s = get();
    const target = s.selectedClipId
      ? s.clips.filter((c) => c.id === s.selectedClipId)
      : s.selectedTrackId
        ? s.clips.filter((c) => c.trackId === s.selectedTrackId)
        : s.clips;
    const ids = new Set(target.map((c) => c.id));
    if (!ids.size) return false;
    get().snapshot();
    const { clips, gap } = spliceClips(s.clips, ids, lo, hi, false);
    set({
      clips,
      selectedClipId: null,
      lastGap: gap,
      markA: lo,
      markB: hi,
    });
    replayMix(get());
    return true;
  },

  liftRegion: (a, b) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (hi - lo < 0.03) return false;
    const s = get();
    const target = s.selectedClipId
      ? s.clips.filter((c) => c.id === s.selectedClipId)
      : s.selectedTrackId
        ? s.clips.filter((c) => c.trackId === s.selectedTrackId)
        : s.clips;
    const ids = new Set(target.map((c) => c.id));
    if (!ids.size) return false;
    const { clips, lifted, gap } = spliceClips(s.clips, ids, lo, hi, true);
    if (!lifted.length) return false;
    get().snapshot();
    const origIndex = s.selectedTrackId ? s.tracks.findIndex((t) => t.id === s.selectedTrackId) : s.tracks.length - 1;
    const track = makeTrack(s.tracks.length, lifted[0]?.name ?? "Вырез");
    const placed = lifted.map((c) => ({ ...c, trackId: track.id }));
    const tracks = [...s.tracks];
    tracks.splice(Math.max(0, origIndex + 1), 0, track);
    set({
      tracks,
      clips: [...clips, ...placed],
      selectedClipId: placed[0]?.id ?? null,
      selectedTrackId: track.id,
      lastGap: gap,
      markA: lo,
      markB: hi,
    });
    get().ensureSpareTracks(SPARE_LANES);
    replayMix(get());
    return true;
  },

  importBuffer: async (buffer, name, trackId, start, sourceKind = "audio", detectedBpm, detectedKey) => {
    const bufferId = uid("buf");
    setAudioBuffer(bufferId, buffer);
    void persistBuffer(bufferId, buffer).catch(() => undefined);
    get().snapshot();
    if (!trackId) get().compactOccupied();
    const tid = trackId ?? get().acquireTrack(name);
    const startAt = start ?? 0;
    const clipId = uid("clip");
    const clip: Clip = {
      id: clipId,
      trackId: tid,
      bufferId,
      name,
      start: startAt,
      offset: 0,
      duration: buffer.duration,
      gain: 1,
      reverse: false,
      fadeIn: 0.01,
      fadeOut: 0.04,
      pitch: 0,
      muted: false,
      sourceKind,
      rate: 1,
      nativeBpm: detectedBpm ?? null,
      preservePitch: false,
    };
    const first = get().clips.length === 0;
    const bpmPatch = first && detectedBpm ? { bpm: detectedBpm, nativeBpm: detectedBpm } : {};
    const keyPatch =
      first && detectedKey ? { keyRoot: detectedKey.root, keyMode: detectedKey.mode } : {};
    set((s) => ({
      clips: [...s.clips, clip],
      selectedClipId: clipId,
      selectedTrackId: tid,
      lastGap: null,
      busy: null,
      ...bpmPatch,
      ...keyPatch,
    }));
    if (first && detectedBpm) engine.setTempo(detectedBpm, detectedBpm);
    get().ensureSpareTracks(SPARE_LANES);
    get().persist();
    return clipId;
  },
}));

function spliceClips(
  clips: Clip[],
  ids: Set<string>,
  lo: number,
  hi: number,
  keepMiddle: boolean,
): { clips: Clip[]; lifted: Clip[]; gap: GapHint | null } {
  const next: Clip[] = [];
  const lifted: Clip[] = [];
  let gap: GapHint | null = null;
  for (const clip of clips) {
    if (!ids.has(clip.id)) {
      next.push(clip);
      continue;
    }
    const r = clipRate(clip);
    const clipEnd = clip.start + clip.duration;
    if (clipEnd <= lo + 0.001 || clip.start >= hi - 0.001) {
      next.push(clip);
      continue;
    }
    const leftDur = lo - clip.start;
    const rightDur = clipEnd - hi;
    if (leftDur >= 0.04) {
      next.push({
        ...clip,
        duration: leftDur,
        fadeOut: Math.min(clip.fadeOut, leftDur * 0.4),
      });
    }
    const midStart = Math.max(clip.start, lo);
    const midEnd = Math.min(clipEnd, hi);
    const midDur = midEnd - midStart;
    if (midDur >= 0.03) {
      const mid: Clip = {
        ...clip,
        id: uid("clip"),
        start: midStart,
        offset: clip.offset + (midStart - clip.start) * r,
        duration: midDur,
        fadeIn: 0.005,
        fadeOut: 0.005,
      };
      if (keepMiddle) lifted.push(mid);
      gap = { start: lo, duration: hi - lo, trackId: clip.trackId };
    }
    if (rightDur >= 0.04) {
      next.push({
        ...clip,
        id: uid("clip"),
        start: hi,
        offset: clip.offset + (hi - clip.start) * r,
        duration: rightDur,
        fadeIn: Math.min(clip.fadeIn, rightDur * 0.4),
      });
    }
  }
  return { clips: next, lifted, gap };
}

export function mixSnapshot() {
  const s = useStudio.getState();
  return {
    tracks: s.tracks,
    clips: s.clips,
    bpm: s.bpm,
    nativeBpm: s.nativeBpm,
    masterGain: s.masterGain,
    loopEnabled: s.loopEnabled,
    loopStart: s.loopStart,
    loopEnd: s.loopEnd,
  };
}

export function selectedClip(): Clip | undefined {
  const s = useStudio.getState();
  return s.clips.find((c) => c.id === s.selectedClipId);
}

export { getAudioBuffer, sourceLength };

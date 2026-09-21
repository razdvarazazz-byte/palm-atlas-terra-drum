export const LANE_COLORS = [
  "lane-coral",
  "lane-teal",
  "lane-blue",
  "lane-sage",
  "lane-bronze",
  "lane-slate",
] as const;

export type LaneColor = (typeof LANE_COLORS)[number];

/** Empty lanes kept at the bottom so a clip can be dropped onto a free track. */
export const SPARE_LANES = 5;

/** Track fader goes to +6 dB so a boost is actually audible. */
export const TRACK_VOL_MAX = 2;
/** Master has a little extra headroom without cooking the mix. */
export const MASTER_VOL_MAX = 1.5;

export type KeyMode = "major" | "minor";

export type Track = {
  id: string;
  name: string;
  color: LaneColor;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  armed: boolean;
};

export type Clip = {
  id: string;
  trackId: string;
  bufferId: string;
  name: string;
  start: number;
  offset: number;
  duration: number;
  gain: number;
  reverse: boolean;
  fadeIn: number;
  fadeOut: number;
  pitch: number;
  muted: boolean;
  sourceKind?: "audio" | "video" | "record";
  /** Playback speed. 1 = original. Visual width is `duration`; source used is `duration * rate`. */
  rate: number;
  /** BPM of the audio at rate = 1. */
  nativeBpm: number | null;
  /** When true, speed change keeps pitch (BPM match). Time-scratch turns this off. */
  preservePitch: boolean;
};

export type ProjectMeta = {
  id: string;
  name: string;
  updatedAt: number;
  bpm: number;
  duration: number;
};

export type ProjectData = {
  id: string;
  name: string;
  bpm: number;
  nativeBpm: number;
  keyRoot: number | null;
  keyMode: KeyMode | null;
  tracks: Track[];
  clips: Clip[];
  masterGain: number;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
  zoom: number;
};

export type GapHint = {
  start: number;
  duration: number;
  trackId: string | null;
};

export type StudioTool = "pointer" | "razor" | "speed";

export type HistoryFrame = {
  project: ProjectData;
  markA: number | null;
  markB: number | null;
  selectedClipId: string | null;
  selectedTrackId: string | null;
  lastGap: GapHint | null;
};

export type BusyState = {
  label: string;
  progress: number;
  cancelable?: boolean;
} | null;

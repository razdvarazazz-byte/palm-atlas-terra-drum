import { uid } from "./utils";
import { persistBuffer, setAudioBuffer } from "./audio/buffers";
import { detectBpm } from "./audio/bpm";
import { detectKey } from "./audio/key";
import { createEmptyProject, saveProject } from "./projects";
import type { LaneColor } from "./studio-types";
import { LANE_COLORS, SPARE_LANES } from "./studio-types";

export async function createMixFromBuffer(buffer: AudioBuffer, name: string, sourceKind: "audio" | "video" = "audio") {
  const p = createEmptyProject(name);
  const bufferId = uid("buf");
  setAudioBuffer(bufferId, buffer);
  void persistBuffer(bufferId, buffer).catch(() => undefined);
  const trackId = p.tracks[0]?.id ?? uid("trk");
  p.tracks = [
    {
      id: trackId,
      name,
      color: "lane-coral" as LaneColor,
      volume: 1,
      pan: 0,
      mute: false,
      solo: false,
      armed: false,
    },
    ...Array.from({ length: SPARE_LANES }, (_, i) => ({
      id: uid("trk"),
      name: `Дорожка ${i + 2}`,
      color: LANE_COLORS[(i + 1) % LANE_COLORS.length] as LaneColor,
      volume: 1,
      pan: 0,
      mute: false,
      solo: false,
      armed: false,
    })),
  ];
  p.clips = [
    {
      id: uid("clip"),
      trackId,
      bufferId,
      name,
      start: 0,
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
      nativeBpm: null,
      preservePitch: false,
    },
  ];
  try {
    const bpm = detectBpm(buffer);
    const value = Math.round(bpm.bpm);
    p.bpm = value;
    p.nativeBpm = value;
    p.clips = p.clips.map((c) => ({ ...c, nativeBpm: value }));
    const key = detectKey(buffer);
    p.keyRoot = key.root;
    p.keyMode = key.mode;
  } catch {
    /* keep defaults */
  }
  saveProject(p, buffer.duration);
  return p.id;
}

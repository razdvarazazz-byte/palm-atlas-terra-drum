import { uid } from "./utils";
import { idbDel, idbGet, idbSet, STORE_LIST, STORE_PROJECTS } from "./idb";
import { deleteBuffer } from "./audio/buffers";
import type { Clip, ProjectData, ProjectMeta, Track } from "./studio-types";
import { LANE_COLORS, SPARE_LANES } from "./studio-types";

const LIST_KEY = "pulse:projects";
const projectKey = (id: string) => `pulse:project:${id}`;

function spareTracks(count = SPARE_LANES): Track[] {
  return Array.from({ length: count }, (_, i) => ({
    id: uid("trk"),
    name: `Дорожка ${i + 1}`,
    color: LANE_COLORS[i % LANE_COLORS.length]!,
    volume: 1,
    pan: 0,
    mute: false,
    solo: false,
    armed: false,
  }));
}

export function createEmptyProject(name = "Новый микс"): ProjectData {
  return {
    id: uid("mix"),
    name,
    bpm: 120,
    nativeBpm: 120,
    keyRoot: null,
    keyMode: null,
    tracks: spareTracks(),
    clips: [],
    masterGain: 1,
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 8,
    zoom: 56,
  };
}

function readLocalList(): ProjectMeta[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIST_KEY);
    return raw ? (JSON.parse(raw) as ProjectMeta[]) : [];
  } catch {
    return [];
  }
}

export function listProjects(): ProjectMeta[] {
  return readLocalList();
}

export async function listProjectsAsync(): Promise<ProjectMeta[]> {
  const local = readLocalList();
  try {
    const stored = await idbGet<ProjectMeta[]>(STORE_LIST, "all");
    if (stored && stored.length) {
      const byId = new Map(local.map((p) => [p.id, p]));
      for (const p of stored) {
        const cur = byId.get(p.id);
        if (!cur || p.updatedAt > cur.updatedAt) byId.set(p.id, p);
      }
      const merged = [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
      writeLocalList(merged);
      return merged;
    }
  } catch {
    /* fall through */
  }
  return local;
}

function writeLocalList(list: ProjectMeta[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list.slice(0, 60)));
  } catch {
    /* quota */
  }
}

export function loadProject(id: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(projectKey(id));
    if (!raw) return null;
    return normalizeProject(JSON.parse(raw) as ProjectData);
  } catch {
    return null;
  }
}

export async function loadProjectAsync(id: string): Promise<ProjectData | null> {
  const local = loadProject(id);
  if (local) return local;
  try {
    const rec = await idbGet<ProjectData>(STORE_PROJECTS, id);
    if (rec) {
      const data = normalizeProject(rec);
      try {
        localStorage.setItem(projectKey(id), JSON.stringify(data));
      } catch {
        /* quota */
      }
      return data;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function normalizeClip(c: Clip): Clip {
  return {
    ...c,
    rate: c.rate && c.rate > 0 ? c.rate : 1,
    nativeBpm: c.nativeBpm ?? null,
    preservePitch: c.preservePitch ?? false,
  };
}

function normalizeProject(data: ProjectData): ProjectData {
  return {
    ...data,
    nativeBpm: data.nativeBpm ?? data.bpm ?? 120,
    bpm: data.bpm ?? 120,
    keyRoot: data.keyRoot ?? null,
    keyMode: data.keyMode ?? null,
    masterGain: data.masterGain ?? 1,
    zoom: data.zoom ?? 56,
    tracks: data.tracks ?? [],
    clips: (data.clips ?? []).map(normalizeClip),
  };
}

export function projectDuration(data: ProjectData): number {
  return data.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
}

export function saveProject(data: ProjectData, duration = 0) {
  const normalized = normalizeProject(data);
  const meta: ProjectMeta = {
    id: normalized.id,
    name: normalized.name,
    updatedAt: Date.now(),
    bpm: normalized.bpm,
    duration: duration || projectDuration(normalized),
  };
  try {
    localStorage.setItem(projectKey(normalized.id), JSON.stringify(normalized));
  } catch {
    /* quota — IDB still holds the project */
  }
  const list = listProjects().filter((p) => p.id !== normalized.id);
  list.unshift(meta);
  writeLocalList(list);
  void persistIdb(normalized, list);
}

async function persistIdb(data: ProjectData, list: ProjectMeta[]) {
  try {
    await idbSet(STORE_PROJECTS, data.id, data);
    await idbSet(STORE_LIST, "all", list);
  } catch {
    /* private mode / quota */
  }
}

export function deleteProject(id: string) {
  const data = loadProject(id);
  try {
    localStorage.removeItem(projectKey(id));
  } catch {
    /* ignore */
  }
  writeLocalList(listProjects().filter((p) => p.id !== id));
  try {
    sessionStorage.removeItem(`pulse:undo:${id}`);
  } catch {
    /* ignore */
  }
  void (async () => {
    try {
      const rec = data ?? (await idbGet<ProjectData>(STORE_PROJECTS, id));
      if (rec) {
        const ids = new Set(rec.clips.map((c) => c.bufferId));
        for (const bid of ids) await deleteBuffer(bid);
      }
      await idbDel(STORE_PROJECTS, id);
      await idbSet(STORE_LIST, "all", listProjects());
    } catch {
      /* ignore */
    }
  })();
}

export async function deleteProjectAsync(id: string) {
  deleteProject(id);
}

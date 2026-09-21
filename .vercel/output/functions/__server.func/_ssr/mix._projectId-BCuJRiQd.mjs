import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { A as ChevronDown, C as GripVertical, D as Download, E as Film, O as Circle, S as Mic, T as FlipHorizontal2, _ as Play, a as Upload, b as Music2, c as Timer, d as Sparkles, g as Plus, h as Repeat, i as Volume2, j as AudioLines, k as ChevronUp, l as Square, m as Save, n as WandSparkles, p as Scissors, r as VolumeX, s as Trash2, t as X, u as SquareSplitVertical, v as Pause, w as Gauge } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as Button, c as formatTime, l as uid, n as Route, o as clamp, s as cn, u as yieldToMain } from "./router-CV-Zednt.mjs";
import { C as saveProject, S as reverseBuffer, T as sourceLength, _ as loadProjectAsync, a as applyRate, b as projectDuration, c as clipRate, f as engine, h as getWaveformPeaks, i as RATE_MIN, l as createBufferFromChannels, m as getAudioBuffer, n as MASTER_VOL_MAX, o as applyTempo, p as extractSlice, r as PulseLogo, s as clipBpm, t as LANE_COLORS, u as createEmptyProject, w as setAudioBuffer, x as restoreBuffer, y as persistBuffer } from "./projects-DCNCT3TJ.mjs";
import { a as DialogOverlay$1, i as DialogDescription$1, n as DialogClose, o as DialogPortal$1, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { a as downloadMp3, c as formatKey, f as transposeRoot, i as downloadBlob, l as isMediaFile, n as detectBpm, o as encodeWav, r as detectKey, s as extractAudioFromFile, t as Progress, u as isVideoFile } from "./key-te8TPO_x.mjs";
import { t as UiModeSwitch } from "./ui-mode-switch-DFFKaMIW.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { t as Root } from "../_libs/radix-ui__react-label.mjs";
import { i as SliderTrack, n as SliderRange, r as SliderThumb, t as Slider$1 } from "../_libs/@radix-ui/react-slider+[...].mjs";
import { i as Trigger, n as List, r as Root2, t as Content } from "../_libs/radix-ui__react-tabs.mjs";
import { n as Portal, r as Provider, t as Content2 } from "../_libs/@radix-ui/react-tooltip+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mix._projectId-BCuJRiQd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var UNDO_KEY = (id) => `pulse:undo:${id}`;
function persistHistory(id, undo, redo) {
	try {
		sessionStorage.setItem(UNDO_KEY(id), JSON.stringify({
			undo: undo.slice(-24),
			redo: redo.slice(-12)
		}));
	} catch {}
}
function readHistory(id) {
	try {
		const raw = sessionStorage.getItem(UNDO_KEY(id));
		if (!raw) return {
			undo: [],
			redo: []
		};
		const parsed = JSON.parse(raw);
		return {
			undo: parsed.undo ?? [],
			redo: parsed.redo ?? []
		};
	} catch {
		return {
			undo: [],
			redo: []
		};
	}
}
function serial(state) {
	const s = state;
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
		zoom: s.zoom
	};
}
function capture(state) {
	return {
		project: serial(state),
		markA: state.markA,
		markB: state.markB,
		selectedClipId: state.selectedClipId,
		selectedTrackId: state.selectedTrackId,
		lastGap: state.lastGap ? { ...state.lastGap } : null
	};
}
function applyFrame(frame) {
	return {
		...frame.project,
		markA: frame.markA,
		markB: frame.markB,
		selectedClipId: frame.selectedClipId,
		selectedTrackId: frame.selectedTrackId,
		lastGap: frame.lastGap
	};
}
function nextColor(count) {
	return LANE_COLORS[count % LANE_COLORS.length];
}
function clipAtTime(clips, time, preferredId, trackId) {
	const inside = (c) => time >= c.start && time <= c.start + c.duration;
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
function replayMix(state) {
	if (!engine.playing) return;
	engine.play({
		tracks: state.tracks,
		clips: state.clips,
		bpm: state.bpm,
		nativeBpm: state.nativeBpm,
		masterGain: state.masterGain,
		loopEnabled: state.loopEnabled,
		loopStart: state.loopStart,
		loopEnd: state.loopEnd
	});
}
function makeTrack(index, name, color) {
	return {
		id: uid("trk"),
		name: name ?? `Дорожка ${index + 1}`,
		color: color ?? nextColor(index),
		volume: 1,
		pan: 0,
		mute: false,
		solo: false,
		armed: false
	};
}
function occupiedIds(clips) {
	return new Set(clips.map((c) => c.trackId));
}
function withClipDefaults(clip) {
	return {
		...clip,
		rate: clip.rate && clip.rate > 0 ? clip.rate : 1,
		nativeBpm: clip.nativeBpm ?? null,
		preservePitch: clip.preservePitch ?? false
	};
}
var useStudio = create((set, get) => ({
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
		const hist = opts?.keepHistory ? {
			undo: get().undoStack,
			redo: get().redoStack
		} : readHistory(data.id);
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
			dragging: false
		});
		get().ensureSpareTracks(5);
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
			return {
				undoStack,
				redoStack: []
			};
		});
	},
	canUndo: () => get().undoStack.length > 0,
	canRedo: () => get().redoStack.length > 0,
	undo: () => {
		const { undoStack } = get();
		if (!undoStack.length) return;
		const prev = undoStack[undoStack.length - 1];
		const current = capture(get());
		const nextUndo = undoStack.slice(0, -1);
		const nextRedo = [...get().redoStack, current];
		set({
			...applyFrame(prev),
			undoStack: nextUndo,
			redoStack: nextRedo
		});
		persistHistory(get().id, nextUndo, nextRedo);
		replayMix(get());
	},
	redo: () => {
		const { redoStack } = get();
		if (!redoStack.length) return;
		const next = redoStack[redoStack.length - 1];
		const current = capture(get());
		const nextRedo = redoStack.slice(0, -1);
		const nextUndo = [...get().undoStack, current];
		set({
			...applyFrame(next),
			redoStack: nextRedo,
			undoStack: nextUndo
		});
		persistHistory(get().id, nextUndo, nextRedo);
		replayMix(get());
	},
	setName: (name) => set({ name }),
	setBpm: (bpm, opts) => {
		const next = Math.max(20, Math.min(400, bpm));
		if (opts?.snapshot !== false) {
			const s = get();
			if (Math.round(s.bpm) !== Math.round(next)) get().snapshot();
		}
		set({ bpm: next });
		engine.setTempo(next, get().nativeBpm);
	},
	setNativeBpm: (nativeBpm) => {
		const next = Math.max(20, Math.min(400, nativeBpm));
		set({ nativeBpm: next });
		engine.setTempo(get().bpm, next);
	},
	setClipTempo: (id, bpm, opts) => {
		const clip = get().clips.find((c) => c.id === id);
		if (!clip) return;
		const native = clip.nativeBpm && clip.nativeBpm > 0 ? clip.nativeBpm : get().bpm;
		const patch = applyTempo(clip, bpm, native);
		if (opts?.snapshot !== false) get().snapshot();
		set((s) => ({ clips: s.clips.map((c) => c.id === id ? {
			...c,
			...patch
		} : c) }));
		replayMix(get());
	},
	setTrackTempo: (trackId, bpm, opts) => {
		if (!get().clips.filter((c) => c.trackId === trackId).length) return;
		if (opts?.snapshot !== false) get().snapshot();
		set((st) => ({ clips: st.clips.map((c) => {
			if (c.trackId !== trackId) return c;
			const native = c.nativeBpm && c.nativeBpm > 0 ? c.nativeBpm : st.bpm;
			return {
				...c,
				...applyTempo(c, bpm, native)
			};
		}) }));
		replayMix(get());
	},
	setClipRate: (id, rate, duration, opts) => {
		const clip = get().clips.find((c) => c.id === id);
		if (!clip) return;
		const patch = duration != null ? {
			rate,
			duration,
			preservePitch: false
		} : applyRate(clip, rate);
		if (opts?.snapshot !== false) get().snapshot();
		set((s) => ({ clips: s.clips.map((c) => c.id === id ? {
			...c,
			...patch
		} : c) }));
		replayMix(get());
	},
	setKey: (root, mode) => set({
		keyRoot: root,
		keyMode: mode
	}),
	setZoom: (zoom) => set({ zoom: Math.max(16, Math.min(320, zoom)) }),
	setMaster: (v) => {
		const next = Math.max(0, Math.min(2, v));
		set({ masterGain: next });
		engine.setMasterGain(next);
	},
	setLoop: (partial) => set(partial),
	setBusy: (busy) => set((s) => ({
		busy,
		busyHidden: busy ? s.busyHidden : false
	})),
	hideBusy: () => set({ busyHidden: true }),
	setDragging: (dragging) => set({ dragging }),
	setBottomTab: (bottomTab) => set({
		bottomTab,
		panelOpen: true
	}),
	setPanelOpen: (panelOpen) => set({ panelOpen }),
	selectClip: (selectedClipId) => {
		set({
			selectedClipId,
			selectedTrackId: get().clips.find((c) => c.id === selectedClipId)?.trackId ?? get().selectedTrackId
		});
	},
	selectTrack: (selectedTrackId) => set({
		selectedTrackId,
		selectedClipId: null
	}),
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
		set({
			markA: null,
			markB: null
		});
	},
	clearLastGap: () => set({ lastGap: null }),
	addTrack: (name, color, opts) => {
		if (opts?.snapshot !== false) get().snapshot();
		const i = get().tracks.length;
		const track = makeTrack(i, name, color);
		set((s) => ({
			tracks: [...s.tracks, track],
			selectedTrackId: track.id
		}));
		return track.id;
	},
	insertTrack: (index, name, color, opts) => {
		if (opts?.snapshot !== false) get().snapshot();
		const track = makeTrack(get().tracks.length, name, color);
		set((s) => {
			const tracks = [...s.tracks];
			const i = Math.max(0, Math.min(tracks.length, index));
			tracks.splice(i, 0, track);
			return {
				tracks,
				selectedTrackId: track.id
			};
		});
		return track.id;
	},
	acquireTrack: (name, color) => {
		const s = get();
		const used = occupiedIds(s.clips);
		const empty = s.tracks.find((t) => !used.has(t.id));
		if (empty) {
			if (name || color) get().updateTrack(empty.id, {
				...name ? { name } : {},
				...color ? { color } : {}
			});
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
			if (tracks.length === s.tracks.length && tracks.every((t, i) => t.id === s.tracks[i]?.id)) return s;
			return { tracks };
		});
	},
	ensureSpareTracks: (min = 5) => {
		set((s) => {
			const used = occupiedIds(s.clips);
			const emptyCount = s.tracks.filter((t) => !used.has(t.id)).length;
			if (emptyCount >= min) return s;
			const extra = [];
			for (let i = emptyCount; i < min; i++) extra.push(makeTrack(s.tracks.length + extra.length));
			return { tracks: [...s.tracks, ...extra] };
		});
	},
	updateTrack: (id, patch) => {
		set((s) => {
			const tracks = s.tracks.map((t) => t.id === id ? {
				...t,
				...patch
			} : t);
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
			selectedTrackId: s.selectedTrackId === id ? s.tracks.find((t) => t.id !== id)?.id ?? null : s.selectedTrackId
		}));
		get().ensureSpareTracks(5);
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
		const full = withClipDefaults({
			...clip,
			id
		});
		set((s) => ({
			clips: [...s.clips, full],
			selectedClipId: id
		}));
		return id;
	},
	updateClip: (id, patch) => {
		set((s) => ({ clips: s.clips.map((c) => c.id === id ? {
			...c,
			...patch
		} : c) }));
		const clip = get().clips.find((c) => c.id === id);
		if (!clip) return;
		if (patch.gain != null || patch.muted != null) engine.applyClipGain(id, clip.muted ? 0 : clip.gain);
		if (patch.muted != null) engine.applyClipMute(id, clip.muted);
		if (patch.rate != null || patch.duration != null || patch.preservePitch != null) replayMix(get());
	},
	moveClip: (id, patch, opts) => {
		if (opts?.snapshot !== false) {}
		set((s) => ({ clips: s.clips.map((c) => c.id === id ? {
			...c,
			...patch
		} : c) }));
	},
	removeClip: (id, opts) => {
		const clip = get().clips.find((c) => c.id === id);
		if (opts?.snapshot !== false) get().snapshot();
		set((s) => ({
			clips: s.clips.filter((c) => c.id !== id),
			selectedClipId: s.selectedClipId === id ? null : s.selectedClipId,
			lastGap: clip ? {
				start: clip.start,
				duration: clip.duration,
				trackId: clip.trackId
			} : s.lastGap
		}));
		get().ensureSpareTracks(5);
		replayMix(get());
	},
	splitClipAt: (clipId, time) => {
		const clip = get().clips.find((c) => c.id === clipId);
		if (!clip) return null;
		const rel = time - clip.start;
		if (rel < .04 || rel > clip.duration - .04) return null;
		get().snapshot();
		const r = clipRate(clip);
		const left = {
			...clip,
			duration: rel,
			fadeOut: Math.min(clip.fadeOut, rel * .4)
		};
		const right = {
			...clip,
			id: uid("clip"),
			start: clip.start + rel,
			offset: clip.offset + rel * r,
			duration: clip.duration - rel,
			fadeIn: Math.min(clip.fadeIn, (clip.duration - rel) * .4)
		};
		set((s) => ({
			clips: s.clips.flatMap((c) => c.id === clipId ? [left, right] : [c]),
			selectedClipId: right.id
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
		const copy = {
			...clip,
			id: uid("clip"),
			start: clip.start + clip.duration + .05
		};
		set((s) => ({
			clips: [...s.clips, copy],
			selectedClipId: copy.id
		}));
	},
	cutRegion: (a, b) => {
		const lo = Math.min(a, b);
		const hi = Math.max(a, b);
		if (hi - lo < .03) return false;
		const s = get();
		const target = s.selectedClipId ? s.clips.filter((c) => c.id === s.selectedClipId) : s.selectedTrackId ? s.clips.filter((c) => c.trackId === s.selectedTrackId) : s.clips;
		const ids = new Set(target.map((c) => c.id));
		if (!ids.size) return false;
		get().snapshot();
		const { clips, gap } = spliceClips(s.clips, ids, lo, hi, false);
		set({
			clips,
			selectedClipId: null,
			lastGap: gap,
			markA: lo,
			markB: hi
		});
		replayMix(get());
		return true;
	},
	liftRegion: (a, b) => {
		const lo = Math.min(a, b);
		const hi = Math.max(a, b);
		if (hi - lo < .03) return false;
		const s = get();
		const target = s.selectedClipId ? s.clips.filter((c) => c.id === s.selectedClipId) : s.selectedTrackId ? s.clips.filter((c) => c.trackId === s.selectedTrackId) : s.clips;
		const ids = new Set(target.map((c) => c.id));
		if (!ids.size) return false;
		const { clips, lifted, gap } = spliceClips(s.clips, ids, lo, hi, true);
		if (!lifted.length) return false;
		get().snapshot();
		const origIndex = s.selectedTrackId ? s.tracks.findIndex((t) => t.id === s.selectedTrackId) : s.tracks.length - 1;
		const track = makeTrack(s.tracks.length, lifted[0]?.name ?? "Вырез");
		const placed = lifted.map((c) => ({
			...c,
			trackId: track.id
		}));
		const tracks = [...s.tracks];
		tracks.splice(Math.max(0, origIndex + 1), 0, track);
		set({
			tracks,
			clips: [...clips, ...placed],
			selectedClipId: placed[0]?.id ?? null,
			selectedTrackId: track.id,
			lastGap: gap,
			markA: lo,
			markB: hi
		});
		get().ensureSpareTracks(5);
		replayMix(get());
		return true;
	},
	importBuffer: async (buffer, name, trackId, start, sourceKind = "audio", detectedBpm, detectedKey) => {
		const bufferId = uid("buf");
		setAudioBuffer(bufferId, buffer);
		persistBuffer(bufferId, buffer).catch(() => void 0);
		get().snapshot();
		if (!trackId) get().compactOccupied();
		const tid = trackId ?? get().acquireTrack(name);
		const startAt = start ?? 0;
		const clipId = uid("clip");
		const clip = {
			id: clipId,
			trackId: tid,
			bufferId,
			name,
			start: startAt,
			offset: 0,
			duration: buffer.duration,
			gain: 1,
			reverse: false,
			fadeIn: .01,
			fadeOut: .04,
			pitch: 0,
			muted: false,
			sourceKind,
			rate: 1,
			nativeBpm: detectedBpm ?? null,
			preservePitch: false
		};
		const first = get().clips.length === 0;
		const bpmPatch = first && detectedBpm ? {
			bpm: detectedBpm,
			nativeBpm: detectedBpm
		} : {};
		const keyPatch = first && detectedKey ? {
			keyRoot: detectedKey.root,
			keyMode: detectedKey.mode
		} : {};
		set((s) => ({
			clips: [...s.clips, clip],
			selectedClipId: clipId,
			selectedTrackId: tid,
			lastGap: null,
			busy: null,
			...bpmPatch,
			...keyPatch
		}));
		if (first && detectedBpm) engine.setTempo(detectedBpm, detectedBpm);
		get().ensureSpareTracks(5);
		get().persist();
		return clipId;
	}
}));
function spliceClips(clips, ids, lo, hi, keepMiddle) {
	const next = [];
	const lifted = [];
	let gap = null;
	for (const clip of clips) {
		if (!ids.has(clip.id)) {
			next.push(clip);
			continue;
		}
		const r = clipRate(clip);
		const clipEnd = clip.start + clip.duration;
		if (clipEnd <= lo + .001 || clip.start >= hi - .001) {
			next.push(clip);
			continue;
		}
		const leftDur = lo - clip.start;
		const rightDur = clipEnd - hi;
		if (leftDur >= .04) next.push({
			...clip,
			duration: leftDur,
			fadeOut: Math.min(clip.fadeOut, leftDur * .4)
		});
		const midStart = Math.max(clip.start, lo);
		const midDur = Math.min(clipEnd, hi) - midStart;
		if (midDur >= .03) {
			const mid = {
				...clip,
				id: uid("clip"),
				start: midStart,
				offset: clip.offset + (midStart - clip.start) * r,
				duration: midDur,
				fadeIn: .005,
				fadeOut: .005
			};
			if (keepMiddle) lifted.push(mid);
			gap = {
				start: lo,
				duration: hi - lo,
				trackId: clip.trackId
			};
		}
		if (rightDur >= .04) next.push({
			...clip,
			id: uid("clip"),
			start: hi,
			offset: clip.offset + (hi - clip.start) * r,
			duration: rightDur,
			fadeIn: Math.min(clip.fadeIn, rightDur * .4)
		});
	}
	return {
		clips: next,
		lifted,
		gap
	};
}
function mixSnapshot() {
	const s = useStudio.getState();
	return {
		tracks: s.tracks,
		clips: s.clips,
		bpm: s.bpm,
		nativeBpm: s.nativeBpm,
		masterGain: s.masterGain,
		loopEnabled: s.loopEnabled,
		loopStart: s.loopStart,
		loopEnd: s.loopEnd
	};
}
/** In-place radix-2 Cooley–Tukey FFT. Length must be a power of two. */
function fft(real, imag, inverse = false) {
	const n = real.length;
	if (n !== imag.length || n < 2 || (n & n - 1) !== 0) throw new Error("FFT length must be a power of two");
	let j = 0;
	for (let i = 0; i < n; i++) {
		if (i < j) {
			const tr = real[i];
			const ti = imag[i];
			real[i] = real[j];
			imag[i] = imag[j];
			real[j] = tr;
			imag[j] = ti;
		}
		let m = n >> 1;
		while (m >= 1 && j >= m) {
			j -= m;
			m >>= 1;
		}
		j += m;
	}
	for (let size = 2; size <= n; size <<= 1) {
		const half = size >> 1;
		const theta = (inverse ? 2 : -2) * Math.PI / size;
		const wrStep = Math.cos(theta);
		const wiStep = Math.sin(theta);
		for (let i = 0; i < n; i += size) {
			let wr = 1;
			let wi = 0;
			for (let k = 0; k < half; k++) {
				const even = i + k;
				const odd = even + half;
				const br = real[odd];
				const bi = imag[odd];
				const tr = wr * br - wi * bi;
				const ti = wr * bi + wi * br;
				const ar = real[even];
				const ai = imag[even];
				real[even] = ar + tr;
				imag[even] = ai + ti;
				real[odd] = ar - tr;
				imag[odd] = ai - ti;
				const nwr = wr * wrStep - wi * wiStep;
				wi = wr * wiStep + wi * wrStep;
				wr = nwr;
			}
		}
	}
	if (inverse) {
		const inv = 1 / n;
		for (let i = 0; i < n; i++) {
			real[i] *= inv;
			imag[i] *= inv;
		}
	}
}
function hann(n) {
	const w = new Float32Array(n);
	if (n < 2) return w;
	for (let i = 0; i < n; i++) w[i] = .5 * (1 - Math.cos(2 * Math.PI * i / (n - 1)));
	return w;
}
var NFFT = 2048;
function scaleGain(buffer, ctx, gain) {
	const channels = [];
	for (let c = 0; c < buffer.numberOfChannels; c++) {
		const src = buffer.getChannelData(c);
		const data = new Float32Array(src.length);
		for (let i = 0; i < src.length; i++) data[i] = src[i] * gain;
		channels.push(data);
	}
	return createBufferFromChannels(ctx, channels, buffer.sampleRate);
}
function resampleChannel(input, ratio) {
	if (Math.abs(ratio - 1) < 1e-6) return new Float32Array(input);
	const outLen = Math.max(1, Math.floor(input.length / ratio));
	const out = new Float32Array(outLen);
	for (let i = 0; i < outLen; i++) {
		const x = i * ratio;
		const i0 = Math.floor(x);
		const frac = x - i0;
		const a = input[i0] ?? 0;
		const b = input[i0 + 1] ?? a;
		out[i] = a + (b - a) * frac;
	}
	return out;
}
/** Overlap-add time stretch. rate>1 makes the buffer longer (slower). */
function olaStretch(input, rate, sr) {
	if (Math.abs(rate - 1) < .01) return new Float32Array(input);
	const grain = Math.max(64, Math.round(.04 * sr));
	const analysisHop = Math.max(16, Math.round(grain / 2));
	const synthesisHop = Math.max(8, Math.round(analysisHop * rate));
	const outLen = Math.max(grain, Math.floor(input.length * rate) + grain);
	const out = new Float32Array(outLen);
	const win = hann(grain);
	let read = 0;
	let write = 0;
	while (read + grain < input.length && write + grain < outLen) {
		for (let i = 0; i < grain; i++) out[write + i] += input[read + i] * win[i];
		read += analysisHop;
		write += synthesisHop;
	}
	const norm = grain / (2 * synthesisHop);
	if (norm > .01) {
		const g = 1 / Math.max(norm, .5);
		for (let i = 0; i < out.length; i++) out[i] *= g;
	}
	return out.subarray(0, Math.max(1, Math.floor(input.length * rate)));
}
async function pitchShiftBuffer(buffer, ctx, semitones, onProgress) {
	const ratio = 2 ** (semitones / 12);
	const channels = [];
	for (let c = 0; c < buffer.numberOfChannels; c++) {
		if (onProgress) onProgress(c / buffer.numberOfChannels);
		await yieldToMain();
		const src = buffer.getChannelData(c);
		const stretched = olaStretch(resampleChannel(src, ratio), ratio, buffer.sampleRate);
		const matched = new Float32Array(src.length);
		const copyN = Math.min(matched.length, stretched.length);
		matched.set(stretched.subarray(0, copyN));
		channels.push(matched);
	}
	onProgress?.(1);
	return createBufferFromChannels(ctx, channels, buffer.sampleRate);
}
async function stftChannel(data, onProgress, start = 0, end = 1, hop = 512) {
	const n = data.length;
	const nFrames = Math.max(1, Math.floor((n - NFFT) / hop) + 1);
	const bins = 1025;
	const mag = new Array(nFrames);
	const phase = new Array(nFrames);
	const win = hann(NFFT);
	const re = new Float32Array(NFFT);
	const im = new Float32Array(NFFT);
	for (let f = 0; f < nFrames; f++) {
		const off = f * hop;
		re.fill(0);
		im.fill(0);
		for (let i = 0; i < NFFT; i++) re[i] = (data[off + i] ?? 0) * win[i];
		fft(re, im, false);
		const m = new Float32Array(bins);
		const p = new Float32Array(bins);
		for (let k = 0; k < bins; k++) {
			const r = re[k];
			const ii = im[k];
			m[k] = Math.hypot(r, ii);
			p[k] = Math.atan2(ii, r);
		}
		mag[f] = m;
		phase[f] = p;
		if (f % 24 === 0) {
			onProgress?.(start + (f + 1) / nFrames * (end - start));
			await yieldToMain();
		}
	}
	return {
		mag,
		phase,
		nFrames,
		bins,
		hop
	};
}
async function istftChannel(spec, length, onProgress, start = 0, end = 1) {
	const out = new Float32Array(length);
	const win = hann(NFFT);
	const re = new Float32Array(NFFT);
	const im = new Float32Array(NFFT);
	const { nFrames, bins } = spec;
	const hop = spec.hop || 512;
	for (let f = 0; f < nFrames; f++) {
		const m = spec.mag[f];
		const p = spec.phase[f];
		re.fill(0);
		im.fill(0);
		for (let k = 0; k < bins; k++) {
			re[k] = m[k] * Math.cos(p[k]);
			im[k] = m[k] * Math.sin(p[k]);
			if (k > 0 && k < bins - 1) {
				re[NFFT - k] = re[k];
				im[NFFT - k] = -im[k];
			}
		}
		fft(re, im, true);
		const off = f * hop;
		for (let i = 0; i < NFFT; i++) {
			const idx = off + i;
			if (idx < length) out[idx] += re[i] * win[i];
		}
		if (f % 24 === 0) {
			onProgress?.(start + (f + 1) / nFrames * (end - start));
			await yieldToMain();
		}
	}
	const g = 1 / (hop <= 513 ? 1.5 : 1);
	for (let i = 0; i < out.length; i++) out[i] *= g;
	return out;
}
function hzToBin(hz, sr) {
	return Math.max(0, Math.min(NFFT / 2, Math.round(hz / sr * NFFT)));
}
async function denoiseBuffer(buffer, ctx, amount = .7, onProgress) {
	const channels = [];
	for (let c = 0; c < buffer.numberOfChannels; c++) {
		const data = buffer.getChannelData(c);
		const spec = await stftChannel(data, onProgress, c / buffer.numberOfChannels, (c + .55) / buffer.numberOfChannels);
		const { nFrames, bins } = spec;
		const noise = new Float32Array(bins);
		const frameEnergy = spec.mag.map((m, i) => {
			let e = 0;
			for (let k = 0; k < bins; k++) e += m[k];
			return {
				i,
				e
			};
		});
		frameEnergy.sort((a, b) => a.e - b.e);
		const quietN = Math.max(4, Math.floor(nFrames * .12));
		for (let q = 0; q < quietN; q++) {
			const m = spec.mag[frameEnergy[q].i];
			for (let k = 0; k < bins; k++) noise[k] += m[k];
		}
		for (let k = 0; k < bins; k++) noise[k] /= quietN;
		const over = 1 + amount * 2.2;
		const floor = .05 + (1 - amount) * .15;
		for (let f = 0; f < nFrames; f++) {
			const m = spec.mag[f];
			for (let k = 0; k < bins; k++) {
				const sub = Math.max(m[k] - noise[k] * over, m[k] * floor);
				m[k] = sub;
			}
		}
		channels.push(await istftChannel(spec, data.length, onProgress, (c + .55) / buffer.numberOfChannels, (c + 1) / buffer.numberOfChannels));
	}
	onProgress?.(1);
	return createBufferFromChannels(ctx, channels, buffer.sampleRate);
}
async function enhanceBuffer(buffer, ctx, onProgress) {
	const sr = buffer.sampleRate;
	const channels = [];
	for (let c = 0; c < buffer.numberOfChannels; c++) {
		const data = buffer.getChannelData(c);
		const spec = await stftChannel(data, onProgress, c / buffer.numberOfChannels, (c + .55) / buffer.numberOfChannels);
		const { nFrames, bins } = spec;
		const mud = hzToBin(280, sr);
		const presence = hzToBin(3500, sr);
		const air = hzToBin(9e3, sr);
		for (let f = 0; f < nFrames; f++) {
			const m = spec.mag[f];
			for (let k = 0; k < bins; k++) {
				let g = 1;
				if (k < mud) g *= .82;
				if (k > presence && k < air) g *= 1.28;
				if (k >= air) g *= 1.45;
				m[k] *= g;
			}
		}
		const out = await istftChannel(spec, data.length, onProgress, (c + .55) / buffer.numberOfChannels, (c + 1) / buffer.numberOfChannels);
		for (let i = 0; i < out.length; i++) {
			const x = out[i] * 1.12;
			out[i] = Math.tanh(x * 1.15) * .92;
		}
		channels.push(out);
	}
	onProgress?.(1);
	return createBufferFromChannels(ctx, channels, buffer.sampleRate);
}
var SplitCancelled = class extends Error {
	constructor() {
		super("cancelled");
		this.name = "SplitCancelled";
	}
};
var CHUNK_SEC = 8;
var OVERLAP_SEC = .2;
/**
* Browser stem splitter.
*
* Vocals: center energy × harmonic mask in the speech band, Wiener-refined so
* words leave the minus. Four stems then split the residual with HPSS:
* drums = percussive, bass = low harmonic, other = leftover.
*/
async function splitStems(buffer, ctx, mode, onProgress, signal) {
	const sr = buffer.sampleRate;
	const duration = buffer.duration;
	const hop = 7.8;
	const nChunks = Math.max(1, Math.ceil(Math.max(0, duration - OVERLAP_SEC) / hop));
	const acc = {};
	const outN = buffer.length;
	const overlapN = Math.max(32, Math.floor(OVERLAP_SEC * sr));
	let t = 0;
	let chunkIndex = 0;
	while (t < duration - .01) {
		if (signal?.aborted) throw new SplitCancelled();
		const sliceDur = Math.min(CHUNK_SEC, duration - t);
		const slice = extractSlice(buffer, ctx, t, sliceDur);
		const p0 = chunkIndex / nChunks;
		const p1 = (chunkIndex + 1) / nChunks;
		const stems = await splitChunk(slice, ctx, mode, (p) => onProgress?.(p0 + p * (p1 - p0) * .98), signal);
		const startSample = Math.floor(t * sr);
		for (const stem of stems) {
			let slot = acc[stem.role];
			if (!slot) {
				slot = {
					L: new Float32Array(outN),
					R: new Float32Array(outN),
					name: stem.name,
					role: stem.role
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
					const a = Math.cos(w * Math.PI / 2);
					const b = Math.sin(w * Math.PI / 2);
					const idx = startSample + i;
					slot.L[idx] = slot.L[idx] * a * a + sL[i] * b * b;
					slot.R[idx] = slot.R[idx] * a * a + sR[i] * b * b;
				}
				if (n > ov) {
					slot.L.set(sL.subarray(ov, n), startSample + ov);
					slot.R.set(sR.subarray(ov, n), startSample + ov);
				}
			}
		}
		if (t + sliceDur >= duration - .01) break;
		t += hop;
		chunkIndex++;
		await yieldToMain();
	}
	onProgress?.(1);
	return (mode === "vocals-instrumental" ? ["vocals", "instrumental"] : [
		"vocals",
		"drums",
		"bass",
		"other"
	]).map((role) => acc[role]).filter(Boolean).map((slot) => ({
		name: slot.name,
		role: slot.role,
		buffer: createBufferFromChannels(ctx, [slot.L, slot.R], sr)
	}));
}
async function splitChunk(buffer, ctx, mode, onProgress, signal) {
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
		const l = left[i];
		const r = right[i];
		const m = .5 * (l + r);
		const s = .5 * (l - r);
		mid[i] = m;
		side[i] = s;
		const denom = Math.abs(l) + Math.abs(r) + 1e-8;
		const sim = 1 - Math.abs(l - r) / denom;
		center[i] = m * sim * sim;
		midEnergy += m * m;
		sideEnergy += s * s;
	}
	const isStereo = Math.sqrt(sideEnergy / (midEnergy + 1e-9)) > .035 && buffer.numberOfChannels > 1;
	onProgress?.(.06);
	const midSpec = await stftChannel(mid, onProgress, .06, .28);
	if (signal?.aborted) throw new SplitCancelled();
	const centerSpec = await stftChannel(center, onProgress, .28, .46);
	if (signal?.aborted) throw new SplitCancelled();
	const { nFrames, bins } = midSpec;
	const vocalW = new Float32Array(bins);
	const speechW = new Float32Array(bins);
	const bassW = new Float32Array(bins);
	const subW = new Float32Array(bins);
	const airW = new Float32Array(bins);
	for (let k = 0; k < bins; k++) {
		const hz = k * sr / NFFT;
		vocalW[k] = bandWeight(hz, 110, 180, 4800, 8200);
		speechW[k] = bandWeight(hz, 200, 280, 3200, 4600);
		bassW[k] = hz < 160 ? 1 : hz < 250 ? 1 - (hz - 160) / 90 : 0;
		subW[k] = hz < 80 ? 1 : hz < 120 ? 1 - (hz - 80) / 40 : 0;
		airW[k] = hz > 1e4 ? 1 : hz > 8200 ? (hz - 8200) / 1800 : 0;
	}
	const { harmonic, percussive } = hpss(midSpec.mag);
	onProgress?.(.52);
	await yieldToMain();
	const vocalMask = new Array(nFrames);
	const instMask = new Array(nFrames);
	for (let f = 0; f < nFrames; f++) {
		const magM = midSpec.mag[f];
		const magC = centerSpec.mag[f];
		const p = percussive[f];
		const h = harmonic[f];
		const v = new Float32Array(bins);
		const ins = new Float32Array(bins);
		for (let k = 0; k < bins; k++) {
			const m = magM[k] + 1e-9;
			const c = magC[k];
			const ratio = Math.min(1, c / m);
			const harm = h[k] / (h[k] + p[k] + 1e-9);
			const perc = p[k] / (h[k] + p[k] + 1e-9);
			const vw = vocalW[k];
			const sw = speechW[k];
			let vocal;
			if (isStereo) {
				vocal = ratio * vw * (.35 + .65 * harm) * (1 - .78 * perc);
				vocal *= .75 + .7 * sw;
				vocal *= 1 - .92 * subW[k];
			} else {
				const floor = Math.max(m * .32, 1e-6);
				vocal = Math.max(0, 1 - floor / m) * vw * (.45 + .55 * harm) * (1 - .45 * perc);
			}
			vocal = Math.min(1, Math.max(0, vocal));
			const cut = Math.min(.99, vocal * (1.2 + .5 * sw));
			let inst = 1 - cut;
			inst = inst * (1 - bassW[k]) + 1 * bassW[k];
			inst = Math.max(inst, airW[k] * .88);
			inst = Math.max(inst, perc * .72);
			v[k] = cut;
			ins[k] = Math.min(1, Math.max(.015, inst));
		}
		vocalMask[f] = v;
		instMask[f] = ins;
	}
	smoothMasks(vocalMask, instMask);
	wienerRefine(vocalMask, instMask);
	onProgress?.(.58);
	await yieldToMain();
	for (let f = 0; f < nFrames; f++) {
		const magM = midSpec.mag[f];
		const magC = centerSpec.mag[f];
		const v = vocalMask[f];
		const ins = instMask[f];
		for (let k = 0; k < bins; k++) {
			const remain = magM[k] * ins[k];
			const extra = Math.min(1, magC[k] * speechW[k] / (remain + 1e-9)) * speechW[k] * .9 * (1 - bassW[k]);
			v[k] = Math.min(1, v[k] + extra * .92);
			ins[k] = Math.max(.012, ins[k] * (1 - extra));
		}
	}
	const vocalsMono = await reconstructMasked(midSpec, vocalMask, n, onProgress, .6, .76);
	if (signal?.aborted) throw new SplitCancelled();
	const instMono = await reconstructMasked(midSpec, instMask, n, onProgress, .76, .88);
	if (signal?.aborted) throw new SplitCancelled();
	const vocL = new Float32Array(n);
	const vocR = new Float32Array(n);
	const instL = new Float32Array(n);
	const instR = new Float32Array(n);
	const sideKeep = isStereo ? 1 : .12;
	for (let i = 0; i < n; i++) {
		const v = vocalsMono[i];
		const ins = instMono[i];
		const s = side[i];
		vocL[i] = v + s * .05;
		vocR[i] = v - s * .05;
		instL[i] = ins + s * sideKeep;
		instR[i] = ins - s * sideKeep;
	}
	const vocals = createBufferFromChannels(ctx, [vocL, vocR], sr);
	const instrumental = createBufferFromChannels(ctx, [instL, instR], sr);
	if (mode === "vocals-instrumental") {
		onProgress?.(1);
		return [{
			name: "Акапелла",
			role: "vocals",
			buffer: vocals
		}, {
			name: "Минус",
			role: "instrumental",
			buffer: instrumental
		}];
	}
	const frames = nFrames;
	const binsN = bins;
	const bassHi = hzToBin(230, sr);
	const kickHi = hzToBin(90, sr);
	const drumMask = new Array(frames);
	const bassMask = new Array(frames);
	const otherMask = new Array(frames);
	for (let f = 0; f < frames; f++) {
		const d = new Float32Array(binsN);
		const b = new Float32Array(binsN);
		const o = new Float32Array(binsN);
		const p = percussive[f];
		const h = harmonic[f];
		const inst = instMask[f];
		for (let k = 0; k < binsN; k++) {
			const harm = h[k] / (h[k] + p[k] + 1e-9);
			const perc = p[k] / (h[k] + p[k] + 1e-9);
			let drums = perc * inst[k];
			if (k <= kickHi) drums = Math.max(drums, perc * .85);
			let bass = k <= bassHi ? harm * (1 - perc * .65) * inst[k] * .98 : 0;
			if (k <= kickHi) bass *= .45;
			let other = Math.max(0, inst[k] - drums - bass);
			other = Math.max(other, (1 - perc) * inst[k] * (k > bassHi ? 1 : .15));
			const sum = drums + bass + other + 1e-9;
			d[k] = drums / sum;
			b[k] = bass / sum;
			o[k] = other / sum;
		}
		drumMask[f] = d;
		bassMask[f] = b;
		otherMask[f] = o;
	}
	onProgress?.(.9);
	const drumsMono = await reconstructMasked(midSpec, mulMasks(instMask, drumMask), n, onProgress, .9, .94);
	if (signal?.aborted) throw new SplitCancelled();
	const bassMono = await reconstructMasked(midSpec, mulMasks(instMask, bassMask), n, onProgress, .94, .97);
	if (signal?.aborted) throw new SplitCancelled();
	const otherMono = await reconstructMasked(midSpec, mulMasks(instMask, otherMask), n, onProgress, .97, 1);
	const drums = stereoFromMono(ctx, drumsMono, side, sr, .32);
	const bass = stereoFromMono(ctx, bassMono, side, sr, .05);
	const other = stereoFromMono(ctx, otherMono, side, sr, .92);
	onProgress?.(1);
	return [
		{
			name: "Вокал",
			role: "vocals",
			buffer: vocals
		},
		{
			name: "Ударные",
			role: "drums",
			buffer: drums
		},
		{
			name: "Бас",
			role: "bass",
			buffer: bass
		},
		{
			name: "Остальное",
			role: "other",
			buffer: other
		}
	];
}
function mulMasks(a, b) {
	return a.map((row, f) => {
		const out = new Float32Array(row.length);
		const other = b[f];
		for (let k = 0; k < row.length; k++) out[k] = row[k] * other[k];
		return out;
	});
}
async function reconstructMasked(spec, masks, length, onProgress, p0 = 0, p1 = 1) {
	const { bins, nFrames, hop } = spec;
	return istftChannel({
		mag: spec.mag.map((m, f) => {
			const out = new Float32Array(bins);
			const mask = masks[f];
			for (let k = 0; k < bins; k++) out[k] = m[k] * mask[k];
			return out;
		}),
		phase: spec.phase,
		nFrames,
		bins,
		hop
	}, length, onProgress, p0, p1);
}
function stereoFromMono(ctx, mono, side, sr, sideGain) {
	const n = mono.length;
	const L = new Float32Array(n);
	const R = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		L[i] = mono[i] + side[i] * sideGain;
		R[i] = mono[i] - side[i] * sideGain;
	}
	return createBufferFromChannels(ctx, [L, R], sr);
}
function bandWeight(hz, a0, a1, b0, b1) {
	if (hz <= a0 || hz >= b1) return 0;
	if (hz < a1) return (hz - a0) / Math.max(1, a1 - a0);
	if (hz > b0) return 1 - (hz - b0) / Math.max(1, b1 - b0);
	return 1;
}
function hpss(mag) {
	const nFrames = mag.length;
	const bins = mag[0].length;
	const timeR = 9;
	const freqR = 5;
	const harmonic = new Array(nFrames);
	const percussive = new Array(nFrames);
	const tWin = /* @__PURE__ */ new Float32Array(19);
	const fWin = /* @__PURE__ */ new Float32Array(11);
	for (let f = 0; f < nFrames; f++) {
		const hRow = new Float32Array(bins);
		const pRow = new Float32Array(bins);
		const f0 = Math.max(0, f - timeR);
		const f1 = Math.min(nFrames - 1, f + timeR);
		for (let k = 0; k < bins; k++) {
			let tn = 0;
			for (let ff = f0; ff <= f1; ff++) tWin[tn++] = mag[ff][k];
			const hMed = medianSmall(tWin, tn);
			const k0 = Math.max(0, k - freqR);
			const k1 = Math.min(bins - 1, k + freqR);
			let fn = 0;
			const row = mag[f];
			for (let kk = k0; kk <= k1; kk++) fWin[fn++] = row[kk];
			const pMed = medianSmall(fWin, fn);
			hRow[k] = hMed;
			pRow[k] = pMed;
		}
		harmonic[f] = hRow;
		percussive[f] = pRow;
	}
	return {
		harmonic,
		percussive
	};
}
function medianSmall(src, n) {
	const tmp = src.slice(0, n);
	tmp.sort();
	const mid = n >> 1;
	return n % 2 ? tmp[mid] : .5 * (tmp[mid - 1] + tmp[mid]);
}
function wienerRefine(vocal, inst) {
	const nFrames = vocal.length;
	const bins = vocal[0].length;
	for (let f = 0; f < nFrames; f++) {
		const v = vocal[f];
		const ins = inst[f];
		for (let k = 0; k < bins; k++) {
			const vp = v[k] * v[k];
			const ip = ins[k] * ins[k];
			const sum = vp + ip + 1e-12;
			v[k] = vp / sum;
			ins[k] = ip / sum;
		}
	}
}
function smoothMasks(vocal, inst) {
	const nFrames = vocal.length;
	const bins = vocal[0].length;
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
			for (let ff = f0; ff <= f1; ff++) for (let kk = k0; kk <= k1; kk++) {
				vs += tmpV[ff][kk];
				is += tmpI[ff][kk];
				c++;
			}
			vocal[f][k] = vs / c;
			inst[f][k] = is / c;
		}
	}
}
function ctx() {
	return engine.ensure();
}
var opSeq = 0;
var opCancelled = false;
var watchdog = null;
function cancelCurrentOp() {
	opCancelled = true;
	useStudio.getState().setBusy(null);
}
function beginOp(label, cancelable = true) {
	opSeq += 1;
	const seq = opSeq;
	opCancelled = false;
	if (watchdog != null) window.clearTimeout(watchdog);
	useStudio.getState().setBusy({
		label,
		progress: .02,
		cancelable
	});
	watchdog = window.setTimeout(() => {
		if (useStudio.getState().busy && opSeq === seq) {
			opCancelled = true;
			useStudio.getState().setBusy(null);
			toast.error("Операция заняла слишком много времени и была остановлена");
		}
	}, 45e3);
	return {
		seq,
		cancelled: () => opCancelled || opSeq !== seq,
		progress: (p, nextLabel) => {
			if (opSeq !== seq) return;
			useStudio.getState().setBusy({
				label: nextLabel ?? label,
				progress: p,
				cancelable
			});
		},
		end: () => {
			if (watchdog != null) {
				window.clearTimeout(watchdog);
				watchdog = null;
			}
			if (opSeq === seq) useStudio.getState().setBusy(null);
		}
	};
}
function clipBufferSlice() {
	const s = useStudio.getState();
	const clip = s.clips.find((c) => c.id === s.selectedClipId);
	if (!clip) {
		toast.error("Выберите клип на дорожке");
		return null;
	}
	const buf = getAudioBuffer(clip.bufferId);
	if (!buf) {
		toast.error("Аудио ещё не загружено");
		return null;
	}
	return {
		clip,
		audio: extractSlice(buf, ctx(), clip.offset, sourceLength(clip))
	};
}
async function replaceClipAudio(clipId, next, extra) {
	const prev = useStudio.getState().clips.find((c) => c.id === clipId);
	const bufferId = uid("buf");
	setAudioBuffer(bufferId, next);
	await persistBuffer(bufferId, next);
	useStudio.getState().updateClip(clipId, {
		bufferId,
		offset: 0,
		duration: extra?.duration ?? prev?.duration ?? next.duration,
		reverse: false,
		pitch: 0,
		...extra
	});
}
var importQueue = [];
var draining = false;
function importMediaFile(file, opts) {
	return new Promise((resolve) => {
		importQueue.push({
			file,
			opts,
			resolve
		});
		drainImports();
	});
}
async function drainImports() {
	if (draining) return;
	draining = true;
	try {
		while (importQueue.length) {
			const job = importQueue.shift();
			const busy = useStudio.getState().busy;
			if (busy && !busy.label.startsWith("Читаем") && !busy.label.startsWith("Извлекаем") && !busy.label.startsWith("Добавляем")) {
				toast.error("Дождись окончания текущей операции");
				job.resolve(null);
				continue;
			}
			try {
				job.resolve(await importMediaFileNow(job.file, job.opts));
			} catch {
				job.resolve(null);
			}
		}
	} finally {
		draining = false;
		if (importQueue.length) drainImports();
	}
}
async function importMediaFileNow(file, opts) {
	if (!isMediaFile(file) && !file.type) {
		toast.error("Нужен аудио- или видеофайл");
		return null;
	}
	const video = isVideoFile(file);
	const op = beginOp(video ? "Извлекаем звук из видео" : "Читаем аудио");
	try {
		await engine.resume().catch(() => void 0);
		const result = await extractAudioFromFile(file, ctx(), (p, label) => op.progress(p, label ?? (video ? "Извлекаем звук из видео" : "Читаем аудио")));
		if (op.cancelled()) return null;
		const first = useStudio.getState().clips.length === 0;
		let detected;
		let key = null;
		try {
			detected = Math.round(detectBpm(result.buffer).bpm);
			key = detectKey(result.buffer);
		} catch {
			detected = void 0;
		}
		if (first) op.progress(.94, "Добавляем на дорожку");
		else op.progress(.9, "Добавляем на дорожку");
		const clipId = await useStudio.getState().importBuffer(result.buffer, result.name, opts?.trackId, opts?.start, video ? "video" : "audio", detected, key ? {
			root: key.root,
			mode: key.mode
		} : null);
		toast.success(video ? "Звук снят с видео и поставлен на дорожку" : "Аудио добавлено на дорожку", { action: {
			label: "MP3",
			onClick: () => {
				downloadMp3(result.buffer, result.name).then(() => toast.success("MP3 сохранён"));
			}
		} });
		return clipId;
	} catch (err) {
		toast.error(err instanceof Error ? err.message : "Не удалось прочитать файл");
		return null;
	} finally {
		op.end();
	}
}
function actionSplitAtPlayhead() {
	const time = engine.getPlayhead();
	if (!useStudio.getState().splitAtPlayhead(time)) {
		toast.error("Поставь ползунок на клип и нажми ножницы");
		return false;
	}
	toast.success("Разрезано");
	return true;
}
function actionSetMark(which) {
	const t = engine.getPlayhead();
	if (which === "a") useStudio.getState().setMarkA(t);
	else useStudio.getState().setMarkB(t);
	toast.message(which === "a" ? `Метка A · ${t.toFixed(2)} с` : `Метка B · ${t.toFixed(2)} с`);
}
function actionCutMarked() {
	const s = useStudio.getState();
	const a = s.markA;
	const b = s.markB;
	if (a == null || b == null) {
		toast.error("Поставь две метки: A и B по краям куска");
		return;
	}
	if (!s.selectedClipId && !s.selectedTrackId) {
		toast.error("Выбери клип или дорожку");
		return;
	}
	if (!s.cutRegion(a, b)) {
		toast.error("Метки не попали в клип");
		return;
	}
	engine.seek(Math.min(a, b));
	toast.success("Кусок вырезан");
}
function actionLiftMarked() {
	const s = useStudio.getState();
	const a = s.markA;
	const b = s.markB;
	if (a == null || b == null) {
		toast.error("Поставь две метки: A и B");
		return;
	}
	if (!s.liftRegion(a, b)) {
		toast.error("Нечего поднимать");
		return;
	}
	toast.success("Кусок вынесен на новую дорожку");
}
function actionDeleteSelected() {
	const s = useStudio.getState();
	if (!s.selectedClipId) {
		toast.error("Выбери кусок, который нужно убрать");
		return;
	}
	s.removeClip(s.selectedClipId);
	toast.success("Кусок убран");
}
async function actionReverse() {
	const pack = clipBufferSlice();
	if (!pack) return;
	if (useStudio.getState().busy) {
		toast.error("Дождись окончания текущей операции");
		return;
	}
	useStudio.getState().snapshot();
	const op = beginOp("Реверс", false);
	try {
		const next = reverseBuffer(pack.audio, ctx());
		await replaceClipAudio(pack.clip.id, next);
		toast.success("Клип развёрнут");
	} finally {
		op.end();
	}
}
async function actionPitch(semitones) {
	const pack = clipBufferSlice();
	if (!pack) return;
	if (Math.abs(semitones) < .05) return;
	if (useStudio.getState().busy) {
		toast.error("Дождись окончания текущей операции");
		return;
	}
	useStudio.getState().snapshot();
	const op = beginOp("Смена тональности");
	try {
		const next = await pitchShiftBuffer(pack.audio, ctx(), semitones, (p) => op.progress(p, "Смена тональности"));
		if (op.cancelled()) return;
		await replaceClipAudio(pack.clip.id, next, { pitch: 0 });
		const store = useStudio.getState();
		if (store.keyRoot != null && store.clips.length <= 2) store.setKey(transposeRoot(store.keyRoot, semitones), store.keyMode);
		toast.success(semitones > 0 ? `+${semitones} полутонов` : `${semitones} полутонов`);
	} finally {
		op.end();
	}
}
async function actionDenoise() {
	const pack = clipBufferSlice();
	if (!pack) return;
	if (useStudio.getState().busy) return;
	useStudio.getState().snapshot();
	const op = beginOp("Убираем шум");
	try {
		const next = await denoiseBuffer(pack.audio, ctx(), .72, (p) => op.progress(p, "Убираем шум"));
		if (op.cancelled()) return;
		await replaceClipAudio(pack.clip.id, next);
		toast.success("Посторонний шум приглушён");
	} finally {
		op.end();
	}
}
async function actionEnhance() {
	const pack = clipBufferSlice();
	if (!pack) return;
	if (useStudio.getState().busy) return;
	useStudio.getState().snapshot();
	const op = beginOp("Улучшение качества");
	try {
		const next = await enhanceBuffer(pack.audio, ctx(), (p) => op.progress(p, "Улучшение качества"));
		if (op.cancelled()) return;
		await replaceClipAudio(pack.clip.id, next);
		toast.success("Звук стал чище и ярче");
	} finally {
		op.end();
	}
}
function actionDetectBpm() {
	const pack = clipBufferSlice();
	const apply = (clipId, audio) => {
		const result = detectBpm(audio);
		const value = Math.round(result.bpm);
		const key = detectKey(audio);
		const store = useStudio.getState();
		store.snapshot();
		if (clipId) store.updateClip(clipId, { nativeBpm: value });
		else if (store.selectedClipId) store.updateClip(store.selectedClipId, { nativeBpm: value });
		if (store.clips.length <= 1) {
			store.setBpm(value, { snapshot: false });
			store.setNativeBpm(value);
		}
		store.setKey(key.root, key.mode);
		return {
			bpm: result,
			key
		};
	};
	if (!pack) {
		const clip = useStudio.getState().clips[0];
		if (!clip) {
			toast.error("Нужен клип, чтобы посчитать BPM и тональность");
			return;
		}
		const buf = getAudioBuffer(clip.bufferId);
		if (!buf) return;
		const result = apply(clip.id, buf);
		toast.success(`BPM ${Math.round(result.bpm.bpm)} · ${result.key.name}`);
		return result;
	}
	const result = apply(pack.clip.id, pack.audio);
	toast.success(`BPM ${Math.round(result.bpm.bpm)} · ${result.key.name}`);
	return result;
}
function actionSetClipBpm(bpm) {
	const s = useStudio.getState();
	if (s.selectedClipId) {
		const clip = s.clips.find((c) => c.id === s.selectedClipId);
		if (clip && (clip.nativeBpm == null || clip.nativeBpm <= 0)) {
			const buf = getAudioBuffer(clip.bufferId);
			if (buf) try {
				const detected = Math.round(detectBpm(extractSlice(buf, ctx(), clip.offset, sourceLength(clip))).bpm);
				s.updateClip(clip.id, { nativeBpm: detected });
			} catch {
				s.updateClip(clip.id, { nativeBpm: s.bpm });
			}
			else s.updateClip(clip.id, { nativeBpm: s.bpm });
		}
		s.setClipTempo(s.selectedClipId, bpm);
		toast.success(`Клип: ${Math.round(bpm)} BPM`);
		return;
	}
	if (s.selectedTrackId) {
		const clips = s.clips.filter((c) => c.trackId === s.selectedTrackId);
		if (!clips.length) {
			s.setBpm(bpm);
			toast.success(`Сетка: ${Math.round(bpm)} BPM`);
			return;
		}
		for (const clip of clips) if (clip.nativeBpm == null || clip.nativeBpm <= 0) s.updateClip(clip.id, { nativeBpm: s.bpm });
		s.setTrackTempo(s.selectedTrackId, bpm);
		toast.success(`Дорожка: ${Math.round(bpm)} BPM`);
		return;
	}
	s.setBpm(bpm);
	toast.success(`Сетка: ${Math.round(bpm)} BPM`);
}
function actionDetectKey() {
	const audio = clipBufferSlice()?.audio ?? (() => {
		const clip = useStudio.getState().clips[0];
		return clip ? getAudioBuffer(clip.bufferId) : void 0;
	})();
	if (!audio) {
		toast.error("Нужен клип, чтобы определить тональность");
		return;
	}
	const key = detectKey(audio);
	const store = useStudio.getState();
	store.snapshot();
	store.setKey(key.root, key.mode);
	toast.success(`Тональность: ${key.name}`);
	return key;
}
async function actionSplit(mode) {
	if (useStudio.getState().busy) {
		toast.error("Дождись окончания текущей операции");
		return;
	}
	const pack = clipBufferSlice();
	if (!pack) return;
	useStudio.getState().snapshot();
	const op = beginOp("Делим на дорожки");
	const ac = new AbortController();
	const cancelWatch = window.setInterval(() => {
		if (op.cancelled()) ac.abort();
	}, 80);
	try {
		const stems = await splitStems(pack.audio, ctx(), mode, (p) => op.progress(p, "Делим на дорожки"), ac.signal);
		if (op.cancelled()) return;
		const colors = mode === "vocals-instrumental" ? ["lane-sage", "lane-slate"] : [
			"lane-sage",
			"lane-coral",
			"lane-bronze",
			"lane-teal"
		];
		const originalClipId = pack.clip.id;
		const originalTrackId = pack.clip.trackId;
		const origIndex = Math.max(0, useStudio.getState().tracks.findIndex((t) => t.id === originalTrackId));
		const r = clipRate(pack.clip);
		for (let i = 0; i < stems.length; i++) {
			if (op.cancelled()) return;
			const stem = stems[i];
			const bufferId = uid("buf");
			setAudioBuffer(bufferId, stem.buffer);
			await persistBuffer(bufferId, stem.buffer);
			if (i === 0) {
				useStudio.getState().updateTrack(originalTrackId, {
					name: stem.name,
					color: colors[0]
				});
				useStudio.getState().updateClip(originalClipId, {
					bufferId,
					name: stem.name,
					offset: 0,
					duration: pack.clip.duration,
					reverse: false,
					pitch: 0,
					rate: r,
					nativeBpm: pack.clip.nativeBpm,
					preservePitch: pack.clip.preservePitch
				});
			} else {
				const trackId = useStudio.getState().insertTrack(origIndex + i, stem.name, colors[i % colors.length], { snapshot: false });
				useStudio.getState().addClip({
					trackId,
					bufferId,
					name: stem.name,
					start: pack.clip.start,
					offset: 0,
					duration: pack.clip.duration,
					gain: 1,
					reverse: false,
					fadeIn: pack.clip.fadeIn,
					fadeOut: pack.clip.fadeOut,
					pitch: 0,
					muted: false,
					rate: r,
					nativeBpm: pack.clip.nativeBpm,
					preservePitch: pack.clip.preservePitch
				});
			}
		}
		useStudio.getState().compactOccupied();
		useStudio.getState().ensureSpareTracks(5);
		useStudio.getState().persist();
		toast.success(mode === "vocals-instrumental" ? "Готово: акапелла и минус подряд" : "Готово: вокал, ударные, бас и остальное");
	} catch (err) {
		if (err instanceof SplitCancelled || op.cancelled()) {
			toast.message("Разделение остановлено");
			return;
		}
		toast.error(err instanceof Error ? err.message : "Не удалось разделить");
	} finally {
		window.clearInterval(cancelWatch);
		op.end();
	}
}
async function actionExport(target = "mix", format = "wav") {
	const s = useStudio.getState();
	if (s.busy) {
		toast.error("Дождись окончания текущей операции");
		return;
	}
	let buffer;
	let filename;
	if (target === "clip") {
		const pack = clipBufferSlice();
		if (!pack) return;
		buffer = pack.audio;
		filename = pack.clip.name || "clip";
	} else {
		const duration = Math.max(1, s.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0) + .2);
		const op = beginOp("Сводим микс", false);
		try {
			buffer = await engine.bounce(mixSnapshot(), duration);
		} catch (err) {
			op.end();
			toast.error(err instanceof Error ? err.message : "Не удалось свести");
			return;
		}
		filename = s.name || "pulse";
		op.end();
	}
	const op = beginOp(format === "mp3" ? "Пишем MP3" : "Пишем WAV", false);
	try {
		if (format === "mp3") {
			await downloadMp3(buffer, filename, (p) => op.progress(.55 + p * .4, "Пишем MP3"));
			toast.success("MP3 сохранён");
		} else {
			downloadBlob(encodeWav(buffer), `${filename}.wav`);
			toast.success("WAV сохранён");
		}
	} catch (err) {
		toast.error(err instanceof Error ? err.message : "Не удалось сохранить");
	} finally {
		op.end();
	}
}
async function actionNormalize() {
	const pack = clipBufferSlice();
	if (!pack) return;
	let peak = 1e-6;
	for (let c = 0; c < pack.audio.numberOfChannels; c++) {
		const d = pack.audio.getChannelData(c);
		for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
	}
	const g = .95 / peak;
	useStudio.getState().snapshot();
	const next = scaleGain(pack.audio, ctx(), g);
	await replaceClipAudio(pack.clip.id, next, { gain: 1 });
	toast.success("Громкость выровнена");
}
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-9 w-full rounded-md border border-input bg-surface-2 px-3 py-1 text-sm text-foreground shadow-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
function usePlaying() {
	const [playing, setPlaying] = (0, import_react.useState)(() => engine.playing);
	const [recording, setRecording] = (0, import_react.useState)(() => engine.recording);
	(0, import_react.useEffect)(() => {
		const offPlay = engine.subscribePlay((p) => setPlaying(p));
		const id = window.setInterval(() => {
			setRecording(engine.recording);
		}, 400);
		return () => {
			offPlay();
			window.clearInterval(id);
		};
	}, []);
	return {
		playing,
		recording
	};
}
/**
* Drive every playhead needle from one rAF tick so the ruler and the lanes
* cannot drift. Transform only — no React re-render of the timeline.
*/
function useSyncedPlayheads(zoom, scroller, followWhilePlaying = true) {
	const lineRef = (0, import_react.useRef)(null);
	const headRef = (0, import_react.useRef)(null);
	const zoomRef = (0, import_react.useRef)(zoom);
	zoomRef.current = zoom;
	const followRef = (0, import_react.useRef)(followWhilePlaying);
	followRef.current = followWhilePlaying;
	(0, import_react.useEffect)(() => {
		const apply = (t) => {
			const z = zoomRef.current;
			const x = Math.max(0, Number.isFinite(t) ? t : 0) * z;
			const transform = `translate3d(${x}px,0,0)`;
			const line = lineRef.current;
			const head = headRef.current;
			if (line) line.style.transform = transform;
			if (head) head.style.transform = transform;
			if (!followRef.current || !engine.playing) return;
			const sc = scroller.current;
			if (!sc) return;
			const view = sc.scrollLeft;
			const w = sc.clientWidth;
			if (x > view + w - 72) sc.scrollLeft = x - w + 110;
			else if (x < view + 24 && view > 0) sc.scrollLeft = Math.max(0, x - 48);
		};
		apply(engine.getPlayhead());
		return engine.subscribe(apply);
	}, [scroller]);
	(0, import_react.useEffect)(() => {
		const transform = `translate3d(${Math.max(0, engine.getPlayhead()) * zoom}px,0,0)`;
		if (lineRef.current) lineRef.current.style.transform = transform;
		if (headRef.current) headRef.current.style.transform = transform;
	}, [zoom]);
	return {
		lineRef,
		headRef
	};
}
/** Paint a clock without re-rendering the transport every frame. */
function usePlayheadClock(ref, format) {
	(0, import_react.useEffect)(() => {
		const node = ref.current;
		if (node) node.textContent = format(engine.getPlayhead());
		return engine.subscribe((t) => {
			const el = ref.current;
			if (el) el.textContent = format(t);
		});
	}, [ref, format]);
}
var Dialog = Dialog$1;
var DialogPortal = DialogPortal$1;
var DialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
	ref,
	className: cn("fixed inset-0 z-50 bg-background/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}));
DialogOverlay.displayName = DialogOverlay$1.displayName;
var DialogContent = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
	ref,
	className: cn("fixed left-1/2 top-1/2 z-50 grid w-[min(32rem,calc(100%-1.5rem))] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl glass-strong p-5 text-card-foreground duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-3 top-3 rounded-sm p-1 text-muted-foreground opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Закрыть"
		})]
	})]
})] }));
DialogContent.displayName = DialogContent$1.displayName;
function DialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex flex-col gap-1.5 text-left", className),
		...props
	});
}
var DialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
	ref,
	className: cn("text-lg font-semibold tracking-tight", className),
	...props
}));
DialogTitle.displayName = DialogTitle$1.displayName;
var DialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
DialogDescription.displayName = DialogDescription$1.displayName;
function ExportDialog({ open, onOpenChange }) {
	const hasClip = useStudio((s) => Boolean(s.selectedClipId));
	const hasClips = useStudio((s) => s.clips.length > 0);
	const run = (target, format) => {
		onOpenChange(false);
		actionExport(target, format);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Сохранить звук" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Микс целиком или выбранный кусок. MP3 — для телефона, WAV — без потерь." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
					children: "Весь микс"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						disabled: !hasClips,
						onClick: () => run("mix", "mp3"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), " MP3"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						disabled: !hasClips,
						onClick: () => run("mix", "wav"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), " WAV"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
					children: "Выбранный клип"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						disabled: !hasClip,
						onClick: () => run("clip", "mp3"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), " MP3"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "secondary",
						disabled: !hasClip,
						onClick: () => run("clip", "wav"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), " WAV"]
					})]
				})
			]
		})] })
	});
}
function VolumeSlider({ value, onChange, max = 2, ariaLabel, compact = false, showMute = true }) {
	const pct = Math.round(value / max * 100);
	const display = Math.round(value * 100);
	const muted = value <= .001;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex min-w-0 items-center", compact ? "gap-0.5" : "gap-1"),
		children: [
			showMute ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "grid size-7 shrink-0 place-items-center text-muted-foreground",
				"aria-label": muted ? "Включить звук" : "Выключить звук",
				onPointerDown: (e) => e.stopPropagation(),
				onClick: (e) => {
					e.stopPropagation();
					onChange(muted ? 1 : 0);
				},
				children: muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-3.5" })
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "range",
				min: 0,
				max,
				step: .01,
				value,
				onPointerDown: (e) => e.stopPropagation(),
				onClick: (e) => e.stopPropagation(),
				onChange: (e) => onChange(Number(e.target.value)),
				className: "vol-range min-w-0 flex-1",
				style: { background: `linear-gradient(to right, var(--color-primary) ${pct}%, color-mix(in oklab, var(--color-foreground) 14%, transparent) ${pct}%)` },
				"aria-label": ariaLabel
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("shrink-0 text-right font-mono text-[10px] tabular", compact ? "w-6" : "w-7", value > 1.01 ? "text-play" : "text-muted-foreground"),
				children: display
			})
		]
	});
}
function BpmInput({ value, onCommit, onArm, ariaLabel = "BPM", className }) {
	const [text, setText] = (0, import_react.useState)(() => formatBpm(value));
	const [focused, setFocused] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!focused) setText(formatBpm(value));
	}, [value, focused]);
	const commit = () => {
		const parsed = parseBpm(text);
		if (parsed == null) {
			setText(formatBpm(value));
			return;
		}
		onCommit(parsed);
		setText(formatBpm(parsed));
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type: "text",
		inputMode: "decimal",
		autoComplete: "off",
		spellCheck: false,
		"aria-label": ariaLabel,
		value: text,
		onFocus: () => {
			setFocused(true);
			onArm?.();
		},
		onChange: (e) => setText(e.target.value.replace(/[^\d.,]/g, "").replace(",", ".")),
		onBlur: () => {
			setFocused(false);
			commit();
		},
		onKeyDown: (e) => {
			if (e.key === "Enter") e.currentTarget.blur();
			else if (e.key === "Escape") {
				setText(formatBpm(value));
				e.currentTarget.blur();
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				onCommit(clampBpm((parseBpm(text) ?? value) + (e.shiftKey ? 5 : 1)));
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				onCommit(clampBpm((parseBpm(text) ?? value) - (e.shiftKey ? 5 : 1)));
			}
		},
		className: cn("h-7 w-12 shrink-0 rounded-md border border-input/80 bg-foreground/6 px-0.5 text-center font-mono text-xs text-foreground tabular", className)
	});
}
function formatBpm(n) {
	if (!Number.isFinite(n)) return "120";
	const r = Math.round(n * 10) / 10;
	return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
function parseBpm(raw) {
	const n = Number(raw.trim());
	if (!Number.isFinite(n) || n <= 0) return null;
	return clampBpm(n);
}
function clampBpm(n) {
	return Math.min(400, Math.max(20, n));
}
function TopBar() {
	const name = useStudio((s) => s.name);
	const setName = useStudio((s) => s.setName);
	const persist = useStudio((s) => s.persist);
	const undo = useStudio((s) => s.undo);
	const redo = useStudio((s) => s.redo);
	const undoLen = useStudio((s) => s.undoStack.length);
	const redoLen = useStudio((s) => s.redoStack.length);
	const [exportOpen, setExportOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "glass-bar flex h-10 shrink-0 items-center gap-1 border-b border-border/60 px-2 sm:px-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				className: "shrink-0",
				"aria-label": "На главную",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PulseLogo, {
					className: "text-sm",
					markClassName: "size-5"
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: name,
				onChange: (e) => setName(e.target.value),
				onBlur: () => persist(),
				className: "h-7 min-w-0 flex-1 border-transparent bg-transparent px-2 text-sm font-medium hover:bg-foreground/6 focus-visible:bg-foreground/8 sm:max-w-52"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HistoryBtn, {
				label: "<",
				title: "Отменить",
				disabled: !undoLen,
				onClick: undo
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HistoryBtn, {
				label: ">",
				title: "Вернуть",
				disabled: !redoLen,
				onClick: redo
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UiModeSwitch, { compact: true }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "icon",
				variant: "ghost",
				className: "size-8 shrink-0",
				title: "Сохранить",
				"aria-label": "Сохранить проект",
				onClick: () => {
					persist();
					toast.success("Проект сохранён");
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "icon",
				variant: "ghost",
				className: "size-8 shrink-0 sm:hidden",
				onClick: () => setExportOpen(true),
				"aria-label": "Экспорт",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				className: "hidden h-7 sm:inline-flex",
				onClick: () => setExportOpen(true),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), "Экспорт"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExportDialog, {
				open: exportOpen,
				onOpenChange: setExportOpen
			})
		]
	});
}
function HistoryBtn({ label, title, disabled, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		size: "icon",
		variant: "secondary",
		className: "size-8 shrink-0 font-mono text-sm",
		title,
		"aria-label": title,
		disabled,
		onClick,
		children: label
	});
}
function PlayheadClock() {
	const ref = (0, import_react.useRef)(null);
	usePlayheadClock(ref, formatTime);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		ref,
		className: "min-w-[4.2rem] shrink-0 font-mono text-xs tabular text-foreground sm:min-w-[5rem]",
		children: formatTime(engine.getPlayhead())
	});
}
function Transport() {
	const bpm = useStudio((s) => s.bpm);
	const setBpm = useStudio((s) => s.setBpm);
	const keyRoot = useStudio((s) => s.keyRoot);
	const keyMode = useStudio((s) => s.keyMode);
	const loopEnabled = useStudio((s) => s.loopEnabled);
	const setLoop = useStudio((s) => s.setLoop);
	const tracks = useStudio((s) => s.tracks);
	const selectedTrackId = useStudio((s) => s.selectedTrackId);
	const selectedClipId = useStudio((s) => s.selectedClipId);
	const clip = useStudio((s) => s.clips.find((c) => c.id === s.selectedClipId));
	const tool = useStudio((s) => s.tool);
	const setTool = useStudio((s) => s.setTool);
	const master = useStudio((s) => s.masterGain);
	const setMaster = useStudio((s) => s.setMaster);
	const { playing, recording } = usePlaying();
	const importBuffer = useStudio((s) => s.importBuffer);
	const [metro, setMetro] = (0, import_react.useState)(engine.metronome);
	const displayBpm = (clip ? clipBpm(clip, bpm) : null) ?? bpm;
	const rate = clip ? clipRate(clip) : 1;
	const bpmTarget = clip || selectedTrackId ? "clip" : "grid";
	const togglePlay = async () => {
		await engine.resume();
		if (engine.playing) engine.pause();
		else await engine.play(mixSnapshot());
	};
	const toggleRec = async () => {
		if (engine.recording) {
			engine.stopRecording();
			return;
		}
		let armed = tracks.find((t) => t.armed) ?? tracks.find((t) => t.id === selectedTrackId) ?? tracks[0];
		if (!armed) {
			const id = useStudio.getState().addTrack("Запись");
			armed = useStudio.getState().tracks.find((t) => t.id === id) ?? useStudio.getState().tracks[0];
		}
		if (!armed) {
			toast.error("Нет дорожки для записи");
			return;
		}
		try {
			await engine.play(mixSnapshot());
			await engine.startRecording(armed.id, async (blob, startedAt, trackId) => {
				const buf = await engine.ensure().decodeAudioData(await blob.arrayBuffer());
				await importBuffer(buf, "Запись", trackId, startedAt, "record");
				toast.success("Запись добавлена");
			});
		} catch {
			toast.error("Нет доступа к микрофону");
		}
	};
	const commitBpm = (next) => {
		if (bpmTarget === "clip") actionSetClipBpm(next);
		else setBpm(next);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "shrink-0 overflow-x-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex h-11 items-center gap-0.5 px-1.5 sm:gap-1 sm:px-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: recording ? "record" : "ghost",
					className: "size-9 shrink-0",
					onClick: () => void toggleRec(),
					"aria-label": "Запись",
					children: recording ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { className: "fill-current" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: "play",
					className: "size-9 shrink-0",
					onClick: () => void togglePlay(),
					"aria-label": playing ? "Пауза" : "Играть",
					children: playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "ml-0.5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: "ghost",
					className: "size-9 shrink-0",
					onClick: () => engine.stop(),
					"aria-label": "Стоп",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-3.5 fill-current" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayheadClock, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: "secondary",
					className: "size-9 shrink-0",
					onClick: () => actionSplitAtPlayhead(),
					"aria-label": "Ножницы по ползунку",
					title: "Разрезать клип по ползунку",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scissors, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: tool === "razor" ? "secondary" : "ghost",
					className: cn("size-9 shrink-0", tool === "razor" && "text-primary"),
					onClick: () => setTool(tool === "razor" ? "pointer" : "razor"),
					"aria-label": "Режим лезвия",
					title: "Тап по клипу режет в этом месте",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scissors, { className: "rotate-90" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: tool === "speed" ? "secondary" : "ghost",
					className: cn("size-9 shrink-0", tool === "speed" && "text-play"),
					onClick: () => {
						setTool(tool === "speed" ? "pointer" : "speed");
						if (!selectedClipId) toast.message("Выбери клип — слева на конце появится ‹│›");
					},
					"aria-label": "Скорость клипа",
					title: "Скорость: зажми ‹│› на конце клипа и тяни",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-1 hidden h-6 w-px shrink-0 bg-border sm:block" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge, { className: "size-3" }), bpmTarget === "clip" ? "Клип" : "Сетка"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: "ghost",
					className: "size-7 shrink-0",
					onClick: () => commitBpm(Math.round(displayBpm) - 1),
					"aria-label": "BPM минус",
					children: "−"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BpmInput, {
					value: displayBpm,
					onArm: () => useStudio.getState().snapshot(),
					onCommit: commitBpm,
					ariaLabel: bpmTarget === "clip" ? "BPM клипа" : "BPM сетки"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "icon",
					variant: "ghost",
					className: "size-7 shrink-0",
					onClick: () => commitBpm(Math.round(displayBpm) + 1),
					"aria-label": "BPM плюс",
					children: "+"
				}),
				clip && Math.abs(rate - 1) > .01 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "shrink-0 font-mono text-[10px] tabular text-play",
					children: ["×", rate.toFixed(2)]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "ml-1 flex h-7 shrink-0 items-center gap-1 rounded-md bg-foreground/6 px-1.5 font-mono text-xs text-foreground",
					title: "Определить тональность",
					onClick: () => void actionDetectKey(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Music2, { className: "size-3 text-muted-foreground" }), formatKey(keyRoot, keyMode)]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ml-1 min-w-[5rem] max-w-[8rem] flex-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeSlider, {
						compact: true,
						value: master,
						max: MASTER_VOL_MAX,
						onChange: setMaster,
						ariaLabel: "Общая громкость"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: loopEnabled ? "secondary" : "ghost",
					className: cn("h-7 shrink-0 px-2 text-xs", loopEnabled && "text-play"),
					onClick: () => setLoop({ loopEnabled: !loopEnabled }),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Repeat, { className: "size-3.5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: metro ? "secondary" : "ghost",
					className: cn("h-7 shrink-0 px-1.5 text-[10px]", metro && "text-play"),
					onClick: () => {
						engine.metronome = !engine.metronome;
						setMetro(engine.metronome);
						toast.message(engine.metronome ? "Метроном включён" : "Метроном выключен");
					},
					children: "Metro"
				})
			]
		})
	});
}
var ZOOM_MIN = 16;
var ZOOM_MAX = 320;
function touchDist(a, b) {
	return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
/**
* Pinch-to-zoom (and trackpad pinch) on a timeline scroller only.
* Keeps the time under the pinch midpoint locked in place.
*/
function usePinchZoom(elRef, zoom, setZoom, onPinching) {
	const zoomRef = (0, import_react.useRef)(zoom);
	zoomRef.current = zoom;
	const pinchRef = (0, import_react.useRef)(null);
	const onPinchingRef = (0, import_react.useRef)(onPinching);
	onPinchingRef.current = onPinching;
	const setZoomRef = (0, import_react.useRef)(setZoom);
	setZoomRef.current = setZoom;
	(0, import_react.useEffect)(() => {
		const el = elRef.current;
		if (!el) return;
		const applyZoom = (next, focalX, fromZoom, fromScroll) => {
			const z = clamp(next, ZOOM_MIN, ZOOM_MAX);
			const time = (fromScroll + focalX) / Math.max(1, fromZoom);
			setZoomRef.current(z);
			requestAnimationFrame(() => {
				el.scrollLeft = time * z - focalX;
			});
		};
		const onTouchStart = (e) => {
			if (e.touches.length === 2) {
				const a = e.touches[0];
				const b = e.touches[1];
				const rect = el.getBoundingClientRect();
				pinchRef.current = {
					dist: Math.max(1, touchDist(a, b)),
					zoom: zoomRef.current,
					focalX: (a.clientX + b.clientX) / 2 - rect.left,
					scrollLeft: el.scrollLeft
				};
				onPinchingRef.current?.(true);
			}
		};
		const onTouchMove = (e) => {
			const state = pinchRef.current;
			if (!state || e.touches.length < 2) return;
			e.preventDefault();
			const a = e.touches[0];
			const b = e.touches[1];
			const dist = touchDist(a, b);
			applyZoom(state.zoom * (dist / state.dist), state.focalX, state.zoom, state.scrollLeft);
		};
		const onTouchEnd = (e) => {
			if (e.touches.length < 2 && pinchRef.current) {
				pinchRef.current = null;
				onPinchingRef.current?.(false);
			}
		};
		const onWheel = (e) => {
			if (!e.ctrlKey && !e.metaKey) return;
			e.preventDefault();
			const rect = el.getBoundingClientRect();
			const focalX = e.clientX - rect.left;
			const prev = zoomRef.current;
			const next = prev * Math.exp(-e.deltaY * .01);
			applyZoom(next, focalX, prev, el.scrollLeft);
		};
		el.addEventListener("touchstart", onTouchStart, { passive: true });
		el.addEventListener("touchmove", onTouchMove, { passive: false });
		el.addEventListener("touchend", onTouchEnd);
		el.addEventListener("touchcancel", onTouchEnd);
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => {
			el.removeEventListener("touchstart", onTouchStart);
			el.removeEventListener("touchmove", onTouchMove);
			el.removeEventListener("touchend", onTouchEnd);
			el.removeEventListener("touchcancel", onTouchEnd);
			el.removeEventListener("wheel", onWheel);
		};
	}, [elRef]);
}
var COLOR = {
	"lane-coral": "#e85d3a",
	"lane-teal": "#2a9d8f",
	"lane-blue": "#4c8dff",
	"lane-sage": "#6fbf73",
	"lane-bronze": "#c4923a",
	"lane-slate": "#7d8aa3"
};
var Waveform = (0, import_react.memo)(function Waveform({ bufferId, color, offset, duration, bufferDuration, fadeIn, fadeOut, className }) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const parent = canvas.parentElement;
		if (!parent) return;
		const draw = () => {
			const w = Math.max(1, Math.round(parent.clientWidth));
			const h = Math.max(1, Math.round(parent.clientHeight));
			const dpr = Math.min(1.5, window.devicePixelRatio || 1);
			if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
				canvas.width = Math.floor(w * dpr);
				canvas.height = Math.floor(h * dpr);
				canvas.style.width = `${w}px`;
				canvas.style.height = `${h}px`;
			}
			const g = canvas.getContext("2d");
			if (!g) return;
			g.setTransform(dpr, 0, 0, dpr, 0, 0);
			g.clearRect(0, 0, w, h);
			const peaks = getWaveformPeaks(bufferId, Math.min(768, Math.max(64, w)));
			g.fillStyle = COLOR[color] ?? "#e85d3a";
			const mid = h / 2;
			if (!peaks || bufferDuration <= 0) {
				g.globalAlpha = .35;
				g.fillRect(0, mid - 1, w, 2);
				return;
			}
			const peakBins = peaks.length / 2;
			const startBin = offset / bufferDuration * peakBins;
			const endBin = (offset + duration) / bufferDuration * peakBins;
			const span = Math.max(1, endBin - startBin);
			const step = w > 480 ? 2 : 1;
			g.globalAlpha = .92;
			for (let x = 0; x < w; x += step) {
				const b = startBin + x / w * span;
				const i = Math.min(peakBins - 1, Math.max(0, Math.floor(b)));
				const min = peaks[i * 2] ?? 0;
				const max = peaks[i * 2 + 1] ?? 0;
				const y1 = mid + min * (h * .42);
				const y2 = mid + max * (h * .42);
				g.fillRect(x, y1, step, Math.max(1, y2 - y1));
			}
			if (fadeIn > 0 || fadeOut > 0) {
				g.globalCompositeOperation = "destination-in";
				const grd = g.createLinearGradient(0, 0, w, 0);
				const inP = duration > 0 ? fadeIn / duration : 0;
				const outP = duration > 0 ? fadeOut / duration : 0;
				grd.addColorStop(0, "rgba(0,0,0,0.15)");
				grd.addColorStop(Math.min(.49, Math.max(0, inP)), "rgba(0,0,0,1)");
				grd.addColorStop(Math.max(.51, 1 - Math.max(0, outP)), "rgba(0,0,0,1)");
				grd.addColorStop(1, "rgba(0,0,0,0.15)");
				g.fillStyle = grd;
				g.fillRect(0, 0, w, h);
				g.globalCompositeOperation = "source-over";
			}
		};
		draw();
		let raf = 0;
		let tries = 0;
		const retry = window.setInterval(() => {
			tries += 1;
			if (getWaveformPeaks(bufferId, 32) || tries > 24) {
				window.clearInterval(retry);
				draw();
			}
		}, 200);
		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(draw);
		});
		ro.observe(parent);
		return () => {
			window.clearInterval(retry);
			cancelAnimationFrame(raf);
			ro.disconnect();
		};
	}, [
		bufferId,
		color,
		offset,
		duration,
		bufferDuration,
		fadeIn,
		fadeOut
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref,
		className
	});
});
var CLIP_ARM_PX = 5;
function trackHeight() {
	if (typeof window === "undefined") return 48;
	const v = getComputedStyle(document.documentElement).getPropertyValue("--track-h");
	const n = parseFloat(v);
	return Number.isFinite(n) && n > 0 ? n : 48;
}
function rulerHeight() {
	if (typeof window === "undefined") return 22;
	const v = getComputedStyle(document.documentElement).getPropertyValue("--ruler-h");
	const n = parseFloat(v);
	return Number.isFinite(n) && n > 0 ? n : 22;
}
function Timeline() {
	const tracks = useStudio((s) => s.tracks);
	const clips = useStudio((s) => s.clips);
	const bpm = useStudio((s) => s.bpm);
	const zoom = useStudio((s) => s.zoom);
	const setZoom = useStudio((s) => s.setZoom);
	const selectedClipId = useStudio((s) => s.selectedClipId);
	const selectedTrackId = useStudio((s) => s.selectedTrackId);
	const loopEnabled = useStudio((s) => s.loopEnabled);
	const loopStart = useStudio((s) => s.loopStart);
	const loopEnd = useStudio((s) => s.loopEnd);
	const markA = useStudio((s) => s.markA);
	const markB = useStudio((s) => s.markB);
	const lastGap = useStudio((s) => s.lastGap);
	const tool = useStudio((s) => s.tool);
	const board = (0, import_react.useRef)(null);
	const heads = (0, import_react.useRef)(null);
	const syncLock = (0, import_react.useRef)("none");
	const [pinching, setPinching] = (0, import_react.useState)(false);
	const [draggingTrackId, setDraggingTrackId] = (0, import_react.useState)(null);
	const [dropIndex, setDropIndex] = (0, import_react.useState)(null);
	const [clipDragging, setClipDragging] = (0, import_react.useState)(null);
	const { lineRef, headRef } = useSyncedPlayheads(zoom, board, true);
	const duration = Math.max(16, clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0) + 8);
	const width = duration * zoom;
	const regionLo = markA != null && markB != null ? Math.min(markA, markB) : null;
	const regionHi = markA != null && markB != null ? Math.max(markA, markB) : null;
	const stackH = Math.max(1, tracks.length) * trackHeight();
	const locked = pinching || draggingTrackId != null;
	const dragging = draggingTrackId != null || clipDragging != null;
	const x0 = Math.max(0, engine.getPlayhead()) * zoom;
	usePinchZoom(board, zoom, setZoom, setPinching);
	const syncFromBoard = () => {
		const el = board.current;
		if (!el || syncLock.current === "head") return;
		syncLock.current = "lane";
		if (heads.current) heads.current.scrollTop = el.scrollTop;
		syncLock.current = "none";
	};
	const syncFromHeads = () => {
		const el = heads.current;
		if (!el || syncLock.current === "lane") return;
		syncLock.current = "head";
		if (board.current) board.current.scrollTop = el.scrollTop;
		syncLock.current = "none";
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex w-lane-head shrink-0 flex-col border-r border-border/70 glass-track",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex h-ruler items-center px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
				children: "Дорожки"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: heads,
				className: "min-h-0 flex-1 overflow-y-auto overscroll-contain",
				onScroll: syncFromHeads,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					style: { minHeight: stackH },
					children: [dropIndex != null && draggingTrackId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "pointer-events-none absolute left-1 right-1 z-30 h-0.5 rounded-full bg-play",
						style: { top: dropIndex * trackHeight() }
					}) : null, tracks.map((track, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrackHeader, {
						track,
						index,
						selected: selectedTrackId === track.id,
						lifted: draggingTrackId === track.id,
						draggingId: draggingTrackId,
						setDraggingId: setDraggingTrackId,
						dropIndex,
						setDropIndex,
						listRef: heads
					}, track.id))]
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: board,
			className: cn("timeline-lanes min-h-0 min-w-0 flex-1 overflow-auto", dragging && "is-dragging"),
			onScroll: syncFromBoard,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				style: {
					width,
					minHeight: stackH + rulerHeight()
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "sticky top-0 z-40 h-ruler overflow-hidden border-b border-border/70 glass-bar",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ruler, {
						bpm,
						zoom,
						duration,
						width
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						ref: headRef,
						className: "pointer-events-none absolute top-0 z-30 h-ruler w-0.5 bg-play will-change-transform",
						style: {
							left: 0,
							transform: `translate3d(${x0}px,0,0)`
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -left-1.5 top-0 size-2.5 rotate-45 bg-play" })
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative select-none",
					style: {
						width,
						minHeight: Math.max(stackH, 1)
					},
					children: [
						loopEnabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pointer-events-none absolute top-0 z-10 border-x border-primary/50 bg-primary/5",
							style: {
								left: loopStart * zoom,
								width: Math.max(2, (loopEnd - loopStart) * zoom),
								height: stackH
							}
						}),
						regionLo != null && regionHi != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pointer-events-none absolute top-0 z-10 border-x border-play/70 bg-play/10",
							style: {
								left: regionLo * zoom,
								width: Math.max(2, (regionHi - regionLo) * zoom),
								height: stackH
							}
						}),
						lastGap && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pointer-events-none absolute top-0 z-[9] border border-dashed border-primary/60 bg-primary/10",
							style: {
								left: lastGap.start * zoom,
								width: Math.max(4, lastGap.duration * zoom),
								height: stackH
							}
						}),
						tracks.map((track) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrackLane, {
							track,
							zoom,
							bpm,
							width,
							lifted: draggingTrackId === track.id,
							locked,
							clipDragging
						}, track.id)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pointer-events-none absolute inset-0 z-20",
							children: clips.map((clip) => {
								const trackIndex = Math.max(0, tracks.findIndex((t) => t.id === clip.trackId));
								const track = tracks[trackIndex] ?? tracks[0];
								if (!track) return null;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipView, {
									clip,
									track,
									trackIndex,
									zoom,
									selected: clip.id === selectedClipId,
									locked,
									dragging: clipDragging === clip.id,
									speedTool: tool === "speed",
									setClipDragging,
									lanesRef: board
								}, clip.id);
							})
						}),
						clips.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pointer-events-none absolute left-1/2 top-8 z-10 w-[min(22rem,86%)] -translate-x-1/2 rounded-lg border border-dashed border-border/80 glass-strong px-4 py-3 text-center text-sm text-muted-foreground",
							children: "Кинь видео или аудио сюда. Первый файл — верхняя дорожка, следующий сразу под ним."
						}),
						markA != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarkLine, {
							time: markA,
							zoom,
							label: "A",
							height: stackH
						}),
						markB != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarkLine, {
							time: markB,
							zoom,
							label: "B",
							height: stackH
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							ref: lineRef,
							className: "pointer-events-none absolute top-0 z-30 w-0.5 bg-play will-change-transform",
							"data-playhead": true,
							style: {
								left: 0,
								height: stackH,
								transform: `translate3d(${x0}px,0,0)`
							}
						})
					]
				})]
			})
		})]
	});
}
function MarkLine({ time, zoom, label, height }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute top-0 z-20 w-px bg-foreground/70",
		style: {
			left: time * zoom,
			height
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "absolute -left-2 top-1 rounded-sm bg-foreground px-1 font-mono text-[10px] leading-4 text-background",
			children: label
		})
	});
}
function Ruler({ bpm, zoom, duration, width }) {
	const bar = 60 / Math.max(20, bpm) * 4;
	const bars = Math.ceil(duration / bar);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: "relative flex h-ruler w-full bg-transparent text-left",
		style: { width },
		onClick: (e) => {
			const rect = e.currentTarget.getBoundingClientRect();
			const x = e.clientX - rect.left;
			engine.seek(Math.max(0, x / zoom));
		},
		children: Array.from({ length: bars + 1 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "absolute top-0 h-ruler border-l border-border/70 pl-1.5 font-mono text-[10px] leading-[var(--ruler-h)] text-muted-foreground",
			style: { left: i * bar * zoom },
			children: i + 1
		}, i))
	});
}
var TrackHeader = (0, import_react.memo)(function TrackHeader({ track, index, selected, lifted, draggingId, setDraggingId, dropIndex, setDropIndex, listRef }) {
	const update = useStudio((s) => s.updateTrack);
	const select = useStudio((s) => s.selectTrack);
	const moveTrack = useStudio((s) => s.moveTrack);
	const snapshot = useStudio((s) => s.snapshot);
	const origin = (0, import_react.useRef)(null);
	const dragging = (0, import_react.useRef)(false);
	const skipClick = (0, import_react.useRef)(false);
	const destRef = (0, import_react.useRef)(index);
	const [editing, setEditing] = (0, import_react.useState)(false);
	const [dy, setDy] = (0, import_react.useState)(0);
	const onDown = (e) => {
		if (e.button !== 0) return;
		if (e.target.closest("input, [data-no-drag]")) return;
		origin.current = {
			x: e.clientX,
			y: e.clientY,
			pointerId: e.pointerId,
			from: index
		};
		dragging.current = false;
		setDy(0);
		e.currentTarget.setPointerCapture(e.pointerId);
	};
	const onMove = (e) => {
		const o = origin.current;
		if (!o) return;
		const dx = e.clientX - o.x;
		const moveY = e.clientY - o.y;
		if (!dragging.current) {
			if (Math.hypot(dx, moveY) < 6) return;
			dragging.current = true;
			snapshot();
			setDraggingId(track.id);
			try {
				navigator.vibrate?.(10);
			} catch {}
		}
		setDy(moveY);
		const list = listRef.current;
		if (!list) return;
		const y = e.clientY - list.getBoundingClientRect().top + list.scrollTop;
		const next = Math.max(0, Math.min(useStudio.getState().tracks.length - 1, Math.floor(y / trackHeight())));
		destRef.current = next;
		setDropIndex(next);
		if (e.clientY > list.getBoundingClientRect().bottom - 28) list.scrollTop += 14;
		if (e.clientY < list.getBoundingClientRect().top + 28) list.scrollTop -= 14;
	};
	const onUp = () => {
		const o = origin.current;
		const was = dragging.current;
		const dest = destRef.current;
		origin.current = null;
		dragging.current = false;
		skipClick.current = was;
		setDy(0);
		setDraggingId(null);
		setDropIndex(null);
		if (was && dest !== o?.from) moveTrack(track.id, dest, { snapshot: false });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex h-track touch-none items-center gap-1 border-b border-border/60 px-1.5", selected ? "bg-foreground/6" : "bg-transparent", lifted && "z-20 rounded-md glass-strong shadow-panel", draggingId && !lifted && "opacity-50"),
		style: lifted ? { transform: `translateY(${dy}px)` } : void 0,
		onPointerDown: onDown,
		onPointerMove: onMove,
		onPointerUp: onUp,
		onPointerCancel: onUp,
		onClick: () => {
			if (skipClick.current) {
				skipClick.current = false;
				return;
			}
			if (!editing) select(track.id);
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("h-4 w-1 shrink-0 rounded-full", colorBar(track.color)) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid size-7 shrink-0 place-items-center text-muted-foreground/80",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GripVertical, { className: "size-3.5" })
			}),
			editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				autoFocus: true,
				value: track.name,
				onChange: (e) => update(track.id, { name: e.target.value }),
				onBlur: () => setEditing(false),
				onKeyDown: (e) => {
					if (e.key === "Enter" || e.key === "Escape") setEditing(false);
				},
				onPointerDown: (e) => e.stopPropagation(),
				onClick: (e) => e.stopPropagation(),
				className: "min-w-0 flex-1 bg-transparent text-xs font-medium outline-none",
				"aria-label": `Имя дорожки ${index + 1}`
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "min-w-0 flex-1 truncate text-left text-xs font-medium",
				onDoubleClick: (e) => {
					e.stopPropagation();
					setEditing(true);
				},
				children: track.name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeaderBtn, {
				active: track.mute,
				title: "Mute",
				onClick: () => update(track.id, { mute: !track.mute }),
				children: "M"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeaderBtn, {
				active: track.solo,
				title: "Solo",
				tone: "play",
				onClick: () => update(track.id, { solo: !track.solo }),
				children: "S"
			})
		]
	});
});
function HeaderBtn({ active, onClick, children, tone = "muted", title }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"data-no-drag": true,
		title,
		onPointerDown: (e) => e.stopPropagation(),
		onClick: (e) => {
			e.stopPropagation();
			onClick();
		},
		className: cn("grid size-7 shrink-0 place-items-center rounded-md text-[10px] font-semibold", active ? tone === "play" ? "bg-play text-background" : tone === "record" ? "bg-record text-background" : "bg-foreground text-background" : "bg-foreground/8 text-muted-foreground"),
		children
	});
}
var TrackLane = (0, import_react.memo)(function TrackLane({ track, zoom, bpm, width, lifted, locked, clipDragging }) {
	const selectTrack = useStudio((s) => s.selectTrack);
	const [over, setOver] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		"data-track-lane": track.id,
		className: cn("relative h-track border-b border-border/60", over && "bg-primary/5", lifted && "z-20", clipDragging && "bg-foreground/[0.03]"),
		style: { width },
		onClick: (e) => {
			if (locked || clipDragging) return;
			if (e.target.closest("[data-clip]")) return;
			selectTrack(track.id);
			const rect = e.currentTarget.getBoundingClientRect();
			const start = Math.max(0, (e.clientX - rect.left) / zoom);
			engine.seek(start);
		},
		onDragOver: (e) => {
			e.preventDefault();
			setOver(true);
		},
		onDragLeave: () => setOver(false),
		onDrop: async (e) => {
			e.preventDefault();
			e.stopPropagation();
			setOver(false);
			const file = e.dataTransfer.files[0];
			if (!file || !isMediaFile(file)) {
				toast.error("Нужен аудио- или видеофайл");
				return;
			}
			const rect = e.currentTarget.getBoundingClientRect();
			const start = Math.max(0, (e.clientX - rect.left) / zoom);
			await importMediaFile(file, {
				trackId: track.id,
				start
			});
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Grid, {
			zoom,
			bpm,
			width
		})
	});
});
function Grid({ zoom, bpm, width }) {
	const beat = 60 / Math.max(20, bpm) * zoom;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none absolute inset-0 opacity-40",
		style: {
			backgroundImage: `linear-gradient(to right, color-mix(in oklab, var(--color-border) 80%, transparent) 1px, transparent 1px)`,
			backgroundSize: `${beat}px 100%`,
			width
		}
	});
}
var ClipView = (0, import_react.memo)(function ClipView({ clip, track, trackIndex, zoom, selected, locked, dragging, speedTool, setClipDragging, lanesRef }) {
	const select = useStudio((s) => s.selectClip);
	const snapshot = useStudio((s) => s.snapshot);
	const tool = useStudio((s) => s.tool);
	const setDragging = useStudio((s) => s.setDragging);
	const buf = getAudioBuffer(clip.bufferId);
	const rate0 = clipRate(clip);
	const rootRef = (0, import_react.useRef)(null);
	const drag = (0, import_react.useRef)(null);
	const armed = (0, import_react.useRef)(false);
	const skipClick = (0, import_react.useRef)(false);
	const grew = (0, import_react.useRef)(false);
	const [live, setLive] = (0, import_react.useState)(null);
	const armMove = (target, pointerId) => {
		if (armed.current) return;
		armed.current = true;
		select(clip.id);
		snapshot();
		setClipDragging(clip.id);
		setDragging(true);
		const node = rootRef.current ?? target;
		try {
			node.setPointerCapture(pointerId);
		} catch {}
		try {
			navigator.vibrate?.(8);
		} catch {}
	};
	const onPointerDown = (e, mode) => {
		e.stopPropagation();
		e.preventDefault();
		if (tool === "razor" || locked) return;
		if (e.pointerType === "touch" && e.isPrimary === false) return;
		drag.current = {
			mode,
			startX: e.clientX,
			startY: e.clientY,
			start: clip.start,
			duration: clip.duration,
			offset: clip.offset,
			rate: rate0,
			sourceLen: sourceLength(clip),
			pointerId: e.pointerId,
			trackIndex
		};
		armed.current = false;
		grew.current = false;
		setLive(null);
		const node = rootRef.current ?? e.currentTarget;
		try {
			node.setPointerCapture(e.pointerId);
		} catch {}
		if (mode !== "move") {
			select(clip.id);
			snapshot();
			armed.current = true;
			setClipDragging(clip.id);
			setDragging(true);
		}
	};
	const onPointerMove = (e) => {
		const d = drag.current;
		if (!d || locked) return;
		const dxPx = e.clientX - d.startX;
		const dyPx = e.clientY - d.startY;
		if (!armed.current) {
			if (Math.hypot(dxPx, dyPx) > CLIP_ARM_PX) armMove(e.currentTarget, d.pointerId);
			else return;
		}
		const dx = (e.clientX - d.startX) / zoom;
		if (d.mode === "move") {
			let start = Math.max(0, d.start + dx);
			if (useStudio.getState().snap) {
				const beat = 60 / Math.max(20, useStudio.getState().bpm);
				start = Math.round(start / beat) * beat;
			}
			const lanes = lanesRef.current;
			let nextIndex = d.trackIndex;
			if (lanes) {
				const rect = lanes.getBoundingClientRect();
				const ruler = rulerHeight();
				const y = e.clientY - rect.top + lanes.scrollTop - ruler;
				const h = trackHeight();
				nextIndex = Math.max(0, Math.floor(y / h));
				const s = useStudio.getState();
				if (nextIndex >= s.tracks.length) {
					if (!grew.current) {
						s.addTrack(void 0, void 0, { snapshot: false });
						grew.current = true;
					}
				}
				const tracks = useStudio.getState().tracks;
				nextIndex = Math.max(0, Math.min(tracks.length - 1, nextIndex));
				if (e.clientX > rect.right - 36) lanes.scrollLeft += 18;
				if (e.clientX < rect.left + 36) lanes.scrollLeft -= 18;
				if (e.clientY > rect.bottom - 36) lanes.scrollTop += 14;
				if (e.clientY < rect.top + 36) lanes.scrollTop -= 14;
			}
			setLive({
				start,
				duration: d.duration,
				offset: d.offset,
				trackIndex: nextIndex,
				rate: d.rate
			});
		} else if (d.mode === "in") {
			const minDx = -d.offset / d.rate;
			const delta = Math.min(d.duration - .05, Math.max(minDx, dx));
			setLive({
				start: d.start + delta,
				duration: d.duration - delta,
				offset: d.offset + delta * d.rate,
				trackIndex: d.trackIndex,
				rate: d.rate
			});
		} else if (d.mode === "out") {
			const bufDur = buf?.duration ?? d.offset + d.sourceLen;
			const maxDur = Math.max(.05, (bufDur - d.offset) / d.rate);
			setLive({
				start: d.start,
				duration: Math.min(maxDur, Math.max(.05, d.duration + dx)),
				offset: d.offset,
				trackIndex: d.trackIndex,
				rate: d.rate
			});
		} else {
			const nextDur = Math.max(.05, d.duration + dx);
			const nextRate = Math.min(4, Math.max(RATE_MIN, d.sourceLen / nextDur));
			setLive({
				start: d.start,
				duration: d.sourceLen / nextRate,
				offset: d.offset,
				trackIndex: d.trackIndex,
				rate: nextRate
			});
		}
	};
	const onPointerUp = () => {
		const d = drag.current;
		skipClick.current = armed.current;
		const next = live;
		drag.current = null;
		if (armed.current && next) {
			const trackId = useStudio.getState().tracks[next.trackIndex]?.id ?? clip.trackId;
			if (d?.mode === "move") useStudio.getState().moveClip(clip.id, {
				start: next.start,
				trackId
			}, { snapshot: false });
			else if (d?.mode === "stretch") useStudio.getState().updateClip(clip.id, {
				duration: next.duration,
				rate: next.rate,
				preservePitch: false
			});
			else useStudio.getState().updateClip(clip.id, {
				start: next.start,
				duration: next.duration,
				offset: next.offset
			});
			useStudio.getState().ensureSpareTracks(5);
		}
		setClipDragging(null);
		setDragging(false);
		armed.current = false;
		setLive(null);
	};
	const start = live?.start ?? clip.start;
	const duration = live?.duration ?? clip.duration;
	const offset = live?.offset ?? clip.offset;
	const rate = live?.rate ?? rate0;
	const idx = live?.trackIndex ?? trackIndex;
	const h = trackHeight();
	const showStretch = selected || speedTool;
	const stretching = drag.current?.mode === "stretch" || live != null && Math.abs(rate - rate0) > .001;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("pointer-events-auto absolute overflow-hidden rounded-md border clip-h touch-none", selected ? "z-10 border-foreground" : "border-transparent", clip.muted && "opacity-40", fillClip(track.color), tool === "razor" && "cursor-cell", dragging && "z-30 scale-[1.02] shadow-panel ring-1 ring-foreground/40"),
		"data-clip": clip.id,
		ref: rootRef,
		onClick: (e) => {
			e.stopPropagation();
			if (skipClick.current) {
				skipClick.current = false;
				return;
			}
			const rect = e.currentTarget.getBoundingClientRect();
			const t = clip.start + (e.clientX - rect.left) / Math.max(1, rect.width) * clip.duration;
			engine.seek(t);
			if (tool === "razor") {
				if (useStudio.getState().splitClipAt(clip.id, t)) toast.success("Разрезано");
				return;
			}
			select(clip.id);
		},
		style: {
			left: 0,
			top: 0,
			width: Math.max(8, duration * zoom),
			transform: `translate3d(${start * zoom}px, ${idx * h + 3}px, 0)`,
			willChange: dragging ? "transform" : void 0
		},
		onPointerDown: (e) => onPointerDown(e, speedTool ? "stretch" : "move"),
		onPointerMove,
		onPointerUp,
		onPointerCancel: onPointerUp,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Waveform, {
				bufferId: clip.bufferId,
				color: track.color,
				offset,
				duration: duration * rate,
				bufferDuration: buf?.duration ?? sourceLength(clip),
				fadeIn: clip.fadeIn,
				fadeOut: clip.fadeOut,
				className: "absolute inset-0 size-full"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none absolute inset-x-0 top-0 truncate px-1.5 pt-0.5 text-[10px] font-medium text-foreground/90",
				children: [clip.sourceKind === "video" ? "Видео · " : "", clip.name]
			}),
			(selected || stretching || Math.abs(rate - 1) > .02) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none absolute bottom-0.5 left-1.5 rounded-sm bg-background/70 px-1 font-mono text-[10px] tabular text-play",
				children: ["×", rate.toFixed(2)]
			}),
			tool !== "razor" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-y-0 left-0 z-10 w-handle cursor-ew-resize",
				onPointerDown: (e) => onPointerDown(e, "in")
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-y-0 right-0 z-10 w-handle cursor-ew-resize",
				onPointerDown: (e) => onPointerDown(e, "out")
			})] }),
			showStretch && tool !== "razor" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				title: "Скорость — тяни вправо или влево",
				"aria-label": "Скорость клипа",
				className: cn("absolute inset-y-0 right-[var(--handle-w)] z-20 flex w-6 items-center justify-center rounded-l-sm bg-foreground/25 text-foreground", speedTool && "speed-handle-pulse bg-play/40"),
				onPointerDown: (e) => onPointerDown(e, "stretch"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-px",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[9px] font-semibold leading-none",
							children: "‹"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-3 w-px bg-current" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[9px] font-semibold leading-none",
							children: "›"
						})
					]
				})
			})
		]
	});
});
function colorBar(color) {
	return {
		"lane-coral": "bg-lane-coral",
		"lane-teal": "bg-lane-teal",
		"lane-blue": "bg-lane-blue",
		"lane-sage": "bg-lane-sage",
		"lane-bronze": "bg-lane-bronze",
		"lane-slate": "bg-lane-slate"
	}[color] ?? "bg-lane-coral";
}
function fillClip(color) {
	return {
		"lane-coral": "bg-lane-coral/25",
		"lane-teal": "bg-lane-teal/25",
		"lane-blue": "bg-lane-blue/25",
		"lane-sage": "bg-lane-sage/25",
		"lane-bronze": "bg-lane-bronze/25",
		"lane-slate": "bg-lane-slate/25"
	}[color] ?? "bg-lane-coral/25";
}
var Label = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
	ref,
	className: cn("text-xs font-medium text-muted-foreground", className),
	...props
}));
Label.displayName = Root.displayName;
var Slider = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Slider$1, {
	ref,
	className: cn("relative flex w-full touch-none select-none items-center py-3", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderTrack, {
		className: "relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-3",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderRange, { className: "absolute h-full bg-primary" })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SliderThumb, { className: "relative block size-5 rounded-full border border-primary bg-foreground shadow-sm transition-[transform,box-shadow] duration-150 after:absolute after:inset-[-12px] after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none disabled:opacity-50" })]
}));
Slider.displayName = Slider$1.displayName;
var Tabs = Root2;
var TabsList = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
	ref,
	className: cn("inline-flex h-9 items-center justify-start gap-1 rounded-lg bg-surface-2 p-1 text-muted-foreground", className),
	...props
}));
TabsList.displayName = List.displayName;
var TabsTrigger = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger, {
	ref,
	className: cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 data-[state=active]:bg-surface-3 data-[state=active]:text-foreground", className),
	...props
}));
TabsTrigger.displayName = Trigger.displayName;
var TabsContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content, {
	ref,
	className: cn("mt-3 focus-visible:outline-none", className),
	...props
}));
TabsContent.displayName = Content.displayName;
var MEDIA_ACCEPT = "audio/*,video/*,.mp3,.wav,.ogg,.m4a,.flac,.webm,.mp4,.mov,.mkv,.m4v,.aac,.3gp";
function BottomPanel() {
	const tab = useStudio((s) => s.bottomTab);
	const setTab = useStudio((s) => s.setBottomTab);
	const clipId = useStudio((s) => s.selectedClipId);
	const panelOpen = useStudio((s) => s.panelOpen);
	const setPanelOpen = useStudio((s) => s.setPanelOpen);
	const lastGap = useStudio((s) => s.lastGap);
	const tool = useStudio((s) => s.tool);
	const setTool = useStudio((s) => s.setTool);
	const undo = useStudio((s) => s.undo);
	const redo = useStudio((s) => s.redo);
	const undoLen = useStudio((s) => s.undoStack.length);
	const redoLen = useStudio((s) => s.redoStack.length);
	const addTrack = useStudio((s) => s.addTrack);
	const ensureSpare = useStudio((s) => s.ensureSpareTracks);
	const videoRef = (0, import_react.useRef)(null);
	const audioRef = (0, import_react.useRef)(null);
	const pick = async (file, atGap = false) => {
		if (!file) return;
		await importMediaFile(file, { start: atGap ? useStudio.getState().lastGap?.start ?? void 0 : 0 });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "dock-safe shrink-0",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: videoRef,
				type: "file",
				accept: "video/*,.mp4,.mov,.webm,.mkv,.m4v,.3gp",
				className: "hidden",
				onChange: async (e) => {
					const file = e.target.files?.[0];
					e.target.value = "";
					await pick(file, false);
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: audioRef,
				type: "file",
				accept: MEDIA_ACCEPT,
				className: "hidden",
				multiple: true,
				onChange: async (e) => {
					const files = [...e.target.files ?? []];
					e.target.value = "";
					for (const file of files) await pick(file, false);
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-0.5 overflow-x-auto border-t border-border/50 px-1 py-0.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HistoryBtn, {
						label: "<",
						title: "Отменить",
						disabled: !undoLen,
						onClick: undo
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HistoryBtn, {
						label: ">",
						title: "Вернуть",
						disabled: !redoLen,
						onClick: redo
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DockBtn, {
						label: "Видео",
						onClick: () => videoRef.current?.click(),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Film, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DockBtn, {
						label: "Аудио",
						onClick: () => audioRef.current?.click(),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DockBtn, {
						label: "Ножницы",
						onClick: () => actionSplitAtPlayhead(),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scissors, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DockBtn, {
						label: "Скорость",
						active: tool === "speed",
						onClick: () => {
							setTool(tool === "speed" ? "pointer" : "speed");
							if (!clipId) return;
							setTab("clip");
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DockBtn, {
						label: lastGap ? "В вырез" : "Кусок",
						onClick: () => actionDeleteSelected(),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DockBtn, {
						label: "Дорожка",
						onClick: () => {
							addTrack();
							ensureSpare(5);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: cn("ml-auto flex h-9 items-center gap-1 rounded-md px-2 text-xs", panelOpen ? "text-foreground" : "text-muted-foreground"),
						onClick: () => setPanelOpen(!panelOpen),
						children: [panelOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "size-4" }), "Ещё"]
					})
				]
			}),
			panelOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex h-[min(236px,36vh)] flex-col border-t border-border/50",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
					value: tab,
					onValueChange: (v) => setTab(v),
					className: "flex min-h-0 flex-1 flex-col",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 overflow-x-auto px-2 py-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
									value: "cut",
									children: "Нарезка"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
									value: "split",
									children: "Стемы"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
									value: "clip",
									children: "Клип"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
									value: "mixer",
									children: "Микшер"
								})
							] }), clipId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] text-muted-foreground",
								children: "Клип выбран"
							}) : null]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "cut",
							className: "mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CutPanel, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "mixer",
							className: "mt-0 min-h-0 flex-1 overflow-x-auto px-2 pb-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mixer, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "clip",
							className: "mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipInspector, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "split",
							className: "mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SplitPanel, {})
						})
					]
				})
			}) : null
		]
	});
}
function DockBtn({ label, onClick, children, active }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		className: cn("flex h-9 min-w-11 flex-col items-center justify-center gap-0.5 rounded-md px-1.5 transition-colors duration-150 hover:bg-foreground/8 hover:text-foreground", active ? "bg-foreground/10 text-play" : "text-muted-foreground"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "[&_svg]:size-3.5",
			children
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-[9px] font-medium leading-none",
			children: label
		})]
	});
}
function CutPanel() {
	const markA = useStudio((s) => s.markA);
	const markB = useStudio((s) => s.markB);
	const lastGap = useStudio((s) => s.lastGap);
	const clip = useStudio((s) => s.clips.find((c) => c.id === s.selectedClipId));
	const videoRef = (0, import_react.useRef)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-xl space-y-2 pt-0.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-semibold",
				children: "Нарезка"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 text-xs leading-relaxed text-muted-foreground",
				children: "Ползунок на начало — ножницы. На конец — ещё раз. Удали середину. Случайный клик дорожку не двигает."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						className: "h-9",
						variant: "secondary",
						onClick: () => actionSplitAtPlayhead(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scissors, {}), " По ползунку"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						className: "h-9",
						variant: "secondary",
						onClick: () => actionDeleteSelected(),
						disabled: !clip,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {}), " Удалить кусок"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						className: "h-9",
						variant: "secondary",
						onClick: () => actionSetMark("a"),
						children: ["Метка A ", markA != null ? markA.toFixed(2) : ""]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						className: "h-9",
						variant: "secondary",
						onClick: () => actionSetMark("b"),
						children: ["Метка B ", markB != null ? markB.toFixed(2) : ""]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "h-9",
						onClick: () => actionCutMarked(),
						disabled: markA == null || markB == null,
						children: "Вырезать A–B"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "h-9",
						variant: "secondary",
						onClick: () => actionLiftMarked(),
						disabled: markA == null || markB == null,
						children: "На новую дорожку"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: videoRef,
				type: "file",
				accept: "audio/*,video/*",
				className: "hidden",
				onChange: async (e) => {
					const file = e.target.files?.[0];
					e.target.value = "";
					if (!file) return;
					await importMediaFile(file, { start: useStudio.getState().lastGap?.start ?? 0 });
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				className: "h-9 w-full",
				variant: lastGap ? "default" : "outline",
				onClick: () => videoRef.current?.click(),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Film, {}),
					" ",
					lastGap ? "Вставить в вырез" : "Добавить файл на следующую дорожку"
				]
			})
		]
	});
}
function Mixer() {
	const tracks = useStudio((s) => s.tracks);
	const master = useStudio((s) => s.masterGain);
	const setMaster = useStudio((s) => s.setMaster);
	const clips = useStudio((s) => s.clips);
	const occupied = new Set(clips.map((c) => c.trackId));
	const live = tracks.filter((t) => occupied.has(t.id));
	const shown = live.length ? live : tracks.slice(0, 8);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full min-w-max gap-2 pt-1",
		children: [shown.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MixerStrip, { track: t }, t.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex w-20 flex-col items-center gap-1 rounded-lg bg-foreground/6 p-1.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
					children: "Master"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fader, {
					value: master,
					max: MASTER_VOL_MAX,
					onChange: setMaster
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("font-mono text-[10px] tabular", master > 1.01 ? "text-play" : "text-muted-foreground"),
					children: Math.round(master * 100)
				})
			]
		})]
	});
}
function MixerStrip({ track }) {
	const update = useStudio((s) => s.updateTrack);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex w-20 flex-col items-center gap-1 rounded-lg bg-foreground/6 p-1.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-full truncate text-center text-[11px] font-medium",
				children: track.name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fader, {
				value: track.volume,
				max: 2,
				onChange: (v) => update(track.id, { volume: v })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("font-mono text-[10px] tabular", track.volume > 1.01 ? "text-play" : "text-muted-foreground"),
				children: Math.round(track.volume * 100)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex w-full gap-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: cn("h-7 flex-1 rounded-md text-[10px] font-semibold", track.mute ? "bg-foreground text-background" : "bg-foreground/10 text-muted-foreground"),
					onClick: () => update(track.id, { mute: !track.mute }),
					children: "M"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: cn("h-7 flex-1 rounded-md text-[10px] font-semibold", track.solo ? "bg-play text-background" : "bg-foreground/10 text-muted-foreground"),
					onClick: () => update(track.id, { solo: !track.solo }),
					children: "S"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
				className: "text-[10px]",
				children: "Pan"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
				min: -1,
				max: 1,
				step: .01,
				value: [track.pan],
				onValueChange: ([v]) => update(track.id, { pan: v ?? 0 })
			})
		]
	});
}
function Fader({ value, onChange, max = 2 }) {
	const ref = (0, import_react.useRef)(null);
	const setFromY = (clientY) => {
		const el = ref.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const t = 1 - (clientY - rect.top) / Math.max(1, rect.height);
		onChange(Math.min(max, Math.max(0, t * max)));
	};
	const onPointer = (e) => {
		e.preventDefault();
		e.stopPropagation();
		e.currentTarget.setPointerCapture(e.pointerId);
		setFromY(e.clientY);
	};
	const unity = 1 / max * 100;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: "relative h-20 w-8 touch-none rounded-full bg-foreground/10",
		onPointerDown: onPointer,
		onPointerMove: (e) => {
			if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromY(e.clientY);
		},
		role: "slider",
		"aria-valuemin": 0,
		"aria-valuemax": Math.round(max * 100),
		"aria-valuenow": Math.round(value * 100),
		"aria-label": "Громкость",
		tabIndex: 0,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute left-1 right-1 border-t border-foreground/30",
				style: { bottom: `${unity}%` }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute bottom-0 left-0 right-0 rounded-full bg-primary",
				style: { height: `${Math.round(value / max * 100)}%` }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-foreground",
				style: { top: `${(1 - value / max) * 100}%` }
			})
		]
	});
}
function ClipInspector() {
	const clip = useStudio((s) => s.clips.find((c) => c.id === s.selectedClipId));
	const projectBpm = useStudio((s) => s.bpm);
	const update = useStudio((s) => s.updateClip);
	const remove = useStudio((s) => s.removeClip);
	const duplicate = useStudio((s) => s.duplicateClip);
	const setClipRate = useStudio((s) => s.setClipRate);
	const setTool = useStudio((s) => s.setTool);
	const keyRoot = useStudio((s) => s.keyRoot);
	const keyMode = useStudio((s) => s.keyMode);
	const [semis, setSemis] = (0, import_react.useState)(0);
	if (!clip) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "max-w-lg pt-2 text-sm text-muted-foreground",
		children: "Выберите клип. BPM и скорость — только у этого куска, не у всего проекта."
	});
	const rate = clipRate(clip);
	const tempo = clipBpm(clip, projectBpm);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Field, {
				label: `BPM клипа${clip.nativeBpm ? ` · было ${Math.round(clip.nativeBpm)}` : ""}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge, { className: "size-4 shrink-0 text-muted-foreground" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BpmInput, {
							value: tempo,
							onCommit: (v) => actionSetClipBpm(v),
							className: "h-8 w-16",
							ariaLabel: "BPM клипа"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							variant: "secondary",
							className: "h-8",
							onClick: () => actionSetClipBpm(projectBpm),
							title: "Подогнать под сетку проекта",
							children: ["Как сетка ", Math.round(projectBpm)]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[10px] text-muted-foreground",
					children: "112, 140, любое — только этот кусок, тон сохраняется."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: `Скорость ×${rate.toFixed(2)}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { className: "size-4 shrink-0 text-muted-foreground" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							min: RATE_MIN,
							max: 4,
							step: .01,
							value: [rate],
							onValueCommit: ([v]) => {
								if (v == null) return;
								setClipRate(clip.id, v);
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "secondary",
							className: "h-8",
							onClick: () => setTool("speed"),
							children: "‹│›"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Громкость клипа",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "size-4 shrink-0 text-muted-foreground" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "range",
							min: 0,
							max: 2,
							step: .01,
							value: clip.gain,
							onChange: (e) => update(clip.id, { gain: Number(e.target.value) }),
							className: "vol-range h-8 w-full",
							"aria-label": "Громкость клипа"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("w-10 text-right font-mono text-xs tabular", clip.gain > 1.01 && "text-play"),
							children: Math.round(clip.gain * 100)
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Field, {
				label: "Затухание слева",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
					min: 0,
					max: Math.max(.05, clip.duration / 2),
					step: .01,
					value: [clip.fadeIn],
					onValueChange: ([v]) => update(clip.id, { fadeIn: v ?? 0 })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "font-mono text-xs tabular text-muted-foreground",
					children: [clip.fadeIn.toFixed(2), " с"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Field, {
				label: "Затухание справа",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
					min: 0,
					max: Math.max(.05, clip.duration / 2),
					step: .01,
					value: [clip.fadeOut],
					onValueChange: ([v]) => update(clip.id, { fadeOut: v ?? 0 })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "font-mono text-xs tabular text-muted-foreground",
					children: [clip.fadeOut.toFixed(2), " с"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: `Тональность ${formatKey(keyRoot, keyMode)}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							min: -12,
							max: 12,
							step: 1,
							value: [semis],
							onValueChange: ([v]) => setSemis(v ?? 0)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "w-8 text-right font-mono text-xs",
							children: semis > 0 ? `+${semis}` : semis
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							disabled: semis === 0,
							onClick: () => void actionPitch(semis).then(() => setSemis(0)),
							children: "Применить"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-1.5 sm:col-span-2 lg:col-span-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "secondary",
						className: "h-8",
						onClick: () => void actionDetectKey(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Music2, {}), " Тональность"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "secondary",
						className: "h-8",
						onClick: () => void actionDetectBpm(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge, {}), " Считать BPM"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "secondary",
						className: "h-8",
						onClick: () => void actionReverse(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlipHorizontal2, {}), " Реверс"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "secondary",
						className: "h-8",
						onClick: () => actionSplitAtPlayhead(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scissors, {}), " По ползунку"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "secondary",
						className: "h-8",
						onClick: () => duplicate(clip.id),
						children: "Дублировать"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "secondary",
						className: "h-8",
						onClick: () => void actionDenoise(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AudioLines, {}), " Шум"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "secondary",
						className: "h-8",
						onClick: () => void actionEnhance(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, {}), " Улучшить"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "secondary",
						className: "h-8",
						onClick: () => void actionNormalize(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WandSparkles, {}), " Норма"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "outline",
						className: "h-8",
						onClick: () => remove(clip.id),
						children: "Удалить клип"
					})
				]
			})
		]
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: label }), children]
	});
}
function SplitPanel() {
	const clip = useStudio((s) => s.clips.find((c) => c.id === s.selectedClipId));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-xl space-y-2.5 pt-0.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-sm font-semibold",
			children: "Стемы"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-0.5 text-xs text-muted-foreground",
			children: "Выбранный клип разбирается на соседние дорожки без пустых промежутков. Минус — без слов, бас — отдельно от ударных."
		})] }), !clip ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted-foreground",
			children: "Сначала выберите клип, который нужно разобрать."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-2 sm:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => void actionSplit("vocals-instrumental"),
				className: "rounded-lg border border-border/70 bg-foreground/6 p-2.5 text-left transition-colors duration-150 hover:border-primary/50 hover:bg-foreground/10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareSplitVertical, { className: "mb-1.5 size-4 text-primary" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-semibold",
						children: "Акапелла + минус"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-0.5 text-xs text-muted-foreground",
						children: "Две дорожки подряд. Песня заменяется."
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => void actionSplit("four-stems"),
				className: "rounded-lg border border-border/70 bg-foreground/6 p-2.5 text-left transition-colors duration-150 hover:border-primary/50 hover:bg-foreground/10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareSplitVertical, { className: "mb-1.5 size-4 text-primary" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-semibold",
						children: "Вокал · ударные · бас"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-0.5 text-xs text-muted-foreground",
						children: "Четыре дорожки: вокал, drums, бас, остальное"
					})
				]
			})]
		})]
	});
}
function BusyOverlay() {
	const busy = useStudio((s) => s.busy);
	const hidden = useStudio((s) => s.busyHidden);
	const hideBusy = useStudio((s) => s.hideBusy);
	if (!busy || hidden) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none fixed inset-x-0 bottom-[5.75rem] z-50 flex justify-center px-3",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-auto w-[min(22rem,calc(100%-2rem))] rounded-xl glass-strong p-4 shadow-panel",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium",
					children: busy.label
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
					value: Math.round(busy.progress * 100),
					className: "mt-3"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 font-mono text-xs tabular text-muted-foreground",
					children: [Math.round(busy.progress * 100), "%"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex gap-2",
					children: [busy.cancelable !== false ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "h-9 flex-1",
						variant: "secondary",
						onClick: () => cancelCurrentOp(),
						children: "Отменить"
					}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "h-9 flex-1",
						variant: "ghost",
						onClick: () => hideBusy(),
						children: "Скрыть"
					})]
				})
			]
		})
	});
}
var TooltipProvider = Provider;
var TooltipContent = import_react.forwardRef(({ className, sideOffset = 6, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	sideOffset,
	className: cn("z-50 overflow-hidden rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-panel", className),
	...props
}) }));
TooltipContent.displayName = Content2.displayName;
async function restoreAudio(data) {
	const audioCtx = engine.ensure();
	const unique = [...new Set(data.clips.map((c) => c.bufferId))];
	await Promise.all(unique.map((id) => restoreBuffer(id, audioCtx).catch(() => null)));
}
function StudioApp({ projectId }) {
	const load = useStudio((s) => s.load);
	const persist = useStudio((s) => s.persist);
	const hydrated = useStudio((s) => s.hydrated);
	const busy = useStudio((s) => s.busy);
	const busyHidden = useStudio((s) => s.busyHidden);
	const loadedFor = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		let alive = true;
		const state = useStudio.getState();
		if (state.hydrated && state.id === projectId) {
			loadedFor.current = projectId;
			restoreAudio(state);
			return () => {
				alive = false;
			};
		}
		if (loadedFor.current !== projectId) useStudio.setState({ hydrated: false });
		(async () => {
			try {
				const data = await loadProjectAsync(projectId);
				if (!alive) return;
				const now = useStudio.getState();
				if (now.hydrated && now.id === projectId && now.undoStack.length > 0) {
					restoreAudio(now);
					return;
				}
				if (!data) {
					if (now.id === projectId && now.clips.length > 0) {
						useStudio.setState({ hydrated: true });
						return;
					}
					const fresh = createEmptyProject();
					fresh.id = projectId;
					saveProject(fresh, 0);
					if (alive) load(fresh);
					loadedFor.current = projectId;
					return;
				}
				load(data);
				loadedFor.current = projectId;
				await restoreAudio(data);
				if (alive) useStudio.setState((s) => ({ clips: s.clips.map((c) => ({ ...c })) }));
			} catch {
				if (!alive) return;
				const now = useStudio.getState();
				if (now.id === projectId && now.clips.length > 0) {
					useStudio.setState({ hydrated: true });
					toast.error("Часть аудио могла не подгрузиться");
					return;
				}
				const fresh = createEmptyProject();
				fresh.id = projectId;
				load(fresh);
				toast.error("Проект открыт, часть аудио могла не загрузиться");
			}
		})();
		return () => {
			alive = false;
		};
	}, [projectId, load]);
	(0, import_react.useEffect)(() => {
		return () => {
			engine.stop();
		};
	}, [projectId]);
	(0, import_react.useEffect)(() => {
		const t = window.setInterval(() => {
			const s = useStudio.getState();
			if (!s.busy && !s.dragging && s.hydrated) persist();
		}, 1e4);
		return () => window.clearInterval(t);
	}, [persist]);
	(0, import_react.useEffect)(() => {
		const kill = (e) => e.preventDefault();
		document.addEventListener("gesturestart", kill, { passive: false });
		document.addEventListener("gesturechange", kill, { passive: false });
		document.addEventListener("gestureend", kill, { passive: false });
		return () => {
			document.removeEventListener("gesturestart", kill);
			document.removeEventListener("gesturechange", kill);
			document.removeEventListener("gestureend", kill);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const resume = () => void engine.resume().catch(() => void 0);
		const onKey = (e) => {
			resume();
			const tag = e.target?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;
			if (e.code === "Space") {
				e.preventDefault();
				(async () => {
					await engine.resume();
					if (engine.playing) engine.pause();
					else await engine.play(mixSnapshot());
				})();
			}
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
				e.preventDefault();
				if (e.shiftKey) useStudio.getState().redo();
				else useStudio.getState().undo();
			}
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
				e.preventDefault();
				useStudio.getState().redo();
			}
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
				e.preventDefault();
				useStudio.getState().persist();
				toast.success("Сохранено");
			}
			if (e.key === "Delete" || e.key === "Backspace") {
				const id = useStudio.getState().selectedClipId;
				if (id) useStudio.getState().removeClip(id);
			}
			if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) useStudio.getState().splitAtPlayhead(engine.getPlayhead());
			if (e.key.toLowerCase() === "a" && !e.metaKey && !e.ctrlKey) useStudio.getState().setMarkA(engine.getPlayhead());
			if (e.key.toLowerCase() === "b" && !e.metaKey && !e.ctrlKey) useStudio.getState().setMarkB(engine.getPlayhead());
		};
		window.addEventListener("pointerdown", resume);
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("pointerdown", resume);
			window.removeEventListener("keydown", onKey);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipProvider, {
		delayDuration: 250,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex h-dvh min-h-0 flex-col overflow-hidden bg-background",
			onDragOver: (e) => e.preventDefault(),
			onDrop: async (e) => {
				e.preventDefault();
				if (e.target?.closest?.("[data-track-lane]")) return;
				if (useStudio.getState().busy) {
					toast.error("Дождись окончания текущей операции");
					return;
				}
				const files = [...e.dataTransfer.files].filter(isMediaFile);
				if (!files.length) {
					toast.error("Нужен аудио- или видеофайл");
					return;
				}
				for (const file of files) await importMediaFile(file);
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TopBar, {}),
				hydrated ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timeline, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-1 items-center justify-center text-sm text-muted-foreground",
					children: "Открываем проект…"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "glass-bar shrink-0 border-t border-border/60",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Transport, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BottomPanel, {})]
				}),
				busy && !busyHidden ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BusyOverlay, {}) : null
			]
		})
	});
}
function MixPage() {
	const { projectId } = Route.useParams();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StudioApp, { projectId });
}
//#endregion
export { MixPage as component };

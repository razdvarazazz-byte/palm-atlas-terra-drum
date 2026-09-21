import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { l as uid, o as clamp, s as cn } from "./router-CV-Zednt.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/projects-DCNCT3TJ.js
var import_jsx_runtime = require_jsx_runtime();
function PulseLogo({ className, markClassName }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn("inline-flex items-center gap-2 font-semibold tracking-tight", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 24 24",
			className: cn("size-7", markClassName),
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					width: "24",
					height: "24",
					rx: "6",
					className: "fill-primary"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "5",
					y: "13",
					width: "2.2",
					height: "6",
					rx: "0.6",
					className: "fill-primary-foreground"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "9",
					y: "7",
					width: "2.2",
					height: "12",
					rx: "0.6",
					className: "fill-primary-foreground"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "13",
					y: "10",
					width: "2.2",
					height: "9",
					rx: "0.6",
					className: "fill-primary-foreground"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: "17",
					y: "5",
					width: "2.2",
					height: "14",
					rx: "0.6",
					className: "fill-primary-foreground"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Pulse" })]
	});
}
var RATE_MIN = .25;
function clipRate(clip) {
	const r = clip.rate ?? 1;
	return clamp(Number.isFinite(r) && r > 0 ? r : 1, RATE_MIN, 4);
}
function sourceLength(clip) {
	return Math.max(.01, clip.duration * clipRate(clip));
}
function clipBpm(clip, fallback = 120) {
	const native = clip.nativeBpm && clip.nativeBpm > 0 ? clip.nativeBpm : fallback;
	return Math.round(native * clipRate(clip) * 10) / 10;
}
function applyTempo(clip, targetBpm, nativeBpm) {
	const native = clamp(nativeBpm, 20, 400);
	const target = clamp(targetBpm, 20, 400);
	const src = sourceLength(clip);
	const rate = clamp(target / native, RATE_MIN, 4);
	return {
		nativeBpm: native,
		rate,
		duration: src / rate,
		preservePitch: true
	};
}
function applyRate(clip, nextRate) {
	const src = sourceLength(clip);
	const rate = clamp(nextRate, RATE_MIN, 4);
	return {
		rate,
		duration: src / rate,
		preservePitch: false
	};
}
var DB_NAME = "pulse-audio";
var DB_VERSION = 2;
var STORE_BUFFERS = "buffers";
var STORE_PROJECTS = "projects";
var STORE_LIST = "meta";
var opening = null;
function withTimeout(promise, ms, label = "timeout") {
	return new Promise((resolve, reject) => {
		const t = globalThis.setTimeout(() => reject(new Error(label)), ms);
		promise.then((v) => {
			globalThis.clearTimeout(t);
			resolve(v);
		}, (err) => {
			globalThis.clearTimeout(t);
			reject(err);
		});
	});
}
function openDb() {
	if (typeof indexedDB === "undefined") return Promise.reject(/* @__PURE__ */ new Error("IndexedDB недоступен"));
	if (opening) return opening;
	opening = withTimeout(new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains("buffers")) db.createObjectStore(STORE_BUFFERS);
			if (!db.objectStoreNames.contains("projects")) db.createObjectStore(STORE_PROJECTS);
			if (!db.objectStoreNames.contains("meta")) db.createObjectStore(STORE_LIST);
		};
		req.onsuccess = () => {
			const db = req.result;
			db.onversionchange = () => {
				db.close();
				opening = null;
			};
			resolve(db);
		};
		req.onerror = () => {
			opening = null;
			reject(req.error);
		};
		req.onblocked = () => {
			opening = null;
			reject(/* @__PURE__ */ new Error("IndexedDB занят"));
		};
	}), 4e3, "IndexedDB timeout").catch((err) => {
		opening = null;
		throw err;
	});
	return opening;
}
async function idbGet(store, key) {
	const db = await openDb();
	return withTimeout(new Promise((resolve, reject) => {
		const req = db.transaction(store, "readonly").objectStore(store).get(key);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	}), 8e3, "idb get timeout");
}
async function idbSet(store, key, value) {
	const db = await openDb();
	return withTimeout(new Promise((resolve, reject) => {
		const tx = db.transaction(store, "readwrite");
		tx.objectStore(store).put(value, key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error ?? /* @__PURE__ */ new Error("idb abort"));
	}), 12e3, "idb set timeout");
}
async function idbDel(store, key) {
	const db = await openDb();
	return withTimeout(new Promise((resolve, reject) => {
		const tx = db.transaction(store, "readwrite");
		tx.objectStore(store).delete(key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	}), 8e3, "idb del timeout");
}
var buffers = /* @__PURE__ */ new Map();
var peaksCache = /* @__PURE__ */ new Map();
function setAudioBuffer(id, buffer) {
	buffers.set(id, buffer);
	peaksCache.delete(id);
}
function getAudioBuffer(id) {
	return buffers.get(id);
}
function mixToMono(buffer) {
	const n = buffer.length;
	const out = new Float32Array(n);
	const ch = buffer.numberOfChannels;
	for (let c = 0; c < ch; c++) {
		const data = buffer.getChannelData(c);
		for (let i = 0; i < n; i++) out[i] += data[i] / ch;
	}
	return out;
}
function createBufferFromChannels(ctx, channels, sampleRate) {
	const length = channels[0]?.length ?? 0;
	const buffer = ctx.createBuffer(channels.length, length, sampleRate);
	for (let c = 0; c < channels.length; c++) buffer.getChannelData(c).set(channels[c]);
	return buffer;
}
function extractSlice(buffer, ctx, startSec, durationSec) {
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
function reverseBuffer(buffer, ctx) {
	const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
	for (let c = 0; c < buffer.numberOfChannels; c++) {
		const src = buffer.getChannelData(c);
		const dst = out.getChannelData(c);
		for (let i = 0, j = src.length - 1; i < src.length; i++, j--) dst[i] = src[j];
	}
	return out;
}
var PEAK_BINS = 768;
function getWaveformPeaks(id, bins = PEAK_BINS) {
	const cached = peaksCache.get(id);
	if (cached && cached.bins === bins) return cached.peaks;
	const buffer = buffers.get(id);
	if (!buffer) return null;
	const peaks = computePeaks(buffer, bins);
	peaksCache.set(id, {
		peaks,
		bins
	});
	return peaks;
}
/** Interleaved min/max pairs, length = bins * 2. */
function computePeaks(buffer, bins) {
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
			const v0 = data0[i];
			if (v0 < min) min = v0;
			if (v0 > max) max = v0;
			if (data1) {
				const v1 = data1[i];
				if (v1 < min) min = v1;
				if (v1 > max) max = v1;
			}
		}
		peaks[b * 2] = min;
		peaks[b * 2 + 1] = max;
	}
	return peaks;
}
var persistChain = Promise.resolve();
async function persistBuffer(id, buffer) {
	if (typeof indexedDB === "undefined") return;
	const sampleRate = buffer.sampleRate;
	const channels = [];
	for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));
	persistChain = persistChain.then(async () => {
		try {
			await idbSet(STORE_BUFFERS, id, {
				sampleRate,
				channels
			});
		} catch {}
	}).catch(() => void 0);
	return persistChain;
}
async function restoreBuffer(id, ctx) {
	if (typeof indexedDB === "undefined") return null;
	if (buffers.has(id)) return buffers.get(id);
	try {
		const rec = await idbGet(STORE_BUFFERS, id);
		if (!rec) return null;
		const buffer = createBufferFromChannels(ctx, rec.channels.map((c) => c instanceof Float32Array ? c : new Float32Array(c)), rec.sampleRate);
		setAudioBuffer(id, buffer);
		return buffer;
	} catch {
		return null;
	}
}
async function deleteBuffer(id) {
	buffers.delete(id);
	peaksCache.delete(id);
	if (typeof indexedDB === "undefined") return;
	try {
		await idbDel(STORE_BUFFERS, id);
	} catch {}
}
var listeners = /* @__PURE__ */ new Set();
var playListeners = /* @__PURE__ */ new Set();
function playbackOf(clip) {
	const rate = clipRate(clip);
	return {
		rate,
		detune: clip.preservePitch && Math.abs(rate - 1) > .001 ? -1200 * Math.log2(rate) : 0
	};
}
var AudioEngine = class {
	ctx = null;
	master = null;
	compressor = null;
	metronomeGain = null;
	playing = false;
	recording = false;
	metronome = false;
	playhead = 0;
	originPlayhead = 0;
	startedAt = 0;
	sources = [];
	timer = null;
	snapshot = null;
	recChunks = [];
	rec = null;
	recStream = null;
	trackGain = /* @__PURE__ */ new Map();
	trackPan = /* @__PURE__ */ new Map();
	recStartedAt = 0;
	recTrackId = null;
	wallOrigin = 0;
	ensure() {
		if (!this.ctx) {
			const Ctx = window.AudioContext || window.webkitAudioContext;
			this.ctx = new Ctx();
			this.master = this.ctx.createGain();
			this.master.gain.value = 1;
			this.compressor = this.ctx.createDynamicsCompressor();
			this.compressor.threshold.value = -1;
			this.compressor.knee.value = 1.5;
			this.compressor.ratio.value = 12;
			this.compressor.attack.value = .002;
			this.compressor.release.value = .08;
			this.metronomeGain = this.ctx.createGain();
			this.metronomeGain.gain.value = .22;
			this.master.connect(this.compressor);
			this.compressor.connect(this.ctx.destination);
			this.metronomeGain.connect(this.master);
		}
		return this.ctx;
	}
	chainFor(track) {
		const ctx = this.ensure();
		let gain = this.trackGain.get(track.id);
		let pan = this.trackPan.get(track.id);
		if (!gain || !pan) {
			gain = ctx.createGain();
			pan = ctx.createStereoPanner();
			gain.connect(pan);
			pan.connect(this.master);
			this.trackGain.set(track.id, gain);
			this.trackPan.set(track.id, pan);
		}
		const soloed = this.snapshot?.tracks.some((t) => t.solo) ?? false;
		const vol = track.mute || soloed && !track.solo ? 0 : clamp(track.volume, 0, 2);
		gain.gain.setTargetAtTime(vol, ctx.currentTime, .015);
		pan.pan.setTargetAtTime(clamp(track.pan, -1, 1), ctx.currentTime, .02);
		return gain;
	}
	refreshTracks() {
		if (!this.snapshot) return;
		for (const track of this.snapshot.tracks) this.chainFor(track);
	}
	applyTrack(track) {
		if (!this.ctx) return;
		if (this.snapshot) this.snapshot.tracks = this.snapshot.tracks.map((t) => t.id === track.id ? { ...track } : t);
		if (this.trackGain.has(track.id) || this.playing) this.chainFor(track);
		else if (this.ctx) this.chainFor(track);
	}
	applyClipGain(clipId, gain) {
		if (this.snapshot) this.snapshot.clips = this.snapshot.clips.map((c) => c.id === clipId ? {
			...c,
			gain
		} : c);
		const ctx = this.ctx;
		if (!ctx) return;
		for (const slot of this.sources) if (slot.clipId === clipId) slot.clipGain.gain.setTargetAtTime(clamp(gain, 0, 4), ctx.currentTime, .015);
	}
	applyClipMute(clipId, muted) {
		if (this.snapshot) this.snapshot.clips = this.snapshot.clips.map((c) => c.id === clipId ? {
			...c,
			muted
		} : c);
		const ctx = this.ctx;
		if (!ctx) return;
		const clip = this.snapshot?.clips.find((c) => c.id === clipId);
		const g = muted ? 0 : clip?.gain ?? 0;
		for (const slot of this.sources) if (slot.clipId === clipId) slot.clipGain.gain.setTargetAtTime(g, ctx.currentTime, .01);
	}
	setMasterGain(v) {
		if (this.snapshot) this.snapshot.masterGain = v;
		const ctx = this.ensure();
		if (this.master) this.master.gain.setTargetAtTime(clamp(v, 0, 2), ctx.currentTime, .015);
	}
	setTempo(bpm, nativeBpm) {
		if (this.snapshot) {
			this.snapshot.bpm = bpm;
			this.snapshot.nativeBpm = nativeBpm;
		}
	}
	async resume() {
		const ctx = this.ensure();
		if (ctx.state === "suspended") await ctx.resume();
	}
	getPlayhead() {
		if (!this.playing) return Number.isFinite(this.playhead) ? Math.max(0, this.playhead) : 0;
		const wall = performance.now() / 1e3 - this.wallOrigin;
		const ctx = this.ctx;
		const audioElapsed = ctx && ctx.state === "running" ? Math.max(0, ctx.currentTime - this.startedAt) : 0;
		let elapsed = ctx && ctx.state === "running" && audioElapsed > .03 ? audioElapsed : wall;
		if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 43200) elapsed = 0;
		this.playhead = Math.max(0, this.originPlayhead + elapsed);
		if (this.snapshot?.loopEnabled) {
			const { loopStart, loopEnd } = this.snapshot;
			const span = Math.max(.05, loopEnd - loopStart);
			if (this.playhead >= loopEnd) this.playhead = loopStart + (this.playhead - loopStart) % span;
		}
		if (!Number.isFinite(this.playhead)) this.playhead = Math.max(0, this.originPlayhead);
		return this.playhead;
	}
	subscribe(fn) {
		listeners.add(fn);
		return () => listeners.delete(fn);
	}
	subscribePlay(fn) {
		playListeners.add(fn);
		fn(this.playing);
		return () => playListeners.delete(fn);
	}
	emit() {
		const t = this.getPlayhead();
		listeners.forEach((fn) => fn(t));
	}
	emitPlay() {
		playListeners.forEach((fn) => fn(this.playing));
	}
	seek(time) {
		const was = this.playing;
		const snap = this.snapshot;
		if (was) this.stopInternal(false);
		this.playhead = Math.max(0, Number.isFinite(time) ? time : 0);
		this.originPlayhead = this.playhead;
		if (was && snap) this.play(snap);
		this.emit();
	}
	async play(snapshot) {
		await this.resume();
		this.snapshot = snapshot;
		if (this.master) this.master.gain.value = clamp(snapshot.masterGain, 0, 2);
		this.stopInternal(false);
		this.playing = true;
		this.emitPlay();
		const ctx = this.ensure();
		if (ctx.state === "suspended") await ctx.resume().catch(() => void 0);
		this.startedAt = ctx.currentTime;
		this.wallOrigin = performance.now() / 1e3;
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
	stopInternal(_reset) {
		for (const slot of this.sources) {
			try {
				slot.source.stop();
			} catch {}
			try {
				slot.source.disconnect();
				slot.fadeGain.disconnect();
				slot.clipGain.disconnect();
			} catch {}
		}
		this.sources = [];
		if (this.timer != null) {
			cancelAnimationFrame(this.timer);
			this.timer = null;
		}
	}
	armClock() {
		const tick = () => {
			if (!this.playing) return;
			const t = this.getPlayhead();
			if (this.snapshot?.loopEnabled && t + .02 >= this.snapshot.loopEnd && this.snapshot.loopEnd > this.snapshot.loopStart) {
				this.seek(this.snapshot.loopStart);
				return;
			}
			this.emit();
			this.timer = requestAnimationFrame(tick);
		};
		this.timer = requestAnimationFrame(tick);
	}
	schedule(snapshot, from, when) {
		const ctx = this.ensure();
		const trackMap = new Map(snapshot.tracks.map((t) => [t.id, t]));
		for (const clip of snapshot.clips) {
			const track = trackMap.get(clip.trackId);
			if (!track) continue;
			const buf = getAudioBuffer(clip.bufferId);
			if (!buf) continue;
			const clipStart = clip.start;
			if (clip.start + clip.duration <= from) continue;
			const localOffset = Math.max(0, from - clipStart);
			const remaining = clip.duration - localOffset;
			if (remaining <= .005) continue;
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
			fadeGain.gain.setValueAtTime(localOffset < fadeIn ? vol * (localOffset / Math.max(fadeIn, .001)) : vol, startAt);
			if (fadeIn > .001 && localOffset < fadeIn) fadeGain.gain.linearRampToValueAtTime(vol, absClipStart + fadeIn);
			if (fadeOut > .001) {
				const tOutStart = absClipStart + clip.duration - fadeOut;
				const startFade = Math.max(startAt, tOutStart);
				fadeGain.gain.setValueAtTime(vol, startFade);
				fadeGain.gain.linearRampToValueAtTime(1e-4, absClipStart + clip.duration);
			}
			source.connect(fadeGain);
			fadeGain.connect(clipGain);
			clipGain.connect(dest);
			try {
				source.start(startAt, Math.min(offset, Math.max(0, buf.duration - .001)), remaining * rate);
			} catch {
				continue;
			}
			this.sources.push({
				source,
				fadeGain,
				clipGain,
				clipId: clip.id
			});
		}
		this.refreshTracks();
		if (this.metronome) this.scheduleMetronome(snapshot.bpm, from, when);
	}
	scheduleMetronome(bpm, from, when) {
		const ctx = this.ensure();
		const beat = 60 / Math.max(20, bpm);
		const startBeat = Math.ceil(from / beat - 1e-4);
		const until = from + 180;
		for (let i = startBeat; i * beat < until; i++) {
			const t = when + (i * beat - from);
			if (t < when - .01) continue;
			const osc = ctx.createOscillator();
			const g = ctx.createGain();
			const accent = i % 4 === 0;
			osc.frequency.value = accent ? 1320 : 880;
			g.gain.setValueAtTime(1e-4, t);
			g.gain.exponentialRampToValueAtTime(accent ? .28 : .14, t + .005);
			g.gain.exponentialRampToValueAtTime(1e-4, t + .06);
			osc.connect(g);
			g.connect(this.metronomeGain);
			osc.start(t);
			osc.stop(t + .07);
		}
	}
	async startRecording(trackId, onClip) {
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
			onClip(new Blob(this.recChunks, { type: rec.mimeType || "audio/webm" }), this.recStartedAt, trackId);
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
	async bounce(snapshot, duration) {
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
			gain.gain.setValueAtTime(fadeIn > 0 ? 1e-4 : vol, t0);
			if (fadeIn > 0) gain.gain.linearRampToValueAtTime(vol, t0 + fadeIn);
			if (fadeOut > 0) {
				gain.gain.setValueAtTime(vol, Math.max(0, t0 + dur - fadeOut));
				gain.gain.linearRampToValueAtTime(1e-4, t0 + dur);
			}
			source.connect(gain);
			gain.connect(pan);
			pan.connect(master);
			try {
				source.start(t0, clip.offset, clip.duration * rate);
			} catch {}
		}
		return offline.startRendering();
	}
};
var engine = new AudioEngine();
var LANE_COLORS = [
	"lane-coral",
	"lane-teal",
	"lane-blue",
	"lane-sage",
	"lane-bronze",
	"lane-slate"
];
/** Master has a little extra headroom without cooking the mix. */
var MASTER_VOL_MAX = 1.5;
var LIST_KEY = "pulse:projects";
var projectKey = (id) => `pulse:project:${id}`;
function spareTracks(count = 5) {
	return Array.from({ length: count }, (_, i) => ({
		id: uid("trk"),
		name: `Дорожка ${i + 1}`,
		color: LANE_COLORS[i % LANE_COLORS.length],
		volume: 1,
		pan: 0,
		mute: false,
		solo: false,
		armed: false
	}));
}
function createEmptyProject(name = "Новый микс") {
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
		zoom: 56
	};
}
function readLocalList() {
	if (typeof localStorage === "undefined") return [];
	try {
		const raw = localStorage.getItem(LIST_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}
function listProjects() {
	return readLocalList();
}
async function listProjectsAsync() {
	const local = readLocalList();
	try {
		const stored = await idbGet(STORE_LIST, "all");
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
	} catch {}
	return local;
}
function writeLocalList(list) {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(LIST_KEY, JSON.stringify(list.slice(0, 60)));
	} catch {}
}
function loadProject(id) {
	try {
		const raw = localStorage.getItem(projectKey(id));
		if (!raw) return null;
		return normalizeProject(JSON.parse(raw));
	} catch {
		return null;
	}
}
async function loadProjectAsync(id) {
	const local = loadProject(id);
	if (local) return local;
	try {
		const rec = await idbGet(STORE_PROJECTS, id);
		if (rec) {
			const data = normalizeProject(rec);
			try {
				localStorage.setItem(projectKey(id), JSON.stringify(data));
			} catch {}
			return data;
		}
	} catch {}
	return null;
}
function normalizeClip(c) {
	return {
		...c,
		rate: c.rate && c.rate > 0 ? c.rate : 1,
		nativeBpm: c.nativeBpm ?? null,
		preservePitch: c.preservePitch ?? false
	};
}
function normalizeProject(data) {
	return {
		...data,
		nativeBpm: data.nativeBpm ?? data.bpm ?? 120,
		bpm: data.bpm ?? 120,
		keyRoot: data.keyRoot ?? null,
		keyMode: data.keyMode ?? null,
		masterGain: data.masterGain ?? 1,
		zoom: data.zoom ?? 56,
		tracks: data.tracks ?? [],
		clips: (data.clips ?? []).map(normalizeClip)
	};
}
function projectDuration(data) {
	return data.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
}
function saveProject(data, duration = 0) {
	const normalized = normalizeProject(data);
	const meta = {
		id: normalized.id,
		name: normalized.name,
		updatedAt: Date.now(),
		bpm: normalized.bpm,
		duration: duration || projectDuration(normalized)
	};
	try {
		localStorage.setItem(projectKey(normalized.id), JSON.stringify(normalized));
	} catch {}
	const list = listProjects().filter((p) => p.id !== normalized.id);
	list.unshift(meta);
	writeLocalList(list);
	persistIdb(normalized, list);
}
async function persistIdb(data, list) {
	try {
		await idbSet(STORE_PROJECTS, data.id, data);
		await idbSet(STORE_LIST, "all", list);
	} catch {}
}
function deleteProject(id) {
	const data = loadProject(id);
	try {
		localStorage.removeItem(projectKey(id));
	} catch {}
	writeLocalList(listProjects().filter((p) => p.id !== id));
	try {
		sessionStorage.removeItem(`pulse:undo:${id}`);
	} catch {}
	(async () => {
		try {
			const rec = data ?? await idbGet("projects", id);
			if (rec) {
				const ids = new Set(rec.clips.map((c) => c.bufferId));
				for (const bid of ids) await deleteBuffer(bid);
			}
			await idbDel(STORE_PROJECTS, id);
			await idbSet(STORE_LIST, "all", listProjects());
		} catch {}
	})();
}
//#endregion
export { saveProject as C, reverseBuffer as S, sourceLength as T, loadProjectAsync as _, applyRate as a, projectDuration as b, clipRate as c, deleteProject as d, engine as f, listProjectsAsync as g, getWaveformPeaks as h, RATE_MIN as i, createBufferFromChannels as l, getAudioBuffer as m, MASTER_VOL_MAX as n, applyTempo as o, extractSlice as p, PulseLogo as r, clipBpm as s, LANE_COLORS as t, createEmptyProject as u, mixToMono as v, setAudioBuffer as w, restoreBuffer as x, persistBuffer as y };

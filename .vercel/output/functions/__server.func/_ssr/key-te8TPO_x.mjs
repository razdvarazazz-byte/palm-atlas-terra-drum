import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { s as cn, u as yieldToMain } from "./router-CV-Zednt.mjs";
import { v as mixToMono } from "./projects-DCNCT3TJ.mjs";
import { n as Root, t as Indicator } from "../_libs/radix-ui__react-progress.mjs";
import { t as Sr } from "../_libs/breezystack__lamejs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/key-te8TPO_x.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Progress = import_react.forwardRef(({ className, value, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
	ref,
	className: cn("relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Indicator, {
		className: "h-full w-full flex-1 bg-primary transition-transform duration-200",
		style: { transform: `translateX(-${100 - (value ?? 0)}%)` }
	})
}));
Progress.displayName = Root.displayName;
var VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|avi|3gp|ogv|mpeg|mpg|wmv|flv|mts|m2ts)$/i;
var AUDIO_EXT = /\.(mp3|wav|wave|ogg|oga|m4a|aac|flac|aiff|aif|wma|opus|weba|caf|aifc)$/i;
function isVideoFile(file) {
	if (file.type.startsWith("video/")) return true;
	return VIDEO_EXT.test(file.name);
}
function isAudioFile(file) {
	if (file.type.startsWith("audio/")) return true;
	return AUDIO_EXT.test(file.name);
}
function isMediaFile(file) {
	return isVideoFile(file) || isAudioFile(file);
}
function mediaFileName(file) {
	return file.name.replace(/\.[^.]+$/, "") || (isVideoFile(file) ? "Видео" : "Аудио");
}
/**
* Pull a real AudioBuffer out of an audio or video file.
* 1) decodeAudioData — instant for mp3/wav/ogg/m4a and most phone mp4/webm
* 2) HTMLMediaElement + MediaRecorder — fallback when the container is exotic
*/
async function extractAudioFromFile(file, ctx, onProgress) {
	const kind = isVideoFile(file) ? "video" : "audio";
	const name = mediaFileName(file);
	const label = kind === "video" ? "Извлекаем звук из видео" : "Читаем аудио";
	onProgress?.(.04, label);
	if (ctx.state === "suspended") await ctx.resume();
	try {
		const bytes = await file.arrayBuffer();
		onProgress?.(.22, label);
		const buffer = await decodeArrayBuffer(ctx, bytes);
		assertHasAudio(buffer);
		onProgress?.(1, "Готово");
		return {
			buffer,
			name,
			kind,
			duration: buffer.duration
		};
	} catch {}
	onProgress?.(.08, kind === "video" ? "Берём звук с видеодорожки" : "Декодируем через плеер");
	const buffer = await extractViaElement(file, ctx, kind, onProgress);
	assertHasAudio(buffer);
	onProgress?.(1, "Готово");
	return {
		buffer,
		name,
		kind,
		duration: buffer.duration
	};
}
async function decodeArrayBuffer(ctx, bytes) {
	const copy = bytes.slice(0);
	try {
		return await ctx.decodeAudioData(copy);
	} catch {
		return new Promise((resolve, reject) => {
			const again = bytes.slice(0);
			const maybe = ctx.decodeAudioData(again, resolve, reject);
			if (maybe && typeof maybe.then === "function") maybe.then(resolve, reject);
		});
	}
}
function pickRecorderMime() {
	if (typeof MediaRecorder === "undefined") return void 0;
	return [
		"audio/webm;codecs=opus",
		"audio/webm",
		"audio/mp4",
		"audio/ogg;codecs=opus"
	].find((t) => MediaRecorder.isTypeSupported(t));
}
async function extractViaElement(file, ctx, kind, onProgress) {
	const url = URL.createObjectURL(file);
	const el = document.createElement(kind === "video" ? "video" : "audio");
	el.preload = "auto";
	el.playsInline = true;
	el.muted = false;
	el.crossOrigin = "anonymous";
	el.controls = false;
	el.setAttribute("playsinline", "true");
	el.setAttribute("webkit-playsinline", "true");
	el.src = url;
	el.style.position = "fixed";
	el.style.left = "-9999px";
	el.style.width = "1px";
	el.style.height = "1px";
	el.style.opacity = "0";
	el.style.pointerEvents = "none";
	document.body.appendChild(el);
	const cleanup = () => {
		try {
			el.pause();
		} catch {}
		el.removeAttribute("src");
		el.load();
		el.remove();
		URL.revokeObjectURL(url);
	};
	try {
		await new Promise((resolve, reject) => {
			const timer = window.setTimeout(() => reject(/* @__PURE__ */ new Error("Файл слишком долго открывается")), 45e3);
			el.onloadedmetadata = () => {
				window.clearTimeout(timer);
				resolve();
			};
			el.onerror = () => {
				window.clearTimeout(timer);
				reject(/* @__PURE__ */ new Error(kind === "video" ? "Не удалось открыть видео" : "Не удалось открыть аудио"));
			};
		});
		const duration = el.duration;
		if (!Number.isFinite(duration) || duration <= 0) throw new Error("У файла нет длительности");
		if (ctx.state === "suspended") await ctx.resume();
		const dest = ctx.createMediaStreamDestination();
		const srcNode = ctx.createMediaElementSource(el);
		srcNode.connect(dest);
		const silent = ctx.createGain();
		silent.gain.value = 0;
		srcNode.connect(silent);
		silent.connect(ctx.destination);
		const mime = pickRecorderMime();
		if (typeof MediaRecorder === "undefined") throw new Error("Этот браузер не умеет снимать звук с видео");
		const rec = new MediaRecorder(dest.stream, mime ? {
			mimeType: mime,
			audioBitsPerSecond: 192e3
		} : void 0);
		const chunks = [];
		rec.ondataavailable = (e) => {
			if (e.data.size) chunks.push(e.data);
		};
		const stopped = new Promise((resolve) => {
			rec.addEventListener("stop", () => resolve(), { once: true });
		});
		rec.start(250);
		el.currentTime = 0;
		await el.play();
		await new Promise((resolve, reject) => {
			const limit = Math.min(18e4, Math.max(12e3, duration * 1e3 + 12e3));
			const timer = window.setTimeout(() => reject(/* @__PURE__ */ new Error("Извлечение звука зависло — попробуй другой файл")), limit);
			el.ontimeupdate = () => {
				if (duration > 0) {
					const p = .1 + .75 * Math.min(1, el.currentTime / duration);
					onProgress?.(p, kind === "video" ? "Снимаем звук с видео" : "Пишем звук");
				}
			};
			el.onended = () => {
				window.clearTimeout(timer);
				resolve();
			};
			el.onerror = () => {
				window.clearTimeout(timer);
				reject(/* @__PURE__ */ new Error("Ошибка воспроизведения"));
			};
		});
		if (rec.state !== "inactive") rec.stop();
		await stopped;
		await yieldToMain();
		try {
			srcNode.disconnect();
			silent.disconnect();
		} catch {}
		if (!chunks.length) throw new Error(kind === "video" ? "В видео нет звуковой дорожки" : "Пустой звук");
		const blob = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" });
		onProgress?.(.9, "Декодируем звук");
		return await decodeArrayBuffer(ctx, await blob.arrayBuffer());
	} finally {
		cleanup();
	}
}
function assertHasAudio(buffer) {
	let peak = 0;
	const data = buffer.getChannelData(0);
	const step = Math.max(1, Math.floor(data.length / 8e3));
	for (let i = 0; i < data.length; i += step) peak = Math.max(peak, Math.abs(data[i]));
	if (peak < 1e-4) throw new Error("В файле нет слышимого звука");
}
function encodeWav(buffer) {
	const numCh = buffer.numberOfChannels;
	const sr = buffer.sampleRate;
	const n = buffer.length;
	const blockAlign = numCh * 2;
	const dataSize = n * blockAlign;
	const out = new ArrayBuffer(44 + dataSize);
	const view = new DataView(out);
	writeStr(view, 0, "RIFF");
	view.setUint32(4, 36 + dataSize, true);
	writeStr(view, 8, "WAVE");
	writeStr(view, 12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, numCh, true);
	view.setUint32(24, sr, true);
	view.setUint32(28, sr * blockAlign, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, 16, true);
	writeStr(view, 36, "data");
	view.setUint32(40, dataSize, true);
	const channels = [];
	for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));
	let offset = 44;
	for (let i = 0; i < n; i++) for (let c = 0; c < numCh; c++) {
		const s = Math.max(-1, Math.min(1, channels[c][i]));
		view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
		offset += 2;
	}
	return new Blob([out], { type: "audio/wav" });
}
function writeStr(view, offset, str) {
	for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 4e3);
}
function floatTo16(input) {
	const out = new Int16Array(input.length);
	for (let i = 0; i < input.length; i++) {
		const s = Math.max(-1, Math.min(1, input[i]));
		out[i] = s < 0 ? s * 32768 | 0 : s * 32767 | 0;
	}
	return out;
}
async function encodeMp3(buffer, bitrate = 192, onProgress) {
	const channels = Math.min(2, Math.max(1, buffer.numberOfChannels));
	const encoder = new Sr(channels, buffer.sampleRate, bitrate);
	const left = floatTo16(buffer.getChannelData(0));
	const right = channels > 1 ? floatTo16(buffer.getChannelData(1)) : void 0;
	const block = 1152;
	const parts = [];
	for (let i = 0; i < left.length; i += block) {
		const l = left.subarray(i, Math.min(left.length, i + block));
		const r = right?.subarray(i, Math.min(right.length, i + block));
		const mp3 = channels > 1 && r ? encoder.encodeBuffer(l, r) : encoder.encodeBuffer(l);
		if (mp3.length) parts.push(mp3.buffer.slice(mp3.byteOffset, mp3.byteOffset + mp3.byteLength));
		if (i % (block * 40) === 0) {
			onProgress?.(i / left.length);
			await yieldToMain();
		}
	}
	const end = encoder.flush();
	if (end.length) parts.push(end.buffer.slice(end.byteOffset, end.byteOffset + end.byteLength));
	onProgress?.(1);
	return new Blob(parts, { type: "audio/mpeg" });
}
async function downloadMp3(buffer, filename, onProgress) {
	downloadBlob(await encodeMp3(buffer, 192, onProgress), filename.toLowerCase().endsWith(".mp3") ? filename : `${filename}.mp3`);
}
/**
* Energy-envelope autocorrelation BPM detector.
* Uses a ~12 s window so adding tracks never freezes the UI.
*/
function detectBpm(buffer) {
	const sr = buffer.sampleRate;
	const windowSamples = Math.min(buffer.length, Math.floor(sr * 12));
	const start = Math.min(Math.floor(buffer.length * .08), Math.max(0, buffer.length - windowSamples));
	const mono = mixToMono(buffer).subarray(start, start + windowSamples);
	const hop = 1024;
	const env = onsetEnvelope(mono, hop);
	const envSr = sr / hop;
	const minBpm = 70;
	const maxBpm = 180;
	const minLag = Math.max(2, Math.floor(60 / maxBpm * envSr));
	const maxLag = Math.min(env.length - 2, Math.floor(60 / minBpm * envSr));
	const corr = new Float32Array(maxLag + 1);
	let corrMax = 1e-9;
	for (let lag = minLag; lag <= maxLag; lag++) {
		let sum = 0;
		const n = env.length - lag;
		for (let i = 0; i < n; i++) sum += env[i] * env[i + lag];
		corr[lag] = n > 0 ? sum / n : 0;
		if (corr[lag] > corrMax) corrMax = corr[lag];
	}
	const peaks = [];
	for (let lag = minLag + 1; lag < maxLag; lag++) {
		const v = corr[lag];
		if (v > corr[lag - 1] && v >= corr[lag + 1] && v > corrMax * .35) peaks.push({
			lag,
			score: v / corrMax
		});
	}
	peaks.sort((a, b) => b.score - a.score);
	const scored = /* @__PURE__ */ new Map();
	for (const p of peaks.slice(0, 12)) {
		let bpm = 60 / (p.lag / envSr);
		while (bpm < minBpm) bpm *= 2;
		while (bpm > maxBpm) bpm /= 2;
		const key = Math.round(bpm * 2) / 2;
		scored.set(key, (scored.get(key) ?? 0) + p.score);
	}
	const candidates = [...scored.entries()].map(([bpm, score]) => ({
		bpm,
		score
	})).sort((a, b) => b.score - a.score).slice(0, 5);
	if (candidates.length === 0) return {
		bpm: 120,
		confidence: .15,
		candidates: [{
			bpm: 120,
			score: .15
		}]
	};
	const top = candidates[0];
	const total = candidates.reduce((s, c) => s + c.score, 0) || 1;
	return {
		bpm: Math.round(top.bpm * 10) / 10,
		confidence: Math.min(1, top.score / total + .15),
		candidates
	};
}
function onsetEnvelope(samples, hop) {
	const n = Math.max(1, Math.floor(samples.length / hop));
	const env = new Float32Array(n);
	let prev = 0;
	for (let i = 0; i < n; i++) {
		let energy = 0;
		const start = i * hop;
		const end = Math.min(samples.length, start + hop);
		for (let k = start; k < end; k++) {
			const v = samples[k] ?? 0;
			energy += v * v;
		}
		const mag = Math.sqrt(energy / Math.max(1, end - start));
		const flux = Math.max(0, mag - prev);
		env[i] = flux;
		prev = mag;
	}
	const out = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		const a = env[i - 1] ?? env[i];
		const b = env[i];
		const c = env[i + 1] ?? env[i];
		out[i] = .25 * a + .5 * b + .25 * c;
	}
	return out;
}
var NOTE_NAMES = [
	"C",
	"C#",
	"D",
	"D#",
	"E",
	"F",
	"F#",
	"G",
	"G#",
	"A",
	"A#",
	"B"
];
/** Krumhansl–Kessler key profiles. */
var MAJOR_PROFILE = [
	6.35,
	2.23,
	3.48,
	2.33,
	4.38,
	4.09,
	2.52,
	5.19,
	2.39,
	3.66,
	2.29,
	2.88
];
var MINOR_PROFILE = [
	6.33,
	2.68,
	3.52,
	5.38,
	2.6,
	3.53,
	2.54,
	4.75,
	3.98,
	2.69,
	3.29,
	3.17
];
function formatKey(root, mode) {
	if (root == null || mode == null || root < 0 || root > 11) return "—";
	const note = NOTE_NAMES[root];
	return mode === "minor" ? `${note}m` : note;
}
function transposeRoot(root, semitones) {
	return ((root + Math.round(semitones)) % 12 + 12) % 12;
}
/**
* Chromagram + KK correlation. Uses a ~20 s window so import stays snappy.
*/
function detectKey(buffer) {
	const chroma = chromagram(buffer);
	let best = {
		root: 0,
		mode: "major",
		score: -Infinity,
		second: -Infinity
	};
	for (let root = 0; root < 12; root++) {
		const maj = correlate(chroma, MAJOR_PROFILE, root);
		const min = correlate(chroma, MINOR_PROFILE, root);
		if (maj > best.score) best = {
			root,
			mode: "major",
			score: maj,
			second: best.score
		};
		else if (maj > best.second) best.second = maj;
		if (min > best.score) best = {
			root,
			mode: "minor",
			score: min,
			second: best.score
		};
		else if (min > best.second) best.second = min;
	}
	const conf = best.score <= 0 ? .2 : Math.min(1, (best.score - Math.max(0, best.second)) / (best.score + 1e-6) + .35);
	return {
		root: best.root,
		mode: best.mode,
		name: formatKey(best.root, best.mode),
		confidence: conf
	};
}
function correlate(chroma, profile, root) {
	let dot = 0;
	let nA = 0;
	let nB = 0;
	for (let i = 0; i < 12; i++) {
		const a = chroma[i];
		const b = profile[(i - root + 12) % 12];
		dot += a * b;
		nA += a * a;
		nB += b * b;
	}
	const denom = Math.sqrt(nA * nB) + 1e-9;
	return dot / denom;
}
function chromagram(buffer) {
	const sr = buffer.sampleRate;
	const step = Math.max(1, Math.round(sr / 11025));
	const hop = 1024;
	const nfft = 2048;
	const start = Math.floor(buffer.length * .12);
	const maxSamples = Math.min(buffer.length - start, Math.floor(12 * sr));
	const src0 = buffer.getChannelData(0);
	const src1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
	const chroma = /* @__PURE__ */ new Float32Array(12);
	const re = new Float32Array(nfft);
	const im = new Float32Array(nfft);
	const win = hann(nfft);
	const bins = nfft / 2;
	let frames = 0;
	for (let off = start; off + nfft * step < start + maxSamples; off += hop * step) {
		re.fill(0);
		im.fill(0);
		for (let i = 0; i < nfft; i++) {
			const idx = off + i * step;
			const a = src0[idx] ?? 0;
			const b = src1 ? src1[idx] ?? 0 : a;
			re[i] = (a + b) * .5 * win[i];
		}
		fftRadix2(re, im);
		for (let k = 1; k < bins; k++) {
			const hz = k * (sr / step) / nfft;
			if (hz < 55 || hz > 5e3) continue;
			const midi = 69 + 12 * Math.log2(hz / 440);
			const pc = (Math.round(midi) % 12 + 12) % 12;
			const mag = Math.hypot(re[k], im[k]);
			chroma[pc] += mag * mag;
		}
		frames++;
		if (frames > 80) break;
	}
	let max = 1e-9;
	for (let i = 0; i < 12; i++) if (chroma[i] > max) max = chroma[i];
	for (let i = 0; i < 12; i++) chroma[i] = Math.sqrt(chroma[i] / max);
	return chroma;
}
function hann(n) {
	const w = new Float32Array(n);
	for (let i = 0; i < n; i++) w[i] = .5 * (1 - Math.cos(2 * Math.PI * i / (n - 1)));
	return w;
}
function fftRadix2(re, im) {
	const n = re.length;
	for (let i = 1, j = 0; i < n; i++) {
		let bit = n >> 1;
		for (; j & bit; bit >>= 1) j ^= bit;
		j ^= bit;
		if (i < j) {
			const tr = re[i];
			re[i] = re[j];
			re[j] = tr;
			const ti = im[i];
			im[i] = im[j];
			im[j] = ti;
		}
	}
	for (let size = 2; size <= n; size <<= 1) {
		const half = size >> 1;
		const ang = -2 * Math.PI / size;
		const wr0 = Math.cos(ang);
		const wi0 = Math.sin(ang);
		for (let i = 0; i < n; i += size) {
			let wr = 1;
			let wi = 0;
			for (let j = 0; j < half; j++) {
				const ur = re[i + j];
				const ui = im[i + j];
				const vr = re[i + j + half] * wr - im[i + j + half] * wi;
				const vi = re[i + j + half] * wi + im[i + j + half] * wr;
				re[i + j] = ur + vr;
				im[i + j] = ui + vi;
				re[i + j + half] = ur - vr;
				im[i + j + half] = ui - vi;
				const nwr = wr * wr0 - wi * wi0;
				wi = wr * wi0 + wi * wr0;
				wr = nwr;
			}
		}
	}
}
//#endregion
export { downloadMp3 as a, formatKey as c, mediaFileName as d, transposeRoot as f, downloadBlob as i, isMediaFile as l, detectBpm as n, encodeWav as o, detectKey as r, extractAudioFromFile as s, Progress as t, isVideoFile as u };

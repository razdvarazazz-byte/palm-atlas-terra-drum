import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as Link, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { E as Film, d as Sparkles, i as Volume2, p as Scissors, u as SquareSplitVertical, w as Gauge } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as Button, l as uid } from "./router-CV-Zednt.mjs";
import { C as saveProject, d as deleteProject, f as engine, g as listProjectsAsync, r as PulseLogo, u as createEmptyProject, w as setAudioBuffer, y as persistBuffer } from "./projects-DCNCT3TJ.mjs";
import { t as UiModeSwitch } from "./ui-mode-switch-DFFKaMIW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Bk85pCVw.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function env(t, attack, decay) {
	if (t < 0) return 0;
	if (t < attack) return t / attack;
	return Math.exp(-3.2 * ((t - attack) / decay));
}
function renderOffline(sr, duration, stereo, fill) {
	const n = Math.floor(duration * sr);
	const L = new Float32Array(n);
	const R = new Float32Array(n);
	fill(L, R, sr);
	const buf = new OfflineAudioContext(stereo ? 2 : 1, n, sr).createBuffer(stereo ? 2 : 1, n, sr);
	buf.copyToChannel(L, 0);
	if (stereo) buf.copyToChannel(R, 1);
	return buf;
}
function kick(L, R, sr, at) {
	const n = Math.floor(.28 * sr);
	const start = Math.floor(at * sr);
	for (let i = 0; i < n && start + i < L.length; i++) {
		const t = i / sr;
		const f = 140 * Math.exp(-18 * t) + 38;
		const s = Math.sin(2 * Math.PI * f * t) * env(t, .004, .22) * .95;
		L[start + i] += s;
		R[start + i] += s;
	}
}
function snare(L, R, sr, at) {
	const n = Math.floor(.22 * sr);
	const start = Math.floor(at * sr);
	let noise = 0;
	for (let i = 0; i < n && start + i < L.length; i++) {
		const t = i / sr;
		noise = Math.random() * 2 - 1;
		const tone = Math.sin(2 * Math.PI * 196 * t);
		const s = (noise * .72 + tone * .28) * env(t, .002, .16) * .55;
		L[start + i] += s * .92;
		R[start + i] += s * 1.05;
	}
}
function hat(L, R, sr, at, open = false) {
	const n = Math.floor((open ? .18 : .045) * sr);
	const start = Math.floor(at * sr);
	let prev = 0;
	for (let i = 0; i < n && start + i < L.length; i++) {
		const t = i / sr;
		const white = Math.random() * 2 - 1;
		const hp = white - prev;
		prev = white;
		const s = hp * env(t, .001, open ? .14 : .035) * (open ? .22 : .16);
		L[start + i] += s * 1.1;
		R[start + i] += s * .85;
	}
}
function bassNote(L, R, sr, at, dur, freq) {
	const n = Math.floor(dur * sr);
	const start = Math.floor(at * sr);
	for (let i = 0; i < n && start + i < L.length; i++) {
		const t = i / sr;
		const saw = 2 * (t * freq % 1) - 1;
		const s = (Math.sin(2 * Math.PI * freq * t) * .7 + saw * .18) * env(t, .01, dur) * .55;
		L[start + i] += s;
		R[start + i] += s;
	}
}
function chord(L, R, sr, at, dur, freqs) {
	const n = Math.floor(dur * sr);
	const start = Math.floor(at * sr);
	for (let i = 0; i < n && start + i < L.length; i++) {
		const t = i / sr;
		let l = 0;
		let r = 0;
		freqs.forEach((f, idx) => {
			const det = f * (1 + (idx - 1) * .004);
			const saw = 2 * (t * det % 1) - 1;
			const g = env(t, .03, dur) * .14;
			if (idx % 2 === 0) l += saw * g;
			else r += saw * g;
			l += Math.sin(2 * Math.PI * f * t) * g * .4;
			r += Math.sin(2 * Math.PI * f * 1.002 * t) * g * .4;
		});
		L[start + i] += l;
		R[start + i] += r;
	}
}
function lead(L, R, sr, at, dur, freq) {
	const n = Math.floor(dur * sr);
	const start = Math.floor(at * sr);
	for (let i = 0; i < n && start + i < L.length; i++) {
		const t = i / sr;
		const vib = freq * (1 + .012 * Math.sin(2 * Math.PI * 5.2 * t));
		const s = (Math.sin(2 * Math.PI * vib * t) + .35 * Math.sin(2 * Math.PI * vib * 2 * t)) * (.5 + .5 * Math.sin(2 * Math.PI * 680 * t)) * env(t, .02, dur) * .28;
		L[start + i] += s;
		R[start + i] += s;
	}
}
var BPM = 120;
var BEAT = 60 / BPM;
var BARS = 4;
var DURATION = 16 * BEAT;
async function buildDemoMix() {
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
		[
			55,
			55,
			65.4,
			49,
			55,
			55,
			73.4,
			82.4
		].forEach((f, i) => {
			bassNote(L, R, s, i * 4 * BEAT, 3.6 * BEAT, f);
			bassNote(L, R, s, i * 4 * BEAT + 1.5 * BEAT, .4 * BEAT, f * 1.5);
		});
	});
	const keysBuf = renderOffline(sr, DURATION, true, (L, R, s) => {
		const chords = [
			[
				220,
				277.2,
				329.6
			],
			[
				196,
				246.9,
				293.7
			],
			[
				174.6,
				220,
				261.6
			],
			[
				196,
				246.9,
				311.1
			]
		];
		for (let bar = 0; bar < BARS; bar++) chord(L, R, s, bar * 4 * BEAT, 3.8 * BEAT, chords[bar % 4]);
	});
	const vocalBuf = renderOffline(sr, DURATION, true, (L, R, s) => {
		[
			440,
			493.9,
			523.3,
			493.9,
			440,
			392,
			349.2,
			392
		].forEach((f, i) => {
			lead(L, R, s, i * 4 * BEAT + .05, 3.2 * BEAT, f);
			lead(L, R, s, i * 4 * BEAT + 2 * BEAT, 1.4 * BEAT, f * 1.25);
		});
	});
	const mixed = renderOffline(sr, DURATION, true, (L, R) => {
		mixIn(L, R, drumsBuf, 1);
		mixIn(L, R, bassBuf, .95);
		mixIn(L, R, keysBuf, .85);
		mixIn(L, R, vocalBuf, 1);
	});
	const ids = {
		drums: uid("buf"),
		bass: uid("buf"),
		keys: uid("buf"),
		vocal: uid("buf"),
		mix: uid("buf")
	};
	setAudioBuffer(ids.drums, drumsBuf);
	setAudioBuffer(ids.bass, bassBuf);
	setAudioBuffer(ids.keys, keysBuf);
	setAudioBuffer(ids.vocal, vocalBuf);
	setAudioBuffer(ids.mix, mixed);
	Promise.all([
		persistBuffer(ids.drums, drumsBuf),
		persistBuffer(ids.bass, bassBuf),
		persistBuffer(ids.keys, keysBuf),
		persistBuffer(ids.vocal, vocalBuf),
		persistBuffer(ids.mix, mixed)
	]).catch(() => void 0);
	const mkTrack = (name, color, i) => ({
		id: uid("trk"),
		name,
		color,
		volume: 1,
		pan: i === 1 ? -.15 : i === 2 ? .2 : 0,
		mute: false,
		solo: false,
		armed: false
	});
	const tracks = [
		mkTrack("Ударные", "lane-coral", 0),
		mkTrack("Бас", "lane-teal", 1),
		mkTrack("Синты", "lane-blue", 2),
		mkTrack("Вокал", "lane-sage", 3)
	];
	return {
		tracks,
		clips: tracks.map((track, i) => ({
			id: uid("clip"),
			trackId: track.id,
			bufferId: [
				ids.drums,
				ids.bass,
				ids.keys,
				ids.vocal
			][i],
			name: track.name,
			start: 0,
			offset: 0,
			duration: DURATION,
			gain: 1,
			reverse: false,
			fadeIn: .01,
			fadeOut: .08,
			pitch: 0,
			muted: false,
			rate: 1,
			nativeBpm: BPM,
			preservePitch: false
		})),
		bpm: BPM,
		mixed: {
			bufferId: ids.mix,
			duration: DURATION,
			name: "Демо-микс"
		}
	};
}
function mixIn(L, R, buf, g) {
	const l = buf.getChannelData(0);
	const r = buf.numberOfChannels > 1 ? buf.getChannelData(1) : l;
	const n = Math.min(L.length, buf.length);
	for (let i = 0; i < n; i++) {
		L[i] += l[i] * g;
		R[i] += r[i] * g;
	}
}
function HomePage() {
	const navigate = useNavigate();
	const [projects, setProjects] = (0, import_react.useState)([]);
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		listProjectsAsync().then(setProjects);
	}, []);
	const openNew = () => {
		const p = createEmptyProject();
		saveProject(p, 0);
		navigate({
			to: "/mix/$projectId",
			params: { projectId: p.id }
		});
	};
	const openDemo = async (mode) => {
		setBusy(true);
		try {
			await engine.resume();
			const demo = await buildDemoMix();
			const p = createEmptyProject(mode === "multi" ? "Демо: 4 дорожки" : "Демо: сведённый трек");
			if (mode === "multi") {
				p.tracks = demo.tracks.map((t) => ({
					...t,
					volume: t.volume || 1
				}));
				p.clips = demo.clips;
				p.bpm = demo.bpm;
				p.nativeBpm = demo.bpm;
			} else {
				const trackId = uid("trk");
				p.tracks = [{
					id: trackId,
					name: "Микс",
					color: "lane-coral",
					volume: 1,
					pan: 0,
					mute: false,
					solo: false,
					armed: false
				}];
				p.bpm = demo.bpm;
				p.nativeBpm = demo.bpm;
				p.clips = [{
					id: uid("clip"),
					trackId,
					bufferId: demo.mixed.bufferId,
					name: demo.mixed.name,
					start: 0,
					offset: 0,
					duration: demo.mixed.duration,
					gain: 1,
					reverse: false,
					fadeIn: .01,
					fadeOut: .08,
					pitch: 0,
					muted: false,
					rate: 1,
					nativeBpm: demo.bpm,
					preservePitch: false
				}];
			}
			saveProject(p, demo.mixed.duration);
			navigate({
				to: "/mix/$projectId",
				params: { projectId: p.id }
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Не удалось собрать демо");
		} finally {
			setBusy(false);
		}
	};
	const features = (0, import_react.useMemo)(() => [
		{
			icon: Film,
			title: "Звук из видео",
			text: "Кинь mp4 или клип с камеры — звук снимется сам и ляжет на дорожку."
		},
		{
			icon: Scissors,
			title: "Ножницы",
			text: "Режь по ползунку. Кнопки < и > откатывают каждый шаг: метка, разрез, удаление."
		},
		{
			icon: SquareSplitVertical,
			title: "Стемы",
			text: "Акапелла, минус, бас, ударные — дорожки встают подряд, без пустых дыр."
		},
		{
			icon: Gauge,
			title: "BPM клипа",
			text: "Темп каждой фразы свой: 112, 140, любое. Сетка проекта отдельно."
		},
		{
			icon: Volume2,
			title: "Микшер",
			text: "Громкость дорожки до 200% — слышно сразу, прямо с телефона."
		},
		{
			icon: Sparkles,
			title: "MP3 и WAV",
			text: "Проекты остаются на устройстве. Экспорт микса и клипа."
		}
	], []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "glass-bar sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PulseLogo, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: openNew,
					className: "h-10",
					children: "Новый микс"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-8 sm:pt-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground",
						children: "Mix studio"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-3 max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl",
						children: "Видео в звук. Вырежи слово. Подставь другое."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 max-w-lg text-base leading-relaxed text-muted-foreground",
						children: "Pulse — студия в браузере: зажми клип и перетащи влево-вправо или на любую дорожку. Первый файл сверху, следующие сразу ниже. Свободные дорожки уже ждут снизу."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 grid gap-2 sm:flex sm:flex-wrap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "lg",
								className: "h-12 w-full sm:w-auto",
								onClick: openNew,
								disabled: busy,
								children: "Создать микс"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "lg",
								variant: "secondary",
								className: "h-12 w-full sm:w-auto",
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/extract",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Film, {}), " Видео → MP3"]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "lg",
								variant: "outline",
								className: "h-12 w-full sm:w-auto",
								onClick: () => void openDemo("mix"),
								disabled: busy,
								children: busy ? "Собираем…" : "Демо для сплиттера"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 max-w-lg",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UiModeSwitch, {})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "mx-auto grid max-w-6xl gap-3 px-4 pb-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-3",
				children: features.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-xl border border-border/70 bg-card/80 p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(f.icon, { className: "size-5 text-primary" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-3 text-sm font-semibold",
							children: f.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm leading-relaxed text-muted-foreground",
							children: f.text
						})
					]
				}, f.title))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mx-auto max-w-6xl px-4 pb-20 sm:px-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-4 flex items-end justify-between",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold",
						children: "Сохранённые проекты"
					})
				}), projects.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "rounded-xl border border-dashed border-border px-5 py-10 text-sm text-muted-foreground",
					children: "Пока пусто. Создай микс или сними звук с видео — проекты остаются на этом устройстве."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
					children: projects.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => navigate({
							to: "/mix/$projectId",
							params: { projectId: p.id }
						}),
						className: "w-full rounded-xl border border-border/70 bg-card/80 p-4 text-left transition-colors duration-150 hover:bg-surface-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cover, { seed: p.id }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex items-start justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: p.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-0.5 text-xs text-muted-foreground",
								children: [
									p.bpm,
									" BPM · ",
									new Date(p.updatedAt).toLocaleDateString()
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								role: "button",
								tabIndex: 0,
								className: "text-xs text-muted-foreground hover:text-destructive",
								onClick: (e) => {
									e.stopPropagation();
									deleteProject(p.id);
									listProjectsAsync().then(setProjects);
								},
								children: "Удалить"
							})]
						})]
					}) }, p.id))
				})]
			})
		]
	});
}
function Cover({ seed }) {
	const n = seed.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 280 64",
		className: "h-16 w-full rounded-md bg-surface-2 text-primary",
		"aria-hidden": "true",
		children: Array.from({ length: 56 }, (_, i) => {
			const h = 8 + n * (i + 3) * 13 % 40;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: 4 + i * 5,
				y: (64 - h) / 2,
				width: "3.2",
				height: h,
				rx: "0.6",
				fill: "currentColor",
				opacity: .35 + (i + n) % 5 / 12
			}, i);
		})
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomePage, {});
}
//#endregion
export { Home as component };

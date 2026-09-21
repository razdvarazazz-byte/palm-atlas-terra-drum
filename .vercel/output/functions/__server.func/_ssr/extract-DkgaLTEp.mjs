import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as Link, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { D as Download, E as Film, w as Gauge, y as Music } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as Button, c as formatTime, l as uid } from "./router-CV-Zednt.mjs";
import { C as saveProject, f as engine, r as PulseLogo, t as LANE_COLORS, u as createEmptyProject, w as setAudioBuffer, y as persistBuffer } from "./projects-DCNCT3TJ.mjs";
import { a as downloadMp3, d as mediaFileName, i as downloadBlob, n as detectBpm, o as encodeWav, r as detectKey, s as extractAudioFromFile, t as Progress, u as isVideoFile } from "./key-te8TPO_x.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/extract-DkgaLTEp.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
async function createMixFromBuffer(buffer, name, sourceKind = "audio") {
	const p = createEmptyProject(name);
	const bufferId = uid("buf");
	setAudioBuffer(bufferId, buffer);
	persistBuffer(bufferId, buffer).catch(() => void 0);
	const trackId = p.tracks[0]?.id ?? uid("trk");
	p.tracks = [{
		id: trackId,
		name,
		color: "lane-coral",
		volume: 1,
		pan: 0,
		mute: false,
		solo: false,
		armed: false
	}, ...Array.from({ length: 5 }, (_, i) => ({
		id: uid("trk"),
		name: `Дорожка ${i + 2}`,
		color: LANE_COLORS[(i + 1) % LANE_COLORS.length],
		volume: 1,
		pan: 0,
		mute: false,
		solo: false,
		armed: false
	}))];
	p.clips = [{
		id: uid("clip"),
		trackId,
		bufferId,
		name,
		start: 0,
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
		nativeBpm: null,
		preservePitch: false
	}];
	try {
		const bpm = detectBpm(buffer);
		const value = Math.round(bpm.bpm);
		p.bpm = value;
		p.nativeBpm = value;
		p.clips = p.clips.map((c) => ({
			...c,
			nativeBpm: value
		}));
		const key = detectKey(buffer);
		p.keyRoot = key.root;
		p.keyMode = key.mode;
	} catch {}
	saveProject(p, buffer.duration);
	return p.id;
}
function ExtractPage() {
	const navigate = useNavigate();
	const inputRef = (0, import_react.useRef)(null);
	const [busy, setBusy] = (0, import_react.useState)(null);
	const [ready, setReady] = (0, import_react.useState)(null);
	const [over, setOver] = (0, import_react.useState)(false);
	const run = async (file) => {
		setBusy({
			label: isVideoFile(file) ? "Извлекаем звук из видео" : "Читаем аудио",
			progress: .04
		});
		try {
			await engine.resume();
			const result = await extractAudioFromFile(file, engine.ensure(), (p, label) => setBusy({
				label: label ?? "Извлекаем звук",
				progress: p
			}));
			const bpm = detectBpm(result.buffer);
			const key = detectKey(result.buffer);
			setReady({
				buffer: result.buffer,
				name: result.name || mediaFileName(file),
				kind: result.kind,
				bpm: Math.round(bpm.bpm),
				key: key.name
			});
			toast.success(result.kind === "video" ? "Звук снят с видео" : "Аудио готово");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Не удалось извлечь звук");
		} finally {
			setBusy(null);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh flex-col bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex h-12 items-center justify-between px-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PulseLogo, {
					className: "text-sm",
					markClassName: "size-6"
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				className: "text-sm text-muted-foreground",
				children: "Назад"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-10 pt-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground",
					children: "Видео → звук"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 text-3xl font-semibold tracking-tight",
					children: "Сними звук с ролика и сохрани MP3"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm leading-relaxed text-muted-foreground",
					children: "Кинь mp4, mov, webm или любой клип с камеры. Звуковая дорожка извлечётся в браузере — без сервера — и её можно сразу скачать или открыть в миксе."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: inputRef,
					type: "file",
					accept: "video/*,audio/*,.mp4,.mov,.webm,.mkv,.m4v,.3gp,.mp3,.wav,.m4a,.ogg",
					className: "hidden",
					onChange: (e) => {
						const file = e.target.files?.[0];
						e.target.value = "";
						if (file) run(file);
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => inputRef.current?.click(),
					onDragOver: (e) => {
						e.preventDefault();
						setOver(true);
					},
					onDragLeave: () => setOver(false),
					onDrop: (e) => {
						e.preventDefault();
						setOver(false);
						const file = e.dataTransfer.files[0];
						if (file) run(file);
					},
					className: `mt-6 flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center transition-colors duration-150 ${over ? "border-primary bg-primary/10" : "border-border bg-card"}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "grid size-12 place-items-center rounded-lg bg-surface-2 text-primary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Film, { className: "size-6" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium",
							children: "Нажми или кинь видео сюда"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted-foreground",
							children: "MP4, MOV, WEBM, MKV · звук снимется сам"
						})
					]
				}),
				busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 rounded-xl border border-border bg-card p-4",
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
						})
					]
				}) : null,
				ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 space-y-3 rounded-xl border border-border bg-card p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-semibold",
								children: ready.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs text-muted-foreground",
								children: [
									ready.kind === "video" ? "Из видео" : "Аудио",
									" · ",
									formatTime(ready.buffer.duration),
									" · ",
									ready.bpm,
									" BPM · ",
									ready.key
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge, { className: "size-4 text-muted-foreground" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								className: "h-11",
								onClick: () => void downloadMp3(ready.buffer, ready.name).then(() => toast.success("MP3 сохранён в загрузки")),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), " MP3"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								className: "h-11",
								variant: "secondary",
								onClick: () => {
									downloadBlob(encodeWav(ready.buffer), `${ready.name}.wav`);
									toast.success("WAV сохранён");
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), " WAV"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							className: "h-11 w-full",
							variant: "outline",
							onClick: async () => {
								const id = await createMixFromBuffer(ready.buffer, ready.name, ready.kind);
								navigate({
									to: "/mix/$projectId",
									params: { projectId: id }
								});
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Music, {}), " Открыть в миксе"]
						})
					]
				}) : null
			]
		})]
	});
}
var SplitComponent = ExtractPage;
//#endregion
export { SplitComponent as component };

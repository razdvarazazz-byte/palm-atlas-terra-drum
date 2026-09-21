import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { f as Smartphone, x as Monitor } from "../_libs/lucide-react.mjs";
import { i as useUiMode, r as setUiMode, s as cn } from "./router-CV-Zednt.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ui-mode-switch-DFFKaMIW.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function UiModeSwitch({ compact = false }) {
	const mode = useUiMode();
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setReady(true), []);
	const shown = ready ? mode : "phone";
	const set = (next) => setUiMode(next);
	if (compact) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: "grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-foreground/8 hover:text-foreground",
		title: shown === "pc" ? "Режим ПК — нажми для телефона" : "Режим телефона — нажми для ПК",
		"aria-label": shown === "pc" ? "Переключить на телефон" : "Переключить на ПК",
		onClick: () => set(shown === "pc" ? "phone" : "pc"),
		children: shown === "pc" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Monitor, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "size-4" })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border/70 bg-card/80 p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground",
				children: "Режим"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm font-medium",
				children: "Телефон или компьютер"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 text-xs leading-relaxed text-muted-foreground",
				children: "На телефоне — крупные кнопки. На ПК — шире дорожки и точнее ручки клипа."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex items-center gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: cn("flex items-center gap-1.5 text-xs font-medium", shown === "phone" ? "text-foreground" : "text-muted-foreground"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "size-4" }), "Телефон"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min: 0,
						max: 1,
						step: 1,
						value: shown === "pc" ? 1 : 0,
						onChange: (e) => set(e.target.value === "1" ? "pc" : "phone"),
						className: "vol-range min-w-0 flex-1",
						style: { background: `linear-gradient(to right, var(--color-primary) ${shown === "pc" ? 100 : 0}%, color-mix(in oklab, var(--color-foreground) 14%, transparent) ${shown === "pc" ? 100 : 0}%)` },
						"aria-label": "Режим интерфейса"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: cn("flex items-center gap-1.5 text-xs font-medium", shown === "pc" ? "text-foreground" : "text-muted-foreground"),
						children: ["ПК", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Monitor, { className: "size-4" })]
					})
				]
			})
		]
	});
}
//#endregion
export { UiModeSwitch as t };

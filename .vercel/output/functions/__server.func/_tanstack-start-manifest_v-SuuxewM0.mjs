//#region node_modules/.nitro/vite/services/ssr/assets/_tanstack-start-manifest_v-SuuxewM0.js
var tsrStartManifest = () => ({ routes: {
	__root__: {
		filePath: "/workspace/src/routes/__root.tsx",
		children: [
			"/",
			"/extract",
			"/mix/$projectId"
		],
		preloads: ["/assets/index-DBdiNFr9.js"],
		scripts: [{ attrs: {
			type: "module",
			async: !0,
			src: "/assets/index-DBdiNFr9.js"
		} }]
	},
	"/": {
		filePath: "/workspace/src/routes/index.tsx",
		children: void 0,
		preloads: [
			"/assets/routes-C0QsLTms.js",
			"/assets/projects-BQK0ht0F.js",
			"/assets/ui-mode-switch-z7DZe09M.js"
		]
	},
	"/extract": {
		filePath: "/workspace/src/routes/extract.tsx",
		children: void 0,
		preloads: [
			"/assets/extract-BQQ5E23-.js",
			"/assets/key-DzNomELV.js",
			"/assets/projects-BQK0ht0F.js"
		]
	},
	"/mix/$projectId": {
		filePath: "/workspace/src/routes/mix.$projectId.tsx",
		children: void 0,
		preloads: [
			"/assets/mix._projectId-B34GV8JU.js",
			"/assets/key-DzNomELV.js",
			"/assets/projects-BQK0ht0F.js",
			"/assets/ui-mode-switch-z7DZe09M.js"
		]
	}
} });
//#endregion
export { tsrStartManifest };

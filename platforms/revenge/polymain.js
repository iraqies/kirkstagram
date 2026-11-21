/**
 * Kirkstagram — Revenge polymanifest entry.
 *
 * Self-contained polymanifest main file (vendetta-mod/polymanifest):
 * served at <url>/index.js, evaluated as `vendetta=>{return <file>}`.
 *
 * Interception targets in the mobile app bundle: the metro module with a
 * `sendBotMessage` export, whose exports are the community "messageUtil"
 * (see the community plugin's modules.ts), and the metro module "Messages"
 * (its default export, community-proven by the Valenced community plugin
 * `clear-urls`). Scans the whole metro registry with a broad target set;
 * the rewrite is idempotent so overlapping hooks are harmless.
 */
import { DEFAULT_CONFIG, mergeConfig, rewriteInstagramUrls } from "../../packages/core/src/index";

let config = mergeConfig(DEFAULT_CONFIG);

function rewriteArgs(args) {
	const message = args[1];
	if (message && typeof message === "object" && typeof message.content === "string") {
		const next = rewriteInstagramUrls(message.content, config);
		if (next !== message.content) message.content = next;
	}
	return args;
}

const hooked = new Set();
const cleanups = [];

function hook(target) {
	if (!target || typeof target !== "object" || hooked.has(target)) return;
	hooked.add(target);
	if (typeof target.sendMessage === "function") {
		cleanups.push(vendetta.patcher.before(target, "sendMessage", rewriteArgs));
	}
}

function scan() {
	const modules = vendetta.metro.modules;
	for (const key in modules) {
		const m = modules[key];
		if (!m) continue;
		hook(m);
		hook(m.exports);
		hook(m.exports?.messageUtil);
		hook(m.exports?.default);
		hook(m.exports?.default?.messageUtil);
		hook(m.default);
		if (typeof m.messageUtil === "object") hook(m.messageUtil);
		if (typeof m.default?.messageUtil === "object") hook(m.default.messageUtil);
	}
}

scan();
for (const delay of [0, 250, 500, 1000, 2000, 4000, 8000, 12000]) {
	setTimeout(scan, delay);
}

export default {
	onLoad() {
		scan();
	},
	onUnload() {
		for (const fn of cleanups) fn();
	},
};

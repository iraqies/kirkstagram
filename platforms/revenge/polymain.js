/**
 * Kirkstagram — Revenge polymanifest entry.
 *
 * Self-contained polymanifest main file (see vendetta-mod/polymanifest):
 * served at <url>/index.js and evaluated as `vendetta=>{return <file>}`.
 *
 * Interception target: the metro module with a `sendBotMessage` export,
 * whose exports are the community "messageUtil" (see the Valenced
 * community plugin's `modules.ts`), and the metro module "Messages"
 * (its `default.sendMessage`, as hooked by community plugin `clear-urls`).
 *
 * Uses `vendetta.patcher.before`; the hook rewrites the message content.
 */
import { DEFAULT_CONFIG, mergeConfig, rewriteInstagramUrls } from "../../packages/core/src/index";

let config = mergeConfig(DEFAULT_CONFIG);

function rewriteArgs(args) {
	const message = args[1];
	if (message && typeof message.content === "string") {
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
	if (typeof target.sendMessage !== "function") return;
	cleanups.push(vendetta.patcher.before(target, "sendMessage", rewriteArgs));
}

function scan() {
	const modules = vendetta.metro.modules;
	for (const key in modules) {
		const m = modules[key];
		if (!m || !m.exports) continue;
		hook(m.exports);            // metro module with a `sendBotMessage` export; its exports are the community "messageUtil"
		hook(m.exports.messageUtil);
		hook(m.exports.default);    // metro module "Messages"; send on its default export
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

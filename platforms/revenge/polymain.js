/**
 * Kirkstagram — Revenge polymanifest entry.
 *
 * Self-contained polymanifest main file (vendetta-mod/polymanifest):
 * served at <url>/index.js, evaluated as `vendetta=>{return <file>}`.
 *
 * Interception target: `messageutil` from `@metro/common`
 * (src/metro/common/index.ts: `export const messageUtil = findByPropsLazy("sendBotMessage")`),
 * which exposes `sendMessage(channelId, { content }, ...)` and
 * `sendBotMessage(channelId, content)`. The app captured `messageutil` as a
 * reference at plugin-eval time, so we mutate that object's
 * `sendMessage`/`sendBotMessage` properties in place — every caller then goes
 * through the wrapper. The rewrite mutates message.content in place and is
 * idempotent (__ksPatched guard), so overlapping hooks are harmless.
 *
 * Strategy: hook `window.__r` (metro require) to catch modules as they load,
 * plus deep-scan `window.modules` and `vendetta` on a timer for
 * lazily-loaded modules. Direct in-place mutation means any reference to the
 * `messageutil` object (including captured consts) sees the wrapped send.
 */
import { DEFAULT_CONFIG, mergeConfig, rewriteInstagramUrls } from "../../packages/core/src/index";

let config = mergeConfig(DEFAULT_CONFIG);

function rewriteArgs(args) {
	const message = args[1];
	if (message && typeof message === "object" && typeof message.content === "string") {
		const next = rewriteInstagramUrls(message.content, config);
		if (next !== message.content) message.content = next;
		return args;
	}
	if (typeof message === "string") {
		const next = rewriteInstagramUrls(message, config);
		if (next !== message) return [args[0], next, ...args.slice(2)];
	}
	return args;
}

const patchedFn = new WeakSet();
const patchedObj = new WeakSet();

function wrapSend(fn) {
	if (patchedFn.has(fn)) return fn;
	const wrapped = function (...args) {
		const next = rewriteArgs(args) ?? args;
		return fn.apply(this, next);
	};
	patchedFn.add(fn);
	patchedFn.add(wrapped);
	return wrapped;
}

function hookObj(obj) {
	if (!obj || typeof obj !== "object" || patchedObj.has(obj)) return;
	if (typeof obj.sendMessage === "function") obj.sendMessage = wrapSend(obj.sendMessage);
	if (typeof obj.sendBotMessage === "function") obj.sendBotMessage = wrapSend(obj.sendBotMessage);
	patchedObj.add(obj);
}

// Hook metro require to catch modules as they're required (including @metro/common)
if (typeof window.__r === "function") {
	const origR = window.__r;
	window.__r = function(id) {
		let result;
		try { result = origR(id); } catch { return origR(id); }
		try {
			if (result && typeof result === "object") {
				hookObj(result);
				if (result.default && typeof result.default === "object") hookObj(result.default);
				if (result.exports && typeof result.exports === "object") hookObj(result.exports);
				if (result.messageutil && typeof result.messageutil === "object") hookObj(result.messageutil);
			}
		} catch {}
		return result;
	};
}

function scanModules(modules) {
	if (!modules || typeof modules !== "object") return;
	for (const key in modules) {
		try {
			const m = modules[key];
			if (m && typeof m === "object") {
				hookObj(m);
				if (m.exports && typeof m.exports === "object") hookObj(m.exports);
				if (m.default && typeof m.default === "object") hookObj(m.default);
				if (m.exports && m.exports.messageutil && typeof m.exports.messageutil === "object") hookObj(m.exports.messageutil);
			}
		} catch {}
	}
}

function deepScan(obj, depth) {
	if (!obj || typeof obj !== "object" || depth > 3) return;
	try {
		hookObj(obj);
		for (const key in obj) {
			const v = obj[key];
			if (v && typeof v === "object") {
				hookObj(v);
				deepScan(v, depth + 1);
			}
		}
	} catch {}
}

// Initial scan
scanModules(window.modules);
scanModules(vendetta?.metro?.modules);
deepScan(vendetta, 0);

// Re-scan to catch lazily-loaded metro modules
for (const delay of [0, 100, 300, 1000, 3000, 10000, 30000]) {
	setTimeout(() => {
		try {
			scanModules(window.modules);
			scanModules(vendetta?.metro?.modules);
			deepScan(vendetta, 0);
		} catch {}
	}, delay);
}

export default {
	onLoad() {
		try {
			scanModules(window.modules);
			scanModules(vendetta?.metro?.modules);
			deepScan(vendetta, 0);
		} catch {}
	},
	onUnload() {}
};

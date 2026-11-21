/**
 * Kirkstagram — Revenge polymanifest entry.
 *
 * Self-contained polymanifest main file (vendetta-mod/polymanifest):
 * served at <url>/index.js, evaluated as `vendetta=>{return <file>}`.
 *
 * Interception target: `messageutil` from `@metro/common`
 * (src/metro/common/index.ts: `export const messageUtil = findByPropsLazy("sendBotMessage")`),
 * which exposes `sendMessage(channelId, { content }, ...)` and
 * `sendBotMessage(channelId, content)`. We find the exact same object the
 * Discord app uses via `vendetta.metro.findByProps("sendBotMessage")` and
 * mutate its `sendMessage`/`sendBotMessage` in place. Every caller then goes
 * through the wrapper. The rewrite mutates message.content in place and is
 * idempotent (__ksPatched guard), so overlapping hooks are harmless.
 *
 * Because `messageutil` may load lazily after our plugin starts, we poll
 * `vendetta.metro.findByProps("sendBotMessage")` on a schedule, plus
 * hook `window.__r` (metro require) as a fallback.
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

let messageUtil = null;
let hooked = false;

function hookObj(obj) {
	if (!obj || typeof obj !== "object") return false;
	let hookedHere = false;
	if (typeof obj.sendMessage === "function" && !obj.sendMessage.__ksPatched) {
		const orig = obj.sendMessage;
		obj.sendMessage = function (...args) {
			const next = rewriteArgs(args) ?? args;
			return orig.apply(this, next);
		};
		obj.sendMessage.__ksPatched = true;
		hookedHere = true;
	}
	if (typeof obj.sendBotMessage === "function" && !obj.sendBotMessage.__ksPatched) {
		const orig = obj.sendBotMessage;
		obj.sendBotMessage = function (...args) {
			const next = rewriteArgs(args) ?? args;
			return orig.apply(this, next);
		};
		obj.sendBotMessage.__ksPatched = true;
		hookedHere = true;
	}
	return hookedHere;
}

function tryHook() {
	if (hooked) return;
	try {
		// Primary: find the exact messageutil object Discord uses.
		const mu = vendetta.metro.findByProps("sendBotMessage");
		if (mu && typeof mu === "object") {
			if (hookObj(mu)) { messageUtil = mu; hooked = true; return; }
			if (mu.default && typeof mu.default === "object" && hookObj(mu.default)) { messageUtil = mu.default; hooked = true; return; }
			if (mu.exports && typeof mu.exports === "object" && hookObj(mu.exports)) { messageUtil = mu.exports; hooked = true; return; }
		}
	} catch {}
	// Fallback: deep-scan vendetta for any object with sendBotMessage/sendMessage.
	try {
		const seen = new WeakSet();
		function scan(o) {
			if (!o || typeof o !== "object" || seen.has(o)) return;
			seen.add(o);
			if (hookObj(o)) hooked = true;
			if (hooked) { messageUtil = o; return; }
			for (const k in o) {
				const v = o[k];
				if (v && typeof v === "object") scan(v);
				if (hooked) { messageUtil = o; return; }
			}
		}
		scan(vendetta);
		scan(window.modules);
	} catch {}
}

// Try immediately and keep polling to catch lazy-loaded modules.
tryHook();
for (const delay of [100, 300, 1000, 3000, 10000, 30000]) {
	setTimeout(tryHook, delay);
}

export default {
	onLoad() {
		tryHook();
	},
	onUnload() {}
};

/**
 * Kirkstagram — Revenge polymanifest entry.
 *
 * Self-contained polymanifest main file (vendetta-mod/polymanifest):
 * served at <url>/index.js, evaluated as `vendetta=>{return <file>}`.
 *
 * Interception target: the metro "messageUtil" module (imported as
 * `import { messageUtil } from "@metro/common"` in the Revenge/Discord
 * mobile bundle), which exposes `sendMessage(channelId, { content }, ...)`
 * and `sendBotMessage(channelId, content)`. The app captured `messageUtil`
 * as a reference at plugin-eval time, so we mutate that object's
 * `sendMessage`/`sendBotMessage` properties in place — every caller, the
 * plugins command included, then goes through the wrapper.
 *
 * Since messageUtil may load lazily after boot, we repeatedly scan the
 * metro registry (and the vendetta object) and proxy module `.exports`
 * setters so newly loaded modules are hooked immediately. The rewrite
 * mutates message.content in place and is idempotent (__ksPatched guard),
 * so overlapping hooks are harmless.
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

function makeWrappedSend(fn) {
	if (fn && fn.__ksPatched) return fn;
	const wrapped = function (...args) {
		const next = rewriteArgs(args) ?? args;
		return fn.apply(this, next);
	};
	wrapped.__ksPatched = true;
	return wrapped;
}

function hookSendOnObject(obj) {
	if (!obj || typeof obj !== "object") return;
	if (typeof obj.sendMessage === "function") obj.sendMessage = makeWrappedSend(obj.sendMessage);
	if (typeof obj.sendBotMessage === "function") obj.sendBotMessage = makeWrappedSend(obj.sendBotMessage);
}

function wrapObject(obj) {
	if (!obj || typeof obj !== "object") return obj;
	hookSendOnObject(obj);
	return new Proxy(obj, {
		set(t, k, v) {
			const r = Reflect.set(t, k, v);
			try {
				if ((k === "sendMessage" || k === "sendBotMessage") && typeof v === "function") {
					t[k] = makeWrappedSend(v);
					return true;
				}
				if ((k === "exports" || k === "default" || k === "messageUtil") && v && typeof v === "object") {
					t[k] = wrapObject(v);
					return true;
				}
			} catch {}
			return r;
		}
	});
}

function wrapEntry(entry) {
	if (!entry || typeof entry !== "object") return entry;
	if (entry.exports && typeof entry.exports === "object") entry.exports = wrapObject(entry.exports);
	if (entry.default && typeof entry.default === "object") entry.default = wrapObject(entry.default);
	if (entry.messageUtil && typeof entry.messageUtil === "object") entry.messageUtil = wrapObject(entry.messageUtil);
	hookSendOnObject(entry);
	return entry;
}

function scanModules(modules) {
	if (!modules || typeof modules !== "object") return;
	for (const key in modules) {
		try {
			const m = modules[key];
			if (m && typeof m === "object") {
				// Assign back so the module object itself becomes a proxy; later
				// `modules[key].exports = ...` assignments flow through the trap.
				modules[key] = wrapEntry(m);
				hookSendOnObject(m);
			}
		} catch {}
	}
}

function deepScan(obj, depth) {
	if (!obj || typeof obj !== "object" || depth > 4) return;
	try {
		for (const key in obj) {
			const v = obj[key];
			if (v && typeof v === "object") {
				hookSendOnObject(v);
				if ((key === "sendMessage" || key === "sendBotMessage") && typeof v === "function") {
					// already hooked above
				}
				deepScan(v, depth + 1);
			}
		}
	} catch {}
}

function installModulesProxy() {
	if (window.__ksModulesProxy) return;
	const orig = vendetta.metro.modules || window.modules;
	if (!orig || typeof orig !== "object") return;
	try {
		const proxy = new Proxy(orig, {
			set(t, k, v) {
				const r = Reflect.set(t, k, v);
				try {
					if (v && typeof v === "object") wrapEntry(v);
				} catch {}
				return r;
			}
		});
		vendetta.metro.modules = proxy;
		try { window.modules = proxy; } catch {}
		window.__ksModulesProxy = true;
	} catch {}
}

// Initial scan of metro registry + vendetta object.
scanModules(vendetta.metro.modules);
scanModules(window.modules);
deepScan(vendetta, 0);
installModulesProxy();

// Re-scan on a tight schedule to catch lazily-loaded metro modules.
for (const delay of [0, 100, 250, 500, 1000, 2000, 4000, 8000, 12000, 20000, 30000]) {
	setTimeout(() => {
		try {
			scanModules(vendetta.metro.modules);
			scanModules(window.modules);
			deepScan(vendetta, 0);
			installModulesProxy();
		} catch {}
	}, delay);
}

export default {
	onLoad() {
		try {
			scanModules(vendetta.metro.modules);
			scanModules(window.modules);
			deepScan(vendetta, 0);
			installModulesProxy();
		} catch {}
	},
	onUnload() {}
};

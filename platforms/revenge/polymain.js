/**
 * Kirkstagram — Revenge polymanifest entry.
 *
 * Self-contained polymanifest main file (vendetta-mod/polymanifest):
 * served at <url>/index.js, evaluated as `vendetta=>{return <file>}`.
 *
 * Interception targets in the Revenge/Discord mobile bundle: the metro
 * module with a `sendBotMessage` export (its exports are the community
 * "messageUtil": `messageUtil.sendMessage(channelId, { content }, ...)`),
 * and the metro "Messages" module (`Messages.default.sendMessage`).
 *
 * Instead of guessing which module loads when, this hooks the whole metro
 * registry: every module object, its exports/default/messageUtil, and any
 * `sendMessage` function assigned at any time (including modules that load
 * lazily after boot). The rewrite mutates `message.content` in place and is
 * idempotent, so overlapping hooks are harmless.
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

const objectToProxy = new WeakMap();   // object -> its proxy
const sendHooked = new WeakSet();      // objects whose sendMessage is wrapped
const wrappedObjects = new WeakSet();  // objects already proxy-wrapped

function makeWrappedSend(fn) {
	if (fn.__ksPatched) return fn;
	const wrapped = function (...args) {
		const next = rewriteArgs(args) ?? args;
		return fn.apply(this, next);
	};
	wrapped.__ksPatched = true;
	return wrapped;
}

function hookSendOnObject(obj) {
	if (!obj || typeof obj !== "object" || sendHooked.has(obj)) return;
	if (typeof obj.sendMessage !== "function") return;
	try {
		sendHooked.add(obj);
		const orig = obj.sendMessage;
		obj.sendMessage = makeWrappedSend(orig);
	} catch {}
}

function wrapObject(obj) {
	if (!obj || typeof obj !== "object") return obj;
	const existing = objectToProxy.get(obj);
	if (existing) return existing;
	wrappedObjects.add(obj);
	hookSendOnObject(obj);
	const proxy = new Proxy(obj, {
		set(t, k, v) {
			const r = Reflect.set(t, k, v);
			try {
				if (k === "sendMessage" && typeof v === "function") {
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
	objectToProxy.set(obj, proxy);
	return proxy;
}

function wrapEntry(entry) {
	if (!entry || typeof entry !== "object") return entry;
	const existing = objectToProxy.get(entry);
	if (existing) return existing;
	if (entry.exports && typeof entry.exports === "object") entry.exports = wrapObject(entry.exports);
	if (entry.default && typeof entry.default === "object") entry.default = wrapObject(entry.default);
	if (entry.messageUtil && typeof entry.messageUtil === "object") entry.messageUtil = wrapObject(entry.messageUtil);
	return wrapObject(entry);
}

function scanModules() {
	try {
		const modules = vendetta.metro.modules;
		if (!modules || typeof modules !== "object") return;
		for (const key in modules) {
			try { modules[key] = wrapEntry(modules[key]); } catch {}
		}
	} catch {}
}

function installModulesProxy() {
	if (window.__ksModulesProxy) return;
	const orig = vendetta.metro.modules;
	if (!orig || typeof orig !== "object") return;
	try {
		const proxy = new Proxy(orig, {
			set(t, k, v) {
				const r = Reflect.set(t, k, v);
				try {
					if (v && typeof v === "object") t[k] = wrapEntry(v);
				} catch {}
				return r;
			}
		});
		vendetta.metro.modules = proxy;
		try { window.modules = proxy; } catch {}
		window.__ksModulesProxy = true;
	} catch {}
}

scanModules();
installModulesProxy();
for (const delay of [0, 250, 500, 1000, 2000, 4000, 8000, 12000]) {
	setTimeout(() => { try { scanModules(); installModulesProxy(); } catch {} }, delay);
}

export default {
	onLoad() {
		try { scanModules(); installModulesProxy(); } catch {}
	},
	onUnload() {}
};

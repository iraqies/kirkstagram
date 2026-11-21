/**
 * Kirkstagram — Valenced adapter.
 *
 * Rewrites Instagram links in outgoing messages before Discord sends them.
 *
 * Interception target: the metro "Messages" module in the mobile app
 * bundle, community-proven by the Valenced community plugin `clear-urls`
 * (`Messages.default.sendMessage(channelId, message, ...)`), where
 * `message` is the message object `{ content }` (or a plain content
 * string on some builds). An older-style `messageUtil` module is also
 * supported as a fallback.
 *
 * Hooked with `@valenced/patcher`'s `before`; the hook rewrites the
 * message content (mutating the object, or replacing a string payload in
 * the args array).
 *
 * Build with `valenced-plugin build` (see valenced-plugin-template).
 */
import { before } from '@valenced/patcher';
import { getModules, lookupModules } from '@valenced/modules/finders';
import { withName, withProps } from '@valenced/modules/finders/filters';
import { DEFAULT_CONFIG, mergeConfig, rewriteInstagramUrls } from '../../packages/core/src/index';

let config = mergeConfig(DEFAULT_CONFIG);

/** Rewrites the message payload of a send call, mutating or replacing it. */
function rewriteArgs(args) {
	const [channelId, message, ...rest] = args;
	if (typeof message === 'string') {
		const next = rewriteInstagramUrls(message, config);
		if (next !== message) return [channelId, next, ...rest];
	} else if (message && typeof message.content === 'string') {
		const next = rewriteInstagramUrls(message.content, config);
		if (next !== message.content) message.content = next;
	}
	return args;
}

function patchMessagesModule(mod) {
	const messages = mod?.default;
	if (!messages || typeof messages.sendMessage !== 'function') return null;
	return before(messages, 'sendMessage', rewriteArgs);
}

function patchMessageUtil(messageUtil) {
	if (!messageUtil || typeof messageUtil.sendMessage !== 'function') return null;
	return before(messageUtil, 'sendMessage', rewriteArgs);
}

function patchMessageUtils() {
	const cleanupFns = [];

	// Discord mobile: metro module "Messages"; send on its default export.
	getModules(withName('Messages'), mod => {
		const fn = patchMessagesModule(mod);
		if (fn) cleanupFns.push(fn);
	});

	// Fallback: other bundles may expose a `messageUtil`-style object.
	for (const match of lookupModules(withProps('messageUtil'))) {
		const exports = Array.isArray(match) ? match[0] : match;
		const messageUtil = exports?.messageUtil ?? exports?.default?.messageUtil;
		const fn = patchMessageUtil(messageUtil);
		if (fn) cleanupFns.push(fn);
	}

	return () => {
		for (const fn of cleanupFns) fn();
	};
}

export default plugin({
	name: 'Kirkstagram',
	jsonStorage: { load: true },
	start({ cleanup, jsonStorage }) {
		config = mergeConfig(jsonStorage?.cache ?? {});
		cleanup(patchMessageUtils());
	},
	stop() {},
});

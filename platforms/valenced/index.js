/**
 * Kirkstagram — Valenced adapter.
 *
 * Rewrites Instagram links in outgoing messages before Discord sends them.
 *
 * Interception targets in the mobile app bundle: the metro "Messages"
 * module (community-proven by the Valenced community plugin `clear-urls`
 * — `Messages.default.sendMessage(channelId, message, ...)`, where
 * `message` is the message object `{ content }` or a plain content
 * string on some builds), and the metro module with a `sendBotMessage`
 * export, whose exports are the community "messageUtil" (see the
 * community plugin's `modules.ts`).
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

function patchMessageUtils() {
	const cleanupFns = [];
	const hooked = new Set();

	function hook(target) {
		if (!target || typeof target !== 'object' || hooked.has(target)) return;
		hooked.add(target);
		if (typeof target.sendMessage === 'function') {
			cleanupFns.push(before(target, 'sendMessage', rewriteArgs));
		}
	}

	// Discord mobile: metro module "Messages"; send on its default export and
	// on the module itself.
	getModules(withName('Messages'), mod => {
		hook(mod?.default);
		hook(mod);
	});

	// The metro module with a `sendBotMessage` export; its exports are the
	// community "messageUtil" (see valenced-community-plugins commands.ts).
	getModules(withProps('sendBotMessage'), exports => hook(exports));

	// Other bundles may expose a `messageUtil`-style object.
	for (const match of lookupModules(withProps('messageUtil'))) {
		const exports = Array.isArray(match) ? match[0] : match;
		hook(exports?.messageUtil ?? exports?.default?.messageUtil ?? exports);
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

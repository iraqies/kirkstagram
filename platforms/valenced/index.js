/**
 * Kirkstagram — Valenced adapter.
 *
 * Rewrites Instagram links in outgoing messages before Discord sends them.
 *
 * Interception target (verified in the Valenced/Revenge app bundle,
 * revenge-bundle/src/lib/api/commands/index.ts): the metro common module
 * exports `messageUtil` and the app submits messages via
 * `messageUtil.sendMessage(channelId, message, options, extra)` where
 * `message` is the message object `{ content }`.
 *
 * Patched with `@valenced/patcher`'s `before`; the hook mutates the message
 * object's `content` and returns the arguments array.
 *
 * Build with `valenced-plugin build` (see valenced-plugin-template).
 */
import { before } from '@valenced/patcher';
import { lookupModules } from '@valenced/modules/finders';
import { withProps } from '@valenced/modules/finders/filters';
import { DEFAULT_CONFIG, mergeConfig, rewriteInstagramUrls } from '../../packages/core/src/index';

let config = mergeConfig(DEFAULT_CONFIG);

function patchMessageUtils() {
	const cleanupFns = [];
	for (const match of lookupModules(withProps('messageUtil'))) {
		const exports = Array.isArray(match) ? match[0] : match;
		const messageUtil = exports?.messageUtil ?? exports?.default?.messageUtil;
		if (!messageUtil || typeof messageUtil.sendMessage !== 'function') continue;
		cleanupFns.push(
			before(messageUtil, 'sendMessage', (args) => {
				const [channelId, message, ...rest] = args;
				if (message && typeof message.content === 'string') {
					message.content = rewriteInstagramUrls(message.content, config);
				}
				return [channelId, message, ...rest];
			}),
		);
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

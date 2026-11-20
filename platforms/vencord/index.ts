/**
 * Kirkstagram — Vencord adapter.
 *
 * Rewrites Instagram links in outgoing messages via Vencord's message events
 * API: `onBeforeMessageSend` and `onBeforeMessageEdit`. The message content
 * is mutated in place before the send/edit proceeds.
 *
 * Install: copy this file into Vencord's `src/plugins/` folder and build, or
 * install as a userplugin. Vencord resolves the relative import of the shared
 * core engine (../../packages/core/src/index).
 */
import { MessageObject } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import {
	DEFAULT_CONFIG,
	mergeConfig,
	rewriteInstagramUrls,
	validateReplacementDomain,
	type KirkstagramConfig,
} from "../../packages/core/src/index";

const settings = definePluginSettings({
	enabled: {
		type: OptionType.BOOLEAN,
		description: "Rewrite Instagram links in outgoing messages",
		default: DEFAULT_CONFIG.enabled,
	},
	replacementDomain: {
		type: OptionType.STRING,
		description: "Host written into the generated Kirkstagram links",
		default: DEFAULT_CONFIG.replacementDomain,
	},
	convertReels: {
		type: OptionType.BOOLEAN,
		description: "Convert /reel/ links",
		default: DEFAULT_CONFIG.convertReels,
	},
	convertPosts: {
		type: OptionType.BOOLEAN,
		description: "Convert /p/ links",
		default: DEFAULT_CONFIG.convertPosts,
	},
	convertTV: {
		type: OptionType.BOOLEAN,
		description: "Convert /tv/ links",
		default: DEFAULT_CONFIG.convertTV,
	},
	convertStories: {
		type: OptionType.BOOLEAN,
		description: "Convert /stories/ links",
		default: DEFAULT_CONFIG.convertStories,
	},
	convertOnEdit: {
		type: OptionType.BOOLEAN,
		description: "Also rewrite when editing a message",
		default: DEFAULT_CONFIG.convertOnEdit,
	},
});

function getConfig(): KirkstagramConfig {
	const stored = settings.store;
	const domain = validateReplacementDomain(stored.replacementDomain)
		? stored.replacementDomain
		: DEFAULT_CONFIG.replacementDomain;
	return mergeConfig({ ...stored, replacementDomain: domain });
}

function rewriteMessage(msg: MessageObject): void {
	const cfg = getConfig();
	if (!cfg.enabled) return;
	const next = rewriteInstagramUrls(msg.content, cfg);
	if (next !== msg.content) msg.content = next;
}

export default definePlugin({
	name: "Kirkstagram",
	description: "Rewrites Instagram links into Kirkstagram links before sending",
	tags: ["Utility"],
	authors: [{ name: "Kirkstagram contributors", id: 0n }],
	settings,
	onBeforeMessageSend(_channelId, msg) {
		rewriteMessage(msg);
	},
	onBeforeMessageEdit(_channelId, _messageId, msg) {
		if (getConfig().convertOnEdit) {
			rewriteMessage(msg);
		}
	},
});

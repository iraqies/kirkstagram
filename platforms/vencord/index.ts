/**
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Kirkstagram — Vencord adapter.
 *
 * Rewrites Instagram links in outgoing messages via Vencord's message events
 * API: `onBeforeMessageSend` and `onBeforeMessageEdit`. The message content
 * is mutated in place before the send/edit proceeds.
 *
 * Discord builds move their send flow around, so this plugin also patches
 * Discord's send entry point directly: the patch calls
 * `globalThis.kirkstagramRewrite` (set in `start()`) with the outgoing
 * message object right before Discord queues it.
 *
 * Install: copy this file into Vencord's `src/plugins/` folder and build, or
 * install as a userplugin. Vencord resolves the relative import of the shared
 * core engine (../../packages/core/src/index).
 */
import { MessageObject } from "@api/MessageEvents";
import { addPatch } from "@api/PluginManager";
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

// Discord's send entry point: `Ti` builds the outgoing message object (`i`)
// and calls `Ut.sendMessage(e, i, o, n)`. The patch rewrites `i.content`
// right before Discord queues the message.
const sendPatch = {
	find: 'function Ti(e,t,o=!0,n={}){let i={content:"",invalidEmojis:[],tts:!1,validNonShortcutEmojis:[],...t};return Ut.sendMessage(e,i,o,n)}',
	replacement: {
		match: "Ut.sendMessage(e,i,o,n)",
		replace: "Ut.sendMessage(e,(globalThis.kirkstagramRewrite?.(i),i),o,n)"
	}
};

const patchTarget = globalThis as { kirkstagramRewrite?: (msg: MessageObject) => void };

export default definePlugin({
	name: "Kirkstagram",
	description: "Rewrites Instagram links into Kirkstagram links before sending",
	tags: ["Utility"],
	authors: [{ name: "Kirkstagram contributors", id: 0n }],
	settings,
	start() {
		patchTarget.kirkstagramRewrite = rewriteMessage;
		try {
			addPatch(sendPatch, "Kirkstagram");
		} catch {
			// If the Discord build drifts again the patch silently no-ops;
			// the onBeforeMessageSend listener still fires via MessageEventsAPI
			// on builds where its patches match.
		}
	},
	onBeforeMessageSend(_channelId, msg) {
		rewriteMessage(msg);
	},
	onBeforeMessageEdit(_channelId, _messageId, msg) {
		if (getConfig().convertOnEdit) {
			rewriteMessage(msg);
		}
	},
});

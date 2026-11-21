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
	if (typeof msg.content !== "string") return;
	const cfg = getConfig();
	if (!cfg.enabled) return;
	const next = rewriteInstagramUrls(msg.content, cfg);
	if (next !== msg.content) msg.content = next;
}

// Discord's send entry points: each client build renames its internals, so
// the plugin declares one patch per known entry and they are idempotent.
//
// - Standalone builds: `Ti` builds the outgoing message object (`i`) and
//   calls `Ut.sendMessage(e, i, o, n)`; the patch rewrites `i.content`
//   right before Discord queues the message.
// - Vesktop: `async _sendMessage(e,t,n)` holds the outgoing message in `t`
//   and queues it; `async editMessage(e,t,n)` holds the edited payload in `n`.
//
// Static patches are registered during plugin init, before the Discord
// webpack modules run, and the rewrite call happens at send time.
const tiPatch = {
	find: 'function Ti(e,t,o=!0,n={}){let i={content:"",invalidEmojis:[],tts:!1,validNonShortcutEmojis:[],...t};return Ut.sendMessage(e,i,o,n)}',
	replacement: {
		match: "Ut.sendMessage(e,i,o,n)",
		replace: "Ut.sendMessage(e,(globalThis.kirkstagramRewrite?.(i),i),o,n)"
	}
};

const sendPatch = {
	find: "async _sendMessage(",
	replacement: {
		match: /async _sendMessage\((\w+),(\w+)((?:,\w+)*)\)\{/,
		replace: "async _sendMessage($1,$2$3){globalThis.kirkstagramRewrite?.($2);"
	}
};

const editPatch = {
	find: "async editMessage(",
	replacement: {
		match: /async editMessage\((\w+),(\w+),(\w+)((?:,\w+)*)\)\{/,
		replace: "async editMessage($1,$2,$3$4){globalThis.kirkstagramRewrite?.($3);"
	}
};

const patchTarget = globalThis as { kirkstagramRewrite?: (msg: MessageObject) => void };

export default definePlugin({
	name: "Kirkstagram",
	description: "Rewrites Instagram links into Kirkstagram links before sending",
	tags: ["Utility"],
	authors: [{ name: "Kirkstagram contributors", id: 0n }],
	settings,
	patches: [tiPatch, sendPatch, editPatch],
	start() {
		patchTarget.kirkstagramRewrite = rewriteMessage;
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

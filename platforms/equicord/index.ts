/**
 * Kirkstagram — Equicord adapter.
 *
 * Equicord is Vencord-based and uses the same Vencord plugin system
 * (src/plugins/ with the same definePlugin API). This adapter works the
 * same way as the Vencord adapter: patches Discord's send entry point
 * (`async _sendMessage` / `async editMessage`) so Instagram links are
 * rewritten before the message is queued.
 *
 * Install: copy this file into Equicord's src/plugins/kirkstagram/ folder
 * and build Equicord, or install as a userplugin.
 *
 * The core engine import is relative to this file's installed location:
 * <EQCORD>/src/plugins/kirkstagram/ -> <KIRKSTAGRAM>/packages/core/src/index
 * (e.g. ../../../../kirkstagram/packages/core/src/index when the two
 * checkouts are siblings under one directory).
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

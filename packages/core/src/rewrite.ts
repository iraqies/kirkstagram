// packages/core/src/rewrite.ts

import { DEFAULT_CONFIG, mergeConfig, type KirkstagramConfig } from "./config.ts";
import { findInstagramUrls, type FoundInstagramUrl, type InstagramUrlType } from "./parser.ts";

export function hasInstagramUrls(text: string): boolean {
	return findInstagramUrls(text).length > 0;
}

function convertEnabled(type: InstagramUrlType, cfg: KirkstagramConfig): boolean {
	switch (type) {
		case "reel":
			return cfg.convertReels;
		case "post":
			return cfg.convertPosts;
		case "tv":
			return cfg.convertTV;
		case "stories":
			return cfg.convertStories;
	}
}

function instagramToMarkdown(match: FoundInstagramUrl, cfg: KirkstagramConfig): string {
	// Visible label: instagram.com + path, with the trailing slash removed.
	const label = `instagram.com${match.path}`;
	// Destination: kirkstagram + path, preserving the original trailing slash,
	// query string and fragment.
	const destination =
		`https://${cfg.replacementDomain}` +
		`${match.path}` +
		`${match.trailingSlash}` +
		`${match.query}` +
		`${match.fragment}`;
	return `[${label}](${destination})`;
}

/**
 * Rewrites supported Instagram URLs in the text into Kirkstagram Markdown
 * links. Only the supported URL spans are replaced; the rest of the message
 * is preserved byte-for-byte. Idempotent: already converted messages are
 * returned unchanged.
 */
export function rewriteInstagramUrls(text: string, config?: Partial<KirkstagramConfig>): string {
	const cfg = mergeConfig(config);
	if (!cfg.enabled || text === "") return text;

	const matches = findInstagramUrls(text);
	if (matches.length === 0) return text;

	let result = "";
	let last = 0;
	for (const match of matches) {
		if (!convertEnabled(match.type, cfg)) continue;
		result += text.slice(last, match.start);
		result += instagramToMarkdown(match, cfg);
		last = match.end;
	}
	result += text.slice(last);
	return result;
}

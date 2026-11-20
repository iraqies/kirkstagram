/**
 * Extracts Instagram URLs from message text.
 *
 * Supported Instagram hosts (exact match, case-insensitive):
 *   instagram.com, www.instagram.com, m.instagram.com
 *
 * Supported patterns:
 *   /reel/{id}
 *   /p/{id}
 *   /tv/{id}
 *   /stories/{username}
 *   /stories/{username}/{id}
 *
 * Only absolute URLs (http/https) with a supported Instagram host and
 * supported path are matched. Malformed URLs, other hosts and lookalike
 * hosts (instagram.com.example.org, fake-instagram.com,
 * instagram.com@evil.example) never match.
 */

export type InstagramHost = "instagram.com" | "www.instagram.com" | "m.instagram.com";

export const INSTAGRAM_HOSTS: readonly InstagramHost[] = [
	"instagram.com",
	"www.instagram.com",
	"m.instagram.com",
];

export type InstagramUrlType = "reel" | "post" | "tv" | "stories";

export interface FoundInstagramUrl {
	/** Start index of the matched URL in the scanned text. */
	start: number;
	/** End index of the matched URL in the scanned text (exclusive). */
	end: number;
	/** The URL path as typed, e.g. "/reel/ABC123". Excludes the trailing slash. */
	path: string;
	/** Trailing slash of the URL, e.g. "/", or "" when absent. */
	trailingSlash: string;
	/** Query string including "?", or "" when absent. */
	query: string;
	/** Fragment including "#", or "" when absent. */
	fragment: string;
	/** Host variant of the typed URL. */
	host: InstagramHost;
	/** Supported pattern the URL matched. */
	type: InstagramUrlType;
}

/**
 * Instagram URL matcher source.
 *
 * Groups:
 *  1: scheme + host, e.g. "https://www.instagram.com"
 *  2: path, e.g. "/reel/ABC123"
 *  3: reel id
 *  4: post id
 *  5: tv id
 *  6: story username
 *  7: story id
 *  8: trailing slash
 *  9: query string
 * 10: fragment
 */
const INSTAGRAM_URL_SOURCE =
	"(https?:\\/\\/(?:www\\.|m\\.)?instagram\\.com)" +
	"(\\/(?:reel\\/([A-Za-z0-9_~-]+)|p\\/([A-Za-z0-9_~-]+)|tv\\/([A-Za-z0-9_~-]+)|stories\\/([A-Za-z0-9_][A-Za-z0-9_.]*)(?:\\/([A-Za-z0-9_-]+))?))" +
	"(\\/)?(\\?[^\\s<>\"'`()]*)?(#[^\\s<>\"'`()]*)?";

function rangesOverlap(ranges: Array<[number, number]>, start: number, end: number): boolean {
	for (const [rangeStart, rangeEnd] of ranges) {
		if (rangeStart < end && start < rangeEnd) return true;
	}
	return false;
}

/**
 * Computes ranges of the text that must not be rewritten: existing Markdown
 * links (label and destination), inline code spans and fenced code blocks.
 */
function computeProtectedRanges(text: string): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];
	let match: RegExpExecArray | null;

	// Existing Markdown links: [label](dest)
	const linkRe = /\[[^\[\]]*\]\([^)\s]+\)/g;
	while ((match = linkRe.exec(text)) !== null) {
		ranges.push([match.index, match.index + match[0].length]);
	}

	// Inline code spans: `code`
	const codeRe = /`[^`]*`/g;
	while ((match = codeRe.exec(text)) !== null) {
		ranges.push([match.index, match.index + match[0].length]);
	}

	// Fenced code blocks: ``` ... ``` (or to the end of the text when unclosed)
	const fenceRe = /```[\s\S]*?(```|$)/g;
	while ((match = fenceRe.exec(text)) !== null) {
		ranges.push([match.index, match.index + match[0].length]);
	}

	return ranges.sort((a, b) => a[0] - b[0]);
}

/**
 * Finds all supported Instagram URLs in the text.
 * URLs inside Markdown links, code spans/blocks or preceded by a backslash
 * are not included, so already converted messages produce no new matches.
 */
export function findInstagramUrls(text: string): FoundInstagramUrl[] {
	const found: FoundInstagramUrl[] = [];
	const protectedRanges = computeProtectedRanges(text);
	const re = new RegExp(INSTAGRAM_URL_SOURCE, "gi");
	let match: RegExpExecArray | null;

	while ((match = re.exec(text)) !== null) {
		const [
			full,
			host,
			path,
			reelId,
			postId,
			tvId,
			storyUser,
			storyId,
			slash,
			query,
			fragment,
		] = match;
		const start = match.index;
		const end = start + full.length;
		const hostName = (host as string).replace(/^https?:\/\//i, "") as InstagramHost;

		// Never rewrite URLs inside existing Markdown links or code spans/blocks.
		if (rangesOverlap(protectedRanges, start, end)) continue;
		// Never rewrite a URL preceded by a backslash (escape).
		if (text[start - 1] === "\\") continue;
		// Ignore URLs with a longer path after the match: /reel/ABC/extra is
		// not a supported Instagram URL.
		const after = text[end];
		if (after !== undefined && /[A-Za-z0-9_~-]/.test(after)) continue;

		let type: InstagramUrlType;
		if (reelId !== undefined) type = "reel";
		else if (postId !== undefined) type = "post";
		else if (tvId !== undefined) type = "tv";
		else type = "stories";

		found.push({
			start,
			end,
			path: path as string,
			trailingSlash: slash ?? "",
			query: query ?? "",
			fragment: fragment ?? "",
			host: hostName,
			type,
		});
	}

	return found;
}

// packages/core/src/config.ts

import { INSTAGRAM_HOSTS, type InstagramHost } from "./parser.ts";

/**
 * Shared configuration for the Kirkstagram rewrite engine.
 *
 * Defaults follow the project specification; every field is overridable per
 * platform via mergeConfig.
 */
export interface KirkstagramConfig {
	/** Master switch. */
	enabled: boolean;
	/**
	 * Destination host of the generated links. Must be a valid hostname;
	 * scheme, path, query, fragment or credentials are not permitted.
	 */
	replacementDomain: string;
	/** Convert /reel/ links. */
	convertReels: boolean;
	/** Convert /p/ links. */
	convertPosts: boolean;
	/** Convert /tv/ links. */
	convertTV: boolean;
	/** Convert /stories/ links. */
	convertStories: boolean;
	/** Convert links added while editing a message. */
	convertOnEdit: boolean;
}

export const DEFAULT_CONFIG: KirkstagramConfig = {
	enabled: true,
	replacementDomain: "www.kirkstagram.com",
	convertReels: true,
	convertPosts: true,
	convertTV: true,
	convertStories: true,
	convertOnEdit: true,
};

/**
 * Merges overrides over the defaults. Fields that are absent (or undefined)
 * in `overrides` keep their default values.
 */
export function mergeConfig(overrides?: Partial<KirkstagramConfig>): KirkstagramConfig {
	return { ...DEFAULT_CONFIG, ...overrides };
}

const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;

export function isValidHostname(host: string): boolean {
	const h = host.trim();
	if (h.length === 0 || h.length > 253) return false;
	if (!HOSTNAME_RE.test(h)) return false;
	// Reject empty or leading/trailing hyphen labels (covered by the regex, kept as a guard).
	return !h.split(".").some((label) => label.length === 0 || label.startsWith("-") || label.endsWith("-"));
}

/**
 * Validates a replacement domain:
 * - must be a bare hostname (no scheme, credentials, path, query or fragment);
 * - must not be an Instagram host, so Kirkstagram never points its links back
 *   into Instagram.
 */
export function validateReplacementDomain(domain: string): boolean {
	const host = domain.trim();
	if ((INSTAGRAM_HOSTS as readonly string[]).includes(host.toLowerCase())) return false;
	return isValidHostname(host);
}

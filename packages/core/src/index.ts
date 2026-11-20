// packages/core/src/index.ts

export {
	DEFAULT_CONFIG,
	isValidHostname,
	mergeConfig,
	validateReplacementDomain,
	type KirkstagramConfig,
} from "./config.ts";
export {
	findInstagramUrls,
	INSTAGRAM_HOSTS,
	type FoundInstagramUrl,
	type InstagramHost,
	type InstagramUrlType,
} from "./parser.ts";
export { hasInstagramUrls, rewriteInstagramUrls } from "./rewrite.ts";

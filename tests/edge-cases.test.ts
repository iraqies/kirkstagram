import assert from "node:assert/strict";
import { test } from "node:test";
import { hasInstagramUrls, rewriteInstagramUrls } from "../packages/core/src/index.ts";

test("very long message: every URL converted", () => {
	const count = 200;
	const parts: string[] = [];
	for (let i = 0; i < count; i++) parts.push(`https://www.instagram.com/reel/id${i}/`);
	const input = parts.join(" ");
	const out = rewriteInstagramUrls(input);
	for (let i = 0; i < count; i++) {
		assert.ok(out.includes(`[instagram.com/reel/id${i}](https://www.kirkstagram.com/reel/id${i}/)`));
	}
});

test("messages with tab and newline separators", () => {
	const input = "one\thttps://www.instagram.com/reel/A\n\ntwo https://instagram.com/p/B\n";
	const out = rewriteInstagramUrls(input);
	assert.ok(out.includes("[instagram.com/reel/A](https://www.kirkstagram.com/reel/A)"));
	assert.ok(out.includes("[instagram.com/p/B](https://www.kirkstagram.com/p/B)"));
});

test("http scheme accepted", () => {
	const out = rewriteInstagramUrls("http://www.instagram.com/reel/X");
	assert.equal(out, "[instagram.com/reel/X](https://www.kirkstagram.com/reel/X)");
});

test("custom replacementDomain via config", () => {
	const out = rewriteInstagramUrls("https://www.instagram.com/reel/X", { replacementDomain: "ig.example.com" });
	assert.equal(out, "[instagram.com/reel/X](https://ig.example.com/reel/X)");
});

test("convertReels toggle", () => {
	const input = "https://www.instagram.com/reel/A https://instagram.com/p/B";
	const out = rewriteInstagramUrls(input, { convertReels: false });
	assert.ok(out.startsWith("https://www.instagram.com/reel/A "));
	assert.ok(out.includes("[instagram.com/p/B](https://www.kirkstagram.com/p/B)"));
});

test("convertOnEdit-style config is accepted by the engine", () => {
	// The engine itself has no edit mode; the toggle is consumed by adapters.
	assert.equal(rewriteInstagramUrls("x", { convertOnEdit: true }), "x");
});

test("enabled: false returns text unchanged", () => {
	assert.equal(rewriteInstagramUrls("https://www.instagram.com/reel/X", { enabled: false }), "https://www.instagram.com/reel/X");
});

test("complex mixed message, full expected output", () => {
	const input = [
		"Saw this: https://www.instagram.com/reel/ABC/?utm_source=share",
		"and this https://www.instagram.com/stories/jane/123",
		"check the IGTV https://m.instagram.com/tv/DEF",
		"pic https://instagram.com/p/GHI/",
		"done",
	].join("\n");
	const expected = [
		"Saw this: [instagram.com/reel/ABC](https://www.kirkstagram.com/reel/ABC/?utm_source=share)",
		"and this [instagram.com/stories/jane/123](https://www.kirkstagram.com/stories/jane/123)",
		"check the IGTV [instagram.com/tv/DEF](https://www.kirkstagram.com/tv/DEF)",
		"pic [instagram.com/p/GHI](https://www.kirkstagram.com/p/GHI/)",
		"done",
	].join("\n");
	assert.equal(rewriteInstagramUrls(input), expected);
});

test("idempotency on a complex message", () => {
	const input = "a https://www.instagram.com/reel/A b https://instagram.com/p/B c https://www.instagram.com/stories/u/1";
	const once = rewriteInstagramUrls(input);
	assert.equal(rewriteInstagramUrls(once), once);
});

test("hasInstagramUrls", () => {
	assert.equal(hasInstagramUrls("https://www.instagram.com/reel/ABC/"), true);
	assert.equal(hasInstagramUrls("Check https://example.com/x"), false);
	assert.equal(hasInstagramUrls("plain text"), false);
	assert.equal(hasInstagramUrls(""), false);
});

test("trailing slash optional on real links (no slash input)", () => {
	const out = rewriteInstagramUrls("https://www.instagram.com/reel/ABC");
	assert.equal(out, "[instagram.com/reel/ABC](https://www.kirkstagram.com/reel/ABC)");
});

test("URL followed by word character is not matched", () => {
	// /reel/ABC/extra is not a supported Instagram URL: ignored, not corrupted.
	const input = "https://www.instagram.com/reel/ABC/extra";
	assert.equal(rewriteInstagramUrls(input), input);
});

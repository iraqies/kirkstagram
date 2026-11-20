import assert from "node:assert/strict";
import { test } from "node:test";
import { rewriteInstagramUrls } from "../packages/core/src/index.ts";

test("spec example: full message with trailing slash", () => {
	const input = "Check this out https://www.instagram.com/reel/Df2l--lglbl/";
	const expected = "Check this out [instagram.com/reel/Df2l--lglbl](https://www.kirkstagram.com/reel/Df2l--lglbl/)";
	assert.equal(rewriteInstagramUrls(input), expected);
});

test("standard Reel", () => {
	const input = "https://www.instagram.com/reel/ABC123/";
	assert.equal(rewriteInstagramUrls(input), "[instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123/)");
});

test("standard Post", () => {
	const input = "https://instagram.com/p/ABC123/";
	assert.equal(rewriteInstagramUrls(input), "[instagram.com/p/ABC123](https://www.kirkstagram.com/p/ABC123/)");
});

test("IGTV", () => {
	const input = "https://m.instagram.com/tv/ABC123/";
	assert.equal(rewriteInstagramUrls(input), "[instagram.com/tv/ABC123](https://www.kirkstagram.com/tv/ABC123/)");
});

test("Story with username and id", () => {
	const input = "https://www.instagram.com/stories/example/123456/";
	assert.equal(rewriteInstagramUrls(input), "[instagram.com/stories/example/123456](https://www.kirkstagram.com/stories/example/123456/)");
});

test("Story without id", () => {
	const input = "https://www.instagram.com/stories/example";
	assert.equal(rewriteInstagramUrls(input), "[instagram.com/stories/example](https://www.kirkstagram.com/stories/example)");
});

test("all hosts accepted, normalized to instagram.com", () => {
	assert.equal(
		rewriteInstagramUrls("https://instagram.com/reel/X"),
		"[instagram.com/reel/X](https://www.kirkstagram.com/reel/X)",
	);
	assert.equal(
		rewriteInstagramUrls("https://www.instagram.com/reel/X"),
		"[instagram.com/reel/X](https://www.kirkstagram.com/reel/X)",
	);
	assert.equal(
		rewriteInstagramUrls("https://m.instagram.com/reel/X"),
		"[instagram.com/reel/X](https://www.kirkstagram.com/reel/X)",
	);
});

test("case-insensitive host and path", () => {
	const out = rewriteInstagramUrls("https://WWW.INSTAGRAM.COM/REEL/X");
	assert.equal(out, "[instagram.com/REEL/X](https://www.kirkstagram.com/REEL/X)");
});

test("multiple Instagram URLs, all converted", () => {
	const input = "https://www.instagram.com/reel/A https://instagram.com/p/B https://m.instagram.com/tv/C";
	const out = rewriteInstagramUrls(input);
	assert.ok(out.includes("[instagram.com/reel/A](https://www.kirkstagram.com/reel/A)"));
	assert.ok(out.includes("[instagram.com/p/B](https://www.kirkstagram.com/p/B)"));
	assert.ok(out.includes("[instagram.com/tv/C](https://www.kirkstagram.com/tv/C)"));
});

test("multiple types of Instagram links in one message", () => {
	const input =
		"r https://www.instagram.com/reel/A, p https://instagram.com/p/B, s https://www.instagram.com/stories/u/1";
	const out = rewriteInstagramUrls(input);
	assert.ok(out.includes("[instagram.com/reel/A](https://www.kirkstagram.com/reel/A)"));
	assert.ok(out.includes("[instagram.com/p/B](https://www.kirkstagram.com/p/B)"));
	assert.ok(out.includes("[instagram.com/stories/u/1](https://www.kirkstagram.com/stories/u/1)"));
	assert.equal(out, input.replace("https://www.instagram.com/reel/A", "[instagram.com/reel/A](https://www.kirkstagram.com/reel/A)")
		.replace("https://instagram.com/p/B", "[instagram.com/p/B](https://www.kirkstagram.com/p/B)")
		.replace("https://www.instagram.com/stories/u/1", "[instagram.com/stories/u/1](https://www.kirkstagram.com/stories/u/1)"));
});

test("query parameters preserved", () => {
	const out = rewriteInstagramUrls("https://www.instagram.com/reel/ABC123/?a=1&b=2");
	assert.ok(out.includes("[instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123/?a=1&b=2)"));
});

test("fragments preserved", () => {
	const out = rewriteInstagramUrls("https://www.instagram.com/reel/ABC123#top");
	assert.ok(out.includes("[instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123#top)"));
});

test("query and fragment preserved together", () => {
	const out = rewriteInstagramUrls("https://www.instagram.com/reel/ABC?a=1#top");
	assert.ok(out.includes("[instagram.com/reel/ABC](https://www.kirkstagram.com/reel/ABC?a=1#top)"));
});

test("existing Kirkstagram URL unchanged", () => {
	assert.equal(rewriteInstagramUrls("https://www.kirkstagram.com/reel/X/"), "https://www.kirkstagram.com/reel/X/");
});

test("already converted message unchanged (idempotent)", () => {
	const input = "Check this out [instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123/)";
	assert.equal(rewriteInstagramUrls(input), input);
});

test("unrelated domain unchanged", () => {
	assert.equal(rewriteInstagramUrls("https://example.com/reel/ABC/"), "https://example.com/reel/ABC/");
	assert.equal(rewriteInstagramUrls("https://twitter.com/user/status/123"), "https://twitter.com/user/status/123");
});

test("malicious hosts unchanged", () => {
	assert.equal(rewriteInstagramUrls("https://instagram.com.example.org/reel/X"), "https://instagram.com.example.org/reel/X");
	assert.equal(rewriteInstagramUrls("https://fake-instagram.com/reel/X"), "https://fake-instagram.com/reel/X");
	assert.equal(rewriteInstagramUrls("https://instagram.com@evil.example/reel/X"), "https://instagram.com@evil.example/reel/X");
});

test("invalid Instagram URLs unchanged", () => {
	assert.equal(rewriteInstagramUrls("https://www.instagram.com/reel/"), "https://www.instagram.com/reel/");
	assert.equal(rewriteInstagramUrls("https://www.instagram.com/"), "https://www.instagram.com/");
	assert.equal(rewriteInstagramUrls("https://www.instagram.com/explore/search"), "https://www.instagram.com/explore/search");
});

test("existing Markdown link not corrupted", () => {
	const input = "[Instagram](https://www.instagram.com/reel/ABC123/)";
	assert.equal(rewriteInstagramUrls(input), input);
});

test("inline code unchanged", () => {
	const input = "Use `https://www.instagram.com/reel/ABC123/` please";
	assert.equal(rewriteInstagramUrls(input), input);
});

test("fenced code block unchanged", () => {
	const input = "```\nhttps://www.instagram.com/reel/ABC123/\n```";
	assert.equal(rewriteInstagramUrls(input), input);
});

test("trailing punctuation preserved", () => {
	const out = rewriteInstagramUrls("Check this out https://www.instagram.com/reel/ABC123/.");
	assert.equal(out, "Check this out [instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123/).");
});

test("trailing comma preserved", () => {
	const out = rewriteInstagramUrls("See https://www.instagram.com/reel/ABC123, nice");
	assert.equal(out, "See [instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123), nice");
});

test("URLs next to parentheses", () => {
	const out = rewriteInstagramUrls("(https://www.instagram.com/reel/ABC123/)");
	assert.ok(out.startsWith("("));
	assert.ok(out.includes("[instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123/)"));
	assert.ok(out.endsWith(")"));
});

test("messages with newlines", () => {
	const input = "Line 1\nhttps://www.instagram.com/reel/ABC123/\nLine 3";
	assert.equal(rewriteInstagramUrls(input), "Line 1\n[instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123/)\nLine 3");
});

test("emoji and text preserved", () => {
	const input = "See 📸 https://www.instagram.com/reel/ABC123/ — done!";
	assert.equal(rewriteInstagramUrls(input), "See 📸 [instagram.com/reel/ABC123](https://www.kirkstagram.com/reel/ABC123/) — done!");
});

test("URLs at the beginning and end of messages", () => {
	assert.equal(rewriteInstagramUrls("https://www.instagram.com/reel/ABC"), "[instagram.com/reel/ABC](https://www.kirkstagram.com/reel/ABC)");
	assert.equal(rewriteInstagramUrls("text https://www.instagram.com/reel/ABC"), "text [instagram.com/reel/ABC](https://www.kirkstagram.com/reel/ABC)");
});

test("empty message unchanged", () => {
	assert.equal(rewriteInstagramUrls(""), "");
});

test("escaped URL not rewritten", () => {
	assert.equal(rewriteInstagramUrls("\\https://www.instagram.com/reel/X"), "\\https://www.instagram.com/reel/X");
});

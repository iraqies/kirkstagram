import assert from "node:assert/strict";
import { test } from "node:test";
import { findInstagramUrls } from "../packages/core/src/index.ts";

test("reel match details", () => {
	const urls = findInstagramUrls("https://www.instagram.com/reel/ABC123/");
	assert.equal(urls.length, 1);
	assert.equal(urls[0].type, "reel");
	assert.equal(urls[0].path, "/reel/ABC123");
	assert.equal(urls[0].trailingSlash, "/");
	assert.equal(urls[0].host, "www.instagram.com");
	assert.equal(urls[0].query, "");
	assert.equal(urls[0].fragment, "");
});

test("post match details", () => {
	const urls = findInstagramUrls("https://instagram.com/p/ABC123/");
	assert.equal(urls.length, 1);
	assert.equal(urls[0].type, "post");
	assert.equal(urls[0].path, "/p/ABC123");
	assert.equal(urls[0].trailingSlash, "/");
});

test("tv match details", () => {
	const urls = findInstagramUrls("https://m.instagram.com/tv/ABC123");
	assert.equal(urls.length, 1);
	assert.equal(urls[0].type, "tv");
	assert.equal(urls[0].path, "/tv/ABC123");
	assert.equal(urls[0].trailingSlash, "");
	assert.equal(urls[0].host, "m.instagram.com");
});

test("story with id", () => {
	const urls = findInstagramUrls("https://www.instagram.com/stories/example/123456/");
	assert.equal(urls.length, 1);
	assert.equal(urls[0].type, "stories");
	assert.equal(urls[0].path, "/stories/example/123456");
	assert.equal(urls[0].trailingSlash, "/");
});

test("story without id", () => {
	const urls = findInstagramUrls("https://www.instagram.com/stories/example");
	assert.equal(urls.length, 1);
	assert.equal(urls[0].type, "stories");
	assert.equal(urls[0].path, "/stories/example");
	assert.equal(urls[0].trailingSlash, "");
});

test("no match for unsupported or malformed URLs", () => {
	assert.deepEqual(findInstagramUrls("https://example.com/reel/X"), []);
	assert.deepEqual(findInstagramUrls("https://instagram.com.example.org/reel/X"), []);
	assert.deepEqual(findInstagramUrls("https://fake-instagram.com/reel/X"), []);
	assert.deepEqual(findInstagramUrls("https://www.instagram.com/reel/"), []);
	assert.deepEqual(findInstagramUrls("https://www.instagram.com/reel/ABC/extra"), []);
	assert.deepEqual(findInstagramUrls("not a url"), []);
	assert.deepEqual(findInstagramUrls("[Instagram](https://www.instagram.com/reel/ABC123/)"), []);
});

test("no matches inside code spans and fenced code blocks", () => {
	assert.deepEqual(findInstagramUrls("`https://www.instagram.com/reel/X`"), []);
	assert.deepEqual(findInstagramUrls("```\nhttps://www.instagram.com/reel/X\n```"), []);
});
